import { BaseAccessStrategy } from './base-strategy';
import type { AccessRights, Action, StrategyDependencies } from './types';
import type { ResourceRepository } from '@/lib/repositories/resource-repository';

/**
 * Strategy for dashboard access decisions
 *
 * Uses existing dashboard-permission.service logic
 * (will be refactored to use pure policies in future)
 */
export class DashboardAccessStrategy extends BaseAccessStrategy {
    private resourceRepo: ResourceRepository;

    constructor(
        deps: StrategyDependencies & { resourceRepository: ResourceRepository }
    ) {
        super(deps);
        this.resourceRepo = deps.resourceRepository;
    }

    /**
     * Check if user can perform action on dashboard
     */
    async canAccess(
        userId: string,
        dashboardId: string,
        action: Action
    ): Promise<boolean> {
        // Parallel fetch (faster!)
        const [context, dashboard] = await Promise.all([
            this.getUserContext(userId),
            this.resourceRepo.getDashboard(dashboardId),
        ]);

        if (!context || !dashboard) return false;

        // Delegate to existing service (for now)
        const { resolveDashboardAccess } = await import(
            '@/lib/services/dashboard/dashboard-permission.service'
        );

        const access = await resolveDashboardAccess(
            userId,
            context.user.role,
            dashboard
        );

        if (!access.hasAccess) return false;

        // Check if permission level is sufficient for action
        return this.hasRequiredPermission(access.permission, action);
    }

    /**
     * Resolve dashboard access with details
     */
    async resolveAccess(
        userId: string,
        dashboardId: string
    ): Promise<AccessRights> {
        const [context, dashboard] = await Promise.all([
            this.getUserContext(userId),
            this.resourceRepo.getDashboard(dashboardId),
        ]);

        if (!context) {
            return {
                hasAccess: false,
                permission: null,
                source: null,
                reason: 'User not found',
            };
        }

        if (!dashboard) {
            return {
                hasAccess: false,
                permission: null,
                source: null,
                reason: 'Dashboard not found',
            };
        }

        // Delegate to existing service
        const { resolveDashboardAccess } = await import(
            '@/lib/services/dashboard/dashboard-permission.service'
        );

        const access = await resolveDashboardAccess(
            userId,
            context.user.role,
            dashboard
        );

        if (!access.hasAccess || !access.permission) {
            return {
                hasAccess: false,
                permission: null,
                source: null,
                reason: 'No access to dashboard',
            };
        }

        // Map source type
        const sourceType = this.mapSourceType(access.primarySource);
        const sourceDescription = access.primarySource
            ? 'type' in access.primarySource
                ? access.primarySource.type
                : 'unknown'
            : 'unknown';

        return {
            hasAccess: true,
            permission: access.permission,
            source: sourceType,
            reason: `Access granted via ${sourceDescription}`,
        };
    }

    /**
     * Check if permission level is sufficient for action
     */
    private hasRequiredPermission(
        userPermission: 'VIEW' | 'EDIT' | 'ADMIN' | null,
        action: Action
    ): boolean {
        if (!userPermission) return false;

        const levels = { VIEW: 1, EDIT: 2, ADMIN: 3 };
        const required = {
            view: 1,
            execute: 1,
            edit: 2,
            create: 2,
            delete: 3,
            share: 3,
        };

        return levels[userPermission] >= (required[action] || 999);
    }

    /**
     * Map AccessSource type to string literal
     */
    private mapSourceType(
        source: { type: string } | null | undefined
    ): 'ownership' | 'role' | 'sharing' | 'space' | 'group' | null {
        if (!source) return null;

        switch (source.type) {
            case 'OWNER':
                return 'ownership';
            case 'GLOBAL_ADMIN':
                return 'role';
            case 'DIRECT_SHARE':
                return 'sharing';
            case 'SPACE_MEMBER':
            case 'SPACE_SHARE':
                return 'space';
            case 'GROUP_SHARE':
                return 'group';
            case 'PUBLIC':
                return 'sharing';
            default:
                return null;
        }
    }
}
