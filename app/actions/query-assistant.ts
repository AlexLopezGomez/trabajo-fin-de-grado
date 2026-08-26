'use server';

import { executeAggregation } from '@/lib/db';
import { requireAuth } from '@/lib/auth/guards';
import { auth as authLogger, query as queryLogger, error as logError } from '@/lib/utils/logger';

// ============================================
// AI Module - Schema, Prompts, and Adapter
// ============================================
import {
  MongoPipelineSchema,
  buildBaseSystemPrompt,
  buildDynamicSystemPrompt,
  generateStructuredOutput,
  selectCollections,
  buildSchemaForCollections,
  formatSchemaForPrompt,
} from '@/lib/ai';

// ============================================
// SECURITY IMPORTS - 5-Layer Defense System
// ============================================
import {
  runPreGenerationSecurityCheck,
  runPostGenerationSecurityCheck,
  buildSecurePrompt,
  getHardenedSystemPrompt,
  enforceLimitOnPipeline,
} from '@/lib/prompt-security';

// Get the hardened system prompt with security layers
const SYSTEM_PROMPT = getHardenedSystemPrompt(buildBaseSystemPrompt());

// ============================================
// Main Function: Generate and Execute Query
// WITH 6-LAYER SECURITY (Added: Authentication)
// ============================================

export interface QueryResult {
  success: boolean;
  data: Record<string, unknown>[];
  pipeline: Record<string, unknown>[];
  collection: string;
  explanation: string;
  suggestedVisualization: string;
  executionTime: number;
  error?: string;
  requiresApproval?: boolean;
  securityCheck?: {
    passed: boolean;
    safetyScore: number;
    blockedAt?: string;
  };
}

/**
 * Generate and Execute MongoDB Query using AI
 * 
 * @param userQuestion - Natural language query in Spanish or English
 * @returns QueryResult with data, pipeline, and security metadata
 * 
 * @throws AuthError if user is not authenticated
 * 
 * Security layers:
 * 1. ✅ Authentication check (requireAuth)
 * 2. ✅ Input sanitization
 * 3. ✅ Intent classification
 * 4. ✅ Secure prompt construction
 * 5. ✅ Pipeline validation
 * 6. ✅ Anomaly detection
 * 7. ✅ Limit enforcement
 * 
 * Note: For rate limiting and RBAC, use executeSecureQuery from secure-query-assistant.ts
 */
