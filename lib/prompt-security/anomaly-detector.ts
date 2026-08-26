/**
 * Anomaly Detection Layer (Layer 5)
 * Detects anomalies in AI-generated responses that may indicate successful injection
 * Final validation before query execution
 */

import { ALLOWED_COLLECTIONS, SENSITIVE_FIELD_PATTERNS } from './patterns';
import { logger } from '@/lib/utils/logger';

// ==============================================
// TYPES
// ==============================================

export interface AnomalyDetectionResult {
  hasAnomalies: boolean;
  anomalies: Anomaly[];
  riskLevel: 'none' | 'low' | 'medium' | 'high' | 'critical';
  confidenceScore: number; // 0-100, how confident we are the response is safe
  shouldBlock: boolean;
  processingTimeMs: number;
}

export interface Anomaly {
  type: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  description: string;
  details?: Record<string, unknown>;
}

export interface GeneratedResponse {
  collection: string;
  pipeline: Record<string, unknown>[];
  explanation: string;
  suggestedVisualization?: string;
}

// ==============================================
// COLLECTION INFERENCE
// ==============================================

// Keywords that suggest which collection should be queried
const COLLECTION_KEYWORDS: Record<string, string[]> = {
  users: [
    'usuario', 'usuarios', 'user', 'users', 'cliente', 'clientes',
    'cuenta', 'cuentas', 'account', 'accounts', 'perfil', 'profile',
    'email', 'correo', 'kyc', 'registro', 'registered',
  ],
  wallets: [
    'wallet', 'wallets', 'cartera', 'carteras', 'saldo', 'balance',
    'portfolio', 'portafolio', 'holding', 'holdings', 'valor total',
  ],
  transactions: [
    'transacción', 'transacciones', 'transaction', 'transactions',
    'compra', 'compras', 'venta', 'ventas', 'buy', 'sell',
    'depósito', 'deposit', 'retiro', 'withdrawal', 'transfer',
    'operación', 'operaciones', 'operation', 'operations',
  ],
  orders: [
    'orden', 'órdenes', 'order', 'orders', 'trade', 'trades',
    'limit order', 'market order', 'open order', 'filled',
  ],
  crypto_prices: [
    'precio', 'precios', 'price', 'prices', 'cotización', 'cotizaciones',
    'valor', 'market', 'mercado', 'crypto', 'bitcoin', 'ethereum',
  ],
};

/**
 * Infer which collections the user query likely refers to
 */
export function inferCollectionsFromQuery(query: string): string[] {
  const queryLower = query.toLowerCase();
  const matchedCollections: string[] = [];

  for (const [collection, keywords] of Object.entries(COLLECTION_KEYWORDS)) {
    const hasMatch = keywords.some(keyword => queryLower.includes(keyword));
    if (hasMatch) {
      matchedCollections.push(collection);
    }
  }

  return matchedCollections;
}

// ==============================================
// MAIN ANOMALY DETECTION
// ==============================================

