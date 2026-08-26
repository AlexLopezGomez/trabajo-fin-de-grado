/**
 * Prompt Injection Detection Patterns
 * Database of regex patterns and keywords for detecting malicious inputs
 */

// ==============================================
// INSTRUCTION OVERRIDE PATTERNS
// Attempts to make the LLM ignore its instructions
// ==============================================

export const INSTRUCTION_OVERRIDE_PATTERNS = [
  // Spanish patterns
  /ignora\s*(las|todas|cualquier|tus)?\s*(instrucciones|reglas|restricciones)/gi,
  /olvida\s*(todo|las|tus)?\s*(instrucciones|reglas|anteriores)/gi,
  /no\s*(sigas|hagas\s*caso|obedezcas)\s*(las|tus)?\s*instrucciones/gi,
  /cambia\s*(tus|las)?\s*(instrucciones|reglas)/gi,
  /nuevas?\s*instrucciones/gi,
  /en\s*su\s*lugar/gi,
  /en\s*vez\s*de\s*(eso|esto)/gi,
  /haz\s*(lo\s*siguiente|esto)\s*en\s*(su|vez)/gi,

  // English patterns
  /ignore\s*(all\s*)?(previous\s*)?(the\s*)?(your\s*)?(any\s*)?(instructions|rules|guidelines|restrictions)/gi,
  /forget\s*(all|your|the|previous)?\s*(instructions|rules|context)/gi,
  /disregard\s*(all|your|the|previous)?\s*(instructions|rules)/gi,
  /override\s*(your|the|all)?\s*(instructions|rules|settings)/gi,
  /bypass\s*(your|the|all)?\s*(instructions|rules|filters|restrictions)/gi,
  /instead\s*of\s*(that|this|following)/gi,
  /new\s*instructions/gi,
  /do\s*(the\s*following|this)\s*instead/gi,
];

// ==============================================
// ROLE MANIPULATION PATTERNS
// Attempts to make the LLM act as something else
// ==============================================

export const ROLE_MANIPULATION_PATTERNS = [
  // Spanish patterns
  /actúa\s*como/gi,
  /eres\s*(ahora|un|una)/gi,
  /simula\s*ser/gi,
  /pretende\s*(que\s*eres|ser)/gi,
  /compórtate\s*como/gi,
  /tu\s*nuevo\s*rol/gi,
  /asume\s*(el\s*rol|que\s*eres)/gi,

  // English patterns
  /act\s*as\s*(a|an|if)/gi,
  /you\s*are\s*now/gi,
  /pretend\s*(to\s*be|you\s*are)/gi,
  /simulate\s*(being|a)/gi,
  /behave\s*(like|as)/gi,
  /your\s*new\s*role/gi,
  /assume\s*(the\s*role|you\s*are)/gi,
  /roleplay\s*as/gi,
];

// ==============================================
// SYSTEM PROMPT EXTRACTION PATTERNS
// Attempts to reveal the system prompt
// ==============================================

export const SYSTEM_PROMPT_PATTERNS = [
  // Spanish
  /muéstrame\s*(tu|el)?\s*(system\s*)?prompt/gi,
  /muestra\s*(tu|el)?\s*(system\s*)?prompt/gi,
  /cuál\s*es\s*(tu|el)\s*(system\s*)?prompt/gi,
  /revela\s*(tus|las)?\s*instrucciones/gi,
  /dime\s*(tus|las)?\s*instrucciones/gi,
  /qué\s*instrucciones\s*tienes/gi,
  /prompt\s*del\s*sistema/gi,
  /tu\s*prompt/gi,

  // English
  /show\s*(me\s*)?(your|the)?\s*(system\s*)?prompt/gi,
  /what\s*(is|are)\s*(your|the)\s*(system\s*)?prompt/gi,
  /reveal\s*(your|the)?\s*(system\s*)?instructions/gi,
  /tell\s*me\s*(your|the)?\s*(system\s*)?prompt/gi,
  /print\s*(your|the)?\s*(system\s*)?prompt/gi,
  /output\s*(your|the)?\s*(system\s*)?prompt/gi,
  /repeat\s*(your|the)?\s*(system\s*)?prompt/gi,
];

// ==============================================
// FORBIDDEN COLLECTION PATTERNS
// Attempts to access unauthorized collections
// ==============================================

