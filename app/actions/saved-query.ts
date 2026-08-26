'use server';

/**
 * Saved Query Server Actions (Phase 2)
 *
 * Manages reusable query definitions that can be linked to widgets
 * or executed independently.
 *
 * Phase 2 Focus:
 * - CRUD operations for saved queries
 * - Query resolution for widget execution
 * - Simple ownership model (enhanced in Phase 3)
 * - Backward compatibility with inline widgets
 */

import { getAuthDatabase, executeAggregation } from '@/lib/db';
import { enforceLimitOnPipeline } from '@/lib/prompt-security';
import { authz } from '@/lib/services/authorization.service';
import { query as queryLogger, error as logError } from '@/lib/utils/logger';
import {
  requireAuth,
  requireOwnership,
  logAction,
  AuthError,
} from '@/lib/auth/guards';
// Helper to create ObjectId dynamically (avoids bundling MongoDB in client)
async function createObjectId(id: string) {
  const { ObjectId } = await import('mongodb');
  return new ObjectId(id);
}
import type {
  SavedQuery,
  SavedQuerySummary,
  CreateSavedQueryInput,
  UpdateSavedQueryInput,
  SavedQueryExecutionResult,
  SavedQueryFilters,
  ResolvedWidgetQuery,
} from '@/types/saved-query';
import { WidgetQuerySource } from '@/types/saved-query'; // Import enum as value
import type { DashboardWidget } from '@/types/dashboard';
import { withNamespaceField, namespaceOrLegacyFilter } from '@/lib/db/namespace';

// ============================================
// SERIALIZATION HELPER
// ============================================

function serializeDocument<T>(doc: unknown): T {
  return JSON.parse(JSON.stringify(doc)) as T;
}

// ============================================
// SAVED QUERY CRUD OPERATIONS
// ============================================

/**
 * Create a new saved query
 *
 * This allows users to save frequently used queries for reuse
 * across multiple widgets or dashboards.
 */
export async function createSavedQuery(
  input: CreateSavedQueryInput
): Promise<SavedQuery> {
  const user = await requireAuth();

  // Enterprise Security: Validate collection access with detailed audit trail
  const canAccess = await authz.canAccess(
    user.id,
    { type: 'collection', id: input.collection },
    'view'
  );

  if (!canAccess) {
    queryLogger('SavedQuery creation denied - collection access', {
      userId: user.id,
      collection: input.collection,
      action: 'createSavedQuery',
    });
    throw new Error(`Access denied: You do not have permission to query the "${input.collection}" collection`);
  }

  // Ensure pipeline has $limit for safety
  const safePipeline = enforceLimitOnPipeline(input.pipeline, 100);

  const db = await getAuthDatabase();
  const now = new Date();

  const queryDoc = withNamespaceField({
    name: input.name.trim(),
    description: input.description?.trim() || '',
    originalQuestion: input.originalQuestion,
    collection: input.collection,
    pipeline: safePipeline,
    ownerId: user.id,
    tags: input.tags || [],
    createdAt: now,
    updatedAt: now,
    executionCount: 0,
  });

  const result = await db.collection('saved_queries').insertOne(queryDoc);

  await logAction('saved_query.create', user.id, {
    queryId: result.insertedId.toString(),
    name: input.name,
    collection: input.collection,
  });

  queryLogger('Saved query created', {
    queryId: result.insertedId.toString(),
    name: input.name,
    collection: input.collection,
    userId: user.id,
  });

  return serializeDocument<SavedQuery>({
    id: result.insertedId.toString(),
    ...queryDoc,
  });
}

/**
 * Get a single saved query by ID
 */
export async function getSavedQuery(queryId: string): Promise<SavedQuery | null> {
  const user = await requireAuth();
  const db = await getAuthDatabase();

  const doc = await db.collection('saved_queries').findOne({
    _id: await createObjectId(queryId),
    ...namespaceOrLegacyFilter(),
  });

  if (!doc) return null;

  // Phase 2: Simple ownership check
  // Phase 3: Will add shared query permissions
  if (doc.ownerId !== user.id && user.role !== 'admin') {
    throw new AuthError('You do not have permission to access this query', 'FORBIDDEN');
  }

  return serializeDocument<SavedQuery>({
    id: doc._id.toString(),
    name: doc.name,
    description: doc.description,
    originalQuestion: doc.originalQuestion,
    collection: doc.collection,
    pipeline: doc.pipeline,
    ownerId: doc.ownerId,
    tags: doc.tags || [],
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    lastExecutedAt: doc.lastExecutedAt,
    executionCount: doc.executionCount || 0,
  });
}

/**
 * List saved queries accessible to current user
 */
