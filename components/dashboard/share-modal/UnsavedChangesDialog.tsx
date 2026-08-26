"use client";

/**
 * UnsavedChangesDialog Component
 * Confirmation dialog for unsaved changes
 */

import type { UnsavedChangesDialogProps } from "./types";

export function UnsavedChangesDialog({
    onKeepEditing,
    onDiscard,
    onSaveAndClose,
}: UnsavedChangesDialogProps) {
    return (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-10 rounded-xl">
            <div className="bg-card border border-border rounded-lg p-6 max-w-md mx-4">
                <h3 className="text-lg font-semibold text-white mb-2">Unsaved Changes</h3>
                <p className="text-sm text-muted-foreground mb-4">
                    You have unsaved changes. What would you like to do?
                </p>
                <div className="flex gap-2 justify-end">
                    <button
                        onClick={onKeepEditing}
                        className="px-4 py-2 text-muted-foreground hover:text-white transition-colors"
                    >
                        Keep Editing
                    </button>
                    <button
                        onClick={onDiscard}
                        className="px-4 py-2 bg-muted hover:bg-muted/80 rounded-lg transition-colors"
                    >
                        Discard Changes
                    </button>
                    <button
                        onClick={onSaveAndClose}
                        className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors"
                    >
                        Save & Close
                    </button>
                </div>
            </div>
        </div>
    );
}
