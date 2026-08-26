"use client";

interface UserActionsCardProps {
    onChangeRole: () => void;
    onDelete: () => void;
}

/**
 * User Actions Card Component
 * Sidebar card with user management actions
 */
export function UserActionsCard({
    onChangeRole,
    onDelete,
}: UserActionsCardProps) {
    return (
        <div className="bg-card/50 border border-border rounded-lg p-6">
            <h2 className="text-lg font-semibold text-white mb-4">
                Actions
            </h2>

            <div className="space-y-2">
                <button
                    onClick={onChangeRole}
                    className="w-full px-4 py-2 rounded-lg bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 transition-colors text-sm font-medium"
                >
                    Change Role
                </button>
                <button
                    onClick={onDelete}
                    className="w-full px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/40 text-red-200 hover:bg-red-500/20 transition-colors text-sm font-medium"
                >
                    Delete User
                </button>
                <p className="text-xs text-muted-foreground mt-2">
                    Soft delete revokes sessions and preserves audit history.
                </p>
            </div>
        </div>
    );
}
