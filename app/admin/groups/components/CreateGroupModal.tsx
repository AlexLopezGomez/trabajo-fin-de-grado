"use client";

interface CreateGroupModalProps {
    show: boolean;
    creating: boolean;
    error: string | null;
    newName: string;
    newDesc: string;
    onClose: () => void;
    onNameChange: (val: string) => void;
    onDescChange: (val: string) => void;
    onCreate: () => void;
}

export function CreateGroupModal({
    show,
    creating,
    error,
    newName,
    newDesc,
    onClose,
    onNameChange,
    onDescChange,
    onCreate,
}: CreateGroupModalProps) {
    if (!show) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={creating ? undefined : onClose}
            />
            <div className="relative bg-card border border-border rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
                <div className="mb-4">
                    <h3 className="text-lg font-semibold text-white">Create Group</h3>
                    <p className="text-sm text-muted-foreground">Define the name and description.</p>
                </div>
                {error && (
                    <div className="mb-3 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                        {error}
                    </div>
                )}
                <div className="space-y-3">
                    <input
                        type="text"
                        placeholder="Group name"
                        className="w-full px-3 py-2 rounded-lg border border-border bg-card/50 text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                        value={newName}
                        onChange={(e) => onNameChange(e.target.value)}
                        disabled={creating}
                    />
                    <textarea
                        placeholder="Description (optional)"
                        className="w-full px-3 py-2 rounded-lg border border-border bg-card/50 text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                        value={newDesc}
                        onChange={(e) => onDescChange(e.target.value)}
                        disabled={creating}
                        rows={3}
                    />
                </div>
                <div className="mt-5 flex gap-3">
                    <button
                        onClick={onClose}
                        disabled={creating}
                        className="flex-1 px-4 py-2 rounded-lg border border-border bg-card/50 text-white hover:bg-muted/50 transition-colors disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onCreate}
                        disabled={creating || !newName.trim()}
                        className="flex-1 px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {creating ? "Creating..." : "Create"}
                    </button>
                </div>
            </div>
        </div>
    );
}
