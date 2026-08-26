import type {
  DashboardWithSharing,
  DashboardPermission,
  DashboardSharingRule,
  ResolvedAccess,
  AccessSource,
} from "@/types/spaces";
import { PERMISSION_LEVELS, higherPermission, isRuleExpired } from "./permission-utils";
import { getUserContext } from "./user-context.service";
import type { UserContext } from "./user-context.service";

/**
 * Access Resolver Service
 *
 * Core logic for resolving user access to resources.
 * Pure functions that evaluate permissions based on sharing rules and user context.
 */

export interface AccessResolutionContext {
  userId: string;
  userRole: string;
  userContext: UserContext;
  isAdminRole: boolean;
  resource: DashboardWithSharing;
}

/**
 * Internal helper for updating permission tracking during resolution
 */
function createPermissionUpdater() {
  const sources: AccessSource[] = [];
  let highestPermission: DashboardPermission | null = null;
  let primarySource: AccessSource | null = null;

  const updatePermission = (permission: DashboardPermission, source: AccessSource) => {
    sources.push(source);
    if (!highestPermission || PERMISSION_LEVELS[permission] > PERMISSION_LEVELS[highestPermission]) {
      highestPermission = permission;
      primarySource = source;
    }
  };

  return {
    updatePermission,
    getResult: () => ({
      sources,
      highestPermission,
      primarySource,
    }),
  };
}

/**
 * Check ownership-based access (highest priority)
 */
export function checkOwnershipAccess(
  userId: string,
  dashboard: DashboardWithSharing,
  updater: ReturnType<typeof createPermissionUpdater>
): boolean {
  if (dashboard.createdBy === userId) {
    updater.updatePermission("ADMIN", { type: "OWNER" });
    return true; // Early return possible
  }
  return false;
}

/**
 * Check global admin role access (highest priority)
 */
export function checkGlobalAdminAccess(
  isAdminRole: boolean,
  updater: ReturnType<typeof createPermissionUpdater>
): boolean {
  if (isAdminRole) {
    updater.updatePermission("ADMIN", { type: "GLOBAL_ADMIN" });
    return true; // Early return possible
  }
  return false;
}

/**
 * Resolve access based on PRIVATE sharing mode
 */
export function resolvePrivateAccess(
  updater: ReturnType<typeof createPermissionUpdater>
): void {
  // PRIVATE mode: Only creator has access (already checked above)
  // No additional permissions to grant
}

/**
 * Resolve access based on SPACE_INHERIT sharing mode
 */
export async function resolveSpaceInheritAccess(
  userId: string,
  userRole: string,
  dashboard: DashboardWithSharing,
  updater: ReturnType<typeof createPermissionUpdater>
): Promise<void> {
  if (!dashboard.spaceId) return;

  const { isSpaceMember } = await import("./user-context.service");
  const { isMember, spaceName, spaceMemberRole } = await isSpaceMember(userId, dashboard.spaceId);

  if (isMember && spaceMemberRole) {
    // Map space member role to dashboard permission
    let permission: DashboardPermission;
    if (spaceMemberRole === 'ADMIN') {
      permission = 'ADMIN';
    } else if (spaceMemberRole === 'CONTRIBUTOR') {
      permission = 'EDIT';
    } else {
      permission = 'VIEW';
    }

    // Apply system role ceiling
    // If system role is 'viewer', cap at VIEW even if space allows more
    if (userRole === 'viewer' && permission !== 'VIEW') {
      permission = 'VIEW';
    }

    updater.updatePermission(permission, {
      type: "SPACE_MEMBER",
      spaceId: dashboard.spaceId,
      spaceName: spaceName || "Unknown Space",
    });
  }
}

/**
 * Resolve access based on PUBLIC sharing mode
 */
export function resolvePublicAccess(
  publicPermission: DashboardPermission | undefined,
  updater: ReturnType<typeof createPermissionUpdater>
): void {
  // Everyone gets access with publicPermission (default VIEW)
  updater.updatePermission(publicPermission || "VIEW", { type: "PUBLIC" });
}

/**
 * Resolve access based on CUSTOM sharing mode
 */
