/**
 * Query Validation Schemas
 *
 * Zod schemas for validating query-related inputs.
 * Prevents injection attacks and ensures data integrity.
 */

import { z } from 'zod';
import { VALIDATION } from '@/lib/constants/validation';
import {
  ObjectIdSchema,
  SafeStringSchema,
  SafeTextSchema,
  LongSafeTextSchema,
} from './validators';

/**
 * AI Query Generation Input Schema
 * For natural language query generation
 */
export const GenerateQuerySchema = z.object({
  userQuestion: LongSafeTextSchema.refine(
    (val) => val.length >= 5,
    'Question must be at least 5 characters'
  ).refine((val) => val.length <= 1000, 'Question too long (max 1000 characters)'),
});

export type GenerateQueryInput = z.infer<typeof GenerateQuerySchema>;

/**
 * Create Saved Query Input Schema
 */
export const CreateSavedQuerySchema = z.object({
  name: SafeStringSchema.min(1, 'Query name required').max(
    100,
    'Query name too long (max 100 characters)'
  ),

  description: LongSafeTextSchema.optional(),

  originalQuestion: LongSafeTextSchema.optional(),

  collection: SafeStringSchema.min(1, 'Collection name required').max(
    100,
    'Collection name too long'
  ),

  pipeline: z
    .array(z.record(z.string(), z.unknown()))
    .min(1, 'Pipeline must have at least one stage')
    .max(VALIDATION.MAX_QUERY_PIPELINE_STAGES, 'Pipeline too complex (max 20 stages)'),

  tags: z
    .array(SafeStringSchema.max(VALIDATION.MAX_TAG_LENGTH, 'Tag too long'))
    .max(VALIDATION.MAX_TAGS_PER_ENTITY, 'Maximum 10 tags allowed')
    .optional()
    .default([]),
});

export type CreateSavedQueryInput = z.infer<typeof CreateSavedQuerySchema>;

/**
 * Update Saved Query Input Schema
 */
export const UpdateSavedQuerySchema = z.object({
  queryId: ObjectIdSchema,

  name: SafeStringSchema.min(1, 'Query name required')
    .max(100, 'Query name too long')
    .optional(),

  description: LongSafeTextSchema.optional(),

  tags: z
    .array(SafeStringSchema.max(VALIDATION.MAX_TAG_LENGTH))
    .max(VALIDATION.MAX_TAGS_PER_ENTITY, 'Maximum 10 tags allowed')
    .optional(),
});

export type UpdateSavedQueryInput = z.infer<typeof UpdateSavedQuerySchema>;

/**
 * Delete Saved Query Input Schema
 */
export const DeleteSavedQuerySchema = z.object({
  queryId: ObjectIdSchema,
});

export type DeleteSavedQueryInput = z.infer<typeof DeleteSavedQuerySchema>;

/**
 * Execute Saved Query Input Schema
 */
export const ExecuteSavedQuerySchema = z.object({
  queryId: ObjectIdSchema,
});

export type ExecuteSavedQueryInput = z.infer<typeof ExecuteSavedQuerySchema>;

/**
 * Get Saved Query Input Schema
 */
export const GetSavedQuerySchema = z.object({
  queryId: ObjectIdSchema,
});

export type GetSavedQueryInput = z.infer<typeof GetSavedQuerySchema>;

/**
 * List Saved Queries Filter Schema
 */
export const ListSavedQueriesSchema = z.object({
  ownedByMe: z.boolean().optional().default(true),

  tag: SafeStringSchema.max(VALIDATION.MAX_TAG_LENGTH).optional(),

  collection: SafeStringSchema.max(VALIDATION.MAX_COLLECTION_NAME_LENGTH).optional(),

  search: SafeStringSchema.max(VALIDATION.MAX_SEARCH_LENGTH, 'Search query too long').optional(),

  page: z.number().int().min(1).max(VALIDATION.MAX_PAGE).default(VALIDATION.DEFAULT_PAGE),

  limit: z.number().int().min(1).max(VALIDATION.MAX_LIMIT).default(VALIDATION.DEFAULT_LIMIT),
});

export type ListSavedQueriesInput = z.infer<typeof ListSavedQueriesSchema>;

/**
 * Link Widget to Saved Query Input Schema
 */
export const LinkWidgetToQuerySchema = z.object({
  widgetId: ObjectIdSchema,
  queryId: ObjectIdSchema,
});

export type LinkWidgetToQueryInput = z.infer<typeof LinkWidgetToQuerySchema>;

/**
 * Unlink Widget from Query Input Schema
 */
export const UnlinkWidgetFromQuerySchema = z.object({
  widgetId: ObjectIdSchema,
});

export type UnlinkWidgetFromQueryInput = z.infer<
  typeof UnlinkWidgetFromQuerySchema
>;
