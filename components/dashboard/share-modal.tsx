"use client";

/**
 * Share Dashboard Modal
 * FR-5: Space-Aware Permission Assignment
 *
 * Provides a complete sharing interface for dashboards including:
 * - Sharing mode selection (PRIVATE, CUSTOM, PUBLIC)
 * - Search and add users, groups, or spaces
 * - Manage existing access list
 * - Permission level control (VIEW, EDIT, ADMIN)
 */

import { useState, useCallback, useMemo } from "react";
import { X, Link2, AlertCircle } from "lucide-react";
import type { ShareTargetSearchResult } from "@/types/spaces";

// Sub-components
import { SharingModeSelector } from "./share-modal/SharingModeSelector";
import { ShareTargetSearch } from "./share-modal/ShareTargetSearch";
import { AccessList } from "./share-modal/AccessList";
import { ShareModalFooter } from "./share-modal/ShareModalFooter";
import { UnsavedChangesDialog } from "./share-modal/UnsavedChangesDialog";

// Hooks
import { useDashboardSharing } from "./share-modal/hooks/useDashboardSharing";
import { useShareTargetSearch } from "./share-modal/hooks/useShareTargetSearch";

// Types
import type { ShareDashboardModalProps } from "./share-modal/types";

export function ShareDashboardModal({
  dashboardId,
  onClose,
  onShared,
  onUpdate,
}: ShareDashboardModalProps) {
  // Dashboard sharing state and operations
  const {
    dashboard,
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
  } = useDashboardSharing(dashboardId);

  // Search functionality
  const excludeIds = useMemo(
    () => effectiveAccessList.map((a) => a.id),
    [effectiveAccessList]
  );
  const {
    query: searchQuery,
    setQuery: setSearchQuery,
    results: searchResults,
    searching,
    showResults: showSearchResults,
    clearSearch,
  } = useShareTargetSearch({ excludeIds });

  // Local UI state
  const [addTargetError, setAddTargetError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);

  // Handle adding a target
  const onAddTarget = useCallback(
    (target: ShareTargetSearchResult) => {
      setAddTargetError(null);
      handleAddTarget(target);
      clearSearch();
    },
    [handleAddTarget, clearSearch]
  );

  // Handle save
  const onSave = useCallback(async () => {
    const result = await handleSave();
    if (result.success) {
      onUpdate?.();
      onShared?.();
      onClose();
    } else {
      alert(`Some changes failed:\n${result.errors.join('\n')}`);
    }
  }, [handleSave, onClose, onShared, onUpdate]);

  // Handle close with unsaved changes warning
  const handleClose = useCallback(() => {
    if (pendingChanges.length > 0) {
      setShowUnsavedWarning(true);
    } else {
      onClose();
    }
  }, [pendingChanges.length, onClose]);

  // Handle discard and close
  const handleDiscardChanges = useCallback(() => {
    discardChanges();
    setShowUnsavedWarning(false);
    onClose();
  }, [discardChanges, onClose]);

  // Handle save and close
  const handleSaveAndClose = useCallback(async () => {
    setShowUnsavedWarning(false);
    await onSave();
  }, [onSave]);

  // Copy link
  const handleCopyLink = useCallback(() => {
    const url = `${window.location.origin}/dashboards/${dashboardId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [dashboardId]);

  // Loading state
  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-lg mx-4 p-8">
          <div className="flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !dashboard) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-lg mx-4 p-6">
          <div className="flex items-center gap-3 text-red-400">
            <AlertCircle className="w-6 h-6" />
            <span>{error || "Failed to load sharing details"}</span>
          </div>
          <button
            onClick={onClose}
            className="mt-4 px-4 py-2 bg-muted hover:bg-muted/80 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/20">
              <Link2 className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">
                Share "{dashboard.name}"
              </h2>
              <p className="text-sm text-muted-foreground">
                Control who can access this dashboard
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-muted rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Sharing Mode */}
          <SharingModeSelector
            mode={effectiveMode}
            onModeChange={handleModeChange}
            disabled={!canManage}
          />

          {/* Add People (for CUSTOM mode) */}
          {effectiveMode === "CUSTOM" && canManage && (
            <ShareTargetSearch
              query={searchQuery}
              onQueryChange={setSearchQuery}
              results={searchResults}
              searching={searching}
              showResults={showSearchResults}
              onAddTarget={onAddTarget}
              error={addTargetError}
            />
          )}

          {/* Current Access List */}
          <AccessList
            accessList={effectiveAccessList}
            ownerName={dashboard.createdByName || "Owner"}
            mode={effectiveMode}
            canManage={canManage}
            onUpdatePermission={handleUpdatePermission}
            onRemove={handleRemoveAccess}
          />
        </div>

        {/* Footer */}
        <ShareModalFooter
          pendingChangesCount={pendingChanges.length}
          saving={saving}
          onCopyLink={handleCopyLink}
          copied={copied}
          onCancel={handleClose}
          onSave={onSave}
        />

        {/* Unsaved Changes Warning Dialog */}
        {showUnsavedWarning && (
          <UnsavedChangesDialog
            onKeepEditing={() => setShowUnsavedWarning(false)}
            onDiscard={handleDiscardChanges}
            onSaveAndClose={handleSaveAndClose}
          />
        )}
      </div>
    </div>
  );
}
