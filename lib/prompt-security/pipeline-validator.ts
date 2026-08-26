import { ALLOWED_COLLECTIONS, SENSITIVE_FIELD_PATTERNS } from './patterns';
import { QUERYABLE_COLLECTIONS } from '@/lib/ai/generated/schema-catalog';
import { logger } from '../utils/logger';

// ==============================================
// TYPES
// ==============================================

export interface PipelineValidationResult {
  isValid: boolean;
  violations: PipelineViolation[];
  securityScore: number; // 0-100 (100 = most secure)
  modifiedPipeline?: Record<string, unknown>[];
  processingTimeMs: number;
}

export interface PipelineViolation {
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  stage?: number;
  operator?: string;
  recommendation?: string;
}

export interface ValidationConfig {
  maxResultLimit: number;
  allowedCollections: readonly string[];
  forbiddenStages: string[];
  forbiddenOperatorsInExpr: string[];
  maxPipelineDepth: number;
  maxLookups: number;
  enforceLimit: boolean;
  userRole?: string;
}

// ==============================================
// DEFAULT CONFIGURATION
// ==============================================

const DEFAULT_CONFIG: ValidationConfig = {
  maxResultLimit: 100,
  allowedCollections: ALLOWED_COLLECTIONS,
  forbiddenStages: ['$out', '$merge', '$delete', '$update', '$remove'],
  forbiddenOperatorsInExpr: ['$where', '$function', '$accumulator'],
  maxPipelineDepth: 15,
  maxLookups: 3,
  enforceLimit: true,
  userRole: 'user',
};

// ==============================================
// ROLE-BASED COLLECTION ACCESS
// ==============================================

// Trusted roles get access to all queryable collections
// Regular users get limited access
const COLLECTION_ACCESS_BY_ROLE: Record<string, readonly string[]> = {
  user: ['transactions', 'orders', 'crypto_prices'],
  operator: QUERYABLE_COLLECTIONS, // Full access to all collections
  supervisor: QUERYABLE_COLLECTIONS, // Full access to all collections
  admin: QUERYABLE_COLLECTIONS, // Full access to all collections  
  superadmin: QUERYABLE_COLLECTIONS, // Full access to all collections
};

// ==============================================
// MAIN VALIDATION FUNCTION
// ==============================================

