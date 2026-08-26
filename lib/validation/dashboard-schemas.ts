/**
 * Dashboard Validation Schemas
 *
 * Zod schemas for validating dashboard-related inputs.
 * Prevents XSS, NoSQL injection, and invalid data.
 */

import { z } from 'zod';
import { VALIDATION } from '@/lib/constants/validation';
import {
  ObjectIdSchema,
  SafeStringSchema,
  SafeTextSchema,
  LongSafeTextSchema,
  BooleanSchema,
  SortOrderSchema,
} from '@/lib/validation/validators';

/**
 * Create Dashboard Input Schema
 */
export const CreateDashboardSchema = z.object({
  name: z.string()
    .min(1, 'Dashboard name required')
    .max(VALIDATION.MAX_DASHBOARD_NAME_LENGTH, 'Dashboard name too long (max 100 characters)')
    .trim(),

  description: LongSafeTextSchema.optional(),

  spaceId: ObjectIdSchema.optional(),

  isPublic: BooleanSchema.optional().default(false),

  tags: z
    .array(z.string().min(1).max(VALIDATION.MAX_TAG_LENGTH, 'Tag too long').trim())
    .max(VALIDATION.MAX_TAGS_PER_ENTITY, 'Maximum 10 tags allowed')
    .optional()
    .default([]),

  config: z
    .object({
      refreshInterval: z
        .number()
        .int()
        .min(0, 'Refresh interval must be non-negative')
        .max(VALIDATION.MAX_REFRESH_INTERVAL, 'Refresh interval too long (max 1 hour)')
        .optional(),
      theme: z.enum(['light', 'dark', 'auto']).optional(),
      layout: z.enum(['grid', 'list', 'kanban']).optional().default('grid'),
    })
    .optional()
    .default({ layout: 'grid' }),
});

export type CreateDashboardInput = z.infer<typeof CreateDashboardSchema>;

/**
 * Update Dashboard Input Schema
 */
export const UpdateDashboardSchema = z.object({
  dashboardId: ObjectIdSchema,

  name: z.string()
    .min(1, 'Dashboard name required')
    .max(VALIDATION.MAX_DASHBOARD_NAME_LENGTH, 'Dashboard name too long')
    .trim()
    .optional(),

  description: LongSafeTextSchema.optional(),

  isPublic: BooleanSchema.optional(),

  tags: z
    .array(z.string().min(1).max(VALIDATION.MAX_TAG_LENGTH).trim())
    .max(VALIDATION.MAX_TAGS_PER_ENTITY, 'Maximum 10 tags allowed')
    .optional(),

  config: z
    .object({
      refreshInterval: z.number().int().min(0).max(VALIDATION.MAX_REFRESH_INTERVAL).optional(),
      theme: z.enum(['light', 'dark', 'auto']).optional(),
      layout: z.enum(['grid', 'list', 'kanban']).optional(),
    })
    .optional(),
});

export type UpdateDashboardInput = z.infer<typeof UpdateDashboardSchema>;

/**
 * Delete Dashboard Input Schema
 */
export const DeleteDashboardSchema = z.object({
  dashboardId: ObjectIdSchema,
});

export type DeleteDashboardInput = z.infer<typeof DeleteDashboardSchema>;

/**
 * Get Dashboard Input Schema
 */
export const GetDashboardSchema = z.object({
  dashboardId: ObjectIdSchema,
});

export type GetDashboardInput = z.infer<typeof GetDashboardSchema>;

/**
 * List Dashboards Input Schema
 */
export const ListDashboardsSchema = z.object({
  spaceId: ObjectIdSchema.optional(),

  page: z.number().int().min(1).max(VALIDATION.MAX_PAGE).default(VALIDATION.DEFAULT_PAGE),

  limit: z.number().int().min(1).max(VALIDATION.MAX_LIMIT).default(VALIDATION.DEFAULT_LIMIT),

  search: z.string().min(1).max(VALIDATION.MAX_SEARCH_LENGTH, 'Search query too long').trim().optional(),

  sortBy: z
    .enum(['name', 'createdAt', 'updatedAt', 'viewCount'])
    .optional()
    .default('createdAt'),

  sortOrder: SortOrderSchema,

  filterByPublic: BooleanSchema.optional(),

  filterByTags: z.array(z.string().min(1).max(VALIDATION.MAX_TAG_LENGTH).trim()).optional(),
});

export type ListDashboardsInput = z.infer<typeof ListDashboardsSchema>;

/**
 * Duplicate Dashboard Input Schema
 */
export const DuplicateDashboardSchema = z.object({
  dashboardId: ObjectIdSchema,
  newName: z.string().min(1).max(VALIDATION.MAX_DASHBOARD_NAME_LENGTH).trim().optional(),
});

export type DuplicateDashboardInput = z.infer<typeof DuplicateDashboardSchema>;

/**
 * Share Dashboard Input Schema
 */
export const ShareDashboardSchema = z.object({
  dashboardId: ObjectIdSchema,
  shareWith: z.array(ObjectIdSchema).min(1, 'Must share with at least one user').max(VALIDATION.MAX_WIDGETS_PER_DASHBOARD),
  permission: z.enum(['view', 'edit']).default('view'),
});

export type ShareDashboardInput = z.infer<typeof ShareDashboardSchema>;

/**
 * Widget Validation Schemas
 */
export const CreateWidgetSchema = z.object({
  dashboardId: ObjectIdSchema,

  name: z.string().min(1, 'Widget name required').max(VALIDATION.MAX_WIDGET_NAME_LENGTH).trim(),

  type: z.enum([
    'chart',
    'table',
    'metric',
    'text',
    'image',
    'map',
    'calendar',
  ]),

  config: z
    .object({
      query: SafeTextSchema.optional(),
      chartType: z.enum(['line', 'bar', 'pie', 'area', 'scatter']).optional(),
      dataSource: z.string().min(1).max(VALIDATION.MAX_COLLECTION_NAME_LENGTH).trim().optional(),
      refreshInterval: z.number().int().min(0).max(VALIDATION.MAX_REFRESH_INTERVAL).optional(),
    })
    .optional()
    .default({}),

  position: z
    .object({
      x: z.number().int().nonnegative(),
      y: z.number().int().nonnegative(),
      width: z.number().int().positive().max(VALIDATION.MAX_WIDGET_WIDTH),
      height: z.number().int().positive().max(VALIDATION.MAX_WIDGET_HEIGHT),
    })
    .optional(),
});

export type CreateWidgetInput = z.infer<typeof CreateWidgetSchema>;

/**
 * Update Widget Input Schema
 */
export const UpdateWidgetSchema = z.object({
  widgetId: ObjectIdSchema,
  name: z.string().min(1).max(VALIDATION.MAX_WIDGET_NAME_LENGTH).trim().optional(),
  config: z
    .object({
      query: SafeTextSchema.optional(),
      chartType: z.enum(['line', 'bar', 'pie', 'area', 'scatter']).optional(),
      dataSource: z.string().min(1).max(VALIDATION.MAX_COLLECTION_NAME_LENGTH).trim().optional(),
      refreshInterval: z.number().int().min(0).max(VALIDATION.MAX_REFRESH_INTERVAL).optional(),
    })
    .optional()
    .default({}),
  position: z
    .object({
      x: z.number().int().nonnegative(),
      y: z.number().int().nonnegative(),
      width: z.number().int().positive().max(VALIDATION.MAX_WIDGET_WIDTH),
      height: z.number().int().positive().max(VALIDATION.MAX_WIDGET_HEIGHT),
    })
    .optional(),
});

export type UpdateWidgetInput = z.infer<typeof UpdateWidgetSchema>;
