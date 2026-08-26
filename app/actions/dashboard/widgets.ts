'use server';

/**
 * Widget CRUD Actions
 */

import { getAuthDatabase } from '@/lib/db';
import { enforceLimitOnPipeline } from '@/lib/prompt-security';
import { authz } from '@/lib/services/authorization.service';
import { requireAuth, requireOwnership, logAction } from '@/lib/auth/guards';
import { ObjectId } from 'mongodb';
import { dashboard as dashboardLogger } from '@/lib/utils/logger';
import type { DashboardWidget, CreateWidgetInput, UpdateWidgetInput } from '@/types/dashboard';
import { serializeDocument } from './helpers';
import { queryScoringService } from '@/lib/services/query-scoring';
import { NotificationService } from '@/lib/services/notification.service';
import { withNamespaceField, namespaceOrLegacyFilter } from '@/lib/db/namespace';

async function calculateNextWidgetPosition(dashboardId: string): Promise<{ x: number; y: number; w: number; h: number }> {
    const db = await getAuthDatabase();
    const widgets = await db.collection('dashboard_widgets').find({ dashboardId }).toArray();

    if (widgets.length === 0) return { x: 0, y: 0, w: 6, h: 4 };

    let maxY = 0;
    for (const widget of widgets) {
        const bottomY = (widget.position?.y ?? 0) + (widget.position?.h ?? 4);
        if (bottomY > maxY) maxY = bottomY;
    }

    const lastRow = widgets.filter(w => (w.position?.y ?? 0) + (w.position?.h ?? 4) === maxY);
    const totalWidth = lastRow.reduce((sum, w) => sum + (w.position?.w ?? 6), 0);

    if (totalWidth <= 6) return { x: totalWidth, y: maxY - 4, w: 6, h: 4 };
    return { x: 0, y: maxY, w: 6, h: 4 };
}

