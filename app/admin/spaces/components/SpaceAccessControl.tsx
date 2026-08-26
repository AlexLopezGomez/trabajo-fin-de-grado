"use client";

import { Users, ChevronDown, ChevronUp } from "lucide-react";

interface SpaceAccessControlProps {
    isOpen: boolean;
    onToggle: () => void;
    groups: Array<{ id: string; name: string; memberCount: number }>;
    users: Array<{ id: string; name: string; email: string }>;
    selectedGroupIds: string[];
    selectedUserIds: string[];
    onToggleGroup: (id: string) => void;
    onToggleUser: (id: string) => void;
    isLoading: boolean;
}

/**
 * Space Access Control Component
 * Collapsible section for selecting groups and users
 */
export function SpaceAccessControl({
    isOpen,
    onToggle,
    groups,
    users,
    selectedGroupIds,
    selectedUserIds,
    onToggleGroup,
    onToggleUser,
    isLoading,
}: SpaceAccessControlProps) {
    const totalSelected = selectedGroupIds.length + selectedUserIds.length;

    return (
        <div>
            <button
                type="button"
                onClick={onToggle}
                className="flex items-center justify-between w-full px-4 py-3 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 hover:border-primary/50 text-foreground transition-all"
            >
                <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">
                        Add Groups & Users
                        {totalSelected > 0 && (
                            <span className="ml-2 px-2 py-0.5 rounded-full bg-primary/20 text-primary text-xs">
                                {totalSelected}
                            </span>
                        )}
                    </span>
                </div>
                {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
            </button>

            {isOpen && (
                <div className="mt-3 p-3 rounded-lg border border-border bg-muted/20 space-y-4">
                    {isLoading ? (
                        <div className="text-center py-4">
                            <div className="inline-block animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary"></div>
                        </div>
                    ) : (
                        <>
                            {/* Groups */}
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">
                                    Grant Access to Groups
                                </label>
                                {groups.length === 0 ? (
                                    <p className="text-xs text-muted-foreground">No groups available</p>
                                ) : (
                                    <div className="space-y-2 max-h-40 overflow-y-auto">
                                        {groups.map((group) => (
                                            <label
                                                key={group.id}
                                                className="flex items-center gap-2 p-2 rounded hover:bg-muted/30 cursor-pointer"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selectedGroupIds.includes(group.id)}
                                                    onChange={() => onToggleGroup(group.id)}
                                                    className="w-4 h-4 rounded border-border bg-background text-primary focus:ring-2 focus:ring-primary/50 focus:ring-offset-0"
                                                />
                                                <div className="flex-1">
                                                    <p className="text-sm text-foreground">{group.name}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {group.memberCount} members
                                                    </p>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Users */}
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">
                                    Add Individual Users
                                </label>
                                {users.length === 0 ? (
                                    <p className="text-xs text-muted-foreground">No users available</p>
                                ) : (
                                    <div className="space-y-2 max-h-40 overflow-y-auto">
                                        {users.map((user) => (
                                            <label
                                                key={user.id}
                                                className="flex items-center gap-2 p-2 rounded hover:bg-muted/30 cursor-pointer"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selectedUserIds.includes(user.id)}
                                                    onChange={() => onToggleUser(user.id)}
                                                    className="w-4 h-4 rounded border-border bg-background text-primary focus:ring-2 focus:ring-primary/50 focus:ring-offset-0"
                                                />
                                                <div className="flex-1">
                                                    <p className="text-sm text-foreground">{user.name}</p>
                                                    <p className="text-xs text-muted-foreground">{user.email}</p>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="pt-2 border-t border-border">
                                <p className="text-xs text-primary">
                                    Tip: Groups control access boundaries. Users in selected groups will automatically see this space.
                                </p>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