export async function listSavedQueries(
  filters?: SavedQueryFilters
): Promise<SavedQuerySummary[]> {
  const user = await requireAuth();
  const db = await getAuthDatabase();

  // Build match query
  const matchQuery: Record<string, unknown> = {};

  // Phase 2: Only show user's own queries
  // Phase 3: Will add shared queries
  if (filters?.ownedByMe !== false) {
    matchQuery.ownerId = user.id;
  }

  if (filters?.tag) {
    matchQuery.tags = filters.tag;
  }

  if (filters?.collection) {
    matchQuery.collection = filters.collection;
  }

  if (filters?.search) {
    matchQuery.$or = [
      { name: { $regex: filters.search, $options: 'i' } },
      { description: { $regex: filters.search, $options: 'i' } },
    ];
  }

  const namespacedMatch = { $and: [namespaceOrLegacyFilter(), matchQuery] };

  // Aggregate with widget counts
  const queries = await db
    .collection('saved_queries')
    .aggregate([
      { $match: namespacedMatch },
      {
        $lookup: {
          from: 'dashboard_widgets',
          let: { queryId: { $toString: '$_id' } },
          pipeline: [
            { $match: { $expr: { $eq: ['$queryId', '$$queryId'] } } },
            { $count: 'count' },
          ],
          as: 'widgetStats',
        },
      },
      {
        $addFields: {
          widgetCount: {
            $ifNull: [{ $arrayElemAt: ['$widgetStats.count', 0] }, 0],
          },
        },
      },
      {
        $project: {
          widgetStats: 0,
        },
      },
      { $sort: { updatedAt: -1 } },
    ])
    .toArray();

  return queries.map((doc) =>
    serializeDocument<SavedQuerySummary>({
      id: doc._id.toString(),
      name: doc.name,
      description: doc.description,
      originalQuestion: doc.originalQuestion,
      collection: doc.collection,
      pipeline: doc.pipeline,
      ownerId: doc.ownerId,
      tags: doc.tags || [],
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      lastExecutedAt: doc.lastExecutedAt,
      executionCount: doc.executionCount || 0,
      widgetCount: doc.widgetCount,
    })
  );
}

/**
 * Update a saved query
 * Phase 2: Only metadata updates (name, description, tags)
 * Phase 3: Will add pipeline updates with versioning
 */
export async function updateSavedQuery(
  queryId: string,
  updates: UpdateSavedQueryInput
): Promise<SavedQuery> {
  const user = await requireAuth();
  const db = await getAuthDatabase();

  // Get existing query
  const existing = await db.collection('saved_queries').findOne({
    _id: await createObjectId(queryId),
    ...namespaceOrLegacyFilter(),
  });

  if (!existing) {
    throw new Error('Saved query not found');
  }

  // Verify ownership
  await requireOwnership(existing.ownerId);

  const updateDoc: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (updates.name !== undefined) updateDoc.name = updates.name.trim();
  if (updates.description !== undefined)
    updateDoc.description = updates.description.trim();
  if (updates.tags !== undefined) updateDoc.tags = updates.tags;

  await db
    .collection('saved_queries')
    .updateOne({ _id: await createObjectId(queryId) }, { $set: updateDoc });

  await logAction('saved_query.update', user.id, {
    queryId,
    updates: Object.keys(updateDoc),
  });

  queryLogger('Saved query updated', {
    queryId,
    userId: user.id,
    updatedFields: Object.keys(updateDoc),
  });

  return serializeDocument<SavedQuery>({
    id: queryId,
    name: updates.name ?? existing.name,
    description: updates.description ?? existing.description,
    originalQuestion: existing.originalQuestion,
    collection: existing.collection,
    pipeline: existing.pipeline,
    ownerId: existing.ownerId,
    tags: updates.tags ?? existing.tags,
    createdAt: existing.createdAt,
    updatedAt: new Date(),
    lastExecutedAt: existing.lastExecutedAt,
    executionCount: existing.executionCount || 0,
  });
}

/**
 * Delete a saved query
 * WARNING: This will break any widgets that reference it
 * Phase 3: Will add cascade options or unlinking
 */
export async function deleteSavedQuery(queryId: string): Promise<void> {
  const user = await requireAuth();
  const db = await getAuthDatabase();

  // Get existing query
  const existing = await db.collection('saved_queries').findOne({
    _id: await createObjectId(queryId),
    ...namespaceOrLegacyFilter(),
  });

  if (!existing) {
    throw new Error('Saved query not found');
  }

  // Verify ownership
  await requireOwnership(existing.ownerId);

  // Check if any widgets use this query
  const widgetCount = await db
    .collection('dashboard_widgets')
    .countDocuments({ queryId });

  if (widgetCount > 0) {
    throw new Error(
      `Cannot delete query: ${widgetCount} widget(s) are still using it. Please unlink or delete those widgets first.`
    );
  }

  await db.collection('saved_queries').deleteOne({
    _id: await createObjectId(queryId),
  });

  await logAction('saved_query.delete', user.id, {
    queryId,
    queryName: existing.name,
  });

  queryLogger('Saved query deleted', {
    queryId,
    queryName: existing.name,
    userId: user.id,
  });
}

