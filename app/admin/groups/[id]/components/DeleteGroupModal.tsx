"use client";

import { AlertTriangle, Loader2 } from "lucide-react";

interface DeleteGroupModalProps {
    groupName: string;
    memberCount: number;
    deleting: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

export function DeleteGroupModal({
    groupName,
    memberCount,
    deleting,
    onConfirm,
    onCancel,
}: DeleteGroupModalProps) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={deleting ? undefined : onCancel}
            />
            <div className="relative bg-card border border-border rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center">
                        <AlertTriangle className="w-6 h-6 text-red-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-white">Delete Group</h3>
                        <p className="text-sm text-muted-foreground">
                            This action cannot be undone
                        </p>
                    </div>
                </div>

                <p className="text-sm text-muted-foreground mb-6">
                    Are you sure you want to delete the group "{groupName}"? This
                    will remove all {memberCount} members from the group and revoke
                    all group-based permissions. The group will be marked as deleted
                    but preserved for audit purposes.
                </p>

                <div className="flex gap-3">
                    <button
                        onClick={onCancel}
                        disabled={deleting}
                        className="flex-1 px-4 py-2 rounded-lg border border-border bg-card/50 text-white hover:bg-muted/50 transition-colors disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={deleting}
                        className="flex-1 px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
                        {deleting ? "Deleting..." : "Delete Group"}
                    </button>
                </div>
            </div>
        </div>
    );
}