export async function generateAndExecuteQuery(
  userQuestion: string
): Promise<QueryResult> {
  const startTime = Date.now();

  try {
    // ========================================
    // SECURITY LAYER 0: Authentication
    // ========================================
    const user = await requireAuth();

    authLogger('User authenticated for query generation', user.id, { role: user.role });

    // ========================================
    // SECURITY LAYERS 1 & 2: Pre-Generation Check
    // Layer 1: Input Sanitization
    // Layer 2: Intent Classification (skipped for trusted users)
    // ========================================
    queryLogger('Pre-generation security check start', { userId: user.id });

    // Skip intent classification for trusted users (admin/supervisor/operator)
    const isTrustedUser = ['admin', 'supervisor', 'operator'].includes(user.role);

    const preCheck = await runPreGenerationSecurityCheck(userQuestion, {
      userRole: user.role,  // Use authenticated user's role, not parameter
      skipIntentClassification: isTrustedUser, // Skip for trusted users
    });

    queryLogger('Security check configuration', {
      userId: user.id,
      role: user.role,
      isTrustedUser,
      intentClassificationSkipped: isTrustedUser,
    });

    if (!preCheck.passed) {
      queryLogger('Pre-generation check blocked', { reason: preCheck.blockReason, userId: user.id });

      // Log security event
      await logSecurityEvent('pre_generation_block', {
        question: userQuestion.substring(0, 200),
        reason: preCheck.blockReason,
        sanitizationScore: preCheck.sanitization.riskScore,
        intent: preCheck.intentClassification.intent,
      });

      return {
        success: false,
        data: [],
        pipeline: [],
        collection: '',
        explanation: '',
        suggestedVisualization: 'table',
        executionTime: Date.now() - startTime,
        error: 'La consulta ha sido bloqueada por razones de seguridad.',
        securityCheck: {
          passed: false,
          safetyScore: preCheck.overallSafetyScore,
          blockedAt: 'pre-generation',
        },
      };
    }

    queryLogger('Pre-generation check passed', {
      safetyScore: preCheck.overallSafetyScore,
      userId: user.id,
    });

    // ========================================
    // LAYER 4: Secure Prompt Construction
    // ========================================
    const securePrompt = buildSecurePrompt(preCheck.sanitization.sanitizedInput);

    // ========================================
    // PHASE 5: TWO-STAGE SCHEMA DISCOVERY
    // Stage 1: Collection Selection
    // Stage 2: Focused Schema Building
    // ========================================
    let systemPrompt = SYSTEM_PROMPT; // Default to hardcoded schema

    try {
      queryLogger('Phase 5: Starting two-stage schema discovery', { userId: user.id });

      // Stage 1: Select relevant collections (GPT-4o-mini, ~1,500 tokens, ~200-300ms)
      const collectionSelection = await selectCollections(
        preCheck.sanitization.sanitizedInput,
        { maxCollections: 5, temperature: 0.3, timeout: 5000 }
      );

      queryLogger('Phase 5: Collections selected', {
        collections: collectionSelection.collections,
        confidence: collectionSelection.confidence,
        userId: user.id,
      });

      // Stage 2: Build focused schema for selected collections (~4,000 tokens)
      const focusedSchema = await buildSchemaForCollections(
        collectionSelection.collections,
        { fetchFreshSamples: false, samplesPerCollection: 2 }
      );

      queryLogger('Phase 5: Focused schema built', {
        totalFields: focusedSchema.totalFields,
        estimatedTokens: focusedSchema.estimatedTokens,
        userId: user.id,
      });

      // Format schema for LLM prompt
      const dynamicSchema = formatSchemaForPrompt(focusedSchema);

      // Build dynamic system prompt with focused schema
      systemPrompt = getHardenedSystemPrompt(buildDynamicSystemPrompt(dynamicSchema));

      queryLogger('Phase 5: Dynamic schema ready', {
        tokenSavings: 50000 - focusedSchema.estimatedTokens, // Estimated savings
        userId: user.id,
      });
    } catch (error) {
      // Fallback to legacy full schema if Phase 5 fails
      queryLogger('Phase 5: Failed, falling back to legacy schema', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: user.id,
      });
      systemPrompt = SYSTEM_PROMPT; // Already set as default
    }

    // ========================================
    // AI GENERATION (with dynamic or legacy schema)
    // ========================================
    queryLogger('AI generating query', {
      userId: user.id,
      preview: preCheck.sanitization.sanitizedInput.substring(0, 100),
    });

    const { object: result } = await generateStructuredOutput({
      schema: MongoPipelineSchema,
      system: systemPrompt,
      prompt: securePrompt,
      context: { feature: 'query-generation', userId: user.id },
    });

    queryLogger('AI generated pipeline', { collection: result.collection, userId: user.id });

    // ========================================
    // SECURITY LAYERS 3 & 5: Post-Generation Check
    // Layer 3: Pipeline Validation
    // Layer 5: Anomaly Detection
    // ========================================
    queryLogger('Post-generation security check start', { userId: user.id });

    const postCheck = runPostGenerationSecurityCheck(
      userQuestion,
      {
        collection: result.collection,
        pipeline: result.pipeline,
        explanation: result.explanation,
      },
      preCheck,
      { userRole: user.role, strictMode: false }  // \u2705 FIXED: Use user.role from auth
    );

    if (!postCheck.passed) {
      queryLogger('Post-generation check blocked', { reason: postCheck.blockReason, userId: user.id });

      // Log security event
      await logSecurityEvent('post_generation_block', {
        question: userQuestion.substring(0, 200),
        reason: postCheck.blockReason,
        collection: result.collection,
        pipelineValidation: postCheck.pipelineValidation?.violations,
        anomalies: postCheck.anomalyDetection?.anomalies,
      });

      return {
        success: false,
        data: [],
        pipeline: [],
        collection: result.collection,
        explanation: '',
        suggestedVisualization: 'table',
        executionTime: Date.now() - startTime,
        error: 'La query generada no cumple con las políticas de seguridad.',
        securityCheck: {
          passed: false,
          safetyScore: postCheck.overallSafetyScore,
          blockedAt: 'post-generation',
        },
      };
    }

    queryLogger('Post-generation check passed', {
      safetyScore: postCheck.overallSafetyScore,
      userId: user.id,
    });

    // ========================================
    // ENFORCE $limit (Safety Net)
    // ========================================
    const safePipeline = enforceLimitOnPipeline(result.pipeline, 100);

    // ========================================
    // EXECUTE THE VALIDATED PIPELINE
    // ========================================
    queryLogger('Executing pipeline', { collection: result.collection, userId: user.id });
    const data = await executeAggregation(result.collection, safePipeline);

    const executionTime = Date.now() - startTime;

    queryLogger('Query completed', {
      executionTimeMs: executionTime,
      resultCount: data.length,
      collection: result.collection,
      userId: user.id,
    });

    return {
      success: true,
      data: data as Record<string, unknown>[],
      pipeline: safePipeline,
      collection: result.collection,
      explanation: result.explanation,
      suggestedVisualization: result.suggestedVisualization,
      executionTime,
      securityCheck: {
        passed: true,
        safetyScore: postCheck.overallSafetyScore,
      },
    };
  } catch (error) {
    logError('AI Query generation failed', error);

    const executionTime = Date.now() - startTime;

    return {
      success: false,
      data: [],
      pipeline: [],
      collection: '',
      explanation: '',
      suggestedVisualization: 'table',
      executionTime,
      error:
        error instanceof Error
          ? error.message
          : 'Error desconocido al procesar la consulta',
    };
  }
}

