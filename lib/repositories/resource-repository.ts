import { LRUCache } from 'lru-cache';
import { withAuthDatabase } from '@/lib/db/helpers';
import type { DashboardWithSharing } from '@/types/spaces';
import type { Space } from './types';

/**
 * Repository for resource access (dashboards, spaces, widgets)
 */
export class ResourceRepository {
    private dashboardCache: LRUCache<string, DashboardWithSharing>;
    private spaceCache: LRUCache<string, Space>;

    constructor(cacheTTL: number = 5 * 60 * 1000) {
        this.dashboardCache = new LRUCache({
            max: 200,
            ttl: cacheTTL,
            updateAgeOnGet: true,
        });

        this.spaceCache = new LRUCache({
            max: 100,
            ttl: cacheTTL,
            updateAgeOnGet: true,
        });
    }

    /**
     * Get dashboard by ID with sharing config
     */
    async getDashboard(
        dashboardId: string
    ): Promise<DashboardWithSharing | null> {
        const cached = this.dashboardCache.get(dashboardId);
        if (cached) {
            return cached;
        }

        // Delegate to existing service (for now)
        const { getDashboardWithSharing } = await import(
            '@/lib/services/dashboard/dashboard-permission.service'
        );

        const dashboard = await getDashboardWithSharing(dashboardId);
        if (!dashboard) return null;

        this.dashboardCache.set(dashboardId, dashboard);
        return dashboard;
    }

    /**
     * Batch get dashboards
     */
    async getDashboards(
        dashboardIds: string[]
    ): Promise<Map<string, DashboardWithSharing>> {
        const results = new Map<string, DashboardWithSharing>();
        const uncached: string[] = [];

        // Check cache
        for (const id of dashboardIds) {
            const cached = this.dashboardCache.get(id);
            if (cached) {
                results.set(id, cached);
            } else {
                uncached.push(id);
            }
        }

        // Batch fetch uncached
        if (uncached.length > 0) {
            const dashboards = await withAuthDatabase(async (db, ObjectId) => {
                return await db
                    .collection('dashboards')
                    .find({
                        _id: { $in: uncached.map((id) => new ObjectId(id)) },
                    })
                    .toArray();
            });

            // Process and cache
            for (const doc of dashboards) {
                const defaultSharing = doc.spaceId
                    ? { mode: 'SPACE_INHERIT' as const, rules: [] }
                    : { mode: 'PRIVATE' as const, rules: [] };

                const dashboard: DashboardWithSharing = {
                    id: doc._id.toString(),
                    name: doc.name,
                    description: doc.description,
                    spaceId: doc.spaceId?.toString(),
                    spaceName: doc.spaceName,
                    createdBy: doc.createdBy?.toString() || doc.ownerId?.toString(),
                    createdByName: doc.createdByName,
                    sharing: doc.sharing || defaultSharing,
                    widgetCount: doc.widgetCount,
                    tags: doc.tags,
                    createdAt: doc.createdAt,
                    updatedAt: doc.updatedAt,
                    isArchived: doc.isArchived || false,
                    stats: doc.stats,
                };

                this.dashboardCache.set(dashboard.id, dashboard);
                results.set(dashboard.id, dashboard);
            }
        }

        return results;
    }

    /**
     * Get space by ID
     */
    async getSpace(spaceId: string): Promise<Space | null> {
        const cached = this.spaceCache.get(spaceId);
        if (cached) {
            return cached;
        }

        const space = await withAuthDatabase(async (db, ObjectId) => {
            return await db.collection('spaces').findOne({
                _id: new ObjectId(spaceId),
                isArchived: { $ne: true },
            });
        });

        if (!space) return null;

        const result: Space = {
            id: space._id.toString(),
            name: space.name,
            memberIds: (space.members || []).map((m: { userId?: string } | string) =>
                typeof m === 'string' ? m : m.userId || ''
            ),
            ownerId: space.ownerId?.toString() || space.createdBy?.toString(),
        };

        this.spaceCache.set(spaceId, result);
        return result;
    }

    /**
     * Invalidate dashboard cache
     */
    invalidateDashboard(dashboardId: string): void {
        this.dashboardCache.delete(dashboardId);
    }

    /**
     * Invalidate space cache
     */
    invalidateSpace(spaceId: string): void {
        this.spaceCache.delete(spaceId);
    }

    clear(): void {
        this.dashboardCache.clear();
        this.spaceCache.clear();
    }

    getStats() {
        return {
            dashboards: {
                size: this.dashboardCache.size,
                max: this.dashboardCache.max,
            },
            spaces: {
                size: this.spaceCache.size,
                max: this.spaceCache.max,
            },
        };
    }
}

export const resourceRepository = new ResourceRepository();