export function detectAnomalies(
  userQuery: string,
  response: GeneratedResponse
): AnomalyDetectionResult {
  const startTime = Date.now();
  const anomalies: Anomaly[] = [];
  let confidenceScore = 100;

  // ==============================================
  // ANOMALY 1: Collection Mismatch
  // ==============================================

  const expectedCollections = inferCollectionsFromQuery(userQuery);

  if (expectedCollections.length > 0 && !expectedCollections.includes(response.collection)) {
    anomalies.push({
      type: 'collection_mismatch',
      severity: 'warning',
      description: `Query mentions ${expectedCollections.join(', ')} but generated query targets ${response.collection}`,
      details: { expected: expectedCollections, actual: response.collection },
    });
    confidenceScore -= 20;
  }

  // ==============================================
  // ANOMALY 2: Unauthorized Collection
  // ==============================================

  if (!ALLOWED_COLLECTIONS.includes(response.collection as typeof ALLOWED_COLLECTIONS[number])) {
    anomalies.push({
      type: 'unauthorized_collection',
      severity: 'critical',
      description: `Response targets unauthorized collection: ${response.collection}`,
      details: { collection: response.collection, allowed: ALLOWED_COLLECTIONS },
    });
    confidenceScore -= 50;
  }

  // ==============================================
  // ANOMALY 3: Pipeline Complexity Anomaly
  // ==============================================

  if (response.pipeline.length > 10) {
    anomalies.push({
      type: 'excessive_complexity',
      severity: 'warning',
      description: `Pipeline has ${response.pipeline.length} stages, which is unusually complex`,
      details: { stageCount: response.pipeline.length },
    });
    confidenceScore -= 10;
  }

  // ==============================================
  // ANOMALY 4: Missing $limit Despite Broad Query
  // ==============================================

  const queryLower = userQuery.toLowerCase();
  const isBroadQuery = /todos?\s*(los|las)?|all\s|every\s|entire|completo/i.test(queryLower);
  const hasLimit = response.pipeline.some(stage => '$limit' in stage);

  if (isBroadQuery && !hasLimit) {
    anomalies.push({
      type: 'missing_limit_on_broad_query',
      severity: 'error',
      description: 'User asked for all/broad data but pipeline has no $limit',
      details: { query: userQuery.substring(0, 100) },
    });
    confidenceScore -= 30;
  }

  // Check $limit value
  const limitStage = response.pipeline.find(stage => '$limit' in stage);
  if (limitStage && (limitStage as { $limit: number }).$limit > 100) {
    anomalies.push({
      type: 'excessive_limit',
      severity: 'error',
      description: `$limit of ${(limitStage as { $limit: number }).$limit} exceeds maximum of 100`,
    });
    confidenceScore -= 25;
  }

  // ==============================================
  // ANOMALY 5: Sensitive Field Projection
  // ==============================================

  const pipelineStr = JSON.stringify(response.pipeline).toLowerCase();

  for (const pattern of SENSITIVE_FIELD_PATTERNS) {
    if (pattern.test(pipelineStr)) {
      anomalies.push({
        type: 'sensitive_field_projection',
        severity: 'error',
        description: 'Pipeline appears to project sensitive fields',
        details: { pattern: pattern.toString() },
      });
      confidenceScore -= 20;
      break; // Only report once
    }
  }

  // ==============================================
  // ANOMALY 6: Explanation Anomaly
  // ==============================================

  // Check if explanation mentions things not in the query
  const suspiciousExplanationPatterns = [
    /admin/i,
    /credential/i,
    /password/i,
    /secret/i,
    /system.*prompt/i,
    /internal/i,
    /all\s+data/i,
  ];

  for (const pattern of suspiciousExplanationPatterns) {
    if (pattern.test(response.explanation) && !pattern.test(userQuery)) {
      anomalies.push({
        type: 'suspicious_explanation',
        severity: 'warning',
        description: `Explanation mentions "${pattern.source}" which was not in the query`,
        details: { pattern: pattern.toString() },
      });
      confidenceScore -= 15;
    }
  }

  // ==============================================
  // ANOMALY 7: Write Operations Detection
  // ==============================================

  // Note: $set is intentionally excluded — in aggregation pipelines it is an alias for $addFields (read-only).
  // $set is only a write operator in update operations, not in aggregation stages.
  const writeOperators = ['$out', '$merge', '$delete', '$update'];
  for (const op of writeOperators) {
    if (pipelineStr.includes(op.toLowerCase())) {
      anomalies.push({
        type: 'write_operation_detected',
        severity: 'critical',
        description: `Write operation "${op}" detected in pipeline`,
        details: { operator: op },
      });
      confidenceScore -= 40;
    }
  }

  // ==============================================
  // ANOMALY 8: $lookup to Unauthorized Collections
  // ==============================================

  const lookupStages = response.pipeline.filter(stage => '$lookup' in stage);
  for (const stage of lookupStages) {
    const lookupTarget = (stage as { $lookup: { from?: string } }).$lookup?.from;
    if (lookupTarget && !ALLOWED_COLLECTIONS.includes(lookupTarget as typeof ALLOWED_COLLECTIONS[number])) {
      anomalies.push({
        type: 'unauthorized_lookup',
        severity: 'critical',
        description: `$lookup targets unauthorized collection: ${lookupTarget}`,
        details: { lookupTarget },
      });
      confidenceScore -= 40;
    }
  }

  // ==============================================
  // ANOMALY 9: Injection Success Indicators
  // ==============================================

  const injectionSuccessPatterns = [
    /system\s*prompt/i,
    /my\s*instructions/i,
    /i\s*(am|was)\s*(designed|programmed|told)/i,
    /openai/i,
    /gpt-?4/i,
    /as\s+an?\s+ai/i,
    /language\s+model/i,
  ];

  const explanationAndPipeline = response.explanation + JSON.stringify(response.pipeline);

  for (const pattern of injectionSuccessPatterns) {
    if (pattern.test(explanationAndPipeline)) {
      anomalies.push({
        type: 'injection_success_indicator',
        severity: 'critical',
        description: `Response contains injection success indicator: "${pattern.source}"`,
        details: { pattern: pattern.toString() },
      });
      confidenceScore -= 50;
    }
  }

  // ==============================================
  // DETERMINE RISK LEVEL AND BLOCKING
  // ==============================================

  confidenceScore = Math.max(0, Math.min(100, confidenceScore));

  const criticalCount = anomalies.filter(a => a.severity === 'critical').length;
  const errorCount = anomalies.filter(a => a.severity === 'error').length;

  let riskLevel: AnomalyDetectionResult['riskLevel'];
  let shouldBlock: boolean;

  if (criticalCount > 0) {
    riskLevel = 'critical';
    shouldBlock = true;
  } else if (errorCount >= 2) {
    riskLevel = 'high';
    shouldBlock = true;
  } else if (errorCount === 1 || confidenceScore < 50) {
    riskLevel = 'medium';
    shouldBlock = true;
  } else if (anomalies.length > 0) {
    riskLevel = 'low';
    shouldBlock = false;
  } else {
    riskLevel = 'none';
    shouldBlock = false;
  }

  // Log results
  if (anomalies.length > 0) {
    logger.warn('[ANOMALY_DETECTOR]', {
      hasAnomalies: true,
      riskLevel,
      shouldBlock,
      confidenceScore,
      anomalyCount: anomalies.length,
      criticalCount,
      errorCount,
    });
  }

  return {
    hasAnomalies: anomalies.length > 0,
    anomalies,
    riskLevel,
    confidenceScore,
    shouldBlock,
    processingTimeMs: Date.now() - startTime,
  };
}

