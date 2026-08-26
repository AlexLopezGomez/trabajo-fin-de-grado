'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { getSpaceDetail, getSpaceDashboards } from '@/app/actions/spaces/index';
import type { Space } from '@/types/spaces';
import type { DashboardSummary } from '@/types/dashboard';
import { error as logError } from '@/lib/utils/logger';

/**
 * Custom hook for managing space detail data
 * Fetches space details and associated dashboards
 */
export function useSpaceDetail(spaceId: string) {
    const { data: session } = useSession();
    const router = useRouter();
    const [space, setSpace] = useState<Space | null>(null);
    const [dashboards, setDashboards] = useState<DashboardSummary[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (session?.user && spaceId) {
            loadSpaceData();
        }
    }, [session, spaceId]); // eslint-disable-line react-hooks/exhaustive-deps

    const loadSpaceData = async () => {
        setIsLoading(true);
        setError(null);

        try {
            // Load space details
            const spaceResult = await getSpaceDetail(spaceId);
            if (!spaceResult.success || !spaceResult.data) {
                setError(spaceResult.error || 'Space not found');
                return;
            }
            setSpace(spaceResult.data.space);

            // Load dashboards for this space (includes both belonging and shared)
            const dashboardsResult = await getSpaceDashboards(spaceId);
            if (dashboardsResult.success && dashboardsResult.data) {
                // Convert DashboardWithAccess to DashboardSummary
                const summaries: DashboardSummary[] = dashboardsResult.data.dashboards.map(d => ({
                    id: d.id,
                    name: d.name,
                    description: d.description,
                    ownerId: d.createdBy,
                    isPublic: d.sharing.mode === 'PUBLIC',
                    spaceId: d.spaceId || null,
                    spaceName: d.spaceName || null,
                    sharingMode: d.sharing.mode,
                    widgetCount: d.widgetCount || 0,
                    createdAt: d.createdAt,
                    updatedAt: d.updatedAt,
                }));
                setDashboards(summaries);
            }
        } catch (err) {
            logError('Failed to load space', err);
            setError('Failed to load space data');
        } finally {
            setIsLoading(false);
        }
    };

    return {
        space,
        dashboards,
        isLoading,
        error,
        loadSpaceData,
    };
}
