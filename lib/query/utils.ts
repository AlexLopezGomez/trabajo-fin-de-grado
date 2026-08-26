/**
 * Query Utilities (Phase 2)
 *
 * Helper functions for working with saved queries and widget query resolution.
 * These utilities make it easier to work with the Phase 2 query linking system.
 */

import type {
  SavedQuery,
  ResolvedWidgetQuery,
} from '@/types/saved-query';
import { WidgetQuerySource } from '@/types/saved-query';
import type { DashboardWidget } from '@/types/dashboard';

// ============================================
// QUERY TYPE DETECTION
// ============================================

/**
 * Check if a widget uses a linked query (references SavedQuery)
 */
export function isLinkedWidget(widget: DashboardWidget): boolean {
  return !!widget.queryId;
}

/**
 * Check if a widget uses an inline query
 */
export function isInlineWidget(widget: DashboardWidget): boolean {
  return !!(widget.collection && widget.pipeline);
}

/**
 * Validate that a widget has a valid query definition
 */
export function hasValidQuery(widget: DashboardWidget): boolean {
  return isLinkedWidget(widget) || isInlineWidget(widget);
}

/**
 * Get the query source type for a widget
 */
export function getWidgetQuerySource(
  widget: DashboardWidget
): WidgetQuerySource | null {
  if (isLinkedWidget(widget)) {
    return WidgetQuerySource.SAVED;
  }
  if (isInlineWidget(widget)) {
    return WidgetQuerySource.INLINE;
  }
  return null;
}

// ============================================
// QUERY COMPARISON
// ============================================

/**
 * Compare two pipelines for equality
 * Useful for detecting if a query has changed
 */
export function arePipelinesEqual(
  pipeline1: Record<string, unknown>[],
  pipeline2: Record<string, unknown>[]
): boolean {
  if (pipeline1.length !== pipeline2.length) return false;

  const str1 = JSON.stringify(pipeline1);
  const str2 = JSON.stringify(pipeline2);

  return str1 === str2;
}

/**
 * Check if two queries are functionally identical
 */
export function areQueriesEqual(
  query1: { collection: string; pipeline: Record<string, unknown>[] },
  query2: { collection: string; pipeline: Record<string, unknown>[] }
): boolean {
  return (
    query1.collection === query2.collection &&
    arePipelinesEqual(query1.pipeline, query2.pipeline)
  );
}

// ============================================
// QUERY METADATA
// ============================================

/**
 * Extract metadata from a pipeline
 * Analyzes the pipeline structure to provide insights
 */
export function analyzePipeline(pipeline: Record<string, unknown>[]): {
  stageCount: number;
  stages: string[];
  hasLimit: boolean;
  limitValue?: number;
  hasSort: boolean;
  hasMatch: boolean;
  complexity: 'low' | 'medium' | 'high';
} {
  const stages = pipeline.map((stage) => Object.keys(stage)[0]);
  const hasLimit = stages.includes('$limit');
  const hasSort = stages.includes('$sort');
  const hasMatch = stages.includes('$match');

  // Find limit value
  let limitValue: number | undefined;
  if (hasLimit) {
    const limitStage = pipeline.find((stage) => '$limit' in stage);
    if (limitStage) {
      limitValue = limitStage.$limit as number;
    }
  }

  // Estimate complexity based on stages
  let complexity: 'low' | 'medium' | 'high' = 'low';
  if (stages.includes('$lookup') || stages.includes('$graphLookup')) {
    complexity = 'high';
  } else if (stages.includes('$group') || stages.includes('$unwind')) {
    complexity = 'medium';
  }

  return {
    stageCount: pipeline.length,
    stages,
    hasLimit,
    limitValue,
    hasSort,
    hasMatch,
    complexity,
  };
}

/**
 * Get a human-readable description of a pipeline
 */
export function describePipeline(pipeline: Record<string, unknown>[]): string {
  const analysis = analyzePipeline(pipeline);
  const parts: string[] = [];

  if (analysis.hasMatch) parts.push('filters data');
  if (analysis.stages.includes('$group')) parts.push('groups results');
  if (analysis.stages.includes('$lookup')) parts.push('joins collections');
  if (analysis.hasSort) parts.push('sorts results');
  if (analysis.hasLimit)
    parts.push(`limits to ${analysis.limitValue} records`);

  if (parts.length === 0) return 'Returns all documents';

  return parts.join(', ');
}

// ============================================
// QUERY VALIDATION
// ============================================

/**
 * Validate that a widget's query definition is consistent
 * Returns validation errors if any
 */
