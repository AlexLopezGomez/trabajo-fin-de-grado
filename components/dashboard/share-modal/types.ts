/**
 * Share Modal Types
 * Local type definitions for the share modal component
 */

import type {
    DashboardSharingMode,
    DashboardPermission,
    SharingTargetType,
    ShareTargetSearchResult,
} from "@/types/spaces";

// =============================================================================
// Pending Change Types
// =============================================================================

export interface PendingChange {
    type: 'MODE' | 'ADD_TARGET' | 'UPDATE_PERMISSION' | 'REMOVE_ACCESS';
    id: string;
}

export interface PendingModeChange extends PendingChange {
    type: 'MODE';
    mode: DashboardSharingMode;
    publicPermission?: DashboardPermission;
}

export interface PendingAddTarget extends PendingChange {
    type: 'ADD_TARGET';
    target: ShareTargetSearchResult;
    permission: DashboardPermission;
}

export interface PendingUpdatePermission extends PendingChange {
    type: 'UPDATE_PERMISSION';
    ruleId: string;
    oldPermission: DashboardPermission;
    newPermission: DashboardPermission;
}

export interface PendingRemoveAccess extends PendingChange {
    type: 'REMOVE_ACCESS';
    ruleId: string;
    access: {
        id: string;
        name: string;
        type: SharingTargetType;
        permission: DashboardPermission;
    };
}

export type PendingChanges = (
    | PendingModeChange
    | PendingAddTarget
    | PendingUpdatePermission
    | PendingRemoveAccess
)[];

// =============================================================================
// Access Entry Types
// =============================================================================

export interface AccessEntry {
    id: string;
    name: string;
    type: SharingTargetType;
    permission: DashboardPermission;
    grantedBy?: string;
    grantedAt?: Date;
    pending?: boolean;
    pendingRemoval?: boolean;
}

// =============================================================================
// Component Props
// =============================================================================

export interface ShareDashboardModalProps {
    dashboardId: string;
    onClose: () => void;
    onShared?: () => void;
    onUpdate?: () => void;
}

export interface SharingModeSelectorProps {
    mode: DashboardSharingMode | undefined;
    onModeChange: (mode: DashboardSharingMode) => void;
    disabled: boolean;
}

export interface ShareTargetSearchProps {
    query: string;
    onQueryChange: (query: string) => void;
    results: ShareTargetSearchResult[];
    searching: boolean;
    showResults: boolean;
    onAddTarget: (target: ShareTargetSearchResult) => void;
    error?: string | null;
}

export interface AccessListItemProps {
    access: AccessEntry;
    canManage: boolean;
    onUpdatePermission: (id: string, permission: DashboardPermission) => void;
    onRemove: (id: string) => void;
}

export interface AccessListProps {
    accessList: AccessEntry[];
    ownerName: string;
    mode: DashboardSharingMode | undefined;
    canManage: boolean;
    onUpdatePermission: (id: string, permission: DashboardPermission) => void;
    onRemove: (id: string) => void;
}

export interface ShareModalFooterProps {
    pendingChangesCount: number;
    saving: boolean;
    onCopyLink: () => void;
    copied: boolean;
    onCancel: () => void;
    onSave: () => void;
}

export interface UnsavedChangesDialogProps {
    onKeepEditing: () => void;
    onDiscard: () => void;
    onSaveAndClose: () => void;
}
