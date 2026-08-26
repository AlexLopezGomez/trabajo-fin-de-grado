'use server';

/**
 * Query Approval Workflow Actions
 *
 * Server actions for managing heavy query approvals by Supervisors.
 * Operators create heavy queries that require Supervisor approval before execution.
 *
 * Workflow:
 * 1. Operator creates widget with heavy query → approval request created
 * 2. Supervisor reviews pending approvals → approves or rejects
 * 3. Approved widgets can be executed by anyone with permission
 * 4. Rejected widgets remain blocked until recreated
 */

import { getAuthDatabase } from '@/lib/db';
import { requireAuth } from '@/lib/auth/guards';
import { authz } from '@/lib/services/authorization.service';
import { ObjectId } from 'mongodb';
import type { QueryApproval, ApprovalQueueItem } from '@/types/rbac';
import { dashboard as dashboardLogger, warn as logWarn } from '@/lib/utils/logger';
import { VALIDATION } from '@/lib/constants/validation';
import { SlackService } from '@/lib/services/slack.service';
import { withNamespaceField, namespaceOrLegacyFilter } from '@/lib/db/namespace';

/**
 * Validate ObjectId format to prevent injection
 */
function validateObjectId(id: string, fieldName: string): void {
  if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
    throw new Error(`Invalid ${fieldName} format`);
  }
}

/**
 * Validate aggregation pipeline for security
 */
function validatePipeline(pipeline: Record<string, unknown>[]): void {
  if (!Array.isArray(pipeline)) {
    throw new Error('Pipeline must be an array');
  }

  if (pipeline.length === 0 || pipeline.length > 100) {
    throw new Error('Pipeline must contain 1-100 stages');
  }

  // Block write operations, arbitrary JS execution, schema disclosure, and admin operations
  const dangerousOps = [
    '$out', '$merge',              // Write operations
    '$function', '$accumulator',   // Arbitrary JavaScript execution
    '$collStats', '$indexStats',   // Schema/index information disclosure
    '$planCacheStats',             // Query plan cache disclosure
    '$listSessions', '$listLocalSessions', // Session enumeration
    '$currentOp',                  // Admin operations
  ];
  for (const stage of pipeline) {
    const stageKeys = Object.keys(stage);
    for (const op of dangerousOps) {
      if (stageKeys.includes(op)) {
        throw new Error(`Dangerous pipeline operator not allowed: ${op}`);
      }
    }
  }
}

/**
 * Request approval for a heavy query
 * Called automatically during widget creation for Operators with heavy queries
 */