export const FORBIDDEN_COLLECTION_PATTERNS = [
  // System collections
  /admin[_\s]*(credentials|passwords|secrets|users|config)/gi,
  /system[_\s.]*(users|roles|keys|config|profile)/gi,
  /internal[_\s]*(config|settings|secrets)/gi,
  /auth[_\s]*(tokens|sessions|keys)/gi,
  /_?(password|secret|key|token)s?[_\s]*(store|vault|db)/gi,

  // MongoDB system namespaces
  /local\./gi,
  /admin\./gi,
  /config\./gi,

  // Sensitive field probing
  /colección\s*(de\s*)?(contraseñas|credenciales|secrets)/gi,
  /collection\s*(of\s*)?(passwords|credentials|secrets)/gi,
];

// ==============================================
// FORBIDDEN OPERATOR PATTERNS
// Attempts to use write or dangerous operations
// ==============================================

export const FORBIDDEN_OPERATOR_PATTERNS = [
  // Write operations
  /\$out\b/gi,
  /\$merge\b/gi,
  /\$delete\b/gi,
  /\$update\b/gi,
  /\$set\b/gi,
  /\$unset\b/gi,
  /\$rename\b/gi,
  /\$push\b(?!\s*\()/gi, // $push in aggregation context is OK, but not as update
  /\$pull\b/gi,

  // Dangerous operations
  /drop\s*(collection|database|index)/gi,
  /truncate/gi,
  /remove\s*all/gi,
  /delete\s*(all|everything)/gi,

  // Code execution
  /\$where\b/gi,
  /\$function\b/gi,
  /\$accumulator\b/gi, // Can execute JS
  /mapReduce/gi,
  /eval\s*\(/gi,
];

// ==============================================
// LIMIT BYPASS PATTERNS
// Attempts to remove or bypass $limit
// ==============================================

export const LIMIT_BYPASS_PATTERNS = [
  // Spanish
  /sin\s*(límite|limit)/gi,
  /sin\s*restricción/gi,
  /todos?\s*(los|las)?\s*(datos|registros|documentos)/gi,
  /no\s*(apliques|pongas|uses)\s*(el\s*)?\$?limit/gi,
  /quita\s*(el\s*)?\$?limit/gi,
  /elimina\s*(el\s*)?\$?limit/gi,
  /máximo\s*posible/gi,
  /ilimitado/gi,

  // English
  /without\s*(any\s*)?(limit|restriction)/gi,
  /no\s*limit/gi,
  /remove\s*(the\s*)?\$?limit/gi,
  /skip\s*(the\s*)?\$?limit/gi,
  /unlimited/gi,
  /all\s*(records|documents|data|entries)/gi,
  /everything\s*in/gi,
  /entire\s*(collection|database|table)/gi,
];

// ==============================================
// ENCODING/OBFUSCATION PATTERNS
// Attempts to hide malicious content
// ==============================================

export const OBFUSCATION_PATTERNS = [
  // Base64-like patterns
  /base64/gi,
  /decode/gi,
  /encode/gi,

  // Unicode escape sequences
  /\\u[0-9a-f]{4}/gi,
  /&#x?[0-9a-f]+;/gi,

  // URL encoding
  /%[0-9a-f]{2}/gi,
];

// Zero-width and invisible characters
export const SUSPICIOUS_CHARACTERS = /[\u200B-\u200D\uFEFF\u202A-\u202E\u2060-\u206F\u00AD]/g;

// ==============================================
// DELIMITER INJECTION PATTERNS
// Attempts to break out of delimiters
// ==============================================

export const DELIMITER_PATTERNS = [
  /<\/?(user_query|system|assistant|human|ai)>/gi,
  /```\s*(system|instructions|prompt)/gi,
  /\[\/?(INST|SYS)\]/gi,
  /<<\/?SYS>>/gi,
  /\[SYSTEM\]/gi,
];

// ==============================================
// CONTEXT MANIPULATION PATTERNS
// Attempts to manipulate conversation context
// ==============================================

export const CONTEXT_MANIPULATION_PATTERNS = [
  // Spanish
  /contexto\s*anterior/gi,
  /conversación\s*previa/gi,
  /historial\s*(de\s*chat)?/gi,

  // English
  /previous\s*context/gi,
  /prior\s*conversation/gi,
  /chat\s*history/gi,
  /earlier\s*in\s*this\s*conversation/gi,
  /as\s*I\s*(said|mentioned)\s*before/gi,
];

// ==============================================
// COMBINED PATTERN SETS
// ==============================================

export const ALL_INJECTION_PATTERNS = [
  ...INSTRUCTION_OVERRIDE_PATTERNS,
  ...ROLE_MANIPULATION_PATTERNS,
  ...SYSTEM_PROMPT_PATTERNS,
  ...FORBIDDEN_COLLECTION_PATTERNS,
  ...FORBIDDEN_OPERATOR_PATTERNS,
  ...LIMIT_BYPASS_PATTERNS,
  ...DELIMITER_PATTERNS,
  ...CONTEXT_MANIPULATION_PATTERNS,
];

// Patterns that warrant immediate blocking
export const CRITICAL_PATTERNS = [
  ...INSTRUCTION_OVERRIDE_PATTERNS,
  ...ROLE_MANIPULATION_PATTERNS,
  ...SYSTEM_PROMPT_PATTERNS,
  ...FORBIDDEN_COLLECTION_PATTERNS,
  ...FORBIDDEN_OPERATOR_PATTERNS,
];

// Patterns that increase risk score but may not block
export const WARNING_PATTERNS = [
  ...LIMIT_BYPASS_PATTERNS,
  ...CONTEXT_MANIPULATION_PATTERNS,
];

// ==============================================
// ALLOWED COLLECTIONS (Dynamic from Schema Catalog)
// ==============================================

// Import dynamic collection list from schema catalog
import { QUERYABLE_COLLECTIONS } from '@/lib/ai/generated/schema-catalog';

// Re-export as ALLOWED_COLLECTIONS for backward compatibility
export const ALLOWED_COLLECTIONS = QUERYABLE_COLLECTIONS;

export type AllowedCollection = (typeof QUERYABLE_COLLECTIONS)[number];

// ==============================================
// SENSITIVE FIELDS (should be masked or blocked)
// ==============================================

export const SENSITIVE_FIELD_PATTERNS = [
  /password/i,
  /passwd/i,
  /secret/i,
  /api[_\s]?key/i,
  /token/i,
  /credential/i,
  /private[_\s]?key/i,
  /ssn/i,
  /social[_\s]?security/i,
  /credit[_\s]?card/i,
  /cvv/i,
  /pin/i,
];

// ==============================================
// UTILITY FUNCTIONS
// ==============================================

export interface PatternMatch {
  pattern: RegExp;
  category: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  match: string;
  index: number;
}

export function findPatternMatches(input: string): PatternMatch[] {
  const matches: PatternMatch[] = [];

  const patternGroups: Array<{
    patterns: RegExp[];
    category: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
  }> = [
      { patterns: INSTRUCTION_OVERRIDE_PATTERNS, category: 'instruction_override', severity: 'critical' },
      { patterns: ROLE_MANIPULATION_PATTERNS, category: 'role_manipulation', severity: 'critical' },
      { patterns: SYSTEM_PROMPT_PATTERNS, category: 'system_prompt_extraction', severity: 'critical' },
      { patterns: FORBIDDEN_COLLECTION_PATTERNS, category: 'forbidden_collection', severity: 'critical' },
      { patterns: FORBIDDEN_OPERATOR_PATTERNS, category: 'forbidden_operator', severity: 'critical' },
      { patterns: LIMIT_BYPASS_PATTERNS, category: 'limit_bypass', severity: 'high' },
      { patterns: DELIMITER_PATTERNS, category: 'delimiter_injection', severity: 'high' },
      { patterns: CONTEXT_MANIPULATION_PATTERNS, category: 'context_manipulation', severity: 'medium' },
      { patterns: OBFUSCATION_PATTERNS, category: 'obfuscation', severity: 'medium' },
    ];

  for (const group of patternGroups) {
    for (const pattern of group.patterns) {
      // Reset lastIndex for global patterns
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(input)) !== null) {
        matches.push({
          pattern,
          category: group.category,
          severity: group.severity,
          match: match[0],
          index: match.index,
        });
      }
    }
  }

  return matches;
}

export function hasSuspiciousCharacters(input: string): boolean {
  return SUSPICIOUS_CHARACTERS.test(input);
}

export function removeSuspiciousCharacters(input: string): string {
  return input.replace(SUSPICIOUS_CHARACTERS, '');
}

