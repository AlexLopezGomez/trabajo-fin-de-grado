'use client';

import { useEffect } from 'react';
import { getDashboardWithWidgets } from '@/app/actions/dashboard/index';
import type { DashboardWithWidgets } from '@/types/dashboard';
import { logger } from "@/lib/utils/logger";

/**
 * Custom hook for polling widgets without cached results
 * Automatically refreshes dashboard state when cache becomes available
 * 
 * This handles the auto-refresh migration for widgets that were created
 * before the cache system was implemented.
 */
export function useWidgetPolling(
    dashboardId: string,
    dashboardData: DashboardWithWidgets | null,
    setDashboardData: (data: DashboardWithWidgets) => void
) {
    // DISABLED: Auto-polling logic commented out - widgets now only refresh on manual user action
    // useEffect(() => {
    //     if (!dashboardData) return;

    //     const widgetsWithoutCache = dashboardData.widgets.filter(w =>
    //         !w.cachedResults || (Array.isArray(w.data) && w.data.length === 0 && !w.error)
    //     );

    //     if (widgetsWithoutCache.length === 0) return;

    //     // Set up polling to check if cache is ready (every 2 seconds for max 30 seconds)
    //     let pollCount = 0;
    //     const maxPolls = 15;

    //     const pollInterval = setInterval(async () => {
    //         pollCount++;

    //         if (pollCount > maxPolls) {
    //             clearInterval(pollInterval);
    //             return;
    //         }

    //         try {
    //             const freshData = await getDashboardWithWidgets(dashboardId);
    //             if (freshData) {
    //                 const allHaveCache = freshData.widgets.every(w =>
    //                     w.cachedResults && w.data && w.data.length > 0
    //                 );

    //                 if (allHaveCache) {
    //                     setDashboardData(freshData);
    //                     clearInterval(pollInterval);
    //                 }
    //             }
    //         } catch (error) {
    //             logger.error('Error polling for widget cache', error);
    //         }
    //     }, 2000);

    //     return () => clearInterval(pollInterval);
    // }, [dashboardData?.widgets.length, dashboardId, setDashboardData]); // eslint-disable-line react-hooks/exhaustive-deps
}