export async function saveWidget(input: CreateWidgetInput): Promise<DashboardWidget> {
    await requireAuth();
    const db = await getAuthDatabase();

    const dashboard = await db.collection('dashboards').findOne({ _id: new ObjectId(input.dashboardId), ...namespaceOrLegacyFilter() });
    if (!dashboard) throw new Error('Dashboard not found');

    await requireOwnership(dashboard.ownerId);

    const user = await requireAuth();
    const canAccess = await authz.canAccess(user.id, { type: 'collection', id: input.collection }, 'view');
    if (!canAccess) {
        throw new Error(`Access denied: You do not have permission to create widgets for "${input.collection}"`);
    }

    const position = input.position ?? await calculateNextWidgetPosition(input.dashboardId);
    const safePipeline = enforceLimitOnPipeline(input.pipeline!, 100);
    const now = new Date();

    let queryScore;
    let requiresApproval = false;

    try {
        queryScore = await queryScoringService.scoreQuery(input.collection || '', safePipeline);

        const isOperator = user.role === 'operator';
        const canRunExpensiveQueries = (await authz.getEffectiveCapabilities(user.id))
            .permissions.includes('run_expensive_queries');

        const isHighImpact = queryScore.tier === 'red';
        requiresApproval = isOperator && isHighImpact && !canRunExpensiveQueries;

        dashboardLogger('Query scored for widget creation', {
            widgetName: input.name,
            collection: input.collection,
            costScore: queryScore.costScore,
            tier: queryScore.tier,
            requiresApproval,
            userRole: user.role
        });
    } catch (error) {
        dashboardLogger('Query scoring failed', {
            widgetName: input.name,
            collection: input.collection,
            error: error instanceof Error ? error.message : 'Unknown error'
        });

        const canRunExpensiveQueries = (await authz.getEffectiveCapabilities(user.id))
            .permissions.includes('run_expensive_queries');

        if (user.role === 'operator' && !canRunExpensiveQueries) {
            requiresApproval = true;
            queryScore = {
                costScore: 75,
                tier: 'red',
                estimatedDocsToScan: 0,
                estimatedTimeMs: 0,
                usesIndex: false,
                collectionSize: 0,
                suggestions: ['Query scoring failed - treating as high-impact for safety'],
                performanceMetrics: { scoringTime: 0 }
            };
        } else {
            queryScore = null;
        }
    }

    const widgetDoc: any = withNamespaceField({
        dashboardId: input.dashboardId,
        name: input.name.trim(),
        originalQuestion: input.originalQuestion,
        collection: input.collection,
        pipeline: safePipeline,
        visualization: input.visualization,
        position,
        refreshMinutes: input.refreshMinutes,
        createdAt: now,
        updatedAt: now,
        requiresApproval,
        approvalStatus: requiresApproval ? 'pending' : 'not_required',
        canExecute: !requiresApproval,
        costScore: queryScore?.costScore,
        costTier: queryScore?.tier,
    });

    const result = await db.collection('dashboard_widgets').insertOne(widgetDoc);
    const widgetId = result.insertedId.toString();

    // If approval is required, create an approval request record
    if (requiresApproval && queryScore) {
        const { requestQueryApproval } = await import('@/app/actions/query-approval');
        await requestQueryApproval({
            widgetId,
            dashboardId: input.dashboardId,
            collection: input.collection || '',
            pipeline: safePipeline,
            costScore: queryScore.costScore,
            tier: queryScore.tier as any,
            suggestions: queryScore.suggestions,
            estimatedDocs: queryScore.estimatedDocsToScan,
            executionTimeMs: queryScore.estimatedTimeMs,
            usesIndex: queryScore.usesIndex,
        });
    } else if (queryScore?.tier === 'yellow' && user.role === 'operator') {
        await NotificationService.notifyMediumImpactQuery({
            userId: user.id,
            userName: user.name || user.email,
            userRole: user.role,
            widgetId,
            widgetName: input.name,
            dashboardId: input.dashboardId,
            collection: input.collection || '',
            costScore: queryScore.costScore,
            tier: queryScore.tier,
            suggestions: queryScore.suggestions,
            estimatedDocsToScan: queryScore.estimatedDocsToScan,
            executionTimeMs: queryScore.estimatedTimeMs,
        });

        dashboardLogger('Medium impact query auto-approved with notification', {
            widgetId,
            widgetName: input.name,
            costScore: queryScore.costScore,
            tier: queryScore.tier
        });

        // Executing Query immediately (requested by user)
        try {
            const { executeAndCacheWidget } = await import('./execution');
            await executeAndCacheWidget(widgetId);
            dashboardLogger('Executed and cached new widget (Yellow Tier)', {
                widgetId,
                widgetName: input.name,
                dashboardId: input.dashboardId
            });
        } catch (executionError) {
            dashboardLogger('Failed to execute new widget on save', {
                widgetId,
                widgetName: input.name,
                error: executionError instanceof Error ? executionError.message : 'Unknown error'
            });
        }
    } else {
        // Execute and cache the query results immediately for approved widgets
        // This ensures the widget shows data immediately when the dashboard loads
        try {
            const { executeAndCacheWidget } = await import('./execution');
            await executeAndCacheWidget(widgetId);
            dashboardLogger('Executed and cached new widget', {
                widgetId,
                widgetName: input.name,
                dashboardId: input.dashboardId
            });
        } catch (executionError) {
            // Log the error but don't fail widget creation
            // The widget can still be refreshed manually later
            dashboardLogger('Failed to execute new widget on save', {
                widgetId,
                widgetName: input.name,
                error: executionError instanceof Error ? executionError.message : 'Unknown error'
            });
        }
    }

    await db.collection('dashboards').updateOne({ _id: new ObjectId(input.dashboardId) }, { $set: { updatedAt: now } });

    dashboardLogger('Created widget', {
        widgetId,
        widgetName: input.name,
        dashboardId: input.dashboardId,
        requiresApproval,
        autoExecuted: !requiresApproval
    });

    return serializeDocument<DashboardWidget>({
        id: widgetId,
        dashboardId: widgetDoc.dashboardId,
        name: widgetDoc.name,
        originalQuestion: widgetDoc.originalQuestion,
        collection: widgetDoc.collection,
        pipeline: widgetDoc.pipeline,
        visualization: widgetDoc.visualization,
        position: widgetDoc.position,
        refreshMinutes: widgetDoc.refreshMinutes,
        createdAt: widgetDoc.createdAt,
        updatedAt: widgetDoc.updatedAt,
        approvalStatus: widgetDoc.approvalStatus,
        canExecute: widgetDoc.canExecute
    });
}

