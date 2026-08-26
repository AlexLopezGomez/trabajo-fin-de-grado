/**
 * Dashboard & Widget Type Definitions
 * The data model for persistent, reusable query visualizations
 * 
 * Philosophy: Once a query passes security validation, its pipeline becomes
 * a validated artifact that can be executed directly—no AI needed.
 */

import { VisualizationType } from './index';
import type { QueryCostScore } from './query-scoring';

// ============================================
// DASHBOARD TYPES
// ============================================

/**
 * A Dashboard is a collection of widgets owned by a user
 */
export interface Dashboard {
  id: string;
  name: string;
  description?: string;
  ownerId: string;              // User who created it (legacy)
  createdBy?: string;            // User who created it (new)
  createdByName?: string;        // Display name of creator
  isPublic: boolean;            // Can others view it? (legacy)
  createdAt: Date;
  updatedAt: Date;
  namespace?: string;            // Project namespace for multi-tenant isolation

  // Space integration
  spaceId?: string | null;      // Space this dashboard belongs to
  spaceName?: string | null;    // Cached space name

  // Sharing configuration
  sharing?: {
    mode: 'PRIVATE' | 'SPACE_INHERIT' | 'CUSTOM' | 'PUBLIC';
    rules?: any[];
    publicPermission?: string;
  };
}

/**
 * Dashboard with widget count for list views
 * Enhanced with Space and Sharing support
 */
export interface DashboardSummary extends Dashboard {
  widgetCount: number;
  spaceId?: string | null;      // Space this dashboard belongs to (null = floating)
  spaceName?: string | null;    // Cached space name for display
  sharingMode?: 'PRIVATE' | 'SPACE_INHERIT' | 'CUSTOM' | 'PUBLIC';
}

/**
 * Create/update dashboard payload
 */
export interface CreateDashboardInput {
  name: string;
  description?: string;
  isPublic?: boolean;
  spaceId?: string;
}

export interface UpdateDashboardInput {
  name?: string;
  description?: string;
  isPublic?: boolean;
}

// ============================================
// WIDGET TYPES
// ============================================

/**
 * Grid position for widget layout
 * Compatible with react-grid-layout
 */
export interface WidgetPosition {
  x: number;      // Grid column position
  y: number;      // Grid row position
  w: number;      // Width in grid units
  h: number;      // Height in grid units
}

/**
 * A Widget is a saved query result that can be refreshed
 *
 * Phase 2 Enhancement: Widgets can now link to SavedQuery OR use inline pipeline
 *
 * Key insight: We store the PIPELINE (inline) or REFERENCE (to SavedQuery).
 * The pipeline has already passed security validation at creation time.
 */
export interface DashboardWidget {
  id: string;
  dashboardId: string;
  namespace?: string;                          // Project namespace for multi-tenant isolation

  // Identity
  name: string;                              // User-defined name
  originalQuestion: string;                  // The natural language question (for context)

  // Query Definition (EITHER linked OR inline)
  queryId?: string;                          // Phase 2: Reference to SavedQuery (optional)

  // Inline Query Definition (backward compatible - optional if queryId is set)
  collection?: string;                       // MongoDB collection to query
  pipeline?: Record<string, unknown>[];      // The validated aggregation pipeline

  // Display
  visualization: VisualizationType;          // How to render the data
  position: WidgetPosition;                  // Grid position

  // Behavior
  refreshMinutes?: number;                   // Optional auto-refresh interval

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  lastExecutedAt?: Date;                     // When was this last run

  // Approval status (from Migration 008)
  approvalStatus?: 'not_required' | 'pending' | 'approved' | 'rejected' | 'pending_reapproval' | 'expired' | 'cancelled';
  requiresApproval?: boolean;
  canExecute?: boolean;

  // Cache (NEW - Persistent Widget Cache)
  cachedResults?: {
    data: Record<string, unknown>[];         // Cached query results
    executedAt: Date;                        // When cache was created
    executionTimeMs: number;                 // How long the query took
    resultCount: number;                     // Number of results
  };
}

/**
 * Widget with its executed data (for rendering)
 */
export interface WidgetWithData extends DashboardWidget {
  data: Record<string, unknown>[];
  executionTime: number;
  error?: string;
  costScore?: QueryCostScore;
}

/**
 * Create widget payload (from a QueryResult)
 * Phase 2: Support EITHER inline query OR saved query reference
 */
export interface CreateWidgetInput {
  dashboardId: string;
  name: string;
  originalQuestion: string;
  visualization: VisualizationType;
  position?: WidgetPosition;
  refreshMinutes?: number;

  // EITHER: Link to saved query
  queryId?: string;

  // OR: Inline query definition
  collection?: string;
  pipeline?: Record<string, unknown>[];
}

/**
 * Update widget payload
 */
export interface UpdateWidgetInput {
  name?: string;
  visualization?: VisualizationType;
  position?: WidgetPosition;
  refreshMinutes?: number;
  collection?: string;                       // Pipeline update support
  pipeline?: Record<string, unknown>[];      // Pipeline update support
}

// ============================================
// EXECUTION TYPES
// ============================================

/**
 * Result of executing a single widget
 */
export interface WidgetExecutionResult {
  widget: DashboardWidget;
  data: Record<string, unknown>[];
  executionTime: number;
  success: boolean;
  error?: string;
  costScore?: QueryCostScore;
}

/**
 * Result of executing all widgets in a dashboard
 */
export interface DashboardExecutionResult {
  dashboardId: string;
  results: WidgetExecutionResult[];
  totalExecutionTime: number;
}

// ============================================
// UI STATE TYPES
// ============================================

/**
 * Dashboard with fully loaded widgets and data
 */
export interface DashboardWithWidgets {
  dashboard: Dashboard;
  widgets: WidgetWithData[];
}

/**
 * Options for the SaveWidgetDialog
 */
export interface SaveWidgetDialogState {
  isOpen: boolean;
  queryResult: {
    collection: string;
    pipeline: Record<string, unknown>[];
    visualization: VisualizationType;
    originalQuestion: string;
  } | null;
}

/**
 * Default widget positions for new widgets
 * Auto-calculates position based on existing widgets
 */
export const DEFAULT_WIDGET_SIZE: Pick<WidgetPosition, 'w' | 'h'> = {
  w: 6,   // Half of 12-column grid
  h: 4,   // 4 rows high
};

/**
 * Grid configuration constants
 */
export const GRID_CONFIG = {
  cols: 12,
  rowHeight: 80,
  margin: [16, 16] as [number, number],
  containerPadding: [0, 0] as [number, number],
};

