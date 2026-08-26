'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
    updateDashboard,
    deleteDashboard,
} from '@/app/actions/dashboard/index';
import type { DashboardWithWidgets } from '@/types/dashboard';
import { logger } from '@/lib/utils/logger';

/**
 * Custom hook for managing dashboard settings state and operations
 * Handles form state for editing dashboard name, description, and visibility
 */
export function useDashboardSettings(
    dashboardId: string,
    updateDashboardState?: (updates: Partial<DashboardWithWidgets['dashboard']>) => void
) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [editName, setEditName] = useState('');
    const [editDescription, setEditDescription] = useState('');
    const [editIsPublic, setEditIsPublic] = useState(false);

    const initializeSettings = (dashboard: DashboardWithWidgets['dashboard']) => {
        setEditName(dashboard.name);
        setEditDescription(dashboard.description || '');
        setEditIsPublic(dashboard.isPublic);
    };

    const saveDashboardSettings = async () => {
        return new Promise<void>((resolve, reject) => {
            startTransition(async () => {
                try {
                    await updateDashboard({
                        dashboardId,
                        name: editName.trim(),
                        description: editDescription.trim() || undefined,
                        isPublic: editIsPublic,
                    });

                    // Update local state if callback provided
                    if (updateDashboardState) {
                        updateDashboardState({
                            name: editName.trim(),
                            description: editDescription.trim(),
                            isPublic: editIsPublic,
                        });
                    }

                    resolve();
                } catch (error) {
                    logger.error('Failed to update dashboard', error, { dashboardId });
                    reject(error);
                }
            });
        });
    };

    const handleDeleteDashboard = async () => {
        if (!confirm('¿Estás seguro de eliminar este dashboard y todos sus widgets?')) {
            return;
        }

        return new Promise<void>((resolve, reject) => {
            startTransition(async () => {
                try {
                    await deleteDashboard({ dashboardId });
                    router.push('/dashboards');
                    resolve();
                } catch (error) {
                    logger.error('Failed to delete dashboard', error, { dashboardId });
                    reject(error);
                }
            });
        });
    };

    const togglePublic = async () => {
        const newIsPublic = !editIsPublic;
        return new Promise<void>((resolve, reject) => {
            startTransition(async () => {
                try {
                    await updateDashboard({
                        dashboardId,
                        name: editName.trim(),
                        description: editDescription.trim() || undefined,
                        isPublic: newIsPublic,
                    });
                    setEditIsPublic(newIsPublic);
                    if (updateDashboardState) {
                        updateDashboardState({ isPublic: newIsPublic });
                    }
                    resolve();
                } catch (error) {
                    logger.error('Failed to toggle dashboard visibility', error, { dashboardId });
                    reject(error);
                }
            });
        });
    };

    return {
        editName,
        editDescription,
        editIsPublic,
        setEditName,
        setEditDescription,
        setEditIsPublic,
        isPending,
        initializeSettings,
        saveDashboardSettings,
        deleteDashboard: handleDeleteDashboard,
        togglePublic,
    };
}