// ==============================================
// HELPER FUNCTIONS
// ==============================================

/**
 * Get human-readable summary of anomaly detection
 */
export function getAnomalySummary(result: AnomalyDetectionResult): string {
  if (!result.hasAnomalies) {
    return '✅ No anomalies detected';
  }

  const emoji = {
    none: '✅',
    low: 'ℹ️',
    medium: '⚠️',
    high: '🔶',
    critical: '🚫',
  };

  return `${emoji[result.riskLevel]} ${result.riskLevel.toUpperCase()} risk: ${result.anomalies.length} anomaly(s) detected (confidence: ${result.confidenceScore}%)`;
}

/**
 * Extract projected fields from a pipeline
 */
export function extractProjectedFields(pipeline: Record<string, unknown>[]): string[] {
  const fields: string[] = [];

  for (const stage of pipeline) {
    if ('$project' in stage) {
      const projection = stage.$project as Record<string, unknown>;
      fields.push(...Object.keys(projection));
    }
    if ('$addFields' in stage) {
      const addFields = stage.$addFields as Record<string, unknown>;
      fields.push(...Object.keys(addFields));
    }
  }

  return [...new Set(fields)];
}

/**
 * Calculate overall safety score from all layers
 */
export function calculateOverallSafetyScore(
  sanitizationRiskScore: number,
  intentConfidence: number,
  pipelineSecurityScore: number,
  anomalyConfidenceScore: number
): number {
  // Weighted average
  const weights = {
    sanitization: 0.2,
    intent: 0.3,
    pipeline: 0.25,
    anomaly: 0.25,
  };

  // Convert risk scores to safety scores (100 - risk)
  const sanitizationSafety = 100 - sanitizationRiskScore;
  const intentSafety = intentConfidence * 100;

  const overallScore =
    (sanitizationSafety * weights.sanitization) +
    (intentSafety * weights.intent) +
    (pipelineSecurityScore * weights.pipeline) +
    (anomalyConfidenceScore * weights.anomaly);

  return Math.round(overallScore);
}

