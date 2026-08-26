/**
 * Prompt Security Module
 * 5-Layer Defense Against Prompt Injection Attacks
 * 
 * Layer 1: Input Sanitization (sanitizer.ts)
 * Layer 2: Intent Classification (intent-classifier.ts)
 * Layer 3: Pipeline Validation (pipeline-validator.ts)
 * Layer 4: Prompt Encapsulation (prompt-builder.ts)
 * Layer 5: Anomaly Detection (anomaly-detector.ts)
 */

// ==============================================
// EXPORTS
// ==============================================

// Layer 1: Input Sanitization
export {
  sanitizeUserInput,
  quickMaliciousCheck,
  getViolationSummary,
  hasOnlyAllowedCharacters,
  type SanitizationResult,
  type SanitizationViolation,
  type SanitizerConfig,
} from './sanitizer';

// Layer 2: Intent Classification
export {
  classifyIntent,
  classifyIntentBatch,
  shouldBlockBasedOnIntent,
  needsAdditionalScrutiny,
  getClassificationSummary,
  getEstimatedCostPerClassification,
  type IntentClassification,
  type ClassificationOptions,
} from './intent-classifier';

// Layer 3: Pipeline Validation
export {
  validatePipeline,
  enforceLimitOnPipeline,
  getAllowedCollectionsForRole,
  isCollectionAllowedForRole,
  getValidationSummary,
  type PipelineValidationResult,
  type PipelineViolation,
  type ValidationConfig,
} from './pipeline-validator';

// Layer 4: Prompt Encapsulation
export {
  buildSecurePrompt,
  getHardenedSystemPrompt,
  sanitizeConversationHistory,
  detectInjectionInOutput,
  PROMPT_TEMPLATES,
  type PromptBuilderOptions,
} from './prompt-builder';

// Layer 5: Anomaly Detection
export {
  detectAnomalies,
  inferCollectionsFromQuery,
  getAnomalySummary,
  extractProjectedFields,
  calculateOverallSafetyScore,
  type AnomalyDetectionResult,
  type Anomaly,
  type GeneratedResponse,
} from './anomaly-detector';

// Pattern Database
export {
  ALLOWED_COLLECTIONS,
  SENSITIVE_FIELD_PATTERNS,
  findPatternMatches,
  hasSuspiciousCharacters,
  removeSuspiciousCharacters,
  ALL_INJECTION_PATTERNS,
  CRITICAL_PATTERNS,
  WARNING_PATTERNS,
  type AllowedCollection,
  type PatternMatch,
} from './patterns';

// ==============================================
// UNIFIED SECURITY PIPELINE
// ==============================================

import { sanitizeUserInput, type SanitizationResult } from './sanitizer';
import { classifyIntent, type IntentClassification } from './intent-classifier';
import { validatePipeline, type PipelineValidationResult } from './pipeline-validator';
import { detectAnomalies, type AnomalyDetectionResult, calculateOverallSafetyScore } from './anomaly-detector';

export interface SecurityCheckResult {
  passed: boolean;
  overallSafetyScore: number;
  shouldBlock: boolean;
  blockReason?: string;
  
  // Layer results
  sanitization: SanitizationResult;
  intentClassification: IntentClassification;
  pipelineValidation?: PipelineValidationResult;
  anomalyDetection?: AnomalyDetectionResult;
  
  // Timing
  totalProcessingTimeMs: number;
}

export interface SecurityCheckOptions {
  userRole?: string;
  skipIntentClassification?: boolean;
  strictMode?: boolean;
}

/**
 * Run the full 5-layer security pipeline
 * Call this BEFORE generating the query (layers 1-2)
 * Then call validatePostGeneration AFTER (layers 3-5)
 */
