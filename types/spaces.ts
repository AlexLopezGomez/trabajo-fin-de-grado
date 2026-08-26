/**
 * Space & Dashboard Sharing Type Definitions
 * Enterprise-grade permission system for dashboards
 * 
 * Philosophy: Flexible sharing at multiple levels (user, group, space)
 * with clear permission resolution and audit trail.
 */

// ============================================
// SPACE TYPES
// ============================================

/**
 * Space types - logical grouping categories
 */
export type SpaceType = "TEAM" | "PROJECT" | "PERSONAL";

/**
 * Default sharing configuration for a space
 */
export interface SpaceDefaultSharing {
  mode: "PRIVATE" | "SPACE_MEMBERS" | "PUBLIC";
  defaultPermission: DashboardPermission;
}

/**
 * Space member with their role in the space
 */
export interface SpaceMember {
  userId: string;
  userName?: string; // Populated from user lookup
  userEmail?: string; // Populated from user lookup
  role: "VIEWER" | "CONTRIBUTOR" | "ADMIN";
  addedBy: string;
  addedAt: Date;
}

/**
 * A Space is a logical container for related dashboards
 */
export interface Space {
  id: string;
  name: string;
  description?: string;
  type: SpaceType;
  namespace?: string;            // Project namespace for multi-tenant isolation

  // Ownership
  createdBy: string;

  // Members for quick access control
  members: SpaceMember[];

  // Group-based access control
  groupAccess?: Array<{
    groupId: string;
    groupName: string;
    grantedAt: Date;
    grantedBy: string;
  }>;

  // Default sharing settings for new dashboards
  defaultSharing: SpaceDefaultSharing;

  // Visual customization
  icon?: string;
  color?: string;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  isArchived: boolean;
}

/**
 * Space with computed stats for list views
 */
export interface SpaceSummary extends Space {
  dashboardCount: number;
  memberCount: number;
}

/**
 * Create space payload
 */
export interface CreateSpaceInput {
  name: string;
  description?: string;
  type: SpaceType;
  icon?: string;
  color?: string;
  defaultSharing?: SpaceDefaultSharing;
  // Initial access control
  initialGroupIds?: string[]; // Group IDs to grant access to this space
  initialMemberUserIds?: string[]; // User IDs to add as direct members
}

/**
 * Update space payload
 */
export interface UpdateSpaceInput {
  name?: string;
  description?: string;
  type?: SpaceType;
  icon?: string;
  color?: string;
  defaultSharing?: SpaceDefaultSharing;
  isArchived?: boolean;
}

// ============================================
// DASHBOARD SHARING TYPES
// ============================================

/**
 * Dashboard sharing modes
 */
export type DashboardSharingMode = "PRIVATE" | "CUSTOM" | "PUBLIC";

/**
 * Permission levels (ordered from least to most permissive)
 */
export type DashboardPermission = "VIEW" | "EDIT" | "ADMIN";

/**
 * Permission level hierarchy for resolution
 */
export const PERMISSION_HIERARCHY: Record<DashboardPermission, number> = {
  VIEW: 1,
  EDIT: 2,
  ADMIN: 3,
};

/**
 * Type of sharing target
 */
export type SharingTargetType = "USER" | "GROUP" | "SPACE";

/**
 * A sharing rule grants access to a specific target
 */
export interface DashboardSharingRule {
  id: string;
  type: SharingTargetType;
  targetId: string;                 // User ID, Group ID, or Space ID
  targetName?: string;              // Cached name for display
  permission: DashboardPermission;
  grantedBy: string;                // User who created this rule
  grantedAt: Date;
  expiresAt?: Date;                 // Optional expiration
  note?: string;                    // Optional reason/context
}

/**
 * Dashboard sharing configuration
 */
export interface DashboardSharing {
  mode: DashboardSharingMode;
  rules: DashboardSharingRule[];    // Only used when mode = CUSTOM
  publicPermission?: DashboardPermission; // Only used when mode = PUBLIC (default: VIEW)
}

/**
 * Enhanced Dashboard with sharing model
 */
export interface DashboardWithSharing {
  id: string;
  name: string;
  description?: string;

  // Location
  spaceId?: string;                 // Nullable - can be floating
  spaceName?: string;               // Cached for display

  // Ownership
  createdBy: string;
  createdByName?: string;           // Cached for display

  // Sharing configuration
  sharing: DashboardSharing;

  // Content
  widgetCount?: number;
  tags?: string[];

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  isArchived: boolean;

