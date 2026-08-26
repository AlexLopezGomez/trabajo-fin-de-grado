import { BaseAccessStrategy } from './base-strategy';
import { canAccessCollection } from '@/lib/policies/collection-policy';
import type { AccessRights, Action, StrategyDependencies } from './types';

/**
 * Strategy for collection access decisions
 *
 * Delegates to collection policy (pure function)
 */
export class CollectionAccessStrategy extends BaseAccessStrategy {
    constructor(deps: StrategyDependencies) {
        super(deps);
    }

    /**
     * Check if user can access collection
     */
    async canAccess(
        userId: string,
        collection: string,
        action: Action
    ): Promise<boolean> {
        // Get user context (cached)
        const context = await this.getUserContext(userId);
        if (!context) return false;

        // Delegate to pure policy function
        return canAccessCollection({
            userId,
            role: context.user.role,
            permissionSet: context.permissionSet,
            collection,
        });
    }

    /**
     * Resolve collection access with details
     */
    async resolveAccess(
        userId: string,
        collection: string
    ): Promise<AccessRights> {
        const context = await this.getUserContext(userId);
        if (!context) {
            return {
                hasAccess: false,
                permission: null,
                source: null,
                reason: 'User not found',
            };
        }

        const hasAccess = canAccessCollection({
            userId,
            role: context.user.role,
            permissionSet: context.permissionSet,
            collection,
        });

        if (!hasAccess) {
            return {
                hasAccess: false,
                permission: null,
                source: null,
                reason: `Role ${context.user.role} cannot access collection ${collection}`,
            };
        }

        return {
            hasAccess: true,
            permission: 'VIEW',
            source: 'role',
            reason: `Access granted via role ${context.user.role}`,
        };
    }
}
