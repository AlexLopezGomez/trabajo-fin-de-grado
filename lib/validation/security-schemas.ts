/**
 * Security Action Validation Schemas
 *
 * Zod schemas for security-related admin actions
 */

import { z } from 'zod';
import { VALIDATION } from '@/lib/constants/validation';
import { EmailSchema, ObjectIdSchema } from './validators';

/**
 * Unlock Account Input Schema
 */
export const UnlockAccountSchema = z.object({
  email: EmailSchema,
});

export type UnlockAccountInput = z.infer<typeof UnlockAccountSchema>;

/**
 * Get Account Lockout Status Schema
 */
export const GetLockoutStatusSchema = z.object({
  email: EmailSchema,
});

export type GetLockoutStatusInput = z.infer<typeof GetLockoutStatusSchema>;

/**
 * Get Failed Attempts Schema
 */
export const GetFailedAttemptsSchema = z.object({
  email: EmailSchema,
  minutesBack: z.number().int().min(1).max(VALIDATION.MAX_MINUTES_BACK).default(60),
});

export type GetFailedAttemptsInput = z.infer<typeof GetFailedAttemptsSchema>;
