/**
 * Collection Selector Agent - Stage 1 of Two-Stage Schema Discovery
 *
 * Analyzes user questions and selects relevant database collections.
 * Uses GPT-4o-mini for cost efficiency with lightweight catalog summaries.
 *
 * Flow:
 * 1. User asks question (e.g., "Show top users by balance")
 * 2. This agent selects relevant collections (e.g., ["users", "wallets"])
 * 3. Schema builder fetches full schemas for only those collections
 * 4. Query builder generates MongoDB pipeline with focused context
 *
 * Token usage: ~1,500 tokens (catalog + question + response)
 * Latency: ~200-300ms with GPT-4o-mini
 */

import { z } from 'zod';
import { logger } from '@/lib/utils/logger';
import { formatCatalogSummariesForPrompt, CATALOG_SUMMARIES, TERM_MAPPINGS } from '../generated/schema-catalog';
import { generateStructuredOutput, AI_CONFIG } from '../adapter';

// ============================================
// Response Schema
// ============================================

const CollectionSelectionSchema = z.object({
  collections: z
    .array(z.string())
    .min(1)
    .max(5)
    .describe('Array of collection names (1-5 collections) most relevant to the user question'),
  reasoning: z
    .string()
    .describe('Brief explanation of why these collections were selected'),
  confidence: z
    .string()
    .transform(val => val.toLowerCase().trim())
    .pipe(z.enum(['high', 'medium', 'low']))
    .default('medium')
    .describe('Confidence level in the selection'),
});

export type CollectionSelection = z.infer<typeof CollectionSelectionSchema>;

// ============================================
// System Prompt for Collection Selector
// ============================================

function buildSelectorSystemPrompt(): string {
  let prompt = `You are a database collection selector.

Your task: Analyze the user's question and select the MINIMUM number of relevant collections needed to answer it.

## Available Collections

{catalog}

## Selection Guidelines

1. **Minimize collections**: Select only what's ABSOLUTELY necessary
   - If question can be answered with 1 collection, select 1
   - Only select multiple collections if relationships are needed

2. **Look for keywords in collection names and descriptions** to match the user's intent.

3. **Consider relationships**: If the user needs data from multiple entities, select the collections that need to be joined via $lookup.

4. **Confidence levels**:
   - HIGH: Clear keywords, obvious collections
   - MEDIUM: Requires interpretation, some ambiguity
   - LOW: Question is vague or unclear
`;

  // Add term mappings as keyword hints
  const collectionMappings = TERM_MAPPINGS?.collections;
  if (collectionMappings && Object.keys(collectionMappings).length > 0) {
    prompt += `\n## Term Mappings (keywords → collections)\n`;
    for (const [term, collection] of Object.entries(collectionMappings)) {
      prompt += `- "${term}" → ${collection}\n`;
    }
  }

  prompt += `
## Important Notes

- Always respond in English (reasoning in English)
- Be conservative: when in doubt, select fewer collections
- Maximum 5 collections to keep context manageable
- If question is unclear, select most likely collections with confidence: LOW
`;

  return prompt;
}

const SYSTEM_PROMPT = buildSelectorSystemPrompt();

// ============================================
// Collection Selector Function
// ============================================

export interface CollectionSelectorOptions {
  /**
   * Maximum number of collections to select (default: 5)
   */
  maxCollections?: number;

  /**
   * Temperature for generation (default: 0.3 for focused selection)
   */
  temperature?: number;

  /**
   * Timeout in milliseconds (default: 5000ms)
   */
  timeout?: number;
}

/**
 * Select relevant collections based on user question
 *
 * @param userQuestion - Natural language question from user
 * @param options - Configuration options
 * @returns Selected collections with reasoning and confidence
 *
 * @throws Error if generation fails or times out
 */