export function validateWidgetQuery(widget: DashboardWidget): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  const hasQueryId = !!widget.queryId;
  const hasCollection = !!widget.collection;
  const hasPipeline = !!widget.pipeline;

  // Must have EITHER queryId OR (collection + pipeline)
  if (!hasQueryId && !hasCollection && !hasPipeline) {
    errors.push('Widget must have either queryId or inline query definition');
  }

  // Cannot have both
  if (hasQueryId && (hasCollection || hasPipeline)) {
    errors.push(
      'Widget cannot have both queryId and inline query (collection/pipeline)'
    );
  }

  // If inline, must have both collection AND pipeline
  if ((hasCollection || hasPipeline) && !(hasCollection && hasPipeline)) {
    errors.push('Inline query must have both collection and pipeline');
  }

  // Validate pipeline structure
  if (hasPipeline && Array.isArray(widget.pipeline)) {
    if (widget.pipeline.length === 0) {
      errors.push('Pipeline cannot be empty');
    }

    // Check if pipeline has $limit
    const hasLimit = widget.pipeline.some((stage) => '$limit' in stage);
    if (!hasLimit) {
      errors.push('Pipeline must include $limit stage for safety');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate a saved query definition
 */
export function validateSavedQueryDefinition(query: {
  collection: string;
  pipeline: Record<string, unknown>[];
}): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!query.collection || query.collection.trim() === '') {
    errors.push('Collection name cannot be empty');
  }

  if (!Array.isArray(query.pipeline)) {
    errors.push('Pipeline must be an array');
  } else if (query.pipeline.length === 0) {
    errors.push('Pipeline cannot be empty');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================
// QUERY FORMATTING
// ============================================

/**
 * Format a pipeline for display (pretty-printed JSON)
 */
export function formatPipeline(
  pipeline: Record<string, unknown>[],
  indent: number = 2
): string {
  return JSON.stringify(pipeline, null, indent);
}

/**
 * Format a resolved query for logging
 */
export function formatResolvedQuery(resolved: ResolvedWidgetQuery): string {
  const sourceLabel =
    resolved.source === WidgetQuerySource.SAVED ? 'Saved Query' : 'Inline';
  const queryInfo =
    resolved.source === WidgetQuerySource.SAVED
      ? ` (${resolved.queryName})`
      : '';

  return `[${sourceLabel}${queryInfo}] ${resolved.collection} | ${resolved.pipeline.length} stages`;
}

// ============================================
// QUERY STATISTICS
// ============================================

/**
 * Calculate statistics for a saved query
 */
export function calculateQueryStats(query: SavedQuery): {
  ageInDays: number;
  averageExecutionsPerDay: number;
  lastExecutedAgo?: string;
} {
  const now = new Date();
  const createdAt = new Date(query.createdAt);
  const ageInMs = now.getTime() - createdAt.getTime();
  const ageInDays = Math.floor(ageInMs / (1000 * 60 * 60 * 24));

  const averageExecutionsPerDay =
    ageInDays > 0 ? query.executionCount / ageInDays : query.executionCount;

  let lastExecutedAgo: string | undefined;
  if (query.lastExecutedAt) {
    const lastExec = new Date(query.lastExecutedAt);
    const timeSince = now.getTime() - lastExec.getTime();
    const days = Math.floor(timeSince / (1000 * 60 * 60 * 24));
    const hours = Math.floor(
      (timeSince % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
    );

    if (days > 0) {
      lastExecutedAgo = `${days} day${days > 1 ? 's' : ''} ago`;
    } else if (hours > 0) {
      lastExecutedAgo = `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
      lastExecutedAgo = 'Recently';
    }
  }

  return {
    ageInDays,
    averageExecutionsPerDay: Math.round(averageExecutionsPerDay * 10) / 10,
    lastExecutedAgo,
  };
}

// ============================================
// BATCH OPERATIONS
// ============================================

/**
 * Group widgets by their query source
 */
export function groupWidgetsByQuerySource(widgets: DashboardWidget[]): {
  linked: DashboardWidget[];
  inline: DashboardWidget[];
  invalid: DashboardWidget[];
} {
  const linked: DashboardWidget[] = [];
  const inline: DashboardWidget[] = [];
  const invalid: DashboardWidget[] = [];

  for (const widget of widgets) {
    if (isLinkedWidget(widget)) {
      linked.push(widget);
    } else if (isInlineWidget(widget)) {
      inline.push(widget);
    } else {
      invalid.push(widget);
    }
  }

  return { linked, inline, invalid };
}

/**
 * Find widgets that reference a specific saved query
 */
export function findWidgetsUsingQuery(
  widgets: DashboardWidget[],
  queryId: string
): DashboardWidget[] {
  return widgets.filter((widget) => widget.queryId === queryId);
}

/**
 * Get unique collections used across widgets
 */
export function getUniqueCollections(widgets: DashboardWidget[]): string[] {
  const collections = new Set<string>();

  for (const widget of widgets) {
    if (widget.collection) {
      collections.add(widget.collection);
    }
  }

  return Array.from(collections).sort();
}
