"use client";

import { X, Plus } from "lucide-react";
import { useCreateSpace } from "../hooks/useCreateSpace";
import { SpaceBasicInfo } from "./SpaceBasicInfo";
import { SpaceAccessControl } from "./SpaceAccessControl";
import type { SpaceSummary } from "@/types/spaces";

interface CreateSpaceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreated: (space: SpaceSummary) => void;
}

/**
 * Create Space Modal Component
 * Modal dialog for creating a new space with access control
 */
export function CreateSpaceModal({
    isOpen,
    onClose,
    onCreated,
}: CreateSpaceModalProps) {
    const {
        name,
        setName,
        description,
        setDescription,
        type,
        setType,
        loading,
        error,
        selectedGroupIds,
        selectedUserIds,
        showAccessSection,
        setShowAccessSection,
        toggleGroup,
        toggleUser,
        groups,
        users,
        loadingData,
        handleSubmit,
    } = useCreateSpace((space) => {
        onCreated(space);
        onClose();
    });

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-border">
                    <h2 className="text-lg font-semibold text-foreground">Create Space</h2>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-muted rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-muted-foreground" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    {/* Basic Info */}
                    <SpaceBasicInfo
                        name={name}
                        description={description}
                        type={type}
                        onNameChange={setName}
                        onDescriptionChange={setDescription}
                        onTypeChange={setType}
                    />

                    {/* Access Control */}
                    <SpaceAccessControl
                        isOpen={showAccessSection}
                        onToggle={() => setShowAccessSection(!showAccessSection)}
                        groups={groups}
                        users={users}
                        selectedGroupIds={selectedGroupIds}
                        selectedUserIds={selectedUserIds}
                        onToggleGroup={toggleGroup}
                        onToggleUser={toggleUser}
                        isLoading={loadingData}
                    />

                    {/* Error */}
                    {error && (
                        <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
                            {error}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !name.trim()}
                            className="px-4 py-2 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-foreground rounded-lg transition-colors flex items-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                <>
                                    <Plus className="w-4 h-4" />
                                    Create Space
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
