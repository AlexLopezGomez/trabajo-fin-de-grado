'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
    getDashboardWithWidgets,
    refreshWidget,
} from '@/app/actions/dashboard/index';
import type { DashboardWithWidgets } from '@/types/dashboard';
import { logger } from '@/lib/utils/logger';

export function useDashboardDetail(dashboardId: string, initialData: DashboardWithWidgets | null) {
    const router = useRouter();
    const [dashboardData, setDashboardData] = useState<DashboardWithWidgets | null>(initialData);
    const [isLoading] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const loadDashboard = async () => {
        try {
            const data = await getDashboardWithWidgets(dashboardId);
            if (!data) {
                router.push('/dashboards');
                return;
            }
            setDashboardData(data);
        } catch (error) {
            logger.error('Failed to load dashboard', error, { dashboardId });
            router.push('/dashboards');
        }
    };

    const refreshAllWidgets = async () => {
        if (!dashboardData) return;

        setIsRefreshing(true);
        try {
            const refreshPromises = dashboardData.widgets.map((widget) =>
                refreshWidget(widget.id)
            );
            const results = await Promise.all(refreshPromises);

            setDashboardData((prev) => {
                if (!prev) return prev;

                const updatedWidgets = prev.widgets.map((widget) => {
                    const result = results.find((r) => r.widget.id === widget.id);
                    if (result && result.success) {
                        return {
                            ...widget,
                            data: result.data,
                            executionTime: result.executionTime,
                            error: result.error,
                            lastExecutedAt: new Date(),
                        };
                    }
                    return widget;
                });

                return {
                    ...prev,
                    widgets: updatedWidgets,
                };
            });
        } catch (error) {
            logger.error('Failed to refresh widgets', error, { dashboardId });
        } finally {
            setIsRefreshing(false);
        }
    };

    const handleWidgetDelete = useCallback((widgetId: string) => {
        setDashboardData((prev) => {
            if (!prev) return prev;
            return {
                ...prev,
                widgets: prev.widgets.filter((w) => w.id !== widgetId),
            };
        });
    }, []);

    const handleWidgetRefresh = useCallback(
        (widgetId: string, data: Record<string, unknown>[]) => {
            setDashboardData((prev) => {
                if (!prev) return prev;
                return {
                    ...prev,
                    widgets: prev.widgets.map((w) =>
                        w.id === widgetId ? { ...w, data } : w
                    ),
                };
            });
        },
        []
    );

    const updateDashboardState = useCallback(
        (updates: Partial<DashboardWithWidgets['dashboard']>) => {
            setDashboardData((prev) => {
                if (!prev) return prev;
                return {
                    ...prev,
                    dashboard: {
                        ...prev.dashboard,
                        ...updates,
                    },
                };
            });
        },
        []
    );

    return {
        dashboardData,
        isLoading,
        isRefreshing,
        loadDashboard,
        refreshAllWidgets,
        handleWidgetDelete,
        handleWidgetRefresh,
        updateDashboardState,
        setDashboardData,
    };
}