// ============================================
// Security Event Logging
// ============================================

async function logSecurityEvent(
  eventType: string,
  details: Record<string, unknown>
): Promise<void> {
  try {
    const { getAuthDatabase } = await import('@/lib/db');
    const { withNamespaceField } = await import('@/lib/db/namespace');
    const db = await getAuthDatabase();

    await db.collection('security_events').insertOne(withNamespaceField({
      eventType,
      details,
      timestamp: new Date(),
      severity: eventType.includes('block') ? 'high' : 'info',
    }));
  } catch (error) {
    // Don't fail the request if logging fails
    logError('[SECURITY_LOG] Failed to log event', error);
  }
}

// ============================================
// Mock Function for Testing Without DB
// ============================================

/**
 * Generate and Execute Query in Mock Mode (No AI/DB)
 * 
 * @param userQuestion - Natural language query
 * @returns QueryResult with mock data
 * 
 * @throws AuthError if user is not authenticated
 * 
 * Note: Even mock mode requires authentication
 */
export async function generateAndExecuteQueryMock(
  userQuestion: string
): Promise<QueryResult> {
  const startTime = Date.now();

  try {
    // ✅ ADD: Authentication check (even for mock mode)
    const user = await requireAuth();

    authLogger('User authenticated for mock query', user.id, { role: user.role });

    // Run security checks even in mock mode
    const preCheck = await runPreGenerationSecurityCheck(userQuestion, {
      userRole: user.role,  // Use authenticated user's role
    });

    if (!preCheck.passed) {
      return {
        success: false,
        data: [],
        pipeline: [],
        collection: '',
        explanation: '',
        suggestedVisualization: 'table',
        executionTime: Date.now() - startTime,
        error: 'La consulta ha sido bloqueada por razones de seguridad.',
        securityCheck: {
          passed: false,
          safetyScore: preCheck.overallSafetyScore,
          blockedAt: 'pre-generation',
        },
      };
    }

    // Generate the pipeline with security
    const securePrompt = buildSecurePrompt(preCheck.sanitization.sanitizedInput);

    const { object: result } = await generateStructuredOutput({
      schema: MongoPipelineSchema,
      system: SYSTEM_PROMPT,
      prompt: securePrompt,
      context: { feature: 'query-generation-mock', userId: user.id },
    });

    // Run post-generation checks
    const postCheck = runPostGenerationSecurityCheck(
      userQuestion,
      {
        collection: result.collection,
        pipeline: result.pipeline,
        explanation: result.explanation,
      },
      preCheck
    );

    if (!postCheck.passed) {
      return {
        success: false,
        data: [],
        pipeline: [],
        collection: result.collection,
        explanation: '',
        suggestedVisualization: 'table',
        executionTime: Date.now() - startTime,
        error: 'La query generada no cumple con las políticas de seguridad.',
        securityCheck: {
          passed: false,
          safetyScore: postCheck.overallSafetyScore,
          blockedAt: 'post-generation',
        },
      };
    }

    // Generate mock data based on the query type
    const mockData = generateMockData(userQuestion, result.collection);

    const executionTime = Date.now() - startTime;

    return {
      success: true,
      data: mockData,
      pipeline: enforceLimitOnPipeline(result.pipeline, 100),
      collection: result.collection,
      explanation: result.explanation,
      suggestedVisualization: result.suggestedVisualization,
      executionTime,
      securityCheck: {
        passed: true,
        safetyScore: postCheck.overallSafetyScore,
      },
    };
  } catch (error) {
    logError('Mock AI Query generation failed', error);

    return {
      success: false,
      data: [],
      pipeline: [],
      collection: '',
      explanation: '',
      suggestedVisualization: 'table',
      executionTime: Date.now() - startTime,
      error:
        error instanceof Error
          ? error.message
          : 'Error al procesar la consulta',
    };
  }
}