  // Cached stats
  stats?: {
    viewCount: number;
    lastViewedAt?: Date;
    lastViewedBy?: string;
  };
}

// ============================================
// PERMISSION RESOLUTION TYPES
// ============================================

/**
 * Source of access - helps explain why a user has access
 */
export type AccessSource =
  | { type: "OWNER" }
  | { type: "GLOBAL_ADMIN" }
  | { type: "PUBLIC" }
  | { type: "SPACE_MEMBER"; spaceId: string; spaceName: string }
  | { type: "DIRECT_SHARE"; ruleId: string }
  | { type: "GROUP_SHARE"; groupId: string; groupName: string; ruleId: string }
  | { type: "SPACE_SHARE"; spaceId: string; spaceName: string; ruleId: string }
  | { type: "SYSTEM_ROLE_CEILING"; reason: string };

/**
 * Resolved access for a user on a dashboard
 */
export interface ResolvedAccess {
  hasAccess: boolean;
  permission: DashboardPermission | null;
  sources: AccessSource[];          // All sources that grant access
  primarySource: AccessSource | null; // The source that provides the highest permission
}

/**
 * Dashboard list item with user's access info
 */
export interface DashboardWithAccess extends DashboardWithSharing {
  userAccess: ResolvedAccess;
}

// ============================================
// AUDIT TYPES
// ============================================

/**
 * Sharing-related audit actions
 */
export type SharingAuditAction =
  | "DASHBOARD_CREATED"
  | "DASHBOARD_SHARING_MODE_CHANGED"
  | "DASHBOARD_SHARE_ADDED"
  | "DASHBOARD_SHARE_REMOVED"
  | "DASHBOARD_SHARE_UPDATED"
  | "DASHBOARD_MOVED_TO_SPACE"
  | "DASHBOARD_REMOVED_FROM_SPACE"
  | "SPACE_CREATED"
  | "SPACE_MEMBER_ADDED"
  | "SPACE_MEMBER_REMOVED"
  | "SPACE_MEMBER_ROLE_CHANGED";

/**
 * Sharing audit log entry
 */
export interface SharingAuditLog {
  id: string;
  action: SharingAuditAction;
  actorId: string;
  actorName: string;
  resourceType: "dashboard" | "space";
  resourceId: string;
  resourceName: string;
  metadata: Record<string, unknown>;
  timestamp: Date;
}

// ============================================
// UI STATE TYPES
// ============================================

/**
 * Share modal state
 */
export interface ShareModalState {
  isOpen: boolean;
  dashboardId: string | null;
  dashboardName: string | null;
}

/**
 * Search result for share targets
 */
export interface ShareTargetSearchResult {
  id: string;
  name: string;
  type: SharingTargetType;
  description?: string;             // Group description or user email
  memberCount?: number;             // For groups/spaces
}

/**
 * Current access list item for display
 */
export interface AccessListItem {
  id: string;
  name: string;
  type: SharingTargetType;
  permission: DashboardPermission;
  accessSource: "DIRECT" | "VIA_GROUP" | "VIA_SPACE" | "OWNER" | "GLOBAL_ADMIN";
  grantedBy?: string;
  grantedAt?: Date;
  expiresAt?: Date;
  canModify: boolean;               // Can current user change this
}

/**
 * Filters for dashboard list
 */
export interface DashboardListFilters {
  search?: string;
  spaceId?: string | null;          // null = floating dashboards
  sharingMode?: DashboardSharingMode;
  permission?: "CAN_EDIT" | "VIEW_ONLY";
  showArchived?: boolean;
  showSharedWithMe?: boolean;
  showMyDashboards?: boolean;
}

/**
 * User's spaces tab data
 */
export interface UserSpaceAccess {
  spaceId: string;
  spaceName: string;
  spaceType: SpaceType;
  accessType: "DIRECT" | "VIA_GROUP" | "GLOBAL_ADMIN";
  role: "VIEWER" | "CONTRIBUTOR" | "ADMIN";
  groupName?: string;               // If access via group
}

// ============================================
// API RESPONSE TYPES
// ============================================

/**
 * Space list response
 */
export interface SpaceListResponse {
  spaces: SpaceSummary[];
  total: number;
}

/**
 * Dashboard list response with access info
 */
export interface DashboardListResponse {
  dashboards: DashboardWithAccess[];
  total: number;
}

/**
 * Share operation response
 */
export interface ShareOperationResponse {
  success: boolean;
  rule?: DashboardSharingRule;
  message?: string;
}