export async function runPreGenerationSecurityCheck(
  userQuery: string,
  options: SecurityCheckOptions = {}
): Promise<SecurityCheckResult> {
  const startTime = Date.now();
  
  // ==============================================
  // LAYER 1: Input Sanitization
  // ==============================================
  
  const sanitization = sanitizeUserInput(userQuery);
  
  if (sanitization.shouldBlock) {
    return {
      passed: false,
      overallSafetyScore: 0,
      shouldBlock: true,
      blockReason: `Input blocked by sanitization: ${getViolationSummary(sanitization.violations)}`,
      sanitization,
      intentClassification: {
        intent: 'definite_injection',
        confidence: 1,
        reasoning: 'Blocked at sanitization layer',
        suggestedAction: 'block',
        riskFactors: sanitization.violations.map(v => v.type),
      },
      totalProcessingTimeMs: Date.now() - startTime,
    };
  }
  
  // ==============================================
  // LAYER 2: Intent Classification
  // ==============================================
  
  let intentClassification: IntentClassification;
  
  if (options.skipIntentClassification) {
    intentClassification = {
      intent: 'legitimate_query',
      confidence: 0.5,
      reasoning: 'Intent classification skipped',
      suggestedAction: 'allow',
      riskFactors: [],
    };
  } else {
    intentClassification = await classifyIntent(sanitization.sanitizedInput);
  }
  
  // Check if intent classification blocks
  if (intentClassification.intent === 'definite_injection' || 
      intentClassification.suggestedAction === 'block') {
    return {
      passed: false,
      overallSafetyScore: Math.round((1 - intentClassification.confidence) * 100),
      shouldBlock: true,
      blockReason: `Query blocked by intent classification: ${intentClassification.reasoning}`,
      sanitization,
      intentClassification,
      totalProcessingTimeMs: Date.now() - startTime,
    };
  }
  
  // Calculate preliminary safety score
  const preliminarySafetyScore = calculateOverallSafetyScore(
    sanitization.riskScore,
    intentClassification.confidence,
    100, // Assume pipeline will be valid
    100  // Assume no anomalies
  );
  
  return {
    passed: true,
    overallSafetyScore: preliminarySafetyScore,
    shouldBlock: false,
    sanitization,
    intentClassification,
    totalProcessingTimeMs: Date.now() - startTime,
  };
}

/**
 * Run post-generation security checks (layers 3-5)
 * Call this AFTER the LLM generates the query
 */
export function runPostGenerationSecurityCheck(
  userQuery: string,
  generatedResponse: {
    collection: string;
    pipeline: Record<string, unknown>[];
    explanation: string;
  },
  preCheckResult: SecurityCheckResult,
  options: SecurityCheckOptions = {}
): SecurityCheckResult {
  const startTime = Date.now();
  
  // ==============================================
  // LAYER 3: Pipeline Validation
  // ==============================================
  
  const pipelineValidation = validatePipeline(
    generatedResponse.pipeline,
    generatedResponse.collection,
    { userRole: options.userRole }
  );
  
  if (!pipelineValidation.isValid) {
    return {
      ...preCheckResult,
      passed: false,
      shouldBlock: true,
      blockReason: `Pipeline validation failed: ${pipelineValidation.violations.map(v => v.description).join('; ')}`,
      pipelineValidation,
      totalProcessingTimeMs: preCheckResult.totalProcessingTimeMs + (Date.now() - startTime),
    };
  }
  
  // ==============================================
  // LAYER 5: Anomaly Detection
  // ==============================================
  
  const anomalyDetection = detectAnomalies(userQuery, generatedResponse);
  
  if (anomalyDetection.shouldBlock) {
    return {
      ...preCheckResult,
      passed: false,
      shouldBlock: true,
      blockReason: `Anomaly detection blocked: ${anomalyDetection.anomalies.map(a => a.description).join('; ')}`,
      pipelineValidation,
      anomalyDetection,
      totalProcessingTimeMs: preCheckResult.totalProcessingTimeMs + (Date.now() - startTime),
    };
  }
  
  // ==============================================
  // CALCULATE FINAL SAFETY SCORE
  // ==============================================
  
  const finalSafetyScore = calculateOverallSafetyScore(
    preCheckResult.sanitization.riskScore,
    preCheckResult.intentClassification.confidence,
    pipelineValidation.securityScore,
    anomalyDetection.confidenceScore
  );
  
  const shouldBlock = finalSafetyScore < (options.strictMode ? 70 : 50);
  
  return {
    passed: !shouldBlock,
    overallSafetyScore: finalSafetyScore,
    shouldBlock,
    blockReason: shouldBlock ? `Overall safety score too low: ${finalSafetyScore}` : undefined,
    sanitization: preCheckResult.sanitization,
    intentClassification: preCheckResult.intentClassification,
    pipelineValidation,
    anomalyDetection,
    totalProcessingTimeMs: preCheckResult.totalProcessingTimeMs + (Date.now() - startTime),
  };
}

// Import for getViolationSummary
import { getViolationSummary } from './sanitizer';