export async function resolveCustomAccess(
  userId: string,
  rules: DashboardSharingRule[] | undefined,
  updater: ReturnType<typeof createPermissionUpdater>
): Promise<void> {
  if (!rules || rules.length === 0) return;

  // Get user's groups and spaces for rule matching
  const userContext = await getUserContext(userId);
  const userGroupIds = new Set(userContext.groups.map(g => g.id));
  const userSpaceIds = new Set(userContext.spaces.map(s => s.id));
  const groupNameMap = new Map(userContext.groups.map(g => [g.id, g.name]));
  const spaceNameMap = new Map(userContext.spaces.map(s => [s.id, s.name]));

  for (const rule of rules) {
    // Skip expired rules
    if (isRuleExpired(rule)) continue;

    switch (rule.type) {
      case "USER":
        // Direct user match
        if (rule.targetId === userId) {
          updater.updatePermission(rule.permission, {
            type: "DIRECT_SHARE",
            ruleId: rule.id,
          });
        }
        break;

      case "GROUP":
        // User is member of the target group
        if (userGroupIds.has(rule.targetId)) {
          updater.updatePermission(rule.permission, {
            type: "GROUP_SHARE",
            groupId: rule.targetId,
            groupName: groupNameMap.get(rule.targetId) || rule.targetName || "Unknown Group",
            ruleId: rule.id,
          });
        }
        break;

      case "SPACE":
        // User is member of the target space
        if (userSpaceIds.has(rule.targetId)) {
          updater.updatePermission(rule.permission, {
            type: "SPACE_SHARE",
            spaceId: rule.targetId,
            spaceName: spaceNameMap.get(rule.targetId) || rule.targetName || "Unknown Space",
            ruleId: rule.id,
          });
        }
        break;
    }
  }
}

/**
 * Apply system role ceilings to resolved permissions
 */
export function applySystemRoleCeilings(
  userRole: string,
  sources: AccessSource[],
  highestPermission: DashboardPermission | null
): { adjustedPermission: DashboardPermission | null; additionalSources: AccessSource[] } {
  if (!highestPermission) {
    return { adjustedPermission: null, additionalSources: [] };
  }

  const additionalSources: AccessSource[] = [];
  let adjustedPermission = highestPermission;
  const isOwner = sources.some(s => s.type === 'OWNER');

  // Viewers can never have more than VIEW permission
  if (userRole === 'viewer' && highestPermission !== 'VIEW') {
    adjustedPermission = 'VIEW';
    additionalSources.push({
      type: 'SYSTEM_ROLE_CEILING',
      reason: 'User system role (viewer) limits permissions to VIEW only',
    });
  }

  // Operators can have VIEW or EDIT, but not ADMIN (unless owner)
  if (userRole === 'operator' && highestPermission === 'ADMIN' && !isOwner) {
    adjustedPermission = 'EDIT';
    additionalSources.push({
      type: 'SYSTEM_ROLE_CEILING',
      reason: 'User system role (operator) limits permissions to EDIT',
    });
  }

  return { adjustedPermission, additionalSources };
}

/**
 * Core access resolution logic (pure function)
 * Evaluates all access rules and returns the resolved access
 */
export async function resolveAccessCore(context: AccessResolutionContext): Promise<ResolvedAccess> {
  const { userId, userRole, isAdminRole, resource: dashboard } = context;
  const updater = createPermissionUpdater();

  // Step 1: Check ownership (highest priority)
  if (checkOwnershipAccess(userId, dashboard, updater)) {
    const result = updater.getResult();
    return {
      hasAccess: true,
      permission: result.highestPermission,
      sources: result.sources,
      primarySource: result.primarySource,
    };
  }

  // Step 2: Check global admin role (highest priority)
  if (checkGlobalAdminAccess(isAdminRole, updater)) {
    const result = updater.getResult();
    return {
      hasAccess: true,
      permission: result.highestPermission,
      sources: result.sources,
      primarySource: result.primarySource,
    };
  }

  // Step 3: Evaluate sharing mode
  const { mode, rules, publicPermission } = dashboard.sharing;
  // Get mode as string to handle legacy SPACE_INHERIT from database documents
  const modeStr = mode as string;

  if (modeStr === "PRIVATE") {
    resolvePrivateAccess(updater);
  } else if (modeStr === "SPACE_INHERIT") {
    // Legacy support: SPACE_INHERIT mode still in database, resolve access via space membership
    await resolveSpaceInheritAccess(userId, userRole, dashboard, updater);
  } else if (modeStr === "PUBLIC") {
    resolvePublicAccess(publicPermission, updater);
  } else if (modeStr === "CUSTOM") {
    await resolveCustomAccess(userId, rules, updater);
  }

  // Step 4: Apply system role ceilings
  const result = updater.getResult();
  const { adjustedPermission, additionalSources } = applySystemRoleCeilings(
    userRole,
    result.sources,
    result.highestPermission
  );

  return {
    hasAccess: adjustedPermission !== null,
    permission: adjustedPermission,
    sources: [...result.sources, ...additionalSources],
    primarySource: result.primarySource,
  };
}