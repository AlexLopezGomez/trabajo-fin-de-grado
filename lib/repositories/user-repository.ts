import { LRUCache } from 'lru-cache';
import type { UserWithRole, Repository } from './types';
import { getAuthDatabase } from '@/lib/db';

/**
 * Repository for user data access
 *
 * IMPORTANT: Uses AUTH database (internal_dashboard_auth_db) NOT the data query database.
 * This enables multi-database architecture where:
 * - Users/Auth â†’ internal_dashboard_auth_db (or AUTH_DATABASE env var)
 * - Data Queries â†’ Enterprise (MONGODB_DATABASE env var)
 *
 * Responsibilities:
 * - Fetch user by ID
 * - Fetch multiple users (batch)
 * - Cache user data (5 min TTL)
 * - Invalidate cache on user updates
 */
export class UserRepository implements Repository<UserWithRole> {
    private cache: LRUCache<string, UserWithRole>;

    constructor(cacheTTL: number = 5 * 60 * 1000) {
        // 5 minutes default
        this.cache = new LRUCache({
            max: 500, // Max 500 users in cache
            ttl: cacheTTL,
            updateAgeOnGet: true, // Refresh TTL on access
        });
    }

    /**
     * Get user by ID with caching
     *
     * Cache hit: ~0ms
     * Cache miss: ~50ms (database query)
     *
     * @param userId - User ID
     * @returns User with role and groups, or null if not found
     */
    async getById(userId: string): Promise<UserWithRole | null> {
        const cached = this.cache.get(userId);
        if (cached) {
            return cached;
        }

        const db = await getAuthDatabase();
        const { ObjectId } = await import('mongodb');

        const user = await db.collection('app_users').findOne(
            { _id: new ObjectId(userId) },
            {
                projection: {
                    role: 1,
                    groupIds: 1,
                    country: 1,
                },
            }
        );

        if (!user) return null;

        const result: UserWithRole = {
            id: userId,
            role: user.role,
            groupIds: user.groupIds || [],
            country: user.country,
        };

        this.cache.set(userId, result);

        return result;
    }

    /**
     * Batch get users - fetch multiple in one query
     *
     * Use this instead of calling getById() in a loop
     *
     * @param userIds - Array of user IDs
     * @returns Map of userId -> UserWithRole
     */
    async getMany(userIds: string[]): Promise<Map<string, UserWithRole>> {
        const results = new Map<string, UserWithRole>();
        const uncached: string[] = [];

        // Check cache first
        for (const id of userIds) {
            const cached = this.cache.get(id);
            if (cached) {
                results.set(id, cached);
            } else {
                uncached.push(id);
            }
        }

        if (uncached.length > 0) {
            const db = await getAuthDatabase();
            const { ObjectId } = await import('mongodb');

            const users = await db
                .collection('app_users')
                .find({
                    _id: { $in: uncached.map((id) => new ObjectId(id)) },
                })
                .project({ role: 1, groupIds: 1, country: 1 })
                .toArray();

            for (const user of users) {
                const id = user._id.toString();
                const result: UserWithRole = {
                    id,
                    role: user.role,
                    groupIds: user.groupIds || [],
                    country: user.country,
                };

                this.cache.set(id, result);
                results.set(id, result);
            }
        }

        return results;
    }

    /**
     * Invalidate cache for a user
     *
     * Call this when user data changes (role update, group membership, etc.)
     */
    invalidate(userId: string): void {
        this.cache.delete(userId);
    }

    /**
     * Clear entire cache
     *
     * Use sparingly - for testing or major data migrations
     */
    clear(): void {
        this.cache.clear();
    }

    /**
     * Get cache statistics (for monitoring)
     */
    getStats() {
        return {
            size: this.cache.size,
            max: this.cache.max,
            ttl: this.cache.ttl,
        };
    }
}

// Singleton instance
export const userRepository = new UserRepository();

