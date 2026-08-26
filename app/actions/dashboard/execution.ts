'use server';

/**
 * Widget Execution Actions
 * Query execution, caching, and dashboard loading
 */

import { getAuthDatabase, executeAggregation } from '@/lib/db';
import { authz } from '@/lib/services/authorization.service';
import { requireAuth } from '@/lib/auth/guards';
import { ObjectId } from 'mongodb';
import { dashboard as dashboardLogger, error as logError, warn as logWarn } from '@/lib/utils/logger';
import type { DashboardWidget, WidgetExecutionResult, DashboardWithWidgets, WidgetWithData } from '@/types/dashboard';
import { serializeDocument } from './helpers';
import { namespaceOrLegacyFilter } from '@/lib/db/namespace';

// DISABLED: Auto-refresh logic commented out - widgets now only refresh on manual user action
// function shouldRefreshWidget(widget: any): boolean {
//     if (!widget.cachedResults) return true;
//     if (!widget.refreshMinutes) return false;
//     const minutesSinceExecution = (Date.now() - new Date(widget.cachedResults.executedAt).getTime()) / 1000 / 60;
//     return minutesSinceExecution >= widget.refreshMinutes;
// }

export async function executeAndCacheWidget(widgetId: string): Promise<WidgetExecutionResult> {
    const user = await requireAuth();
    const startTime = Date.now();
    const db = await getAuthDatabase();

    const widgetDoc = await db.collection('dashboard_widgets').findOne({ _id: new ObjectId(widgetId) });
    if (!widgetDoc) throw new Error('Widget not found');

    // Check approval status for widgets that require approval
    if (widgetDoc.requiresApproval && widgetDoc.approvalStatus !== 'approved') {
        throw new Error(`This widget requires Supervisor approval before execution. Status: ${widgetDoc.approvalStatus || 'pending'}`);
    }

    // SECURITY: If widget requires approval, verify pipeline hasn't changed since approval
    if (widgetDoc.requiresApproval && widgetDoc.approvalStatus === 'approved' && widgetDoc.approvalId) {
        const approval = await db.collection('query_approvals').findOne({
            _id: new ObjectId(widgetDoc.approvalId),
            status: 'approved',
        });

        if (!approval) {
            throw new Error('Approval record not found for this widget');
        }

        // Verify pipeline matches approved pipeline
        const currentPipelineHash = JSON.stringify(widgetDoc.pipeline);
        const approvedPipelineHash = JSON.stringify(approval.pipeline);

        if (currentPipelineHash !== approvedPipelineHash) {
            // Pipeline changed after approval - require new approval
            await db.collection('dashboard_widgets').updateOne(
                { _id: new ObjectId(widgetId) },
                {
                    $set: {
                        approvalStatus: 'pending_reapproval',
                        canExecute: false,
                        updatedAt: new Date(),
                    },
                }
            );
            throw new Error('Widget query has changed since approval. New approval required.');
        }

        // Check if approval has expired
        if (approval.expiresAt && new Date(approval.expiresAt) < new Date()) {
            await db.collection('dashboard_widgets').updateOne(
                { _id: new ObjectId(widgetId) },
                {
                    $set: {
                        approvalStatus: 'expired',
                        canExecute: false,
                        updatedAt: new Date(),
                    },
                }
            );
            throw new Error('Approval has expired. Please request new approval.');
        }
    }

    // Check dashboard access using RBAC
    const canAccess = await authz.canAccess(user.id, { type: 'dashboard', id: widgetDoc.dashboardId }, 'execute');
    if (!canAccess) throw new Error('Access denied: You do not have permission to execute this widget');

    const widget: DashboardWidget = serializeDocument<DashboardWidget>({
        id: widgetDoc._id.toString(),
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
        lastExecutedAt: widgetDoc.lastExecutedAt,
        cachedResults: widgetDoc.cachedResults,
    });

    try {
        const canExecute = await authz.canAccess(user.id, { type: 'collection', id: widget.collection! }, 'execute');
        if (!canExecute) throw new Error(`Access denied: Cannot execute on "${widget.collection}"`);

        const [data, dashboard] = await Promise.all([
            executeAggregation(widget.collection!, widget.pipeline!),
            db.collection('dashboards').findOne({
                _id: new ObjectId(widgetDoc.dashboardId),
                ...namespaceOrLegacyFilter(),
            }),
        ]);
        const executionTimeMs = Date.now() - startTime;
        const isPublicDashboard = dashboard?.sharing?.mode === 'PUBLIC';

        // Skip field masking for public dashboards - data is meant to be visible to everyone
        const finalData = isPublicDashboard
            ? data as Record<string, unknown>[]
            : await authz.maskFields(data as Record<string, unknown>[], user.id, { collection: widget.collection! });

        const now = new Date();
        await db.collection('dashboard_widgets').updateOne(
            { _id: new ObjectId(widgetId) },
            { $set: { cachedResults: { data: finalData, executedAt: now, executionTimeMs, resultCount: finalData.length }, lastExecutedAt: now } }
        );

        dashboardLogger('Executed and cached widget', {
            widgetId,
            widgetName: widget.name,
            executionTimeMs,
            resultCount: finalData.length,
            isPublicDashboard
        });

        return serializeDocument<WidgetExecutionResult>({
            widget,
            data: serializeDocument<Record<string, unknown>[]>(finalData),
            executionTime: executionTimeMs,
            success: true,
        });
    } catch (error) {
        const executionTimeMs = Date.now() - startTime;
        logError(`Error executing widget "${widget.name}"`, error, { widgetId: widget.id });

        return serializeDocument<WidgetExecutionResult>({
            widget,
            data: [],
            executionTime: executionTimeMs,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
}

export async function refreshWidget(widgetId: string): Promise<WidgetExecutionResult> {
    return executeAndCacheWidget(widgetId);
}

export async function executeWidget(widgetId: string): Promise<WidgetExecutionResult> {
    const user = await requireAuth();
    const startTime = Date.now();
    const db = await getAuthDatabase();

    const widgetDoc = await db.collection('dashboard_widgets').findOne({ _id: new ObjectId(widgetId) });
    if (!widgetDoc) throw new Error('Widget not found');

    // Check approval status for widgets that require approval
    if (widgetDoc.requiresApproval && widgetDoc.approvalStatus !== 'approved') {
        throw new Error(`This widget requires Supervisor approval before execution. Status: ${widgetDoc.approvalStatus || 'pending'}`);
    }

    // SECURITY: If widget requires approval, verify pipeline hasn't changed since approval
    if (widgetDoc.requiresApproval && widgetDoc.approvalStatus === 'approved' && widgetDoc.approvalId) {
        const approval = await db.collection('query_approvals').findOne({
            _id: new ObjectId(widgetDoc.approvalId),
            status: 'approved',
        });

        if (!approval) {
            throw new Error('Approval record not found for this widget');
        }

        // Verify pipeline matches approved pipeline
        const currentPipelineHash = JSON.stringify(widgetDoc.pipeline);
        const approvedPipelineHash = JSON.stringify(approval.pipeline);

        if (currentPipelineHash !== approvedPipelineHash) {
            // Pipeline changed after approval - require new approval
            await db.collection('dashboard_widgets').updateOne(
                { _id: new ObjectId(widgetId) },
                {
                    $set: {
                        approvalStatus: 'pending_reapproval',
                        canExecute: false,
                        updatedAt: new Date(),
                    },
                }
            );
            throw new Error('Widget query has changed since approval. New approval required.');
        }

        // Check if approval has expired
        if (approval.expiresAt && new Date(approval.expiresAt) < new Date()) {
            await db.collection('dashboard_widgets').updateOne(
                { _id: new ObjectId(widgetId) },
                {
                    $set: {
                        approvalStatus: 'expired',
                        canExecute: false,
                        updatedAt: new Date(),
                    },
                }
            );
            throw new Error('Approval has expired. Please request new approval.');
        }
    }

    // Check dashboard access using RBAC
    const canAccess = await authz.canAccess(user.id, { type: 'dashboard', id: widgetDoc.dashboardId }, 'execute');
    if (!canAccess) throw new Error('Access denied: You do not have permission to execute this widget');

    const widget: DashboardWidget = serializeDocument<DashboardWidget>({
        id: widgetDoc._id.toString(),
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
        lastExecutedAt: widgetDoc.lastExecutedAt,
    });

    try {
        const [data, dashboard] = await Promise.all([
            executeAggregation(widget.collection!, widget.pipeline!),
            db.collection('dashboards').findOne({
                _id: new ObjectId(widgetDoc.dashboardId),
                ...namespaceOrLegacyFilter(),
            }),
        ]);
        const isPublicDashboard = dashboard?.sharing?.mode === 'PUBLIC';

        // Skip field masking for public dashboards - data is meant to be visible to everyone
        const finalData = isPublicDashboard
            ? data as Record<string, unknown>[]
            : await authz.maskFields(data as Record<string, unknown>[], user.id, { collection: widget.collection! });

        const executionTime = Date.now() - startTime;

        await db.collection('dashboard_widgets').updateOne({ _id: new ObjectId(widgetId) }, { $set: { lastExecutedAt: new Date() } });

        dashboardLogger('Executed widget', {
            widgetId: widget.id,
            dashboardId: widget.dashboardId,
            widgetName: widget.name,
            executionTimeMs: executionTime,
            resultCount: finalData.length,
            isPublicDashboard
        });

        return serializeDocument<WidgetExecutionResult>({ widget, data: serializeDocument<Record<string, unknown>[]>(finalData), executionTime, success: true });
    } catch (error) {
        const executionTime = Date.now() - startTime;
        logError(`Error executing widget "${widget.name}"`, error, { widgetId: widget.id });
        return serializeDocument<WidgetExecutionResult>({ widget, data: [], executionTime, success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    }
}

export async function executeDashboardWidgets(dashboardId: string): Promise<WidgetExecutionResult[]> {
    const user = await requireAuth();
    const db = await getAuthDatabase();

    // Check dashboard access using RBAC
    const canAccess = await authz.canAccess(user.id, { type: 'dashboard', id: dashboardId }, 'execute');
    if (!canAccess) throw new Error('Dashboard not found or access denied');

    const widgets = await db.collection('dashboard_widgets').find({ dashboardId }).toArray();
    const results = await Promise.all(widgets.map((w) => executeWidget(w._id.toString())));
    return results;
}

export async function getDashboardWithWidgets(dashboardId: string): Promise<DashboardWithWidgets | null> {
    const user = await requireAuth();
    const db = await getAuthDatabase();

    // First, fetch dashboard without authorization filter
    const dashboard = await db.collection('dashboards').findOne({
        _id: new ObjectId(dashboardId),
        ...namespaceOrLegacyFilter(),
    });
    if (!dashboard) return null;

    // Check access using RBAC authorization service
    const canAccess = await authz.canAccess(user.id, { type: 'dashboard', id: dashboardId }, 'view');
    if (!canAccess) return null;


    const widgetDocs = await db.collection('dashboard_widgets').find({ dashboardId }).sort({ 'position.y': 1, 'position.x': 1 }).toArray();

    const widgetsNeedingRefresh: string[] = [];
    const widgetsWithData: WidgetWithData[] = [];

    for (const doc of widgetDocs) {
        const widget: DashboardWidget = serializeDocument<DashboardWidget>({
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
            cachedResults: doc.cachedResults,
        });

        if (doc.cachedResults?.data) {
            widgetsWithData.push({
                ...widget,
                data: serializeDocument<Record<string, unknown>[]>(doc.cachedResults.data),
                executionTime: doc.cachedResults.executionTimeMs || 0,
                // Approval status fields
                approvalStatus: doc.approvalStatus,
                requiresApproval: doc.requiresApproval,
                canExecute: doc.canExecute,
            });
        } else {
            widgetsNeedingRefresh.push(doc._id.toString());
            widgetsWithData.push({
                ...widget,
                data: [],
                executionTime: 0,
                error: 'No cached data available',
                // Approval status fields
                approvalStatus: doc.approvalStatus,
                requiresApproval: doc.requiresApproval,
                canExecute: doc.canExecute,
            });
        }
    }

    // DISABLED: Background auto-refresh commented out - widgets now only refresh on manual user action
    // if (widgetsNeedingRefresh.length > 0) {
    //     logWarn(`Dashboard ${dashboardId} has ${widgetsNeedingRefresh.length} widgets without cache`, { widgetIds: widgetsNeedingRefresh });
    //     Promise.all(widgetsNeedingRefresh.map((id) => executeAndCacheWidget(id))).catch((err) => logError('Background refresh failed', err));
    // }

    return serializeDocument<DashboardWithWidgets>({
        dashboard: {
            id: dashboard._id.toString(),
            name: dashboard.name,
            description: dashboard.description,
            ownerId: dashboard.ownerId,
            createdBy: dashboard.createdBy,
            createdByName: dashboard.createdByName,
            isPublic: dashboard.isPublic,
            createdAt: dashboard.createdAt,
            updatedAt: dashboard.updatedAt,
            spaceId: dashboard.spaceId,
            spaceName: dashboard.spaceName,
            sharing: dashboard.sharing,
        },
        widgets: widgetsWithData,
    });
}