export async function getDashboardWidgets(dashboardId: string): Promise<DashboardWidget[]> {
    const user = await requireAuth();
    const db = await getAuthDatabase();

    const dashboard = await db.collection('dashboards').findOne({
        _id: new ObjectId(dashboardId),
        $and: [
            namespaceOrLegacyFilter(),
            { $or: [{ ownerId: user.id }, { isPublic: true }] },
        ],
    });
    if (!dashboard) throw new Error('Dashboard not found or access denied');

    const widgets = await db.collection('dashboard_widgets').find({ dashboardId }).sort({ 'position.y': 1, 'position.x': 1 }).toArray();

    return widgets.map((doc) => serializeDocument<DashboardWidget>({
        id: doc._id.toString(),
        dashboardId: doc.dashboardId,
        name: doc.name,
        originalQuestion: doc.originalQuestion,
        collection: doc.collection,
        pipeline: doc.pipeline,
        visualization: doc.visualization,
        position: doc.position,
        refreshMinutes: doc.refreshMinutes,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
        lastExecutedAt: doc.lastExecutedAt,
        approvalStatus: doc.approvalStatus,
        canExecute: doc.canExecute,
    }));
}

export async function updateWidget(widgetId: string, updates: UpdateWidgetInput): Promise<DashboardWidget> {
    const user = await requireAuth();
    const db = await getAuthDatabase();

    const widget = await db.collection('dashboard_widgets').findOne({ _id: new ObjectId(widgetId) });
    if (!widget) throw new Error('Widget not found');

    const dashboard = await db.collection('dashboards').findOne({ _id: new ObjectId(widget.dashboardId), ...namespaceOrLegacyFilter() });
    if (!dashboard) throw new Error('Dashboard not found');

    await requireOwnership(dashboard.ownerId);

    const updateDoc: Record<string, unknown> = { updatedAt: new Date() };
    if (updates.name !== undefined) updateDoc.name = updates.name.trim();
    if (updates.visualization !== undefined) updateDoc.visualization = updates.visualization;
    if (updates.position !== undefined) updateDoc.position = updates.position;
    if (updates.refreshMinutes !== undefined) updateDoc.refreshMinutes = updates.refreshMinutes;

    // Handle pipeline/collection changes for Operators
    if (updates.pipeline || updates.collection) {
        if (updates.pipeline) updateDoc.pipeline = enforceLimitOnPipeline(updates.pipeline, 100);
        if (updates.collection) updateDoc.collection = updates.collection;

        const isOperator = user.role === 'operator';
        const pipeline = (updateDoc.pipeline as any[]) || widget.pipeline;
        const collection = (updateDoc.collection as string) || widget.collection;

        try {
            const queryScore = await queryScoringService.scoreQuery(collection, pipeline);
            const canRunExpensiveQueries = (await authz.getEffectiveCapabilities(user.id))
                .permissions.includes('run_expensive_queries');

            updateDoc.costScore = queryScore.costScore;
            updateDoc.costTier = queryScore.tier;

            if (isOperator && queryScore.tier === 'red' && !canRunExpensiveQueries) {
                updateDoc.approvalStatus = 'pending';
                updateDoc.canExecute = false;

                const { requestQueryApproval } = await import('@/app/actions/query-approval');
                await requestQueryApproval({
                    widgetId,
                    dashboardId: widget.dashboardId,
                    collection,
                    pipeline,
                    costScore: queryScore.costScore,
                    tier: queryScore.tier,
                    suggestions: queryScore.suggestions,
                    estimatedDocs: queryScore.estimatedDocsToScan,
                    executionTimeMs: queryScore.estimatedTimeMs,
                    usesIndex: queryScore.usesIndex,
                });
            } else {
                updateDoc.approvalStatus = 'not_required';
                updateDoc.canExecute = true;
            }
        } catch (error) {
            dashboardLogger('Query scoring failed during update', {
                widgetId,
                collection,
                error: error instanceof Error ? error.message : 'Unknown error'
            });

            const canRunExpensiveQueries = (await authz.getEffectiveCapabilities(user.id))
                .permissions.includes('run_expensive_queries');

            if (isOperator && !canRunExpensiveQueries) {
                updateDoc.approvalStatus = 'pending';
                updateDoc.canExecute = false;
                updateDoc.costScore = 75;
                updateDoc.costTier = 'red';

                const { requestQueryApproval } = await import('@/app/actions/query-approval');
                await requestQueryApproval({
                    widgetId,
                    dashboardId: widget.dashboardId,
                    collection,
                    pipeline,
                    costScore: 75,
                    tier: 'red',
                    suggestions: ['Query scoring failed - treating as high-impact for safety'],
                    estimatedDocs: 0,
                    executionTimeMs: 0,
                    usesIndex: false,
                });
            } else {
                updateDoc.approvalStatus = 'not_required';
                updateDoc.canExecute = true;
            }
        }
    }

    const unsetDoc: Record<string, string> = {};
    if ('pipeline' in updates || 'collection' in updates) unsetDoc.cachedResults = "";

    const updateOperation: any = { $set: updateDoc };
    if (Object.keys(unsetDoc).length > 0) updateOperation.$unset = unsetDoc;

    await db.collection('dashboard_widgets').updateOne({ _id: new ObjectId(widgetId) }, updateOperation);

    dashboardLogger('Updated widget', {
        widgetId,
        dashboardId: widget.dashboardId,
        userId: user.id,
        requiresApproval: updateDoc.approvalStatus === 'pending'
    });

    const updatedWidget = await db.collection('dashboard_widgets').findOne({ _id: new ObjectId(widgetId) });

    return serializeDocument<DashboardWidget>({
        id: widgetId,
        dashboardId: updatedWidget!.dashboardId,
        name: updatedWidget!.name,
        originalQuestion: updatedWidget!.originalQuestion,
        collection: updatedWidget!.collection,
        pipeline: updatedWidget!.pipeline,
        visualization: updatedWidget!.visualization,
        position: updatedWidget!.position,
        refreshMinutes: updatedWidget!.refreshMinutes,
        createdAt: updatedWidget!.createdAt,
        updatedAt: updatedWidget!.updatedAt,
        lastExecutedAt: updatedWidget!.lastExecutedAt,
        approvalStatus: updatedWidget!.approvalStatus,
        canExecute: updatedWidget!.canExecute,
    });
}

