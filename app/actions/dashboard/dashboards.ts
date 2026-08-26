'use server';

/**
 * Dashboard CRUD Actions
 *
 * SECURITY: All inputs validated with Zod schemas and sanitized to prevent:
 * - XSS attacks
 * - NoSQL injection
 * - Resource exhaustion
 */

import { getAuthDatabase } from '@/lib/db';
import { requireAuth, requireOwnership, logAction } from '@/lib/auth/guards';
import { authz } from '@/lib/services/authorization.service';
import { ObjectId } from 'mongodb';
import { dashboard as dashboardLogger } from '@/lib/utils/logger';
import type { Dashboard, CreateDashboardInput, UpdateDashboardInput } from '@/types/dashboard';
import { serializeDocument } from './helpers';
import {
  CreateDashboardSchema,
  UpdateDashboardSchema,
  GetDashboardSchema,
  DeleteDashboardSchema,
} from '@/lib/validation/dashboard-schemas';
import { stripHtml } from '@/lib/security/sanitize';
import { withNamespaceField, namespaceOrLegacyFilter } from '@/lib/db/namespace';

export async function createDashboard(rawInput: unknown): Promise<Dashboard> {
    const user = await requireAuth();

    // ✅ SECURITY: Validate input with Zod schema
    const input = CreateDashboardSchema.parse(rawInput);

    const db = await getAuthDatabase();

    // ✅ SECURITY: Sanitize text fields to prevent XSS
    const sanitizedName = await stripHtml(input.name);
    const sanitizedDescription = input.description ? await stripHtml(input.description) : '';

    let spaceName: string | undefined;
    if (input.spaceId) {
        const space = await db.collection('spaces').findOne({ _id: new ObjectId(input.spaceId) });
        if (space) spaceName = space.name;
    }

    const now = new Date();
    let sharingMode = 'PRIVATE';
    if (input.spaceId) sharingMode = 'SPACE_INHERIT';
    else if (input.isPublic) sharingMode = 'PUBLIC';

    const dashboardDoc = {
        name: sanitizedName,
        description: sanitizedDescription,
        ownerId: user.id,
        createdBy: user.id,
        createdByName: user.name || user.email,
        isPublic: input.isPublic ?? false,
        spaceId: input.spaceId,
        spaceName,
        tags: input.tags || [],
        config: input.config || {},
        sharing: { mode: sharingMode, rules: [], publicPermission: input.isPublic ? 'VIEW' : undefined },
        createdAt: now,
        updatedAt: now,
    };

    const result = await db.collection('dashboards').insertOne(withNamespaceField(dashboardDoc));

    await logAction('dashboard.create', user.id, {
        dashboardId: result.insertedId.toString(),
        name: sanitizedName,
        spaceId: input.spaceId,
        sharingMode,
    });

    dashboardLogger('Created dashboard', {
        dashboardId: result.insertedId.toString(),
        userId: user.id,
        spaceId: input.spaceId,
        spaceName: spaceName || 'None',
        sharingMode,
    });

    return serializeDocument<Dashboard>({
        id: result.insertedId.toString(),
        name: dashboardDoc.name,
        description: dashboardDoc.description,
        ownerId: dashboardDoc.ownerId,
        createdBy: dashboardDoc.createdBy,
        createdByName: dashboardDoc.createdByName,
        isPublic: dashboardDoc.isPublic,
        createdAt: dashboardDoc.createdAt,
        updatedAt: dashboardDoc.updatedAt,
        spaceId: dashboardDoc.spaceId,
        spaceName: dashboardDoc.spaceName,
        sharing: dashboardDoc.sharing,
    });
}