export async function selectCollections(
  userQuestion: string,
  options: CollectionSelectorOptions = {}
): Promise<CollectionSelection> {
  const {
    maxCollections = 5,
    temperature = 0, // Changed to 0 for deterministic enum selection
    timeout = 2000, // Reduced from 5000ms to 2000ms (Security Fix #2)
  } = options;

  // Security Fix #1: Input validation
  if (!userQuestion || typeof userQuestion !== 'string') {
    throw new Error('Invalid user question: must be a non-empty string');
  }

  if (userQuestion.length > 2000) {
    throw new Error('User question too long (max 2000 characters)');
  }

  // Sanitize for AI injection (allow Spanish characters)
  const sanitizedQuestion = userQuestion
    .replace(/[^\w\s\-.,áéíóúñ¿?¡!]/gi, '')
    .trim()
    .slice(0, 2000);

  logger.debug('[COLLECTION SELECTOR] Starting Stage 1: Collection Selection', {
    query: sanitizedQuestion,
    questionPreview: sanitizedQuestion.substring(0, 100),
    maxCollections,
    originalLength: userQuestion.length,
    sanitizedLength: sanitizedQuestion.length,
  });

  const startTime = Date.now();

  try {
    // Format catalog for prompt
    const catalogSummaries = formatCatalogSummariesForPrompt();
    const systemPrompt = SYSTEM_PROMPT.replace('{catalog}', catalogSummaries);

    // Generate selection with timeout (using sanitized question)
    const result = await Promise.race([
      generateStructuredOutput({
        schema: CollectionSelectionSchema,
        model: AI_CONFIG.classificationModel, // Use centralized config
        system: systemPrompt,
        prompt: `User question: "${sanitizedQuestion}"\n\nSelect the relevant collections (maximum ${maxCollections}).`,
        temperature, // Now 0 for deterministic output
        context: { feature: 'collection-selection' },
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Collection selection timed out')), timeout)
      ),
    ]);

    const selectionTime = Date.now() - startTime;

    // Validate selected collections exist
    const validCollections = result.object.collections.filter((name) =>
      CATALOG_SUMMARIES.some((c) => c.name === name)
    );

    if (validCollections.length === 0) {
      throw new Error('No valid collections selected');
    }

    logger.debug('[COLLECTION SELECTOR] Stage 1 completed', {
      selectedCollections: validCollections,
      selectedCount: validCollections.length,
      confidence: result.object.confidence,
      selectionTimeMs: selectionTime,
      reasoning: result.object.reasoning,
      reasoningPreview: result.object.reasoning.slice(0, 100) + '...',
    });

    return {
      collections: validCollections.slice(0, maxCollections),
      reasoning: result.object.reasoning,
      confidence: result.object.confidence,
    };
  } catch (error) {
    const selectionTime = Date.now() - startTime;

    logger.error('❌ [COLLECTION SELECTOR] Stage 1 failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      errorDetails: error instanceof Error ? error.stack : undefined,
      selectionTimeMs: selectionTime,
    });

    // Fallback: Use simple keyword matching
    logger.debug('[COLLECTION SELECTOR] Falling back to keyword matching');
    return fallbackCollectionSelection(userQuestion);
  }
}

// ============================================
// Fallback Collection Selection
// ============================================

/**
 * Fallback collection selector using keyword matching
 * Used when AI generation fails
 */
function fallbackCollectionSelection(userQuestion: string): CollectionSelection {
  const question = userQuestion.toLowerCase();
  const selected = new Set<string>();

  // Use term mappings from generated catalog
  const collectionMappings = TERM_MAPPINGS?.collections || {};
  for (const [term, collection] of Object.entries(collectionMappings)) {
    if (question.includes(term.toLowerCase())) {
      selected.add(collection);
    }
  }

  // Also match collection names directly against the question
  for (const summary of CATALOG_SUMMARIES) {
    const nameWords = summary.name.toLowerCase().split('_');
    if (nameWords.some((word) => word.length > 3 && question.includes(word))) {
      selected.add(summary.name);
    }
  }

  // If no matches, pick the first 2 collections as a safe default
  if (selected.size === 0) {
    const defaults = CATALOG_SUMMARIES.slice(0, 2).map((s) => s.name);
    defaults.forEach((d) => selected.add(d));
  }

  const finalSelection = [...selected].slice(0, 5);

  logger.debug('[COLLECTION SELECTOR] Fallback selection completed', {
    selectedCollections: finalSelection,
    selectedCount: finalSelection.length,
  });

  return {
    collections: finalSelection,
    reasoning: 'Fallback: Selected based on keyword matching due to AI generation failure',
    confidence: 'low',
  };
}

// ============================================
// Validation Helper
// ============================================

/**
 * Validate that all selected collections exist in catalog
 */
export function validateCollectionSelection(collections: string[]): boolean {
  return collections.every((name) =>
    CATALOG_SUMMARIES.some((c) => c.name === name)
  );
}