export async function deleteWidget(widgetId: string): Promise<void> {
    const user = await requireAuth();
    const db = await getAuthDatabase();

    const widget = await db.collection('dashboard_widgets').findOne({ _id: new ObjectId(widgetId) });
    if (!widget) throw new Error('Widget not found');

    const dashboard = await db.collection('dashboards').findOne({ _id: new ObjectId(widget.dashboardId), ...namespaceOrLegacyFilter() });
    if (!dashboard) throw new Error('Dashboard not found');

    await requireOwnership(dashboard.ownerId);

    await db.collection('dashboard_widgets').deleteOne({ _id: new ObjectId(widgetId) });
    await db.collection('dashboards').updateOne({ _id: new ObjectId(widget.dashboardId) }, { $set: { updatedAt: new Date() } });

    await logAction('widget.delete', user.id, { widgetId, widgetName: widget.name, dashboardId: widget.dashboardId });

    dashboardLogger('Deleted widget', { widgetId, dashboardId: widget.dashboardId, userId: user.id });
}

export async function updateWidgetPositions(
    positions: Array<{ widgetId: string; position: { x: number; y: number; w: number; h: number } }>
): Promise<void> {
    const user = await requireAuth();
    const db = await getAuthDatabase();

    if (positions.length === 0) return;

    const firstWidget = await db.collection('dashboard_widgets').findOne({ _id: new ObjectId(positions[0].widgetId) });
    if (!firstWidget) throw new Error('Widget not found');

    const dashboard = await db.collection('dashboards').findOne({ _id: new ObjectId(firstWidget.dashboardId), ...namespaceOrLegacyFilter() });
    if (!dashboard) throw new Error('Dashboard not found');

    await requireOwnership(dashboard.ownerId);

    const operations = positions.map((p) => ({
        updateOne: {
            filter: { _id: new ObjectId(p.widgetId), dashboardId: firstWidget.dashboardId },
            update: { $set: { position: p.position, updatedAt: new Date() } },
        },
    }));

    await db.collection('dashboard_widgets').bulkWrite(operations);
    await db.collection('dashboards').updateOne({ _id: new ObjectId(firstWidget.dashboardId) }, { $set: { updatedAt: new Date() } });

    dashboardLogger('Updated widget positions', { dashboardId: firstWidget.dashboardId, widgetCount: positions.length, userId: user.id });
}
