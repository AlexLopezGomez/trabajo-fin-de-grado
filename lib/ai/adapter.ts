/**
 * AI Adapter - Provider Abstraction Layer
 * 
 * Abstracts the AI SDK implementation allowing:
 * - Easy provider swapping (OpenAI, Anthropic, etc.)
 * - Configuration via environment variables
 * - Centralized error handling
 * - Mocking for tests
 * 
 * @module ai/adapter
 */

import { generateObject as aiGenerateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import type { ZodSchema } from 'zod';
import { logger } from '@/lib/utils/logger';

// ============================================
// Configuration
// ============================================

/**
 * AI provider configuration loaded from environment.
 * Centralized so changes apply everywhere.
 */
export const AI_CONFIG = {
    /** Default model for queries */
    defaultModel: process.env.AI_MODEL || 'gpt-4o-mini',

    /** Model for security classification (can be cheaper) */
    classificationModel: process.env.AI_CLASSIFICATION_MODEL || 'gpt-4o-mini',

    /** Default temperature (low for deterministic output) */
    defaultTemperature: parseFloat(process.env.AI_TEMPERATURE || '0.1'),

    /** Max retries on failure */
    maxRetries: parseInt(process.env.AI_MAX_RETRIES || '2'),

    /** Request timeout in ms */
    timeout: parseInt(process.env.AI_TIMEOUT || '30000'),

    /** Enable/disable AI features globally */
    enabled: process.env.AI_ENABLED !== 'false',
} as const;

// ============================================
// Types
// ============================================

export interface GenerateOptions<T> {
    /** The Zod schema for structured output */
    schema: ZodSchema<T>;

    /** System prompt with instructions */
    system: string;

    /** User prompt/query */
    prompt: string;

    /** Model to use (defaults to AI_CONFIG.defaultModel) */
    model?: string;

    /** Temperature (defaults to AI_CONFIG.defaultTemperature) */
    temperature?: number;

    /** Optional context for logging */
    context?: {
        feature: string;
        userId?: string;
    };
}

export interface GenerateResult<T> {
    /** The generated object */
    object: T;

    /** Time taken in ms */
    processingTimeMs: number;

    /** Model used */
    model: string;
}

// ============================================
// Provider Registry (for future extensibility)
// ============================================

type ProviderFactory = (modelId: string) => ReturnType<typeof openai>;

const providers: Record<string, ProviderFactory> = {
    openai: (modelId: string) => openai(modelId),
    // Add more providers here as needed:
    // anthropic: (modelId: string) => anthropic(modelId),
    // google: (modelId: string) => google(modelId),
};

function getProvider(modelId: string): ReturnType<typeof openai> {
    // For now, always use OpenAI
    // Future: parse model name to determine provider (e.g., "claude-3" -> anthropic)
    return providers.openai(modelId);
}

// ============================================
// Main API
// ============================================

/**
 * Generate a structured object using AI.
 * 
 * This is the main entry point for all AI operations.
 * Provides consistent logging, error handling, and provider abstraction.
 * 
 * @example
 * ```ts
 * const result = await generateStructuredOutput({
 *   schema: MySchema,
 *   system: "You are a helpful assistant...",
 *   prompt: "Generate a response for...",
 *   context: { feature: 'query-generation', userId: 'user123' }
 * });
 * ```
 */
export async function generateStructuredOutput<T>(
    options: GenerateOptions<T>
): Promise<GenerateResult<T>> {
    const {
        schema,
        system,
        prompt,
        model = AI_CONFIG.defaultModel,
        temperature = AI_CONFIG.defaultTemperature,
        context,
    } = options;

    // Check if AI is disabled
    if (!AI_CONFIG.enabled) {
        throw new Error('AI features are disabled. Set AI_ENABLED=true to enable.');
    }

    const startTime = Date.now();

    try {
        const provider = getProvider(model);

        const { object } = await aiGenerateObject({
            model: provider,
            schema,
            system,
            prompt,
            temperature,
        });

        const processingTimeMs = Date.now() - startTime;

        // Log successful generation
        logger.info('[AI_ADAPTER] Generation successful', {
            model,
            processingTimeMs,
            feature: context?.feature,
            userId: context?.userId,
        });

        return {
            object,
            processingTimeMs,
            model,
        };
    } catch (error) {
        const processingTimeMs = Date.now() - startTime;

        // Enhanced error logging for AI_NoObjectGeneratedError
        if (error instanceof Error && error.name === 'AI_NoObjectGeneratedError') {
            const aiError = error as any;

            // Log the value that failed validation
            if (aiError.value) {
                logger.error('[AI_ADAPTER] Schema validation failed - LLM output:', aiError.value, {
                    parsedValue: JSON.stringify(aiError.value, null, 2),
                });

                // Try to manually validate to get detailed errors
                if (schema && 'safeParse' in schema) {
                    const parseResult = (schema as any).safeParse(aiError.value);
                    if (!parseResult.success) {
                        logger.error('[AI_ADAPTER] Zod validation errors:', parseResult.error.issues, {
                            issues: parseResult.error.issues.map((issue: any) => ({
                                path: issue.path.join('.'),
                                code: issue.code,
                                message: issue.message,
                                received: issue.received,
                                expected: issue.expected?.slice?.(0, 5),
                            })),
                        });
                    }
                }
            }

            // Log raw text if available
            if (aiError.text) {
                logger.error('[AI_ADAPTER] Raw LLM response text:', { text: aiError.text.substring(0, 500) });
            }
        }

        logger.error('[AI_ADAPTER] Generation failed', error, {
            model,
            processingTimeMs,
            feature: context?.feature,
            userId: context?.userId,
        });

        throw error;
    }
}

// ============================================
// Specialized Methods (Convenience)
// ============================================

/**
 * Generate output for security classification (uses cheaper model by default).
 */
export async function generateSecurityClassification<T>(
    options: Omit<GenerateOptions<T>, 'model'>
): Promise<GenerateResult<T>> {
    return generateStructuredOutput({
        ...options,
        model: AI_CONFIG.classificationModel,
        temperature: 0, // Always deterministic for security
        context: {
            ...options.context,
            feature: options.context?.feature || 'security-classification',
        },
    });
}

/**
 * Check if AI features are available and enabled.
 */
export function isAIEnabled(): boolean {
    return AI_CONFIG.enabled;
}

/**
 * Get current AI configuration (for debugging/admin panels).
 */
export function getAIConfig() {
    return {
        ...AI_CONFIG,
        // Never expose API keys
    };
}
