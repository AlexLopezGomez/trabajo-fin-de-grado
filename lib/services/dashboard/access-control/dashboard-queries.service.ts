import { getAuthDatabase } from "@/lib/db/index";
import { PERMISSION_LEVELS } from "./permission-utils";
import { getUserContext } from "./user-context.service";
import type { UserContext } from "./user-context.service";
import type { DashboardWithSharing, ResolvedAccess } from "@/types/spaces";
import { namespaceOrLegacyFilter } from "@/lib/db/namespace";

/**
 * Dashboard Queries Service
 *
 * Handles complex query building and data fetching for dashboard access control.
 * Separates query logic from access resolution for better testability and maintainability.
 */

export interface DashboardFilters {
  spaceId?: string | null;
  sharingMode?: string;
  permission?: "CAN_EDIT" | "VIEW_ONLY";
  showArchived?: boolean;
  showSharedWithMe?: boolean;
  showMyDashboards?: boolean;
  search?: string;
}

export interface DashboardPagination {
  page: number;
  pageSize: number;
}

export interface DashboardQueryContext {
  userId: string;
  userRole: string;
  userContext: UserContext;
  isAdmin: boolean;
  filters: DashboardFilters;
  pagination: DashboardPagination;
}

/**
 * Build base query for dashboard filtering
 */
export function buildBaseDashboardQuery(filters: DashboardFilters): Record<string, unknown> {
  const query: Record<string, unknown> = {};

  if (!filters?.showArchived) {
    query.isArchived = { $ne: true };
  }

  if (filters?.search) {
    query.name = { $regex: filters.search, $options: "i" };
  }

  if (filters?.spaceId !== undefined) {
    if (filters.spaceId === null) {
      query.spaceId = null; // Floating dashboards
    } else {
      query.spaceId = filters.spaceId;
    }
  }

  if (filters?.sharingMode) {
    query["sharing.mode"] = filters.sharingMode;
  }

  return query;
}

/**
 * Build access-based query for non-admin users
 */
export function buildAccessBasedQuery(
  context: DashboardQueryContext
): Record<string, unknown> {
  const { userId, userContext, filters } = context;
  const userGroupIds = userContext.groups.map((g: { id: string }) => g.id);
  const userSpaceIds = userContext.spaces.map((s: { id: string }) => s.id);

  const query = buildBaseDashboardQuery(filters);

  if (filters?.showMyDashboards) {
    query.createdBy = userId;
  } else if (filters?.showSharedWithMe) {
    // Dashboards shared with me (not my own)
    query.createdBy = { $ne: userId };
    query.$or = [
      // Public dashboards
      { "sharing.mode": "PUBLIC" },
      // Space inherit where I'm a member
      {
        "sharing.mode": "SPACE_INHERIT",
        spaceId: { $in: userSpaceIds },
      },
      // Legacy: In my spaces, no explicit sharing mode defined yet (assumed shared)
      {
        spaceId: { $in: userSpaceIds },
        "sharing": { $exists: false }
      },
      // Custom rules targeting me directly
      {
        "sharing.mode": "CUSTOM",
        "sharing.rules.type": "USER",
        "sharing.rules.targetId": userId,
      },
      // Custom rules targeting my groups
      {
        "sharing.mode": "CUSTOM",
        "sharing.rules.type": "GROUP",
        "sharing.rules.targetId": { $in: userGroupIds },
      },
      // Custom rules targeting my spaces
      {
        "sharing.mode": "CUSTOM",
        "sharing.rules.type": "SPACE",
        "sharing.rules.targetId": { $in: userSpaceIds },
      },
    ];
  } else {
    // All dashboards I can access
    query.$or = [
      // My dashboards
      { createdBy: userId },
      { ownerId: userId }, // Legacy support
      // Public dashboards
      { "sharing.mode": "PUBLIC" },
      // Space inherit where I'm a member
      {
        "sharing.mode": "SPACE_INHERIT",
        spaceId: { $in: userSpaceIds },
      },
      // Legacy: In my spaces, no explicit sharing mode defined yet (assumed shared)
      {
        spaceId: { $in: userSpaceIds },
        "sharing": { $exists: false }
      },
      // Custom rules targeting me directly
      {
        "sharing.mode": "CUSTOM",
        "sharing.rules.type": "USER",
        "sharing.rules.targetId": userId,
      },
      // Custom rules targeting my groups
      {
        "sharing.mode": "CUSTOM",
        "sharing.rules.type": "GROUP",
        "sharing.rules.targetId": { $in: userGroupIds },
      },
      // Custom rules targeting my spaces
      {
        "sharing.mode": "CUSTOM",
        "sharing.rules.type": "SPACE",
        "sharing.rules.targetId": { $in: userSpaceIds },
      },
    ];
  }

  return query;
}

/**
 * Create MongoDB aggregation pipeline for dashboard fetching with widget counts
 */
import type { AggregationPipeline } from "@/lib/db/mongodb.types";
import type { DashboardDocument } from "@/lib/db/dashboard.types";

