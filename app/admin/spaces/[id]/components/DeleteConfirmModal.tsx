"use client";

import { AlertTriangle } from "lucide-react";

interface DeleteConfirmModalProps {
    isOpen: boolean;
    spaceName: string;
    onClose: () => void;
    onConfirm: () => void;
}

/**
 * Delete Confirmation Modal
 * Simple modal for confirming space deletion
 */
export function DeleteConfirmModal({
    isOpen,
    spaceName,
    onClose,
    onConfirm,
}: DeleteConfirmModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-red-500/20">
                        <AlertTriangle className="w-6 h-6 text-red-400" />
                    </div>
                    <h2 className="text-lg font-semibold text-foreground">Delete Space?</h2>
                </div>
                <p className="text-muted-foreground mb-6">
                    Are you sure you want to delete "{spaceName}"? This action cannot be undone.
                </p>
                <div className="flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        className="px-4 py-2 bg-red-500 hover:bg-red-600 text-foreground rounded-lg transition-colors"
                    >
                        Delete
                    </button>
                </div>
            </div>
        </div>
    );
}
