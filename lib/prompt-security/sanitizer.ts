/**
 * Input Sanitization Layer (Layer 1)
 * First line of defense against prompt injection attacks
 */

import {
  findPatternMatches,
  hasSuspiciousCharacters,
  removeSuspiciousCharacters,
  PatternMatch,
} from './patterns';
import { logger } from '../utils/logger';

// ==============================================
// TYPES
// ==============================================

export interface SanitizationResult {
  isValid: boolean;
  sanitizedInput: string;
  originalInput: string;
  violations: SanitizationViolation[];
  riskScore: number; // 0-100
  shouldBlock: boolean;
  processingTimeMs: number;
}

export interface SanitizationViolation {
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  matchedText?: string;
  position?: number;
}

export interface SanitizerConfig {
  maxLength: number;
  minLength: number;
  blockOnCritical: boolean;
  riskThreshold: number; // Risk score above this triggers blocking
  allowedCharacterSets: RegExp[];
  logViolations: boolean;
}

// ==============================================
// DEFAULT CONFIGURATION
// ==============================================

const DEFAULT_CONFIG: SanitizerConfig = {
  maxLength: 500,
  minLength: 3,
  blockOnCritical: true,
  riskThreshold: 60,
  allowedCharacterSets: [
    /^[\p{L}\p{N}\p{P}\p{Z}\p{S}]+$/u, // Unicode letters, numbers, punctuation, spaces, symbols
  ],
  logViolations: true,
};

// ==============================================
// RISK SCORE WEIGHTS
// ==============================================

const SEVERITY_WEIGHTS = {
  critical: 40,
  high: 25,
  medium: 15,
  low: 5,
};

const ADDITIONAL_RISK_FACTORS = {
  multipleCriticalPatterns: 20,
  suspiciousCharacters: 15,
  excessiveLength: 10,
  multilineInput: 5,
};

// ==============================================
// MAIN SANITIZATION FUNCTION
// ==============================================

