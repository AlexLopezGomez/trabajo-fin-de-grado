import { getAuthDatabase } from "@/lib/db";
import type { SharingTargetType, ShareTargetSearchResult, DashboardSharingRule } from "@/types/spaces";

/**
 * Dashboard Sharing Targets Service
 *
 * Handles target resolution and search functionality for sharing.
 * Provides utilities for finding and validating users, groups, and spaces.
 */

/**
 * Resolve target name by type and ID
 */
import type { DatabaseClient, DatabaseSession } from "@/lib/db/types";

export async function resolveTargetName(
  db: DatabaseClient,
  type: SharingTargetType,
  targetId: string,
  session?: DatabaseSession
): Promise<string> {
  const { ObjectId } = await import("mongodb");

  switch (type) {
    case "USER": {
      const user = await db.collection("app_users").findOne(
        { _id: new ObjectId(targetId) },
        { session }
      );
      if (!user) throw new Error("User not found");
      return user.name;
    }
    case "GROUP": {
      const group = await db.collection("groups").findOne(
        { _id: new ObjectId(targetId), deletedAt: null },
        { session }
      );
      if (!group) throw new Error("Group not found");
      return group.name;
    }
    case "SPACE": {
      const space = await db.collection("spaces").findOne(
        { _id: new ObjectId(targetId), isArchived: { $ne: true } },
        { session }
      );
      if (!space) throw new Error("Space not found");
      return space.name;
    }
    default:
      throw new Error(`Unknown target type: ${type}`);
  }
}

/**
 * Search for share targets (users, groups, spaces)
 */
export async function searchShareTargets(
  query: string,
  types?: SharingTargetType[],
  excludeIds?: string[],
  limit: number = 10
): Promise<ShareTargetSearchResult[]> {
  const db = await getAuthDatabase();
  const { ObjectId } = await import("mongodb");
  const results: ShareTargetSearchResult[] = [];

  const searchTypes = types || ["USER", "GROUP", "SPACE"];
  const excludeSet = new Set(excludeIds || []);

  // Search users
  if (searchTypes.includes("USER")) {
    const users = await db.collection("app_users")
      .find({
        $or: [
          { name: { $regex: query, $options: "i" } },
          { email: { $regex: query, $options: "i" } },
        ],
      })
      .limit(limit)
      .toArray();

    for (const user of users) {
      if (!excludeSet.has(user._id.toString())) {
        results.push({
          id: user._id.toString(),
          name: user.name,
          type: "USER",
          description: user.email,
        });
      }
    }
  }

  // Search groups
  if (searchTypes.includes("GROUP")) {
    const groups = await db.collection("groups")
      .find({
        name: { $regex: query, $options: "i" },
        deletedAt: null,
      })
      .limit(limit)
      .toArray();

    for (const group of groups) {
      if (!excludeSet.has(group._id.toString())) {
        results.push({
          id: group._id.toString(),
          name: group.name,
          type: "GROUP",
          description: `Group with ${group.memberIds?.length || 0} members`,
        });
      }
    }
  }

  // Search spaces
  if (searchTypes.includes("SPACE")) {
    const spaces = await db.collection("spaces")
      .find({
        name: { $regex: query, $options: "i" },
        isArchived: { $ne: true },
      })
      .limit(limit)
      .toArray();

    for (const space of spaces) {
      if (!excludeSet.has(space._id.toString())) {
        results.push({
          id: space._id.toString(),
          name: space.name,
          type: "SPACE",
          description: space.description || `Space`,
        });
      }
    }
  }

  return results;
}

/**
 * Validate target exists and is accessible
 */
export async function validateTarget(
  type: SharingTargetType,
  targetId: string
): Promise<{ exists: boolean; name?: string; error?: string }> {
  try {
    const db = await getAuthDatabase();
    const name = await resolveTargetName(db, type, targetId);
    return { exists: true, name };
  } catch (error) {
    return {
      exists: false,
      error: error instanceof Error ? error.message : "Target validation failed"
    };
  }
}

/**
 * Get multiple targets by IDs and type
 */
export async function getTargetsByIds(
  type: SharingTargetType,
  targetIds: string[]
): Promise<Array<{ id: string; name: string }>> {
  if (targetIds.length === 0) return [];

  const db = await getAuthDatabase();
  const { ObjectId } = await import("mongodb");

  const objectIds = targetIds.map(id => new ObjectId(id));

  let collection: string;
  let filter: Record<string, unknown> = { _id: { $in: objectIds } };

  switch (type) {
    case "USER":
      collection = "app_users";
      break;
    case "GROUP":
      collection = "groups";
      filter.deletedAt = null;
      break;
    case "SPACE":
      collection = "spaces";
      filter.isArchived = { $ne: true };
      break;
    default:
      throw new Error(`Unknown target type: ${type}`);
  }

  const targets = await db.collection(collection)
    .find(filter)
    .toArray();

  return targets.map(target => ({
    id: target._id.toString(),
    name: target.name,
  }));
}

/**
 * Check if target has specific permission on dashboard
 */
export async function checkTargetPermission(
  dashboardId: string,
  type: SharingTargetType,
  targetId: string,
  requiredPermission: "VIEW" | "EDIT"
): Promise<{ hasPermission: boolean; actualPermission?: string }> {
  const db = await getAuthDatabase();
  const { ObjectId } = await import("mongodb");

  const dashboard = await db.collection("dashboards").findOne(
    { _id: new ObjectId(dashboardId) }
  );

  if (!dashboard) {
    return { hasPermission: false };
  }

  // Check sharing mode
  const sharing = dashboard.sharing || { mode: "PRIVATE", rules: [] };

  // If public, check public permission
  if (sharing.mode === "PUBLIC" && sharing.publicPermission) {
    return {
      hasPermission: requiredPermission === "VIEW" ||
        (requiredPermission === "EDIT" && sharing.publicPermission === "EDIT"),
      actualPermission: sharing.publicPermission,
    };
  }

  // Check custom rules
  const rule = sharing.rules?.find(
    (r: DashboardSharingRule) => r.type === type && r.targetId === targetId
  );

  if (rule) {
    return {
      hasPermission: requiredPermission === "VIEW" ||
        (requiredPermission === "EDIT" && rule.permission === "EDIT"),
      actualPermission: rule.permission,
    };
  }

  return { hasPermission: false };
}