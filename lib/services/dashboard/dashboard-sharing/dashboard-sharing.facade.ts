/**
 * Dashboard Sharing Facade
 *
 * Unified API for dashboard sharing operations.
 * Orchestrates specialized services while maintaining backward compatibility.
 */

// Import individual services
import {
  changeSharingMode,
  moveDashboardToSpace,
  validateSharingModeTransition,
  getDefaultSharingForMode,
} from './sharing-mode.service';

import {
  addSharingRule,
  updateSharingRule,
  removeSharingRule,
  validateSharingRule,
  getSharingRules,
} from './sharing-rules.service';

import {
  resolveTargetName,
  searchShareTargets,
  validateTarget,
  getTargetsByIds,
  checkTargetPermission,
} from './sharing-targets.service';

// Re-export types for convenience
export type {
  DashboardWithSharing,
  DashboardSharingRule,
  DashboardSharingMode,
  DashboardPermission,
  SharingTargetType,
  ShareTargetSearchResult,
} from '@/types/spaces';

// Re-export all functions
export {
  changeSharingMode,
  moveDashboardToSpace,
  validateSharingModeTransition,
  getDefaultSharingForMode,
  addSharingRule,
  updateSharingRule,
  removeSharingRule,
  validateSharingRule,
  getSharingRules,
  resolveTargetName,
  searchShareTargets,
  validateTarget,
  getTargetsByIds,
  checkTargetPermission,
};

// Legacy function names for backward compatibility
export const updateSharingModeService = changeSharingMode;
export const moveDashboardToSpaceService = moveDashboardToSpace;
export const addSharingRuleService = addSharingRule;
export const updateSharingRuleService = updateSharingRule;
export const removeSharingRuleService = removeSharingRule;
export const searchShareTargetsService = searchShareTargets;

// Import required services
import { getAuthDatabase } from "@/lib/db";
import type {
  DashboardWithSharing,
  SharingTargetType,
  DashboardPermission,
} from "@/types/spaces";
import type { DashboardDocument } from "@/lib/db/dashboard.types";

/**
 * Get dashboard sharing details (legacy function)
 */
export async function getDashboardSharingDetailsService(
  dashboardId: string
): Promise<{
  dashboard: DashboardWithSharing;
  currentAccess: {
    id: string;
    name: string;
    type: SharingTargetType;
    permission: DashboardPermission;
    grantedBy?: string;
    grantedAt?: Date;
    expiresAt?: Date;
  }[];
} | null> {
  const db = await getAuthDatabase();
  const { ObjectId } = await import("mongodb");

  const dashboard = await db.collection("dashboards").findOne({
    _id: new ObjectId(dashboardId),
  });

  if (!dashboard) return null;

  const currentAccess: {
    id: string;
    name: string;
    type: SharingTargetType;
    permission: DashboardPermission;
    grantedBy?: string;
    grantedAt?: Date;
    expiresAt?: Date;
  }[] = [];

  // Add rules to current access list
  const rules = dashboard.sharing?.rules || [];
  for (const rule of rules) {
    currentAccess.push({
      id: rule.id,
      name: rule.targetName || rule.targetId,
      type: rule.type,
      permission: rule.permission,
      grantedBy: rule.grantedBy,
      grantedAt: rule.grantedAt,
      expiresAt: rule.expiresAt,
    });
  }

  return {
    dashboard: mapDashboardDoc(dashboard as DashboardDocument),
    currentAccess,
  };
}

/**
 * Initialize sharing for an existing dashboard (migration helper)
 */
export async function initializeDashboardSharingService(
  dashboardId: string
): Promise<void> {
  const db = await getAuthDatabase();
  const { ObjectId } = await import("mongodb");

  const dashboard = await db.collection("dashboards").findOne({
    _id: new ObjectId(dashboardId),
  });

  if (!dashboard) {
    throw new Error("Dashboard not found");
  }

  // Only initialize if sharing doesn't exist
  if (!dashboard.sharing) {
    const sharing = {
      mode: dashboard.isPublic ? "PUBLIC" : "PRIVATE",
      rules: [],
      publicPermission: dashboard.isPublic ? "VIEW" : null,
    };

    await db.collection("dashboards").updateOne(
      { _id: new ObjectId(dashboardId) },
      { $set: { sharing } }
    );
  } else if (dashboard.isPublic && dashboard.sharing.mode !== "PUBLIC") {
    // Fix existing dashboards that have isPublic=true but sharing.mode is not PUBLIC
    const sharing = {
      ...dashboard.sharing,
      mode: "PUBLIC" as const,
      publicPermission: dashboard.sharing.publicPermission || "VIEW",
    };

    await db.collection("dashboards").updateOne(
      { _id: new ObjectId(dashboardId) },
      { $set: { sharing } }
    );
  }
}

/**
 * Helper to map MongoDB document to DashboardWithSharing
 */
function mapDashboardDoc(doc: DashboardDocument): DashboardWithSharing {
  // Map SPACE_INHERIT to CUSTOM for backward compatibility with existing database documents
  let sharing = doc.sharing || { mode: "PRIVATE" as const, rules: [] };
  if ((sharing.mode as string) === "SPACE_INHERIT") {
    sharing = { ...sharing, mode: "CUSTOM" as const };
  }

  return {
    id: doc._id.toString(),
    name: doc.name,
    description: doc.description,
    spaceId: doc.spaceId?.toString() || doc.spaceId,
    spaceName: doc.spaceName,
    createdBy: doc.createdBy?.toString() || doc.ownerId?.toString(),
    createdByName: doc.createdByName,
    sharing: sharing as DashboardWithSharing["sharing"],
    widgetCount: doc.widgetCount,
    tags: doc.tags,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    isArchived: doc.isArchived || false,
    stats: doc.stats,
  };
}