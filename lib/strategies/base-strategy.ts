import type { StrategyDependencies, AccessStrategy, Action, AccessRights } from './types';
import type { UserRepository } from '@/lib/repositories/user-repository';
import type { PermissionRepository } from '@/lib/repositories/permission-repository';

/**
 * Base strategy with common helpers
 *
 * Concrete strategies extend this
 */
export abstract class BaseAccessStrategy implements AccessStrategy {
    protected userRepo: UserRepository;
    protected permissionRepo: PermissionRepository;

    constructor(deps: StrategyDependencies) {
        this.userRepo = deps.userRepository;
        this.permissionRepo = deps.permissionRepository;
    }

    /**
     * Abstract methods - must be implemented by concrete strategies
     */
    abstract canAccess(
        userId: string,
        resourceId: string,
        action: Action
    ): Promise<boolean>;

    abstract resolveAccess(
        userId: string,
        resourceId: string
    ): Promise<AccessRights>;

    /**
     * Helper: Get user and permission set in parallel
     */
    protected async getUserContext(userId: string) {
        const user = await this.userRepo.getById(userId);
        if (!user) return null;

        const permissionSet = await this.permissionRepo.getForRole(user.role);
        if (!permissionSet) return null;

        return { user, permissionSet };
    }
}