export function validatePipeline(
  pipeline: Record<string, unknown>[],
  collection: string,
  config: Partial<ValidationConfig> = {}
): PipelineValidationResult {
  const startTime = Date.now();
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const violations: PipelineViolation[] = [];
  let securityScore = 100;

  // ==============================================
  // VALIDATION 1: Collection Whitelist
  // ==============================================

  const trustedRoles = ['admin', 'supervisor', 'operator'];
  const isTrustedRole = cfg.userRole && trustedRoles.includes(cfg.userRole);

  // Trusted roles: No collection restrictions (only query impact matters)
  // Regular users: Still enforce collection access rules
  const allowedForRole = isTrustedRole
    ? cfg.allowedCollections // Allow all collections
    : (cfg.userRole ? COLLECTION_ACCESS_BY_ROLE[cfg.userRole] : cfg.allowedCollections);

  if (!isTrustedRole && !allowedForRole.includes(collection)) {
    violations.push({
      type: 'unauthorized_collection',
      severity: 'critical',
      description: `Collection "${collection}" is not authorized for role "${cfg.userRole}"`,
      recommendation: `Use one of: ${allowedForRole.join(', ')}`,
    });
    securityScore -= 50;
  }

  // ==============================================
  // VALIDATION 2: Pipeline Structure
  // ==============================================

  if (!Array.isArray(pipeline)) {
    violations.push({
      type: 'invalid_pipeline_structure',
      severity: 'critical',
      description: 'Pipeline must be an array',
    });
    return {
      isValid: false,
      violations,
      securityScore: 0,
      processingTimeMs: Date.now() - startTime,
    };
  }

  if (pipeline.length === 0) {
    violations.push({
      type: 'empty_pipeline',
      severity: 'high',
      description: 'Pipeline cannot be empty',
    });
    securityScore -= 30;
  }

  if (pipeline.length > cfg.maxPipelineDepth) {
    violations.push({
      type: 'pipeline_too_deep',
      severity: 'medium',
      description: `Pipeline has ${pipeline.length} stages, maximum is ${cfg.maxPipelineDepth}`,
      recommendation: 'Simplify the query',
    });
    securityScore -= 15;
  }

  // ==============================================
  // VALIDATION 3: Forbidden Stages
  // ==============================================

  for (let i = 0; i < pipeline.length; i++) {
    const stage = pipeline[i];
    const stageKeys = Object.keys(stage);

    for (const key of stageKeys) {
      if (cfg.forbiddenStages.includes(key)) {
        violations.push({
          type: 'forbidden_stage',
          severity: 'critical',
          description: `Stage "${key}" is not allowed`,
          stage: i,
          operator: key,
          recommendation: 'This operation is blocked for security reasons',
        });
        securityScore -= 40;
      }
    }
  }

  // ==============================================
  // VALIDATION 4: $limit Enforcement
  // ==============================================

  if (cfg.enforceLimit) {
    const limitStage = pipeline.find((stage): stage is { $limit: number } => '$limit' in stage);

    if (!limitStage) {
      violations.push({
        type: 'missing_limit',
        severity: 'high',
        description: 'Pipeline must include a $limit stage',
        recommendation: `Add { "$limit": ${cfg.maxResultLimit} } to the pipeline`,
      });
      securityScore -= 25;
    } else if (typeof limitStage.$limit !== 'number' || limitStage.$limit > cfg.maxResultLimit) {
      violations.push({
        type: 'excessive_limit',
        severity: 'high',
        description: `$limit of ${limitStage.$limit} exceeds maximum of ${cfg.maxResultLimit}`,
        recommendation: `Set $limit to ${cfg.maxResultLimit} or less`,
      });
      securityScore -= 20;
    }
  }

  // ==============================================
  // VALIDATION 5: $lookup Security
  // ==============================================

  const lookupStages = pipeline.filter((stage) => '$lookup' in stage);

  if (lookupStages.length > cfg.maxLookups) {
    violations.push({
      type: 'too_many_lookups',
      severity: 'medium',
      description: `Pipeline has ${lookupStages.length} $lookup stages, maximum is ${cfg.maxLookups}`,
      recommendation: 'Reduce the number of joins',
    });
    securityScore -= 10;
  }

  // Only check lookup restrictions for non-trusted users
  if (!isTrustedRole) {
    for (let i = 0; i < lookupStages.length; i++) {
      const lookupStage = lookupStages[i] as { $lookup: { from?: string } };
      const lookupTarget = lookupStage.$lookup?.from;

      if (lookupTarget && !allowedForRole.includes(lookupTarget)) {
        violations.push({
          type: 'unauthorized_lookup',
          severity: 'critical',
          description: `$lookup to collection "${lookupTarget}" is not authorized`,
          operator: '$lookup',
          recommendation: `Only lookup to: ${allowedForRole.join(', ')}`,
        });
        securityScore -= 40;
      }
    }
  }

  // ==============================================
  // VALIDATION 6: Dangerous Operators in $expr
  // ==============================================

  const exprContent = JSON.stringify(pipeline);

  for (const forbiddenOp of cfg.forbiddenOperatorsInExpr) {
    if (exprContent.includes(`"${forbiddenOp}"`)) {
      violations.push({
        type: 'forbidden_operator',
        severity: 'critical',
        description: `Operator "${forbiddenOp}" is not allowed`,
        operator: forbiddenOp,
        recommendation: 'This operator can execute arbitrary code and is blocked',
      });
      securityScore -= 40;
    }
  }

  // ==============================================
  // VALIDATION 7: $elemMatch Misuse Detection
  // ==============================================

  // $elemMatch can ONLY be used in $match stage, not in $project, $addFields, etc.
  // This includes nested $match stages inside $lookup pipelines (which are valid)

  /**
   * Recursively check for invalid $elemMatch usage in an object
   * @param obj - Object to check
   * @param parentKey - Key of parent object to track context
   * @param isInMatchStage - Whether we're currently inside a $match stage
   * @returns Array of found invalid usages
   */
  function findInvalidElemMatch(
    obj: any,
    parentKey: string = '',
    isInMatchStage: boolean = false
  ): string[] {
    const invalidUsages: string[] = [];

    if (typeof obj !== 'object' || obj === null) {
      return invalidUsages;
    }

    for (const [key, value] of Object.entries(obj)) {
      // Check if we're entering a $match stage
      const nowInMatchStage = key === '$match';

      // Check if we're entering a $lookup pipeline (which may contain valid $match stages)
      const isLookupPipeline = parentKey === 'pipeline' || key === 'pipeline';

      // If we find $elemMatch and we're NOT in a $match stage, it's invalid
      if (key === '$elemMatch' && !isInMatchStage) {
        invalidUsages.push(parentKey || 'unknown');
      }

      // Recursively check nested objects/arrays
      if (typeof value === 'object' && value !== null) {
        if (Array.isArray(value)) {
          // For arrays, check each element
          for (const item of value) {
            invalidUsages.push(
              ...findInvalidElemMatch(item, key, nowInMatchStage || isInMatchStage)
            );
          }
        } else {
          // For objects, continue recursive check
          invalidUsages.push(
            ...findInvalidElemMatch(value, key, nowInMatchStage || isInMatchStage)
          );
        }
      }
    }

    return invalidUsages;
  }

  // Check each pipeline stage for invalid $elemMatch usage
  for (let i = 0; i < pipeline.length; i++) {
    const stage = pipeline[i];
    const stageKeys = Object.keys(stage);
    const stageName = stageKeys[0];

    // Find invalid $elemMatch usages in this stage
    const invalidUsages = findInvalidElemMatch(stage);

    if (invalidUsages.length > 0) {
      violations.push({
        type: 'invalid_operator_context',
        severity: 'critical',
        description: `$elemMatch operator can ONLY be used in $match stage, but found in ${stageName} stage (context: ${invalidUsages[0]})`,
        stage: i,
        operator: '$elemMatch',
        recommendation: 'Use $filter operator in $project/$addFields to extract array elements. Example: { "$filter": { "input": "$array", "as": "item", "cond": { "$eq": ["$$item.field", "value"] } } }',
      });
      securityScore -= 50;
    }
  }

  // ==============================================
  // VALIDATION 8: Sensitive Field Access
  // ==============================================

  const projectStages = pipeline.filter((stage) => '$project' in stage);

  for (const projectStage of projectStages) {
    const projection = (projectStage as { $project: Record<string, unknown> }).$project;
    const projectedFields = Object.keys(projection);

    for (const field of projectedFields) {
      const fieldLower = field.toLowerCase();

      for (const pattern of SENSITIVE_FIELD_PATTERNS) {
        if (pattern.test(fieldLower)) {
          violations.push({
            type: 'sensitive_field_access',
            severity: 'high',
            description: `Field "${field}" appears to be sensitive data`,
            recommendation: 'Sensitive fields should not be projected',
          });
          securityScore -= 15;
          break;
        }
      }
    }
  }

  // ==============================================
  // VALIDATION 9: $match Position (Performance + Security)
  // ==============================================

  const firstMatchIndex = pipeline.findIndex((stage) => '$match' in stage);
  const firstLookupIndex = pipeline.findIndex((stage) => '$lookup' in stage);

  if (firstLookupIndex !== -1 && (firstMatchIndex === -1 || firstMatchIndex > firstLookupIndex)) {
    violations.push({
      type: 'match_after_lookup',
      severity: 'low',
      description: 'No $match before $lookup - this may expose more data than intended',
      recommendation: 'Add a $match stage before $lookup to filter data early',
    });
    securityScore -= 5;
  }

  // ==============================================
  // FINAL SCORE AND RESULT
  // ==============================================

  securityScore = Math.max(0, securityScore);

  const hasCritical = violations.some(v => v.severity === 'critical');
  const hasHigh = violations.some(v => v.severity === 'high');

  const isValid = !hasCritical && !hasHigh && securityScore >= 50;

  // Log validation results
  if (violations.length > 0) {
    logger.warn('[PIPELINE_VALIDATOR]', {
      isValid,
      securityScore,
      violationCount: violations.length,
      criticalCount: violations.filter(v => v.severity === 'critical').length,
      collection,
    });
  }

  return {
    isValid,
    violations,
    securityScore,
    processingTimeMs: Date.now() - startTime,
  };
}