// Helper function to generate contextual mock data
function generateMockData(
  question: string,
  collection: string
): Record<string, unknown>[] {
  const q = question.toLowerCase();

  // User-related queries
  if (collection === 'users' || q.includes('usuario') || q.includes('cliente')) {
    if (q.includes('top') || q.includes('mayor') || q.includes('saldo')) {
      return [
        { username: 'crypto_whale', email: 'whale@email.com', country: 'ES', total_value_eur: 245000.50 },
        { username: 'btc_hodler', email: 'hodler@email.com', country: 'MX', total_value_eur: 189500.25 },
        { username: 'eth_maxi', email: 'eth@email.com', country: 'AR', total_value_eur: 156000.00 },
        { username: 'defi_pro', email: 'defi@email.com', country: 'ES', total_value_eur: 98750.75 },
        { username: 'trader_x', email: 'trader@email.com', country: 'CO', total_value_eur: 87200.00 },
      ];
    }
    if (q.includes('bitcoin') || q.includes('btc')) {
      return [
        { username: 'satoshi_fan', email: 'satoshi@email.com', country: 'ES', btc_balance: 2.5 },
        { username: 'btc_lover', email: 'btclover@email.com', country: 'MX', btc_balance: 1.8 },
        { username: 'hodl_king', email: 'hodl@email.com', country: 'AR', btc_balance: 1.2 },
      ];
    }
    return [
      { username: 'user_001', email: 'user1@email.com', country: 'ES', kyc_level: 'level_2' },
      { username: 'user_002', email: 'user2@email.com', country: 'MX', kyc_level: 'level_1' },
      { username: 'user_003', email: 'user3@email.com', country: 'AR', kyc_level: 'level_3' },
    ];
  }

  // Transaction-related queries
  if (collection === 'transactions' || q.includes('transaccion') || q.includes('operacion')) {
    if (q.includes('tipo') || q.includes('grupo') || q.includes('volumen')) {
      return [
        { _id: 'buy', total_amount: 1250000, count: 3420 },
        { _id: 'sell', total_amount: 980000, count: 2890 },
        { _id: 'deposit', total_amount: 560000, count: 1560 },
        { _id: 'withdrawal', total_amount: 340000, count: 890 },
      ];
    }
    return [
      { type: 'buy', amount: 5000, currency: 'EUR', status: 'completed', created_at: new Date() },
      { type: 'sell', amount: 0.5, currency: 'BTC', status: 'completed', created_at: new Date() },
    ];
  }

  // Order-related queries
  if (collection === 'orders' || q.includes('orden') || q.includes('trade')) {
    return [
      { pair: 'BTC/EUR', side: 'buy', status: 'filled', amount: 0.5, price: 45000 },
      { pair: 'ETH/EUR', side: 'sell', status: 'open', amount: 2.0, price: 2800 },
    ];
  }

  // Price-related queries
  if (collection === 'crypto_prices' || q.includes('precio') || q.includes('cotizacion')) {
    return [
      { symbol: 'BTC', price_eur: 45230.50, change_24h: 2.5 },
      { symbol: 'ETH', price_eur: 2850.25, change_24h: -1.2 },
      { symbol: 'SOL', price_eur: 98.50, change_24h: 5.8 },
    ];
  }

  // Default
  return [
    { message: 'Datos de ejemplo', count: 42 },
  ];
}
