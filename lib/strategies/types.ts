import type { UserRepository } from '@/lib/repositories/user-repository';
import type { PermissionRepository } from '@/lib/repositories/permission-repository';
import type { ResourceRepository } from '@/lib/repositories/resource-repository';

/**
 * Action types for authorization
 */
export type Action = 'view' | 'edit' | 'create' | 'delete' | 'share' | 'execute';

/**
 * Access rights with detailed information
 */
export interface AccessRights {
    hasAccess: boolean;
    permission: 'VIEW' | 'EDIT' | 'ADMIN' | null;
    source: 'ownership' | 'role' | 'sharing' | 'space' | 'group' | null;
    reason: string;
}

/**
 * Base interface for all access strategies
 */
export interface AccessStrategy {
    /**
     * Check if user can perform action on resource
     */
    canAccess(userId: string, resourceId: string, action: Action): Promise<boolean>;

    /**
     * Get detailed access info (for audit trails)
     */
    resolveAccess(userId: string, resourceId: string): Promise<AccessRights>;
}

/**
 * Strategy dependencies (injected)
 */
export interface StrategyDependencies {
    userRepository: UserRepository;
    permissionRepository: PermissionRepository;
    resourceRepository?: ResourceRepository; // Only for resource-based strategies
}
