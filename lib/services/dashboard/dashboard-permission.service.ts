/**
 * RESOLVED ACCESS (Resource-Specific Rights)
 *
 * This module determines what a user can do WITH A SPECIFIC RESOURCE.
 * It evaluates ownership, sharing rules, space membership, and group access.
 *
 * KEY CONCEPT: Resource-Specific Rights
 * - "Can this user EDIT dashboard #123?"
 * - "Does this user have ADMIN access to space #456?"
 * - Returns: Permission level (VIEW/EDIT/ADMIN) + WHY they have access
 *
 * USE THIS FOR:
 * ✅ Dashboard access checks - Before showing/editing a dashboard
 * ✅ Space access checks - Determining user's role in a space
 * ✅ Sharing logic - Who can access this specific resource?
 * ✅ Audit trails - "User X has EDIT access via sharing rule Y"
 *
 * DO NOT USE FOR:
 * ❌ Collection/query authorization - Use collection-access.ts
 * ❌ User capabilities lookup - Use permission-resolver.ts
 * ❌ Field-level security - Use field-masking.ts
 *
 * RESOLUTION ALGORITHM:
 * 1. Ownership (creator) → ADMIN
 * 2. Global admin role → ADMIN
 * 3. Sharing mode (PRIVATE, SPACE_INHERIT, CUSTOM, PUBLIC)
 * 4. Custom sharing rules (USER, GROUP, SPACE targets)
 * 5. Return highest permission + access source
 *
 * ARCHITECTURE NOTE:
 * This will eventually be consolidated into AuthorizationService.resolveResourceAccess()
 *
 * RELATED MODULES:
 * - permission-resolver.ts - User capabilities (what permissions does user have globally?)
 * - collection-access.ts - Database access (can user query collection X?)
 * - authorization.service.ts - Unified entry point (future migration target)
 */

/**
 * Dashboard Permission Service (Legacy Facade)
 *
 * This file now serves as a backward compatibility layer.
 * All functionality has been refactored into specialized modules in ./access-control/
 *
 * For new code, import from: @/lib/services/dashboard/access-control
 */

import type {
  DashboardWithSharing,
  DashboardPermission,
  DashboardSharingRule,
  ResolvedAccess,
  AccessSource,
  PERMISSION_HIERARCHY,
} from "@/types/spaces";

// Re-export everything from the new modular structure for backward compatibility
export * from "./access-control";

import { isRuleExpired } from "./access-control/permission-utils";

// Dashboard access functions are now imported from dashboard-access.service.ts

// All functions are re-exported from the new modular structure

