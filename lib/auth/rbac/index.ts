/**
 * RBAC Module - Types and Core Role Resolution
 *
 * This module now only exports:
 * - Type definitions (PermissionSet, RoleAssignment, etc.)
 * - Role resolution (getPermissionSetForRole, canRoleSeeField)
 * - Built-in role definitions (getBuiltInPermissionSet)
 *
 * For authorization checks, use AuthorizationService:
 * ```typescript
 * import { authz } from '@/lib/services/authorization.service';
 * 
 * // Check access
 * const canEdit = await authz.canAccess(userId, { type: 'dashboard', id: '123' }, 'edit');
 * 
 * // Get capabilities
 * const caps = await authz.getEffectiveCapabilities(userId);
 * 
 * // Mask fields
 * const masked = await authz.maskFields(data, userId, { collection: 'users' });
 * ```
 *
 * @module lib/rbac
 */

// ============================================
// ROLE RESOLUTION (Unified - supports custom + built-in)
// ============================================

export {
  getPermissionSetForRole,
  canRoleSeeField,
  type UnifiedPermissionSet,
} from './role-resolver';

// ============================================
// BUILT-IN ROLE DEFINITIONS
// ============================================

export {
  getBuiltInPermissionSet,
  roleCanSeeField,
  getAvailableCollections,
  type BuiltInPermissionSet,
  type DataAccessConfig,
} from './built-in-roles';

// ============================================
// TYPE RE-EXPORTS
// ============================================

export type {
  PermissionSet,
  RoleAssignment,
  Scope,
  Permission,
} from '@/types/rbac';
