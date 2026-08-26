"use client";

/**
 * useDashboardSharing Hook
 * Manages dashboard sharing data, pending changes, and API operations
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import {
    getDashboardSharing,
    updateDashboardSharingMode,
    addDashboardSharingRule,
    updateDashboardSharingRule,
    removeDashboardSharingRule,
} from "@/app/actions/spaces";
import type {
    DashboardWithSharing,
    DashboardSharingMode,
    DashboardPermission,
    ResolvedAccess,
    ShareTargetSearchResult,
} from "@/types/spaces";
import type {
    AccessEntry,
    PendingChanges,
    PendingModeChange,
    PendingAddTarget,
    PendingUpdatePermission,
    PendingRemoveAccess,
} from "../types";

interface UseDashboardSharingReturn {
    // Data
    dashboard: DashboardWithSharing | null;
    userAccess: ResolvedAccess | null;
    currentAccess: AccessEntry[];
    effectiveMode: DashboardSharingMode | undefined;
    effectiveAccessList: AccessEntry[];

    // State
    loading: boolean;
    error: string | null;
    pendingChanges: PendingChanges;
    saving: boolean;

    // Computed
    canManage: boolean;

    // Actions
    handleModeChange: (mode: DashboardSharingMode) => void;
    handleAddTarget: (target: ShareTargetSearchResult, permission?: DashboardPermission) => void;
    handleUpdatePermission: (ruleId: string, newPermission: DashboardPermission) => void;
    handleRemoveAccess: (ruleId: string) => void;
    handleSave: () => Promise<{ success: boolean; errors: string[] }>;
    discardChanges: () => void;
}

export function useDashboardSharing(dashboardId: string): UseDashboardSharingReturn {
    const [dashboard, setDashboard] = useState<DashboardWithSharing | null>(null);
    const [userAccess, setUserAccess] = useState<ResolvedAccess | null>(null);
    const [currentAccess, setCurrentAccess] = useState<AccessEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [pendingChanges, setPendingChanges] = useState<PendingChanges>([]);
    const [saving, setSaving] = useState(false);

    // Fetch dashboard sharing details
    useEffect(() => {
        async function fetchData() {
            setLoading(true);
            setError(null);

            try {
                const response = await getDashboardSharing(dashboardId);
                if (response.success && response.data) {
                    setDashboard(response.data.dashboard);
                    setCurrentAccess(response.data.currentAccess);
                    setUserAccess(response.data.userAccess);
                } else {
                    setError(response.error || "Failed to load sharing details");
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : "Unknown error");
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, [dashboardId]);

    // Compute effective mode from current + pending changes
    const effectiveMode = useMemo(() => {
        const modeChange = pendingChanges.find(c => c.type === 'MODE') as PendingModeChange | undefined;
        return modeChange?.mode ?? dashboard?.sharing.mode;
    }, [pendingChanges, dashboard]);

    // Compute effective access list from current + pending changes
    const effectiveAccessList = useMemo(() => {
        let list = [...currentAccess];

        // Apply pending additions
        pendingChanges
            .filter((c): c is PendingAddTarget => c.type === 'ADD_TARGET')
            .forEach(change => {
                list.push({
                    id: change.id,
                    name: change.target.name,
                    type: change.target.type,
                    permission: change.permission,
                    pending: true
                });
            });

        // Apply pending updates
        pendingChanges
            .filter((c): c is PendingUpdatePermission => c.type === 'UPDATE_PERMISSION')
            .forEach(change => {
                const item = list.find(a => a.id === change.ruleId);
                if (item) item.permission = change.newPermission;
            });

        // Mark pending removals
        pendingChanges
            .filter((c): c is PendingRemoveAccess => c.type === 'REMOVE_ACCESS')
            .forEach(change => {
                const item = list.find(a => a.id === change.ruleId);
                if (item) item.pendingRemoval = true;
            });

        return list;
    }, [currentAccess, pendingChanges]);

    // Check if user can manage sharing
    const canManage = userAccess?.permission === "ADMIN" || userAccess?.primarySource?.type === "OWNER";

    // Update sharing mode
    const handleModeChange = useCallback((mode: DashboardSharingMode) => {
        if (!dashboard) return;

        setPendingChanges(prev => [
            ...prev.filter(c => c.type !== 'MODE'),
            { type: 'MODE', id: crypto.randomUUID(), mode }
        ]);

        // Update dashboard optimistically for UI
        setDashboard(prev => prev ? { ...prev, sharing: { ...prev.sharing, mode } } : prev);
    }, [dashboard]);

    // Add share target
    const handleAddTarget = useCallback((
        target: ShareTargetSearchResult,
        permission: DashboardPermission = "VIEW"
    ) => {
        setPendingChanges(prev => [
            ...prev,
            {
                type: 'ADD_TARGET',
                id: crypto.randomUUID(),
                target,
                permission
            }
        ]);

        // Update dashboard mode to CUSTOM optimistically
        if (dashboard && dashboard.sharing.mode !== "CUSTOM") {
            setDashboard(prev =>
                prev ? { ...prev, sharing: { ...prev.sharing, mode: "CUSTOM" } } : prev
            );
            // Also add mode change to pending if not already there
            setPendingChanges(prev => {
                const hasModeChange = prev.some(c => c.type === 'MODE');
                if (hasModeChange) return prev;
                return [
                    ...prev,
                    { type: 'MODE', id: crypto.randomUUID(), mode: "CUSTOM" }
                ];
            });
        }
    }, [dashboard]);

    // Update permission
    const handleUpdatePermission = useCallback((
        ruleId: string,
        newPermission: DashboardPermission
    ) => {
        // Check if this is a pending addition
        const pendingAddition = pendingChanges.find(
            c => c.type === 'ADD_TARGET' && c.id === ruleId
        ) as PendingAddTarget | undefined;

        if (pendingAddition) {
            // Update the permission in the pending addition
            setPendingChanges(prev => prev.map(c =>
                c.type === 'ADD_TARGET' && c.id === ruleId
                    ? { ...c, permission: newPermission }
                    : c
            ));
            return;
        }

        const access = currentAccess.find(a => a.id === ruleId);
        if (!access) return;

        // Add to pending changes
        setPendingChanges(prev => [
            ...prev.filter(c => !(c.type === 'UPDATE_PERMISSION' && (c as PendingUpdatePermission).ruleId === ruleId)),
            {
                type: 'UPDATE_PERMISSION',
                id: crypto.randomUUID(),
                ruleId,
                oldPermission: access.permission,
                newPermission
            }
        ]);
    }, [pendingChanges, currentAccess]);

    // Remove access
    const handleRemoveAccess = useCallback((ruleId: string) => {
        // Check if this is a pending addition that hasn't been saved yet
        const isPendingAddition = pendingChanges.some(
            c => c.type === 'ADD_TARGET' && c.id === ruleId
        );

        if (isPendingAddition) {
            // Just remove the pending addition
            setPendingChanges(prev => prev.filter(c => !(c.type === 'ADD_TARGET' && c.id === ruleId)));
            return;
        }

        const access = currentAccess.find(a => a.id === ruleId);
        if (!access) return;

        // Add to pending changes for removal
        setPendingChanges(prev => [
            ...prev,
            {
                type: 'REMOVE_ACCESS',
                id: crypto.randomUUID(),
                ruleId,
                access: {
                    id: access.id,
                    name: access.name,
                    type: access.type,
                    permission: access.permission
                }
            }
        ]);
    }, [pendingChanges, currentAccess]);

    // Save all pending changes
    const handleSave = useCallback(async () => {
        setSaving(true);
        const errors: string[] = [];

        try {
            // 1. Apply mode change first (if any)
            const modeChange = pendingChanges.find(c => c.type === 'MODE') as PendingModeChange | undefined;
            if (modeChange) {
                const response = await updateDashboardSharingMode(dashboardId, modeChange.mode, modeChange.publicPermission);
                if (!response.success) {
                    errors.push(`Failed to update mode: ${response.error}`);
                } else if (response.data) {
                    setDashboard(response.data.dashboard);
                }
            }

            // 2. Process removals
            const removals = pendingChanges.filter((c): c is PendingRemoveAccess => c.type === 'REMOVE_ACCESS');
            for (const removal of removals) {
                const response = await removeDashboardSharingRule(dashboardId, removal.ruleId);
                if (!response.success) {
                    errors.push(`Failed to remove ${removal.access.name}: ${response.error}`);
                }
            }

            // 3. Process permission updates
            const updates = pendingChanges.filter((c): c is PendingUpdatePermission => c.type === 'UPDATE_PERMISSION');
            for (const update of updates) {
                const response = await updateDashboardSharingRule(dashboardId, update.ruleId, { permission: update.newPermission });
                if (!response.success) {
                    errors.push(`Failed to update permission: ${response.error}`);
                }
            }

            // 4. Process additions
            const additions = pendingChanges.filter((c): c is PendingAddTarget => c.type === 'ADD_TARGET');
            for (const addition of additions) {
                const response = await addDashboardSharingRule(dashboardId, addition.target.type, addition.target.id, addition.permission);
                if (!response.success) {
                    errors.push(`Failed to add ${addition.target.name}: ${response.error}`);
                }
            }

            // Refresh data regardless of success/failure
            const refreshResponse = await getDashboardSharing(dashboardId);
            if (refreshResponse.success && refreshResponse.data) {
                setDashboard(refreshResponse.data.dashboard);
                setCurrentAccess(refreshResponse.data.currentAccess);
            }
            setPendingChanges([]);

            return { success: errors.length === 0, errors };
        } catch (err) {
            return { success: false, errors: [err instanceof Error ? err.message : 'Error saving changes'] };
        } finally {
            setSaving(false);
        }
    }, [dashboardId, pendingChanges]);

    // Discard all pending changes
    const discardChanges = useCallback(() => {
        setPendingChanges([]);
    }, []);

    return {
        dashboard,
        userAccess,
        currentAccess,
        effectiveMode,
        effectiveAccessList,
        loading,
        error,
        pendingChanges,
        saving,
        canManage,
        handleModeChange,
        handleAddTarget,
        handleUpdatePermission,
        handleRemoveAccess,
        handleSave,
        discardChanges,
    };
}
