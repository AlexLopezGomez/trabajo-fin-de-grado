'use client';

import { useState, useMemo } from 'react';
import type { DashboardSummary } from '@/types/dashboard';

export type FilterType = 'all' | 'mine' | 'shared';

/**
 * Custom hook for managing dashboard filtering logic
 * Handles both ownership and space-based filtering
 */
export function useDashboardFilters(dashboards: DashboardSummary[], userId?: string) {
    const [filterType, setFilterType] = useState<FilterType>('all');
    const [filterSpaceId, setFilterSpaceId] = useState<string>('');

    const filteredDashboards = useMemo(() => {
        return dashboards.filter(dashboard => {
            // Filter by ownership
            if (filterType === 'mine' && dashboard.ownerId !== userId) {
                return false;
            }
            if (filterType === 'shared' && dashboard.ownerId === userId) {
                return false;
            }

            // Filter by space
            if (filterSpaceId) {
                if (filterSpaceId === '_floating') {
                    if (dashboard.spaceId) return false;
                } else {
                    if (dashboard.spaceId !== filterSpaceId) return false;
                }
            }

            return true;
        });
    }, [dashboards, filterType, filterSpaceId, userId]);

    return {
        filterType,
        filterSpaceId,
        setFilterType,
        setFilterSpaceId,
        filteredDashboards,
    };
}
