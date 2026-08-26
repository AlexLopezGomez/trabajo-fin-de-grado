import { BaseAccessStrategy } from './base-strategy';
import type { AccessRights, Action, StrategyDependencies } from './types';
import type { ResourceRepository } from '@/lib/repositories/resource-repository';

/**
 * Strategy for space access decisions
 *
 * Implements space member/owner checks
 */
export class SpaceAccessStrategy extends BaseAccessStrategy {
    private resourceRepo: ResourceRepository;

    constructor(
        deps: StrategyDependencies & { resourceRepository: ResourceRepository }
    ) {
        super(deps);
        this.resourceRepo = deps.resourceRepository;
    }

    /**
     * Check if user can perform action on space
     */
    async canAccess(
        userId: string,
        spaceId: string,
        action: Action
    ): Promise<boolean> {
        const [context, space] = await Promise.all([
            this.getUserContext(userId),
            this.resourceRepo.getSpace(spaceId),
        ]);

        if (!context || !space) return false;

        // Check if user is owner
        if (space.ownerId === userId) {
            return true; // Owner can do anything
        }

        // Check if user is admin
        if (context.permissionSet.dataAccess?.collections === '*') {
            return true; // Admin can do anything
        }

        // Check if user is member
        const isMember = space.memberIds.includes(userId);

        if (!isMember) return false;

        // Members can view/execute, but not edit/delete/share
        const allowedActions: Action[] = ['view', 'execute'];
        return allowedActions.includes(action);
    }

    /**
     * Resolve space access with details
     */
    async resolveAccess(
        userId: string,
        spaceId: string
    ): Promise<AccessRights> {
        const [context, space] = await Promise.all([
            this.getUserContext(userId),
            this.resourceRepo.getSpace(spaceId),
        ]);

        if (!context) {
            return {
                hasAccess: false,
                permission: null,
                source: null,
                reason: 'User not found',
            };
        }

        if (!space) {
            return {
                hasAccess: false,
                permission: null,
                source: null,
                reason: 'Space not found',
            };
        }

        // Check ownership
        if (space.ownerId === userId) {
            return {
                hasAccess: true,
                permission: 'ADMIN',
                source: 'ownership',
                reason: 'User is space owner',
            };
        }

        // Check admin role
        if (context.permissionSet.dataAccess?.collections === '*') {
            return {
                hasAccess: true,
                permission: 'ADMIN',
                source: 'role',
                reason: 'User is global admin',
            };
        }

        // Check membership
        const isMember = space.memberIds.includes(userId);
        if (isMember) {
            return {
                hasAccess: true,
                permission: 'VIEW',
                source: 'space',
                reason: 'User is space member',
            };
        }

        return {
            hasAccess: false,
            permission: null,
            source: null,
            reason: 'User is not space owner or member',
        };
    }
}
