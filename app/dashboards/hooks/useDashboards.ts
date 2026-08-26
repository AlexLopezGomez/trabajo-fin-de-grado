'use client';

import { useEffect, useState, useTransition } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
    createDashboard as createDashboardAction,
    deleteDashboard as deleteDashboardAction,
} from '@/app/actions/dashboard/index';
import { getAccessibleDashboardsAction } from '@/app/actions/spaces/index';
import type { DashboardSummary } from '@/types/dashboard';
import type { DashboardWithAccess } from '@/types/spaces';
import { logger } from '@/lib/utils/logger';

export interface CreateDashboardInput {
    name: string;
    description?: string;
    spaceId?: string;
}

/**
 * Custom hook for managing dashboards data and operations
 * Handles fetching, creating, and deleting dashboards
 */
export function useDashboards() {
    const { data: session } = useSession();
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [dashboards, setDashboards] = useState<DashboardSummary[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (session?.user) {
            loadDashboards();
        }
    }, [session]);

    const loadDashboards = async () => {
        setIsLoading(true);
        try {
            // Use permission-aware API that respects RBAC:
            // - Owned dashboards
            // - Direct shares
            // - Group-based shares
            // - Space-based shares
            const result = await getAccessibleDashboardsAction({}, 1, 100);
            if (result.success && result.data) {
                // Map DashboardWithAccess to DashboardSummary for compatibility
                const mapped: DashboardSummary[] = result.data.dashboards.map((d: DashboardWithAccess) => ({
                    id: d.id,
                    name: d.name,
                    description: d.description,
                    ownerId: d.createdBy,
                    isPublic: d.sharing?.mode === 'PUBLIC',
                    createdAt: d.createdAt,
                    updatedAt: d.updatedAt,
                    widgetCount: d.widgetCount || 0,
                    spaceId: d.spaceId,
                    spaceName: d.spaceName,
                    sharingMode: d.sharing?.mode,
                }));
                setDashboards(mapped);
            }
        } catch (error) {
            logger.error('Failed to load dashboards', error);
        } finally {
            setIsLoading(false);
        }
    };

    const createDashboard = async (input: CreateDashboardInput) => {
        return new Promise<void>((resolve, reject) => {
            startTransition(async () => {
                try {
                    const dashboard = await createDashboardAction({
                        name: input.name.trim(),
                        description: input.description?.trim() || undefined,
                        spaceId: input.spaceId || undefined,
                    });
                    router.push(`/dashboard/${dashboard.id}`);
                    resolve();
                } catch (error) {
                    logger.error('Failed to create dashboard', error);
                    reject(error);
                }
            });
        });
    };

    const deleteDashboard = async (dashboardId: string) => {
        if (!confirm('¿Estás seguro de eliminar este dashboard y todos sus widgets?')) {
            return;
        }

        return new Promise<void>((resolve, reject) => {
            startTransition(async () => {
                try {
                    await deleteDashboardAction({ dashboardId });
                    setDashboards((prev) => prev.filter((d) => d.id !== dashboardId));
                    resolve();
                } catch (error) {
                    logger.error('Failed to delete dashboard', error, { dashboardId });
                    reject(error);
                }
            });
        });
    };

    return {
        dashboards,
        isLoading,
        isPending,
        loadDashboards,
        createDashboard,
        deleteDashboard,
    };
}
