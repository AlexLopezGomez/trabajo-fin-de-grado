/**
 * Authorization Service - Lightweight Orchestrator
 *
 * This class does ONE thing: coordinate authorization decisions.
 * It does NOT:
 * - Fetch data (delegates to repositories)
 * - Implement policy logic (delegates to policies)
 * - Handle resource-specific logic (delegates to strategies)
 *
 * Philosophy: Compose, don't implement
 *
 * Refactored from 650 lines to ~310 lines (52% reduction)
 */

import {
  userRepository,
  type UserRepository,
} from '@/lib/repositories/user-repository';
import {
  permissionRepository,
  type PermissionRepository,
} from '@/lib/repositories/permission-repository';
import {
  resourceRepository,
  type ResourceRepository,
} from '@/lib/repositories/resource-repository';
import { CollectionAccessStrategy } from '@/lib/strategies/collection-access-strategy';
import { DashboardAccessStrategy } from '@/lib/strategies/dashboard-access-strategy';
import { SpaceAccessStrategy } from '@/lib/strategies/space-access-strategy';
import { computeCapabilities } from '@/lib/policies/permission-policy';
import { applyFieldMasking } from '@/lib/policies/field-policy';

/**
 * Resource type for access checks
 */
export type ResourceType = 'dashboard' | 'space' | 'query' | 'collection' | 'widget';

/**
 * Action type for access checks
 */
export type Action = 'view' | 'edit' | 'delete' | 'create' | 'execute' | 'share';

/**
 * Resource identifier for access checks
 */
export interface Resource {
  type: ResourceType;
  id?: string;
}

/**
 * Context for field masking
 */
export interface MaskingContext {
  collection: string;
  includeMetadata?: boolean;
}

/**
 * User's effective capabilities
 */
export interface Capabilities {
  permissions: string[];
  collections: string[] | '*';
  canCreateDashboards: boolean;
  canManageUsers: boolean;
  canManageRoles: boolean;
  canApproveQueries: boolean;
  canViewApprovals: boolean;
  isAdmin: boolean;
}

/**
 * Resolved access rights for a specific resource
 */
export interface AccessRights {
  hasAccess: boolean;
  permission: 'VIEW' | 'EDIT' | 'ADMIN' | null;
  source: 'ownership' | 'role' | 'sharing' | 'space' | 'group' | null;
  reason?: string;
}

/**
 * Dependencies that can be injected (for testing)
 */
export interface AuthorizationServiceDeps {
  userRepository: UserRepository;
  permissionRepository: PermissionRepository;
  resourceRepository: ResourceRepository;
}

/**
 * Authorization Service v2
 *
 * Lightweight orchestrator that delegates all work
 */
export class AuthorizationService {
  private collectionStrategy: CollectionAccessStrategy;
  private dashboardStrategy: DashboardAccessStrategy;
  private spaceStrategy: SpaceAccessStrategy;

  constructor(
    private deps: AuthorizationServiceDeps = {
      userRepository,
      permissionRepository,
      resourceRepository,
    }
  ) {
    // Initialize strategies with injected dependencies
    this.collectionStrategy = new CollectionAccessStrategy({
      userRepository: deps.userRepository,
      permissionRepository: deps.permissionRepository,
    });

    this.dashboardStrategy = new DashboardAccessStrategy({
      userRepository: deps.userRepository,
      permissionRepository: deps.permissionRepository,
      resourceRepository: deps.resourceRepository,
    });

    this.spaceStrategy = new SpaceAccessStrategy({
      userRepository: deps.userRepository,
      permissionRepository: deps.permissionRepository,
      resourceRepository: deps.resourceRepository,
    });
  }

  /**
   * Primary authorization check
   *
   * Routes to appropriate strategy - NO BUSINESS LOGIC HERE
   *
   * @param userId - User performing action
   * @param resource - Resource being accessed
   * @param action - Action being performed
   * @returns True if access granted
   */
  async canAccess(
    userId: string,
    resource: Resource,
    action: Action
  ): Promise<boolean> {
    switch (resource.type) {
      case 'collection':
        return this.collectionStrategy.canAccess(
          userId,
          resource.id || '',
          action
        );

      case 'dashboard':
      case 'widget':
      case 'query':
        return this.dashboardStrategy.canAccess(
          userId,
          resource.id || '',
          action
        );

      case 'space':
        return this.spaceStrategy.canAccess(userId, resource.id || '', action);

      default:
        return false;
    }
  }

