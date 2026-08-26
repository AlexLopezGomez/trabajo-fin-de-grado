/**
 * RBAC Type Definitions for Admin UI
 * Based on UI-ADMIN.md design document
 */

import { UserRole } from "@/auth";

// ============================================
// CURRENT STATE (v1 - Existing)
// ============================================

/**
 * Application user (current schema in app_users collection)
 */
export interface AppUser {
  _id: string;
  email: string;
  name: string;
  role: UserRole;
  country?: string;
  password?: string;
  providers?: string[];
  image?: string;
  createdAt: Date;
  lastLoginAt?: Date;
  createdBy?: string;
}

/**
 * User list item (for display in admin UI)
 */
export interface UserListItem {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  country?: string;
  lastLogin?: Date;
  status: "active" | "inactive";
  image?: string;
}

/**
 * User detail view (current simple model)
 */
export interface UserDetail extends UserListItem {
  createdAt: Date;
  providers: string[];
  // Future: groups, role assignments, effective permissions
}

// ============================================
// FUTURE STATE (v2 - Enhanced RBAC per UI-ADMIN.md)
// ============================================

/**
 * Permission - Atomic action
 */
export interface Permission {
  id: string; // e.g., "view_dashboard"
  name: string; // e.g., "View Dashboard"
  description: string;
  category: "dashboard" | "space" | "user" | "system" | "query";
}

/**
 * Permission Set - Bundle of permissions (includes both built-in and custom)
 * After Migration 008, this is now the 4-Role RBAC model
 */
export interface PermissionSet {
  id: string; // e.g., "operator" or auto-generated UUID for custom
  name: string; // e.g., "Operator"
  description: string;
  permissionIds: string[]; // References to permissions
  isCustom: boolean; // true for user-created roles
  isBuiltIn?: boolean; // true for built-in functional roles
  deprecated?: boolean; // true for deprecated roles
  dataAccess?: DataAccess; // Data access configuration (unified model)
  createdBy?: string; // Admin who created it (for custom roles)
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Data Access Configuration - Defines what data a role can access
 */
export interface DataAccess {
  collections: string[] | '*'; // MongoDB collections this role can access (e.g., ["users", "orders"]) or '*' for all
  fieldMasking: {
    [collection: string]: {
      [field: string]: "visible" | "masked" | "hidden";
    };
  };
  rowLevelFilters?: {
    filterType: "country" | "none";
    filterField?: string;
  };
}

/**
 * Unified Permission Set - Hybrid Model
 *
 * This is the SINGLE SOURCE OF TRUTH for what a role can do.
 * It combines:
 * 1. UI Permissions (permissionIds) - What actions can be performed
 * 2. Data Access (dataAccess) - What data can be accessed and how
 *
 * Key Principles:
 * - Each user has ONE role that defines their permission ceiling
 * - Groups provide resource access (spaces/dashboards), NOT additional permissions
 * - Role = permission ceiling; groups cannot escalate privileges
 */
export interface UnifiedPermissionSet {
  id: string; // UUID or slug (e.g., "sales", "finance", "custom-xyz")
  name: string; // Display name (e.g., "Sales")
  description: string; // Human-readable description

  // UI Permissions (from PERMISSION_CATALOG)
  permissionIds: string[]; // ["view_dashboard", "create_query", ...] or ["*"] for admin

  // Data Access (from legacy ROLE_PERMISSIONS)
  dataAccess: DataAccess;

