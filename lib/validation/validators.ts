/**
 * Reusable Validation Patterns
 *
 * Common Zod schemas for input validation across the application.
 * Prevents XSS, NoSQL injection, and resource exhaustion attacks.
 */

import { z } from 'zod';
import { VALIDATION } from '@/lib/constants/validation';

/**
 * MongoDB ObjectId format validation
 */
export const ObjectIdSchema = z
  .string()
  .regex(/^[0-9a-f]{24}$/, 'Invalid ObjectId format');

/**
 * Email validation
 */
export const EmailSchema = z
  .string()
  .email('Invalid email format')
  .max(VALIDATION.MAX_EMAIL_LENGTH, 'Email too long')
  .toLowerCase()
  .trim();

/**
 * Safe string (alphanumeric + basic punctuation)
 * Prevents XSS and special character attacks
 */
export const SafeStringSchema = z
  .string()
  .trim()
  .min(1, 'Required')
  .max(VALIDATION.MAX_STRING_LENGTH, 'Too long (max 100 characters)')
  .regex(/^[a-zA-Z0-9 _-]+$/, 'Only letters, numbers, spaces, hyphens, and underscores allowed');

/**
 * Safe text (allows more characters but limited length)
 */
export const SafeTextSchema = z
  .string()
  .trim()
  .max(VALIDATION.MAX_DESCRIPTION_LENGTH, 'Too long (max 500 characters)');

/**
 * Long safe text for descriptions
 */
export const LongSafeTextSchema = z
  .string()
  .trim()
  .max(VALIDATION.MAX_NOTES_LENGTH, 'Too long (max 2000 characters)');

/**
 * URL validation (HTTP/HTTPS only)
 */
export const UrlSchema = z
  .string()
  .url('Invalid URL format')
  .max(VALIDATION.MAX_URL_LENGTH, 'URL too long')
  .refine(
    (url) => {
      try {
        const parsed = new URL(url);
        return ['http:', 'https:'].includes(parsed.protocol);
      } catch {
        return false;
      }
    },
    { message: 'Only HTTP/HTTPS URLs allowed' }
  );

/**
 * ISO date validation
 */
export const ISODateSchema = z
  .string()
  .datetime({ message: 'Invalid ISO date format' })
  .transform((str) => new Date(str));

/**
 * Create enum schema with type safety
 */
export function createEnumSchema<T extends string>(values: readonly T[], name: string) {
  return z.enum(values as [T, ...T[]]);
}

/**
 * Pagination schema
 */
export const PaginationSchema = z.object({
  page: z.number().int().min(1).max(VALIDATION.MAX_PAGE).default(VALIDATION.DEFAULT_PAGE),
  limit: z.number().int().min(1).max(VALIDATION.MAX_LIMIT).default(VALIDATION.DEFAULT_LIMIT),
});

/**
 * Sort order schema
 */
export const SortOrderSchema = z.enum(['asc', 'desc']).default('desc');

/**
 * Boolean with coercion (handles string "true"/"false")
 */
export const BooleanSchema = z
  .union([z.boolean(), z.string()])
  .transform((val) => {
    if (typeof val === 'boolean') return val;
    return val === 'true';
  });

/**
 * Positive integer schema
 */
export const PositiveIntSchema = z.number().int().positive('Must be positive');

/**
 * Non-negative integer schema
 */
export const NonNegativeIntSchema = z.number().int().nonnegative('Must be non-negative');

/**
 * Percentage schema (0-100)
 */
export const PercentageSchema = z
  .number()
  .min(0, 'Percentage must be between 0 and 100')
  .max(VALIDATION.MAX_PERCENTAGE, 'Percentage must be between 0 and 100');

/**
 * Safe filename (no path traversal)
 */
export const SafeFilenameSchema = z
  .string()
  .min(1, 'Filename required')
  .max(VALIDATION.MAX_FILENAME_LENGTH, 'Filename too long')
  .regex(/^[a-zA-Z0-9_.-]+$/, 'Invalid filename characters')
  .refine(
    (filename) => !filename.includes('..') && !filename.includes('/') && !filename.includes('\\'),
    { message: 'Path traversal detected' }
  );

/**
 * IP address validation (IPv4)
 */
export const IPv4Schema = z
  .string()
  .regex(
    /^((25[0-5]|(2[0-4]|1\d|[1-9]|)\d)\.?\b){4}$/,
    'Invalid IPv4 address'
  );

/**
 * Hex color validation
 */
export const HexColorSchema = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color (e.g., #FF5733)');

/**
 * JSON string validation with parsing
 */
export const JSONStringSchema = z
  .string()
  .refine(
    (str) => {
      try {
        JSON.parse(str);
        return true;
      } catch {
        return false;
      }
    },
    { message: 'Invalid JSON string' }
  )
  .transform((str) => JSON.parse(str));

/**
 * Slug validation (URL-friendly strings)
 */
export const SlugSchema = z
  .string()
  .min(1, 'Slug required')
  .max(VALIDATION.MAX_SLUG_LENGTH, 'Slug too long')
  .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens')
  .refine((slug) => !slug.startsWith('-') && !slug.endsWith('-'), {
    message: 'Slug cannot start or end with hyphen',
  });