export async function getDashboard(rawInput: unknown): Promise<Dashboard | null> {
    const user = await requireAuth();

    // ✅ SECURITY: Validate input
    const { dashboardId } = GetDashboardSchema.parse(rawInput);

    const db = await getAuthDatabase();

    // Check access using RBAC authorization service
    const canAccess = await authz.canAccess(user.id, { type: 'dashboard', id: dashboardId }, 'view');
    if (!canAccess) return null;

    const doc = await db.collection('dashboards').findOne({
        _id: new ObjectId(dashboardId),
        ...namespaceOrLegacyFilter(),
    });

    if (!doc) return null;

    return serializeDocument<Dashboard>({
        id: doc._id.toString(),
        name: doc.name,
        description: doc.description,
        ownerId: doc.ownerId,
        isPublic: doc.isPublic,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
    });
}

export async function updateDashboard(rawInput: unknown): Promise<Dashboard> {
    const user = await requireAuth();

    // ✅ SECURITY: Validate input
    const input = UpdateDashboardSchema.parse(rawInput);

    const db = await getAuthDatabase();

    const existing = await db.collection('dashboards').findOne({ _id: new ObjectId(input.dashboardId), ...namespaceOrLegacyFilter() });
    if (!existing) throw new Error('Dashboard not found');

    await requireOwnership(existing.ownerId);

    const updateDoc: Record<string, unknown> = { updatedAt: new Date() };

    // ✅ SECURITY: Sanitize text fields
    if (input.name !== undefined) {
        updateDoc.name = await stripHtml(input.name);
    }
    if (input.description !== undefined) {
        updateDoc.description = await stripHtml(input.description);
    }
    if (input.isPublic !== undefined) {
        updateDoc.isPublic = input.isPublic;
        // Update sharing mode based on isPublic
        if (input.isPublic) {
            updateDoc.sharing = { mode: 'PUBLIC', rules: [], publicPermission: 'VIEW' };
        } else if (existing.sharing?.mode === 'PUBLIC') {
            // If changing from public to private, set to PRIVATE
            updateDoc.sharing = { mode: 'PRIVATE', rules: [] };
        }
    }
    if (input.tags !== undefined) {
        updateDoc.tags = await Promise.all(input.tags.map(tag => stripHtml(tag)));
    }
    if (input.config !== undefined) {
        updateDoc.config = input.config;
    }

    await db.collection('dashboards').updateOne(
        { _id: new ObjectId(input.dashboardId) },
        { $set: updateDoc }
    );

    dashboardLogger('Updated dashboard', { dashboardId: input.dashboardId, userId: user.id });

    return serializeDocument<Dashboard>({
        id: input.dashboardId,
        name: updateDoc.name as string ?? existing.name,
        description: updateDoc.description as string ?? existing.description,
        ownerId: existing.ownerId,
        isPublic: updateDoc.isPublic as boolean ?? existing.isPublic,
        createdAt: existing.createdAt,
        updatedAt: new Date(),
    });
}

export async function deleteDashboard(rawInput: unknown): Promise<void> {
    const user = await requireAuth();

    // ✅ SECURITY: Validate input
    const { dashboardId } = DeleteDashboardSchema.parse(rawInput);

    const db = await getAuthDatabase();

    const existing = await db.collection('dashboards').findOne({ _id: new ObjectId(dashboardId), ...namespaceOrLegacyFilter() });
    if (!existing) throw new Error('Dashboard not found');

    await requireOwnership(existing.ownerId);

    const widgetDeleteResult = await db.collection('dashboard_widgets').deleteMany({ dashboardId, ...namespaceOrLegacyFilter() });
    await db.collection('dashboards').deleteOne({ _id: new ObjectId(dashboardId), ...namespaceOrLegacyFilter() });

    await logAction('dashboard.delete', user.id, {
        dashboardId,
        dashboardName: existing.name,
        widgetsDeleted: widgetDeleteResult.deletedCount,
    });

    dashboardLogger('Deleted dashboard', {
        dashboardId,
        widgetsDeleted: widgetDeleteResult.deletedCount,
        userId: user.id,
        dashboardName: existing.name,
    });
}