  // Metadata
  isBuiltIn: boolean; // true for admin, supervisor, operator, viewer
  isCustom: boolean; // true for roles created by users
  createdBy?: string; // User ID of creator (for custom roles)
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Create/Update custom role input
 */
export interface CreateCustomRoleInput {
  name: string;
  description: string;
  permissionIds: string[];
}

export interface UpdateCustomRoleInput {
  name?: string;
  description?: string;
  permissionIds?: string[];
}

/**
 * Scope - Where permissions apply
 */
export interface Scope {
  type: "GLOBAL" | "SPACE" | "DASHBOARD" | "DATASOURCE";
  resourceId?: string; // spaceId, dashboardId, etc. (null if GLOBAL)
}

/**
 * Role Assignment - Binding of PermissionSet + Scope to User/Group
 */
export interface RoleAssignment {
  id: string;
  targetType: "user" | "group";
  targetId: string; // userId or groupId
  permissionSetId: string; // e.g., "analyst"
  scope: Scope;
  assignedBy: string; // userId of admin
  assignedAt: Date;
}

/**
 * Group - Collection of users
 */
export interface Group {
  id: string;
  name: string;
  description: string;
  memberIds: string[]; // References to users
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Audit log entry for permission changes
 */
export interface PermissionAuditLog {
  id: string;
  action: "ROLE_CHANGED" | "ROLE_ASSIGNED" | "ROLE_REVOKED" | "USER_CREATED" | "USER_DELETED" | "GROUP_MODIFIED";
  actorId: string; // Admin who performed the action
  actorName: string;
  actorEmail?: string;
  targetType: "user" | "group";
  targetId: string;
  targetName: string;
  targetEmail?: string;
  details: {
    oldRole?: string;
    newRole?: string;
    permissionSetId?: string;
    scope?: Scope;
    reason?: string;
    [key: string]: any;
  };
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Audit log filters
 */
export interface AuditLogFilters {
  userId?: string;
  action?: string;
  actorId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}

/**
 * Audit log response
 */
export interface AuditLogResponse {
  logs: PermissionAuditLog[];
  total: number;
  hasMore: boolean;
}

// ============================================
// UI STATE TYPES
// ============================================

/**
 * Filters for user list
 */
export interface UserListFilters {
  search?: string; // Name or email
  role?: UserRole;
  groupId?: string; // Filter by group membership
  status?: "active" | "inactive" | "all";
}

/**
 * Lightweight group for filter dropdowns
 */
export interface GroupFilterItem {
  id: string;
  name: string;
  memberCount: number;
}

/**
 * Pagination state
 */
export interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
}

/**
 * Sort state
 */
export interface SortState {
  field: keyof UserListItem;
  direction: "asc" | "desc";
}

// ============================================
// API RESPONSE TYPES
// ============================================

/**
 * User list response
 */
export interface UserListResponse {
  users: UserListItem[];
  pagination: PaginationState;
}

/**
 * User detail response
 */
export interface UserDetailResponse {
  user: UserDetail;
  // Future: directRoles, inheritedRoles, effectivePermissions
}

/**
 * Generic API response wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ============================================
// QUERY APPROVAL TYPES (Migration 008)
// ============================================

/**
 * Query Approval - Tracks approval workflow for heavy queries
 */
export interface QueryApproval {
  id: string;
  widgetId: string;
  dashboardId: string;
  requesterId: string;
  requesterName: string;
  namespace?: string;            // Project namespace for multi-tenant isolation

  // Query details
  collection: string;
  pipeline: Record<string, unknown>[];
  costScore: number;
  estimatedDocs?: number;

  // Query scoring metadata (Phase 2 integration)
  tier?: 'green' | 'yellow' | 'red';
  suggestions?: string[];
  executionTimeMs?: number;
  usesIndex?: boolean;

  // Approval status
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';

  // Review metadata
  reviewerId?: string;
  reviewerName?: string;
  reviewedAt?: Date;
  reviewNotes?: string;

  // Timestamps
  requestedAt: Date;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Approval Queue Item - Lightweight view for approval queue UI
 */
export interface ApprovalQueueItem {
  id: string;
  widgetId: string;
  dashboardId: string;
  dashboardName: string;
  widgetName?: string;
  requesterName: string;
  collection: string;
  originalQuestion?: string;
  pipeline?: Record<string, unknown>[];
  costScore: number;
  tier?: 'green' | 'yellow' | 'red';
  suggestions?: string[];
  estimatedDocsToScan?: number;
  executionTimeMs?: number;
  usesIndex?: boolean;
  requestedAt: Date;
  daysPending: number;
}
