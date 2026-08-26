import { withAuthDatabaseTransaction } from "@/lib/db/helpers";
import type {
  DashboardWithSharing,
  DashboardSharingMode,
  DashboardPermission,
  DashboardSharingRule,
} from "@/types/spaces";
import type { DashboardDocument } from "@/lib/db/dashboard.types";
import { AuditService } from "@/lib/services/audit.service";

/**
 * Dashboard Sharing Mode Service
 *
 * Handles dashboard sharing mode changes and space association management.
 * Provides validation and audit logging for mode transitions.
 */

/**
 * Update dashboard sharing mode
 */
export async function changeSharingMode(
  dashboardId: string,
  mode: DashboardSharingMode,
  publicPermission: DashboardPermission | undefined,
  actor: { id: string; name: string; email: string }
): Promise<DashboardWithSharing> {
  return withAuthDatabaseTransaction(async (db, session, ObjectId) => {
    const dashboard = await db.collection("dashboards").findOne(
      { _id: new ObjectId(dashboardId) },
      { session }
    );

    if (!dashboard) {
      throw new Error("Dashboard not found");
    }

    const oldMode = dashboard.sharing?.mode || "PRIVATE";

    const updateFields: Record<string, unknown> = {
      "sharing.mode": mode,
      updatedAt: new Date(),
    };

    // Clear rules when switching to non-CUSTOM modes
    if (mode !== "CUSTOM") {
      updateFields["sharing.rules"] = [];
    }

    // Set public permission for PUBLIC mode
    if (mode === "PUBLIC") {
      updateFields["sharing.publicPermission"] = publicPermission || "VIEW";
    } else {
      updateFields["sharing.publicPermission"] = null;
    }

    const result = await db.collection("dashboards").findOneAndUpdate(
      { _id: new ObjectId(dashboardId) },
      { $set: updateFields },
      { returnDocument: "after", session }
    );

    if (!result) {
      throw new Error("Dashboard not found after update");
    }

    // Audit log
    await AuditService.logAction({
      action: "DASHBOARD_SHARING_MODE_CHANGED",
      actor,
      targetType: "dashboard",
      targetId: dashboardId,
      targetName: dashboard.name,
      details: {
        oldMode,
        newMode: mode,
        publicPermission: mode === "PUBLIC" ? (publicPermission || "VIEW") : null,
      },
      session,
    });

    return mapDashboardDoc(result as unknown as DashboardDocument);
  });
}

/**
 * Move dashboard to a different space or remove from space
 */
export async function moveDashboardToSpace(
  dashboardId: string,
  spaceId: string | null,
  actor: { id: string; name: string; email: string }
): Promise<DashboardWithSharing> {
  return withAuthDatabaseTransaction(async (db, session, ObjectId) => {
    const dashboard = await db.collection("dashboards").findOne(
      { _id: new ObjectId(dashboardId) },
      { session }
    );

    if (!dashboard) {
      throw new Error("Dashboard not found");
    }

    let spaceName: string | null = null;

    // Verify space exists if moving to a space
    if (spaceId) {
      const space = await db.collection("spaces").findOne(
        { _id: new ObjectId(spaceId), isArchived: { $ne: true } },
        { session }
      );
      if (!space) {
        throw new Error("Space not found");
      }
      spaceName = space.name;
    }

    const oldSpaceId = dashboard.spaceId;
    const oldSpaceName = dashboard.spaceName;

    const result = await db.collection("dashboards").findOneAndUpdate(
      { _id: new ObjectId(dashboardId) },
      {
        $set: {
          spaceId,
          spaceName,
          updatedAt: new Date(),
        },
      },
      { returnDocument: "after", session }
    );

    // Audit log
    const action = spaceId ? "DASHBOARD_MOVED_TO_SPACE" : "DASHBOARD_REMOVED_FROM_SPACE";
    await AuditService.logAction({
      action: action as "DASHBOARD_MOVED_TO_SPACE" | "DASHBOARD_REMOVED_FROM_SPACE",
      actor,
      targetType: "dashboard",
      targetId: dashboardId,
      targetName: dashboard.name,
      details: {
        oldSpaceId,
        oldSpaceName,
        newSpaceId: spaceId,
        newSpaceName: spaceName,
      },
      session,
    });

    return mapDashboardDoc(result as unknown as DashboardDocument);
  });
}

/**
 * Validate sharing mode transition
 */
export function validateSharingModeTransition(
  currentMode: DashboardSharingMode,
  newMode: DashboardSharingMode
): { valid: boolean; error?: string } {
  // Define valid transitions (SPACE_INHERIT removed - use CUSTOM mode with space as target)
  const validTransitions: Record<DashboardSharingMode, DashboardSharingMode[]> = {
    PRIVATE: ["CUSTOM", "PUBLIC"],
    CUSTOM: ["PRIVATE", "PUBLIC"], // Clear rules when switching away
    PUBLIC: ["PRIVATE", "CUSTOM"], // Clear public permission
  };

  if (!validTransitions[currentMode].includes(newMode)) {
    return {
      valid: false,
      error: `Cannot transition from ${currentMode} to ${newMode}`,
    };
  }

  return { valid: true };
}

/**
 * Get default sharing configuration for a mode
 */
export function getDefaultSharingForMode(mode: DashboardSharingMode): {
  rules: DashboardSharingRule[];
  publicPermission: DashboardPermission | null;
} {
  switch (mode) {
    case "PRIVATE":
      return { rules: [], publicPermission: null };
    case "CUSTOM":
      return { rules: [], publicPermission: null }; // Rules will be added separately
    case "PUBLIC":
      return { rules: [], publicPermission: "VIEW" };
    default:
      throw new Error(`Unknown sharing mode: ${mode}`);
  }
}

/**
 * Map database document to DashboardWithSharing type
 */
function mapDashboardDoc(doc: DashboardDocument): DashboardWithSharing {
  // Map SPACE_INHERIT to CUSTOM for backward compatibility with existing documents
  let sharing = doc.sharing || { mode: "PRIVATE" as const, rules: [] };
  if (sharing.mode === "SPACE_INHERIT") {
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