// ==============================================
// PIPELINE MODIFICATION (auto-fix)
// ==============================================

export function enforceLimitOnPipeline(
  pipeline: Record<string, unknown>[],
  maxLimit: number = 100
): Record<string, unknown>[] {
  const modifiedPipeline = [...pipeline];

  // Find existing limit
  const limitIndex = modifiedPipeline.findIndex((stage) => '$limit' in stage);

  if (limitIndex === -1) {
    // Add limit at the end
    modifiedPipeline.push({ $limit: maxLimit });
  } else {
    // Enforce max limit
    const currentLimit = (modifiedPipeline[limitIndex] as { $limit: number }).$limit;
    if (currentLimit > maxLimit) {
      modifiedPipeline[limitIndex] = { $limit: maxLimit };
    }
  }

  return modifiedPipeline;
}

// ==============================================
// HELPER FUNCTIONS
// ==============================================

/**
 * Get allowed collections for a specific role
 */
export function getAllowedCollectionsForRole(role: string): readonly string[] {
  return COLLECTION_ACCESS_BY_ROLE[role] || COLLECTION_ACCESS_BY_ROLE.user;
}

/**
 * Check if a specific collection is allowed for a role
 */
export function isCollectionAllowedForRole(collection: string, role: string): boolean {
  const allowed = getAllowedCollectionsForRole(role);
  return allowed.includes(collection);
}

/**
 * Get a summary of validation violations
 */
export function getValidationSummary(result: PipelineValidationResult): string {
  if (result.isValid) {
    return `✅ Valid pipeline (Security Score: ${result.securityScore}/100)`;
  }

  const critical = result.violations.filter(v => v.severity === 'critical').length;
  const high = result.violations.filter(v => v.severity === 'high').length;

  return `❌ Invalid pipeline: ${critical} critical, ${high} high severity issues (Security Score: ${result.securityScore}/100)`;
}