  /**
   * Check if user can access a collection
   *
   * Convenience method for collection access
   */
  async canAccessCollection(userId: string, collection: string): Promise<boolean> {
    return this.collectionStrategy.canAccess(userId, collection, 'view');
  }

  /**
   * Check if user can access a dashboard
   *
   * Convenience method for dashboard access
   */
  async canAccessDashboard(
    userId: string,
    dashboardId: string,
    action: Action = 'view'
  ): Promise<boolean> {
    return this.dashboardStrategy.canAccess(userId, dashboardId, action);
  }

  /**
   * Check if user can access a space
   *
   * Convenience method for space access
   */
  async canAccessSpace(
    userId: string,
    spaceId: string,
    action: Action = 'view'
  ): Promise<boolean> {
    return this.spaceStrategy.canAccess(userId, spaceId, action);
  }

  /**
   * Get effective capabilities for a user
   *
   * Delegates to permission repository + policy
   */
  async getEffectiveCapabilities(userId: string): Promise<Capabilities> {
    const user = await this.deps.userRepository.getById(userId);
    if (!user) {
      return this.emptyCapabilities();
    }

    const permissionSet = await this.deps.permissionRepository.getForRole(
      user.role
    );
    if (!permissionSet) {
      return this.emptyCapabilities();
    }

    // Delegate to pure policy function
    return computeCapabilities(permissionSet);
  }

  /**
   * Mask sensitive fields in query results
   *
   * @deprecated Field masking is deprecated as of v2.0. All built-in roles now have
   * fieldMasking: {} configured, so this method effectively returns data unchanged.
   * The system now uses Process Restriction (Supervisor approval) instead of
   * Technical Restriction (field masking). See RBAC_GOVERNANCE_MATRIX.md
   *
   * Delegates to field masking policy
   */
  async maskFields(
    data: Record<string, unknown>[],
    userId: string,
    context: MaskingContext
  ): Promise<Record<string, unknown>[]> {
    const user = await this.deps.userRepository.getById(userId);
    if (!user) return [];

    const permissionSet = await this.deps.permissionRepository.getForRole(
      user.role
    );
    if (!permissionSet) return [];

    // Delegate to pure policy function
    return applyFieldMasking(data, permissionSet, context.collection);
  }

  /**
   * Resolve resource access with detailed information
   *
   * Delegates to appropriate strategy
   */
  async resolveResourceAccess(
    userId: string,
    resource: Resource
  ): Promise<AccessRights> {
    switch (resource.type) {
      case 'collection':
        return this.collectionStrategy.resolveAccess(
          userId,
          resource.id || ''
        );

      case 'dashboard':
      case 'widget':
      case 'query':
        return this.dashboardStrategy.resolveAccess(
          userId,
          resource.id || ''
        );

      case 'space':
        return this.spaceStrategy.resolveAccess(userId, resource.id || '');

      default:
        return {
          hasAccess: false,
          permission: null,
          source: null,
          reason: 'Unknown resource type',
        };
    }
  }

  /**
   * Helper: Empty capabilities for unauthorized users
   */
  private emptyCapabilities(): Capabilities {
    return {
      permissions: [],
      collections: [],
      canCreateDashboards: false,
      canManageUsers: false,
      canManageRoles: false,
      canApproveQueries: false,
      canViewApprovals: false,
      isAdmin: false,
    };
  }

  /**
   * Invalidate caches for a user
   *
   * Call when user data changes (role, groups, etc.)
   */
  invalidateUser(userId: string): void {
    this.deps.userRepository.invalidate(userId);
  }

  /**
   * Invalidate caches for a role
   *
   * Call when custom role is updated
   */
  invalidateRole(roleId: string): void {
    this.deps.permissionRepository.invalidate(roleId);
  }

  /**
   * Invalidate caches for a dashboard
   *
   * Call when dashboard is updated/shared
   */
  invalidateDashboard(dashboardId: string): void {
    this.deps.resourceRepository.invalidateDashboard(dashboardId);
  }

  /**
   * Invalidate caches for a space
   *
   * Call when space membership changes
   */
  invalidateSpace(spaceId: string): void {
    this.deps.resourceRepository.invalidateSpace(spaceId);
  }

  /**
   * Get cache statistics (for monitoring)
   */
  getCacheStats() {
    return {
      users: this.deps.userRepository.getStats(),
      permissions: this.deps.permissionRepository.getStats(),
      resources: this.deps.resourceRepository.getStats(),
    };
  }
}

/**
 * Singleton instance for production use
 */
export const authz = new AuthorizationService();