export async function requestQueryApproval(input: {
  widgetId: string;
  dashboardId: string;
  collection: string;
  pipeline: Record<string, unknown>[];
  costScore: number;
  estimatedDocs?: number;
  tier?: 'green' | 'yellow' | 'red';
  suggestions?: string[];
  executionTimeMs?: number;
  usesIndex?: boolean;
}): Promise<{ approvalId: string }> {
  const user = await requireAuth();

  validateObjectId(input.widgetId, 'widgetId');
  validateObjectId(input.dashboardId, 'dashboardId');

  // Check if user has permission to create queries
  const capabilities = await authz.getEffectiveCapabilities(user.id);
  const canCreateQuery =
    capabilities.permissions.includes('create_query') ||
    user.role === 'admin' ||
    user.role === 'supervisor' ||
    user.role === 'operator';

  if (!canCreateQuery) {
    throw new Error('You do not have permission to create queries');
  }

  const canAccessDashboard = await authz.canAccess(
    user.id,
    { type: 'dashboard', id: input.dashboardId },
    'edit'
  );

  if (!canAccessDashboard) {
    throw new Error('Access denied: You cannot request approvals for this dashboard');
  }

  validatePipeline(input.pipeline);

  // Block system and RBAC collections
  const BLOCKED_COLLECTION_PREFIXES = ['system.', 'admin.', 'local.', 'migration_', 'backup_'];
  const BLOCKED_COLLECTIONS = ['app_users', 'permission_sets', 'query_approvals', 'audit_logs', 'security_events'];

  if (!input.collection ||
    !/^[a-zA-Z][a-zA-Z0-9_]{0,127}$/.test(input.collection) ||
    BLOCKED_COLLECTION_PREFIXES.some(prefix => input.collection.toLowerCase().startsWith(prefix)) ||
    BLOCKED_COLLECTIONS.includes(input.collection.toLowerCase())) {
    throw new Error('Invalid or restricted collection name');
  }

  const db = await getAuthDatabase();

  const [widget, dashboard] = await Promise.all([
    db.collection('dashboard_widgets').findOne({
      _id: new ObjectId(input.widgetId),
      dashboardId: input.dashboardId,
    }),
    db.collection('dashboards').findOne({
      _id: new ObjectId(input.dashboardId),
    }),
  ]);

  if (!widget) {
    throw new Error('Widget not found or does not belong to this dashboard');
  }

  const approval = await db.collection('query_approvals').insertOne(withNamespaceField({
    widgetId: input.widgetId,
    dashboardId: input.dashboardId,
    requesterId: user.id,
    requesterName: user.name || user.email,
    collection: input.collection,
    pipeline: input.pipeline,
    costScore: input.costScore,
    estimatedDocs: input.estimatedDocs,
    tier: input.tier,
    suggestions: input.suggestions,
    executionTimeMs: input.executionTimeMs,
    usesIndex: input.usesIndex,
    status: 'pending',
    requestedAt: new Date(),
    expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    createdAt: new Date(),
    updatedAt: new Date(),
  }));

  const approvalId = approval.insertedId.toString();

  dashboardLogger('Query approval requested', {
    approvalId,
    widgetId: input.widgetId,
    requesterId: user.id,
    costScore: input.costScore,
  });

  // Send Slack notification for red tier queries
  if (input.tier === 'red') {
    await SlackService.sendQueryApprovalNotification({
      approvalId,
      widgetId: input.widgetId,
      dashboardId: input.dashboardId,
      dashboardName: dashboard?.name || 'Unknown Dashboard',
      requesterName: user.name || user.email,
      requesterId: user.id,
      collection: input.collection,
      costScore: input.costScore,
      tier: input.tier,
      estimatedDocs: input.estimatedDocs,
      executionTimeMs: input.executionTimeMs,
      suggestions: input.suggestions,
    });
  }

  return { approvalId };
}

/**
 * Approve a pending query
 * Only Supervisors with approve_queries permission can call this
 */
export async function approveQuery(
  approvalId: string,
  notes?: string
): Promise<{ success: boolean }> {
  const user = await requireAuth();

  validateObjectId(approvalId, 'approvalId');

  // Check if user has permission to approve queries
  const capabilities = await authz.getEffectiveCapabilities(user.id);
  if (!capabilities.canApproveQueries) {
    throw new Error('Access denied: You do not have permission to approve queries');
  }

  const db = await getAuthDatabase();

  const approvalDoc = await db.collection('query_approvals').findOne({
    _id: new ObjectId(approvalId),
    ...namespaceOrLegacyFilter(),
  });

  if (!approvalDoc) {
    throw new Error('Approval request not found');
  }

  const canAccessDashboard = await authz.canAccess(
    user.id,
    { type: 'dashboard', id: approvalDoc.dashboardId },
    'view'
  );

  if (!canAccessDashboard) {
    throw new Error('Access denied: You cannot approve queries for dashboards you cannot access');
  }

  // Find and update the approval
  const approval = await db.collection('query_approvals').findOneAndUpdate(
    { _id: new ObjectId(approvalId), status: 'pending', ...namespaceOrLegacyFilter() },
    {
      $set: {
        status: 'approved',
        reviewerId: user.id,
        reviewerName: user.name || user.email,
        reviewedAt: new Date(),
        reviewNotes: notes,
        updatedAt: new Date(),
      },
    },
    { returnDocument: 'after' }
  );

  if (!approval) {
    throw new Error('Approval request not found or already processed');
  }

  // Update widget to allow execution
  await db.collection('dashboard_widgets').updateOne(
    { _id: new ObjectId(approval.widgetId) },
    {
      $set: {
        approvalStatus: 'approved',
        approvalId: approvalId,
        canExecute: true,
        updatedAt: new Date(),
      },
    }
  );

  dashboardLogger('Query approved', {
    approvalId,
    widgetId: approval.widgetId,
    reviewerId: user.id,
    requesterId: approval.requesterId,
  });

  return { success: true };
}

