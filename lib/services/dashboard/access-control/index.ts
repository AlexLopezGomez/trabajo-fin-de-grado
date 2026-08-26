/**
 * Dashboard Access Control Module
 *
 * Unified facade for all dashboard permission and access control functionality.
 * Provides backward compatibility while hiding internal module structure.
 */

// Re-export permission utilities
export * from './permission-utils';

// Re-export user context services
export * from './user-context.service';

// Re-export access resolution services
export * from './access-resolver.service';

// Re-export dashboard access services
export * from './dashboard-access.service';

// Re-export dashboard query services
export * from './dashboard-queries.service';

// Legacy function names for backward compatibility with dashboard-permission.service.ts
export {
  resolveDashboardAccess,
  checkDashboardPermission,
} from './dashboard-access.service';

export {
  getAccessibleDashboards,
} from './dashboard-access.service';

export {
  getDashboardWithSharing,
} from './dashboard-queries.service';