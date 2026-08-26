/**
 * Saved Query Type Definitions (Phase 2)
 *
 * Phase 2 Focus: Optional query linking with backward compatibility
 * - Widgets can reference SavedQuery OR use inline pipeline
 * - Simple ownership model (enhanced in Phase 3)
 * - Foundation for query library and sharing features
 */

import { VisualizationType } from './index';

// ============================================
// SAVED QUERY TYPES
// ============================================

/**
 * A SavedQuery is a reusable, validated MongoDB aggregation pipeline
 * that can be linked to multiple widgets or executed independently.
 *
 * Phase 2: Basic query storage and linking
 * Phase 3: Adds permissions, versioning, sharing
 */
export interface SavedQuery {
  id: string;
  name: string;
  description?: string;
  originalQuestion: string;           // The natural language question
  namespace?: string;                 // Project namespace for multi-tenant isolation

  // Query Definition
  collection: string;                 // MongoDB collection
  pipeline: Record<string, unknown>[]; // Validated aggregation pipeline

  // Ownership (simple for Phase 2)
  ownerId: string;                    // User who created it

  // Organization
  tags?: string[];                    // For categorization/search

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  lastExecutedAt?: Date;
  executionCount: number;             // Track usage
}

/**
 * SavedQuery with usage statistics for list views
 */
export interface SavedQuerySummary extends SavedQuery {
  widgetCount: number;                // How many widgets use this query
  lastUsedBy?: string;                // User ID who last executed it
}

/**
 * Create saved query input
 */
export interface CreateSavedQueryInput {
  name: string;
  description?: string;
  originalQuestion: string;
  collection: string;
  pipeline: Record<string, unknown>[];
  tags?: string[];
}

/**
 * Update saved query input
 */
export interface UpdateSavedQueryInput {
  name?: string;
  description?: string;
  tags?: string[];
  // Note: pipeline/collection changes will be in Phase 3 (with versioning)
}

/**
 * Query execution result for saved queries
 */
export interface SavedQueryExecutionResult {
  query: SavedQuery;
  data: Record<string, unknown>[];
  executionTime: number;
  success: boolean;
  error?: string;
}

// ============================================
// WIDGET LINKING TYPES
// ============================================

/**
 * Enum to identify widget query source
 */
export enum WidgetQuerySource {
  INLINE = 'inline',      // Widget has its own pipeline
  SAVED = 'saved',        // Widget links to SavedQuery
}

/**
 * Result of resolving a widget's query
 * (abstracts whether it's inline or linked)
 */
export interface ResolvedWidgetQuery {
  source: WidgetQuerySource;
  collection: string;
  pipeline: Record<string, unknown>[];
  queryId?: string;                   // Set if source is SAVED
  queryName?: string;                 // Name of linked query (for UI)
}

// ============================================
// VALIDATION TYPES
// ============================================

/**
 * Validation result for saved query operations
 */
export interface SavedQueryValidation {
  valid: boolean;
  errors: string[];
  warnings?: string[];
}

// ============================================
// FILTER/SEARCH TYPES
// ============================================

/**
 * Filters for listing saved queries
 */
export interface SavedQueryFilters {
  tag?: string;                       // Filter by tag
  collection?: string;                // Filter by collection
  ownedByMe?: boolean;                // Show only my queries
  search?: string;                    // Text search in name/description
}