/**
 * Reject a pending query
 * Only Supervisors with approve_queries permission can call this
 */
export async function rejectQuery(
  approvalId: string,
  notes: string
): Promise<{ success: boolean }> {
  const user = await requireAuth();

  validateObjectId(approvalId, 'approvalId');

  // Check if user has permission to reject queries
  // Check if user has permission to reject queries
  const capabilities = await authz.getEffectiveCapabilities(user.id);
  if (!capabilities.canApproveQueries) {
    throw new Error('Access denied: You do not have permission to reject queries');
  }

  if (!notes || notes.trim().length === 0) {
    throw new Error('Rejection notes are required');
  }

  if (notes.length > VALIDATION.MAX_NOTES_LENGTH) {
    throw new Error('Rejection notes must not exceed 2000 characters');
  }

  const sanitizedNotes = notes
    .trim()
    .replace(/[<>]/g, '')
    .substring(0, VALIDATION.MAX_NOTES_LENGTH);

  const db = await getAuthDatabase();

  const approvalDoc = await db.collection('query_approvals').findOne({
    _id: new ObjectId(approvalId),
    ...namespaceOrLegacyFilter(),
  });

  if (!approvalDoc) {
    throw new Error('Approval request not found');
  }

  const canAccessDashboard = await authz.canAccess(
    user.id,
    { type: 'dashboard', id: approvalDoc.dashboardId },
    'view'
  );

  if (!canAccessDashboard) {
    throw new Error('Access denied: You cannot reject queries for dashboards you cannot access');
  }

  // Find and update the approval
  const approval = await db.collection('query_approvals').findOneAndUpdate(
    { _id: new ObjectId(approvalId), status: 'pending', ...namespaceOrLegacyFilter() },
    {
      $set: {
        status: 'rejected',
        reviewerId: user.id,
        reviewerName: user.name || user.email,
        reviewedAt: new Date(),
        reviewNotes: sanitizedNotes,
        updatedAt: new Date(),
      },
    },
    { returnDocument: 'after' }
  );

  if (!approval) {
    throw new Error('Approval request not found or already processed');
  }

  // Update widget status
  await db.collection('dashboard_widgets').updateOne(
    { _id: new ObjectId(approval.widgetId) },
    {
      $set: {
        approvalStatus: 'rejected',
        approvalId: approvalId,
        canExecute: false,
        updatedAt: new Date(),
      },
    }
  );

  logWarn('Query rejected', {
    approvalId,
    widgetId: approval.widgetId,
    reviewerId: user.id,
    requesterId: approval.requesterId,
  });

  return { success: true };
}

/**
 * Get pending approvals
 * Only users with view_query_approvals permission can call this
 */
