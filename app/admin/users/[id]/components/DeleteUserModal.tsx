"use client";

interface DeleteUserModalProps {
    isOpen: boolean;
    userName: string;
    onClose: () => void;
    onConfirm: () => void;
    deleteReason: string;
    setDeleteReason: (reason: string) => void;
    isDeleting: boolean;
    error: string | null;
}

/**
 * Delete User Modal Component
 * Modal dialog for confirming user deletion with reason
 */
export function DeleteUserModal({
    isOpen,
    userName,
    onClose,
    onConfirm,
    deleteReason,
    setDeleteReason,
    isDeleting,
    error,
}: DeleteUserModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
            <div className="w-full max-w-lg rounded-xl border border-border bg-card/90 p-6 shadow-xl">
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <h2 className="text-xl font-semibold text-white">Delete user</h2>
                        <p className="text-sm text-muted-foreground">
                            Soft delete disables the account and revokes sessions. Data remains for audit.
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-muted-foreground hover:text-white"
                    >
                        ✕
                    </button>
                </div>

                {error && (
                    <div className="mb-3 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                        {error}
                    </div>
                )}

                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm text-muted-foreground">Reason (optional)</label>
                        <textarea
                            value={deleteReason}
                            onChange={(e) => setDeleteReason(e.target.value)}
                            maxLength={500}
                            className="w-full min-h-[100px] rounded-lg border border-border bg-background/60 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                            placeholder="E.g., left the company"
                        />
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-2">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 rounded-lg border border-border bg-background/60 text-muted-foreground hover:text-white hover:border-primary/50 transition-colors"
                            disabled={isDeleting}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={onConfirm}
                            className="px-4 py-2 rounded-lg bg-red-500 text-white border border-red-500/60 hover:bg-red-600 transition-colors disabled:opacity-60"
                            disabled={isDeleting}
                        >
                            {isDeleting ? "Deleting..." : "Confirm delete"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
