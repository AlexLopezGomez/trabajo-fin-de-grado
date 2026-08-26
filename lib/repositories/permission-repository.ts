import { LRUCache } from 'lru-cache';
import {
    getPermissionSetForRole,
    type UnifiedPermissionSet,
} from '@/lib/auth/rbac/role-resolver';
import type { Repository } from './types';

/**
 * Repository for permission set access
 *
 * Caches permission sets for roles (both built-in and custom)
 */
export class PermissionRepository
    implements Repository<UnifiedPermissionSet> {
    private cache: LRUCache<string, UnifiedPermissionSet>;

    constructor(cacheTTL: number = 5 * 60 * 1000) {
        this.cache = new LRUCache({
            max: 100, // Max 100 roles in cache
            ttl: cacheTTL,
            updateAgeOnGet: true,
        });
    }

    /**
     * Get permission set for role
     *
     * Delegates to existing role-resolver but adds caching
     */
    async getForRole(roleId: string): Promise<UnifiedPermissionSet | null> {
        const cached = this.cache.get(roleId);
        if (cached) {
            return cached;
        }

        const permissionSet = await getPermissionSetForRole(roleId);
        if (!permissionSet) return null;

        this.cache.set(roleId, permissionSet);
        return permissionSet;
    }

    /**
     * Alias for getForRole (Repository interface compatibility)
     */
    async getById(roleId: string): Promise<UnifiedPermissionSet | null> {
        return this.getForRole(roleId);
    }

    /**
     * Batch get permission sets for multiple roles
     */
    async getMany(
        roleIds: string[]
    ): Promise<Map<string, UnifiedPermissionSet>> {
        const results = new Map<string, UnifiedPermissionSet>();

        await Promise.all(
            roleIds.map(async (roleId) => {
                const permissionSet = await this.getForRole(roleId);
                if (permissionSet) {
                    results.set(roleId, permissionSet);
                }
            })
        );

        return results;
    }

    /**
     * Invalidate cache for a role
     *
     * Call when custom role is updated
     */
    invalidate(roleId: string): void {
        this.cache.delete(roleId);
    }

    clear(): void {
        this.cache.clear();
    }

    getStats() {
        return {
            size: this.cache.size,
            max: this.cache.max,
            ttl: this.cache.ttl,
        };
    }
}

export const permissionRepository = new PermissionRepository();