/**
 * Execute a saved query independently (not through a widget)
 * Useful for testing queries or building a query library UI
 */
export async function executeSavedQuery(
  queryId: string
): Promise<SavedQueryExecutionResult> {
  const user = await requireAuth();
  const startTime = Date.now();
  const db = await getAuthDatabase();

  // Get the query
  const query = await getSavedQuery(queryId); // Handles auth check
  if (!query) {
    throw new Error('Query not found');
  }

  // Enterprise Security: Validate collection access before execution
  const canAccess = await authz.canAccess(
    user.id,
    { type: 'collection', id: query.collection },
    'execute'
  );

  if (!canAccess) {
    queryLogger('SavedQuery execution denied - collection access', {
      userId: user.id,
      queryId,
      collection: query.collection,
      action: 'executeSavedQuery',
    });
    throw new Error(`Access denied: You do not have permission to execute queries on the "${query.collection}" collection`);
  }

  try {
    // Execute the query
    const data = await executeAggregation(query.collection, query.pipeline);

    // Enterprise Security: Apply field-level masking based on user permissions
    const maskedData = await authz.maskFields(
      data as Record<string, unknown>[],
      user.id,
      { collection: query.collection }
    );

    const executionTime = Date.now() - startTime;

    // Update execution stats
    await db.collection('saved_queries').updateOne(
      { _id: await createObjectId(queryId) },
      {
        $set: { lastExecutedAt: new Date() },
        $inc: { executionCount: 1 },
      }
    );

    queryLogger('Executed saved query', {
      queryId: query.id,
      queryName: query.name,
      executionTimeMs: executionTime,
      resultCount: maskedData.length,
      userId: user.id,
    });

    return serializeDocument<SavedQueryExecutionResult>({
      query,
      data: serializeDocument<Record<string, unknown>[]>(maskedData),
      executionTime,
      success: true,
    });
  } catch (error) {
    const executionTime = Date.now() - startTime;
    logError(`Error executing saved query "${query.name}"`, error, { queryId: query.id });

    return serializeDocument<SavedQueryExecutionResult>({
      query,
      data: [],
      executionTime,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

// ============================================
// WIDGET QUERY RESOLUTION (THE MAGIC ✨)
// ============================================

/**
 * Resolve a widget's query definition
 *
 * This is the key function that enables backward compatibility:
 * - If widget has queryId → resolve from SavedQuery
 * - If widget has inline pipeline → use it directly
 * - Throws if widget has neither
 *
 * Called internally by executeWidget in dashboard.ts
 */
export async function resolveWidgetQuery(
  widget: DashboardWidget
): Promise<ResolvedWidgetQuery> {
  const user = await requireAuth();

  // Case 1: Widget links to saved query
  if (widget.queryId) {
    const savedQuery = await getSavedQuery(widget.queryId);

    if (!savedQuery) {
      throw new Error(
        `Widget "${widget.name}" references a deleted or inaccessible query (ID: ${widget.queryId})`
      );
    }

    // Enterprise Security: Validate collection access for saved query
    const canAccessSaved = await authz.canAccess(
      user.id,
      { type: 'collection', id: savedQuery.collection },
      'view'
    );

    if (!canAccessSaved) {
      queryLogger('Widget query resolution denied - saved query collection access', {
        userId: user.id,
        widgetId: widget.id,
        queryId: widget.queryId,
        collection: savedQuery.collection,
      });
      throw new Error(`Access denied: You do not have permission to access the "${savedQuery.collection}" collection required by this widget`);
    }

    return {
      source: WidgetQuerySource.SAVED,
      collection: savedQuery.collection,
      pipeline: savedQuery.pipeline,
      queryId: savedQuery.id,
      queryName: savedQuery.name,
    };
  }

  // Case 2: Widget has inline query (backward compatible)
  if (widget.collection && widget.pipeline) {
    // Enterprise Security: Validate collection access for inline query
    const canAccessInline = await authz.canAccess(
      user.id,
      { type: 'collection', id: widget.collection },
      'view'
    );

    if (!canAccessInline) {
      queryLogger('Widget query resolution denied - inline query collection access', {
        userId: user.id,
        widgetId: widget.id,
        collection: widget.collection,
      });
      throw new Error(`Access denied: You do not have permission to access the "${widget.collection}" collection required by this widget`);
    }

    return {
      source: WidgetQuerySource.INLINE,
      collection: widget.collection,
      pipeline: widget.pipeline,
    };
  }

  // Case 3: Widget has neither (invalid state)
  throw new Error(
    `Widget "${widget.name}" has no query definition (neither queryId nor inline pipeline)`
  );
}

/**
 * Link an existing widget to a saved query
 *
 * This converts an inline widget to use a saved query reference.
 * The inline pipeline/collection are cleared.
 */
export async function linkWidgetToSavedQuery(
  widgetId: string,
  queryId: string
): Promise<DashboardWidget> {
  const user = await requireAuth();
  const db = await getAuthDatabase();

  // Verify query exists and user has access
  const savedQuery = await getSavedQuery(queryId);
  if (!savedQuery) {
    throw new Error('Saved query not found');
  }

  // Get widget
  const widgetDoc = await db.collection('dashboard_widgets').findOne({
    _id: await createObjectId(widgetId),
  });

  if (!widgetDoc) {
    throw new Error('Widget not found');
  }

  // Get dashboard to verify ownership
  const dashboard = await db.collection('dashboards').findOne({
    _id: await createObjectId(widgetDoc.dashboardId),
  });

  if (!dashboard) {
    throw new Error('Dashboard not found');
  }

  // Verify ownership
  await requireOwnership(dashboard.ownerId);

  // Update widget to link to saved query
  await db.collection('dashboard_widgets').updateOne(
    { _id: await createObjectId(widgetId) },
    {
      $set: {
        queryId: queryId,
        updatedAt: new Date(),
      },
      $unset: {
        collection: '',
        pipeline: '',
      },
    }
  );

  await logAction('widget.link_query', user.id, {
    widgetId,
    queryId,
    widgetName: widgetDoc.name,
    queryName: savedQuery.name,
  });

  queryLogger('Linked widget to saved query', {
    widgetId,
    queryId,
    dashboardId: widgetDoc.dashboardId,
    userId: user.id,
  });

  // Return updated widget
  const updated = await db.collection('dashboard_widgets').findOne({
    _id: await createObjectId(widgetId),
  });

  return serializeDocument<DashboardWidget>({
    id: updated!._id.toString(),
    dashboardId: updated!.dashboardId,
    name: updated!.name,
    originalQuestion: updated!.originalQuestion,
    queryId: updated!.queryId,
    visualization: updated!.visualization,
    position: updated!.position,
    refreshMinutes: updated!.refreshMinutes,
    createdAt: updated!.createdAt,
    updatedAt: updated!.updatedAt,
    lastExecutedAt: updated!.lastExecutedAt,
  });
}

/**
 * Unlink a widget from its saved query
 *
 * This converts a linked widget back to inline mode by copying
 * the saved query's pipeline into the widget.
 */
export async function unlinkWidgetFromSavedQuery(
  widgetId: string
): Promise<DashboardWidget> {
  const user = await requireAuth();
  const db = await getAuthDatabase();

  // Get widget
  const widgetDoc = await db.collection('dashboard_widgets').findOne({
    _id: await createObjectId(widgetId),
  });

  if (!widgetDoc) {
    throw new Error('Widget not found');
  }

  if (!widgetDoc.queryId) {
    throw new Error('Widget is not linked to a saved query');
  }

  // Get the saved query to copy its pipeline
  const savedQuery = await getSavedQuery(widgetDoc.queryId);
  if (!savedQuery) {
    throw new Error('Linked query not found');
  }

  // Get dashboard to verify ownership
  const dashboard = await db.collection('dashboards').findOne({
    _id: await createObjectId(widgetDoc.dashboardId),
  });

  if (!dashboard) {
    throw new Error('Dashboard not found');
  }

  // Verify ownership
  await requireOwnership(dashboard.ownerId);

  // Update widget to use inline query
  await db.collection('dashboard_widgets').updateOne(
    { _id: await createObjectId(widgetId) },
    {
      $set: {
        collection: savedQuery.collection,
        pipeline: savedQuery.pipeline,
        updatedAt: new Date(),
      },
      $unset: {
        queryId: '',
      },
    }
  );

  await logAction('widget.unlink_query', user.id, {
    widgetId,
    queryId: savedQuery.id,
    widgetName: widgetDoc.name,
  });

  queryLogger('Unlinked widget from saved query', {
    widgetId,
    queryId: savedQuery.id,
    dashboardId: widgetDoc.dashboardId,
    userId: user.id,
  });

  // Return updated widget
  const updated = await db.collection('dashboard_widgets').findOne({
    _id: await createObjectId(widgetId),
  });

  return serializeDocument<DashboardWidget>({
    id: updated!._id.toString(),
    dashboardId: updated!.dashboardId,
    name: updated!.name,
    originalQuestion: updated!.originalQuestion,
    collection: updated!.collection,
    pipeline: updated!.pipeline,
    visualization: updated!.visualization,
    position: updated!.position,
    refreshMinutes: updated!.refreshMinutes,
    createdAt: updated!.createdAt,
    updatedAt: updated!.updatedAt,
    lastExecutedAt: updated!.lastExecutedAt,
  });
}