export function sanitizeUserInput(
  input: string,
  config: Partial<SanitizerConfig> = {}
): SanitizationResult {
  const startTime = Date.now();
  const cfg = { ...DEFAULT_CONFIG, ...config };

  const violations: SanitizationViolation[] = [];
  let riskScore = 0;
  let sanitizedInput = input;

  // ==============================================
  // STEP 1: Basic Input Validation
  // ==============================================

  // Check for empty or whitespace-only input
  if (!input || input.trim().length === 0) {
    return {
      isValid: false,
      sanitizedInput: '',
      originalInput: input,
      violations: [{
        type: 'empty_input',
        severity: 'high',
        description: 'Input is empty or contains only whitespace',
      }],
      riskScore: 100,
      shouldBlock: true,
      processingTimeMs: Date.now() - startTime,
    };
  }

  // Check minimum length
  if (input.trim().length < cfg.minLength) {
    violations.push({
      type: 'input_too_short',
      severity: 'medium',
      description: `Input is shorter than minimum length of ${cfg.minLength} characters`,
    });
    riskScore += 20;
  }

  // Check maximum length
  if (input.length > cfg.maxLength) {
    violations.push({
      type: 'input_too_long',
      severity: 'medium',
      description: `Input exceeds maximum length of ${cfg.maxLength} characters`,
      matchedText: `Length: ${input.length}`,
    });
    riskScore += ADDITIONAL_RISK_FACTORS.excessiveLength;
    // Truncate for sanitized output
    sanitizedInput = input.substring(0, cfg.maxLength);
  }

  // ==============================================
  // STEP 2: Check for Suspicious Characters
  // ==============================================

  if (hasSuspiciousCharacters(input)) {
    violations.push({
      type: 'suspicious_characters',
      severity: 'high',
      description: 'Input contains zero-width or invisible Unicode characters',
    });
    riskScore += ADDITIONAL_RISK_FACTORS.suspiciousCharacters;
    sanitizedInput = removeSuspiciousCharacters(sanitizedInput);
  }

  // ==============================================
  // STEP 3: Check for Multiline Input (Potential Injection)
  // ==============================================

  const lineCount = (input.match(/\n/g) || []).length + 1;
  if (lineCount > 3) {
    violations.push({
      type: 'excessive_newlines',
      severity: 'medium',
      description: `Input contains ${lineCount} lines, which may indicate injection attempt`,
    });
    riskScore += ADDITIONAL_RISK_FACTORS.multilineInput;
  }

  // ==============================================
  // STEP 4: Pattern Matching for Injection Attempts
  // ==============================================

  const patternMatches = findPatternMatches(input);

  // Group matches by severity
  const criticalMatches = patternMatches.filter(m => m.severity === 'critical');
  const highMatches = patternMatches.filter(m => m.severity === 'high');
  const mediumMatches = patternMatches.filter(m => m.severity === 'medium');
  const lowMatches = patternMatches.filter(m => m.severity === 'low');

  // Convert pattern matches to violations
  for (const match of patternMatches) {
    violations.push({
      type: `pattern_${match.category}`,
      severity: match.severity,
      description: `Detected ${match.category.replace(/_/g, ' ')} pattern`,
      matchedText: match.match,
      position: match.index,
    });
  }

  // Calculate risk score from patterns
  riskScore += criticalMatches.length * SEVERITY_WEIGHTS.critical;
  riskScore += highMatches.length * SEVERITY_WEIGHTS.high;
  riskScore += mediumMatches.length * SEVERITY_WEIGHTS.medium;
  riskScore += lowMatches.length * SEVERITY_WEIGHTS.low;

  // Bonus penalty for multiple critical patterns (coordinated attack)
  if (criticalMatches.length >= 2) {
    riskScore += ADDITIONAL_RISK_FACTORS.multipleCriticalPatterns;
  }

  // Cap risk score at 100
  riskScore = Math.min(100, riskScore);

  // ==============================================
  // STEP 5: Normalize and Clean Input
  // ==============================================

  // Normalize whitespace
  sanitizedInput = sanitizedInput
    .replace(/\s+/g, ' ')  // Collapse multiple spaces
    .trim();

  // Remove potential delimiter injection
  sanitizedInput = sanitizedInput
    .replace(/<\/?[a-z_]+>/gi, '') // Remove XML-like tags
    .replace(/```[a-z]*/gi, '')    // Remove code block markers
    .replace(/\[\/?[A-Z]+\]/g, ''); // Remove bracket commands

  // ==============================================
  // STEP 6: Determine Blocking Decision
  // ==============================================

  let shouldBlock = false;

  // Block if any critical pattern found and blocking is enabled
  if (cfg.blockOnCritical && criticalMatches.length > 0) {
    shouldBlock = true;
  }

  // Block if risk score exceeds threshold
  if (riskScore >= cfg.riskThreshold) {
    shouldBlock = true;
  }

  // ==============================================
  // STEP 7: Log Violations (if enabled)
  // ==============================================

  if (cfg.logViolations && violations.length > 0) {
    logger.warn('[SANITIZER] Violations detected', {
      riskScore,
      shouldBlock,
      violationCount: violations.length,
      criticalCount: criticalMatches.length,
      truncatedInput: input.substring(0, 100) + (input.length > 100 ? '...' : ''),
    });
  }

  return {
    isValid: !shouldBlock,
    sanitizedInput,
    originalInput: input,
    violations,
    riskScore,
    shouldBlock,
    processingTimeMs: Date.now() - startTime,
  };
}

// ==============================================
// UTILITY FUNCTIONS
// ==============================================

/**
 * Quick check if input is likely malicious (fast path)
 * Use for rate limiting or quick filtering
 */
export function quickMaliciousCheck(input: string): boolean {
  // Quick length check
  if (input.length > 1000) return true;

  // Quick pattern check for most common injection attempts
  const quickPatterns = [
    /ignor(a|e)\s*(las|all|previous)/i,
    /instruc(ciones|tions)/i,
    /system\s*prompt/i,
    /\$out|\$merge/i,
    /admin.*credential/i,
  ];

  return quickPatterns.some(p => p.test(input));
}

/**
 * Get a human-readable summary of violations
 */
export function getViolationSummary(violations: SanitizationViolation[]): string {
  if (violations.length === 0) return 'No violations detected';

  const critical = violations.filter(v => v.severity === 'critical').length;
  const high = violations.filter(v => v.severity === 'high').length;
  const medium = violations.filter(v => v.severity === 'medium').length;

  const parts: string[] = [];
  if (critical > 0) parts.push(`${critical} critical`);
  if (high > 0) parts.push(`${high} high`);
  if (medium > 0) parts.push(`${medium} medium`);

  return `Detected: ${parts.join(', ')} severity violation(s)`;
}

/**
 * Check if input contains only allowed characters for a query
 */
export function hasOnlyAllowedCharacters(input: string): boolean {
  // Allow: letters (any language), numbers, common punctuation, spaces
  const allowedPattern = /^[\p{L}\p{N}\s.,;:!?¿¡'"()\-_@#$%&*+=<>€£¥/\\]+$/u;
  return allowedPattern.test(input);
}