export async function getPendingApprovals(): Promise<ApprovalQueueItem[]> {
  const user = await requireAuth();

  // Check permission (allow wildcard for admin)
  const capabilities = await authz.getEffectiveCapabilities(user.id);
  const hasPermission = capabilities.permissions.includes('view_query_approvals') ||
    capabilities.permissions.includes('*') ||
    capabilities.isAdmin;
  if (!hasPermission) {
    throw new Error('Access denied: You do not have permission to view approval queue');
  }

  const db = await getAuthDatabase();

  // Get pending approvals with dashboard info
  const approvals = await db
    .collection('query_approvals')
    .aggregate([
      { $match: { status: 'pending', ...namespaceOrLegacyFilter() } },
      {
        $addFields: {
          widgetObjectId: { $toObjectId: '$widgetId' },
        },
      },
      {
        $lookup: {
          from: 'dashboards',
          localField: 'dashboardId',
          foreignField: '_id',
          as: 'dashboard',
        },
      },
      {
        $lookup: {
          from: 'dashboard_widgets',
          localField: 'widgetObjectId',
          foreignField: '_id',
          as: 'widget',
        },
      },
      { $unwind: { path: '$dashboard', preserveNullAndEmptyArrays: true } },
      { $unwind: { path: '$widget', preserveNullAndEmptyArrays: true } },
      { $sort: { requestedAt: -1 } },
    ])
    .toArray();

  return approvals.map((a) => {
    const daysPending = Math.floor(
      (Date.now() - new Date(a.requestedAt).getTime()) / (1000 * 60 * 60 * 24)
    );

    return {
      id: a._id.toString(),
      widgetId: a.widgetId,
      dashboardId: a.dashboardId,
      dashboardName: a.dashboard?.name || 'Unknown Dashboard',
      widgetName: a.widget?.name,
      requesterName: a.requesterName,
      collection: a.collection,
      originalQuestion: a.widget?.originalQuestion,
      pipeline: a.pipeline,
      costScore: a.costScore,
      tier: a.tier,
      suggestions: a.suggestions,
      estimatedDocsToScan: a.estimatedDocs,
      executionTimeMs: a.executionTimeMs,
      usesIndex: a.usesIndex,
      requestedAt: a.requestedAt,
      daysPending,
    };
  });
}

/**
 * Get approval history (approved and rejected)
 * Only users with view_query_approvals permission can call this
 */
export async function getApprovalHistory(limit: number = 50): Promise<QueryApproval[]> {
  const user = await requireAuth();

  // Check permission (allow wildcard for admin)
  const capabilities = await authz.getEffectiveCapabilities(user.id);
  const hasPermission = capabilities.permissions.includes('view_query_approvals') ||
    capabilities.permissions.includes('*') ||
    capabilities.isAdmin;
  if (!hasPermission) {
    throw new Error('Access denied: You do not have permission to view approval history');
  }

  const db = await getAuthDatabase();

  const approvals = await db
    .collection('query_approvals')
    .find({ status: { $in: ['approved', 'rejected'] }, ...namespaceOrLegacyFilter() })
    .sort({ reviewedAt: -1 })
    .limit(limit)
    .toArray();

  return approvals.map((a) => ({
    id: a._id.toString(),
    widgetId: a.widgetId,
    dashboardId: a.dashboardId,
    requesterId: a.requesterId,
    requesterName: a.requesterName,
    collection: a.collection,
    pipeline: a.pipeline,
    costScore: a.costScore,
    estimatedDocs: a.estimatedDocs,
    tier: a.tier,
    suggestions: a.suggestions,
    executionTimeMs: a.executionTimeMs,
    usesIndex: a.usesIndex,
    status: a.status,
    reviewerId: a.reviewerId,
    reviewerName: a.reviewerName,
    reviewedAt: a.reviewedAt,
    reviewNotes: a.reviewNotes,
    requestedAt: a.requestedAt,
    expiresAt: a.expiresAt,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
  }));
}

/**
 * Cancel a pending approval (by requester)
 * Only the user who requested can cancel
 */
export async function cancelApproval(approvalId: string): Promise<{ success: boolean }> {
  const user = await requireAuth();

  validateObjectId(approvalId, 'approvalId');

  const db = await getAuthDatabase();

  // Find and update the approval (only if requester matches)
  const approval = await db.collection('query_approvals').findOneAndUpdate(
    { _id: new ObjectId(approvalId), status: 'pending', requesterId: user.id, ...namespaceOrLegacyFilter() },
    {
      $set: {
        status: 'cancelled',
        updatedAt: new Date(),
      },
    },
    { returnDocument: 'after' }
  );

  if (!approval) {
    throw new Error('Approval request not found, already processed, or you are not the requester');
  }

  // Update widget
  await db.collection('dashboard_widgets').updateOne(
    { _id: new ObjectId(approval.widgetId) },
    {
      $set: {
        approvalStatus: 'cancelled',
        canExecute: false,
        updatedAt: new Date(),
      },
    }
  );

  dashboardLogger('Query approval cancelled', {
    approvalId,
    widgetId: approval.widgetId,
    requesterId: user.id,
  });

  return { success: true };
}