export function createDashboardAggregationPipeline(
  query: Record<string, unknown>,
  pagination: DashboardPagination
): AggregationPipeline {
  return [
    { $match: query },
    { $sort: { updatedAt: -1 } },
    { $skip: (pagination.page - 1) * pagination.pageSize },
    { $limit: pagination.pageSize },
    // Add widget count lookup
    {
      $lookup: {
        from: "dashboard_widgets",
        let: { dashboardId: { $toString: "$_id" } },
        pipeline: [
          { $match: { $expr: { $eq: ["$dashboardId", "$$dashboardId"] } } },
          { $count: "count" },
        ],
        as: "widgetStats",
      },
    },
    {
      $addFields: {
        widgetCount: {
          $ifNull: [{ $arrayElemAt: ["$widgetStats.count", 0] }, 0],
        },
      },
    },
    { $project: { widgetStats: 0 } },
  ];
}

/**
 * Convert MongoDB document to DashboardWithSharing
 */
export function mapDashboardDocument(doc: DashboardDocument): DashboardWithSharing {
  // Legacy handling: If spaceId exists but sharing is missing, default to CUSTOM (was SPACE_INHERIT)
  const defaultSharing = doc.spaceId
    ? { mode: "CUSTOM" as const, rules: [] }
    : { mode: "PRIVATE" as const, rules: [] };

  // Map SPACE_INHERIT to CUSTOM for backward compatibility with existing database documents
  let sharing = doc.sharing || defaultSharing;
  if ((sharing.mode as string) === "SPACE_INHERIT") {
    sharing = { ...sharing, mode: "CUSTOM" as const };
  }

  return {
    id: doc._id.toString(),
    name: doc.name,
    description: doc.description,
    spaceId: doc.spaceId?.toString(),
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

/**
 * Resolve access for multiple dashboards in batch
 */
export async function resolveBatchDashboardAccess(
  userId: string,
  userRole: string,
  dashboards: DashboardWithSharing[]
): Promise<(DashboardWithSharing & { userAccess: ResolvedAccess })[]> {
  const { resolveDashboardAccess } = await import("./dashboard-access.service");

  const dashboardsWithAccess = await Promise.all(
    dashboards.map(async (dashboard) => {
      const userAccess = await resolveDashboardAccess(userId, userRole, dashboard);
      return { ...dashboard, userAccess };
    })
  );

  return dashboardsWithAccess;
}

/**
 * Filter dashboards by permission level
 */
export function filterDashboardsByPermission(
  dashboards: (DashboardWithSharing & { userAccess: ResolvedAccess })[],
  permission: "CAN_EDIT" | "VIEW_ONLY"
): (DashboardWithSharing & { userAccess: ResolvedAccess })[] {
  if (permission === "CAN_EDIT") {
    return dashboards.filter(
      d => d.userAccess.permission && PERMISSION_LEVELS[d.userAccess.permission] >= PERMISSION_LEVELS.EDIT
    );
  } else if (permission === "VIEW_ONLY") {
    return dashboards.filter(
      d => d.userAccess.permission === "VIEW"
    );
  }
  return dashboards;
}

/**
 * Get accessible dashboards with full access resolution
 */
export async function getAccessibleDashboardsWithAccess(
  context: DashboardQueryContext
): Promise<{ dashboards: (DashboardWithSharing & { userAccess: ResolvedAccess })[]; total: number }> {
  const { userId, userRole, isAdmin, filters, pagination } = context;

  // Build query based on user permissions
  const baseQuery = isAdmin
    ? buildBaseDashboardQuery(filters)
    : buildAccessBasedQuery(context);

  // Wrap with namespace isolation
  const query = { $and: [namespaceOrLegacyFilter(), baseQuery] };

  const db = await getAuthDatabase();

  // Get total count
  const total = await db.collection("dashboards").countDocuments(query);

  // Fetch dashboards with aggregation
  const aggregationPipeline = createDashboardAggregationPipeline(query, pagination);
  const dashboardDocs = await db.collection("dashboards")
    .aggregate(aggregationPipeline)
    .toArray() as unknown as DashboardDocument[];

  // Convert to DashboardWithSharing objects
  const dashboards = dashboardDocs.map(mapDashboardDocument);

  // Resolve access for each dashboard
  const dashboardsWithAccess = await resolveBatchDashboardAccess(userId, userRole, dashboards);

  // Apply permission filtering if requested
  const filteredDashboards = filters?.permission
    ? filterDashboardsByPermission(dashboardsWithAccess, filters.permission)
    : dashboardsWithAccess;

  return { dashboards: filteredDashboards, total };
}

/**
 * Get dashboard with sharing details (simple fetch)
 */
export async function getDashboardWithSharing(dashboardId: string): Promise<DashboardWithSharing | null> {
  const db = await getAuthDatabase();
  const { ObjectId } = await import("mongodb");

  const doc = await db.collection("dashboards").findOne({
    _id: new ObjectId(dashboardId),
    ...namespaceOrLegacyFilter(),
  });

  if (!doc) return null;

  return mapDashboardDocument(doc as unknown as DashboardDocument);
}