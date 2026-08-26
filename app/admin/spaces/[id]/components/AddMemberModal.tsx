"use client";

import { X, User, Users, Plus } from "lucide-react";
import { useAddMember } from "../hooks/useAddMember";

interface AddMemberModalProps {
    isOpen: boolean;
    spaceId: string;
    existingMemberIds: string[];
    existingGroupIds: string[];
    onClose: () => void;
    onSuccess: () => void;
}

/**
 * Add Member/Group Modal - Simplified wrapper
 * Uses useAddMember hook for all logic
 */
export function AddMemberModal({
    isOpen,
    spaceId,
    existingMemberIds,
    existingGroupIds,
    onClose,
    onSuccess,
}: AddMemberModalProps) {
    const {
        users,
        groups,
        loadingData,
        selectedUserIds,
        selectedGroupIds,
        userRole,
        setUserRole,
        toggleUser,
        toggleGroup,
        userSearch,
        setUserSearch,
        groupSearch,
        setGroupSearch,
        activeTab,
        setActiveTab,
        adding,
        error,
        totalSelected,
        handleAdd,
    } = useAddMember(spaceId, existingMemberIds, existingGroupIds, () => {
        onSuccess();
        onClose();
    });

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-xl max-h-[85vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
                    <div>
                        <h2 className="text-lg font-semibold text-foreground">Add Members & Groups</h2>
                        <p className="text-sm text-muted-foreground">
                            Select users and groups to add to this space
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-muted rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-muted-foreground" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-border shrink-0">
                    <button
                        onClick={() => setActiveTab("users")}
                        className={`flex-1 px-4 py-3 text-sm font-medium transition-colors relative ${activeTab === "users" ? "text-primary" : "text-muted-foreground hover:text-foreground"
                            }`}
                    >
                        <div className="flex items-center justify-center gap-2">
                            <User className="w-4 h-4" />
                            Users
                            {selectedUserIds.length > 0 && (
                                <span className="px-1.5 py-0.5 rounded-full bg-primary/20 text-primary text-xs">
                                    {selectedUserIds.length}
                                </span>
                            )}
                        </div>
                        {activeTab === "users" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
                    </button>
                    <button
                        onClick={() => setActiveTab("groups")}
                        className={`flex-1 px-4 py-3 text-sm font-medium transition-colors relative ${activeTab === "groups" ? "text-primary" : "text-muted-foreground hover:text-foreground"
                            }`}
                    >
                        <div className="flex items-center justify-center gap-2">
                            <Users className="w-4 h-4" />
                            Groups
                            {selectedGroupIds.length > 0 && (
                                <span className="px-1.5 py-0.5 rounded-full bg-primary/20 text-primary text-xs">
                                    {selectedGroupIds.length}
                                </span>
                            )}
                        </div>
                        {activeTab === "groups" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden flex flex-col p-4 gap-4">
                    {loadingData ? (
                        <div className="flex-1 flex items-center justify-center">
                            <div className="text-center">
                                <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                                <p className="mt-4 text-muted-foreground">Loading...</p>
                            </div>
                        </div>
                    ) : activeTab === "users" ? (
                        <UsersList
                            users={users}
                            selectedIds={selectedUserIds}
                            onToggle={toggleUser}
                            search={userSearch}
                            onSearchChange={setUserSearch}
                            role={userRole}
                            onRoleChange={setUserRole}
                        />
                    ) : (
                        <GroupsList
                            groups={groups}
                            selectedIds={selectedGroupIds}
                            onToggle={toggleGroup}
                            search={groupSearch}
                            onSearchChange={setGroupSearch}
                        />
                    )}
                </div>

                {/* Error */}
                {error && (
                    <div className="mx-4 mb-2 text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
                        {error}
                    </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between p-4 border-t border-border shrink-0">
                    <div className="text-sm text-muted-foreground">
                        {totalSelected > 0 ? (
                            <span>
                                <span className="text-foreground font-medium">{totalSelected}</span> selected
                            </span>
                        ) : (
                            "Select users or groups to add"
                        )}
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleAdd}
                            disabled={totalSelected === 0 || adding}
                            className="px-4 py-2 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-foreground rounded-lg transition-colors flex items-center gap-2"
                        >
                            {adding ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Adding...
                                </>
                            ) : (
                                <>
                                    <Plus className="w-4 h-4" />
                                    Add {totalSelected > 0 ? `(${totalSelected})` : ""}
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Users List Component
function UsersList({
    users,
    selectedIds,
    onToggle,
    search,
    onSearchChange,
    role,
    onRoleChange,
}: {
    users: Array<{ id: string; name: string; email: string }>;
    selectedIds: string[];
    onToggle: (id: string) => void;
    search: string;
    onSearchChange: (value: string) => void;
    role: "VIEWER" | "CONTRIBUTOR" | "ADMIN";
    onRoleChange: (role: "VIEWER" | "CONTRIBUTOR" | "ADMIN") => void;
}) {
    return (
        <>
            {/* Search */}
            <div className="relative shrink-0">
                <input
                    type="text"
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder="Search users..."
                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-muted/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
            </div>

            {/* Role selector */}
            <div className="shrink-0">
                <label className="block text-sm text-muted-foreground mb-1.5">Role for selected users</label>
                <select
                    value={role}
                    onChange={(e) => onRoleChange(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-muted/50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                    <option value="VIEWER">Viewer - Can view dashboards</option>
                    <option value="CONTRIBUTOR">Contributor - Can edit dashboards</option>
                    <option value="ADMIN">Admin - Full access</option>
                </select>
            </div>

            {/* User list */}
            <div className="flex-1 overflow-y-auto border border-border rounded-lg">
                {users.length === 0 ? (
                    <div className="p-6 text-center text-muted-foreground">
                        No users available
                    </div>
                ) : (
                    <div className="divide-y divide-border">
                        {users.map((user) => (
                            <label
                                key={user.id}
                                className="flex items-center gap-3 p-3 hover:bg-muted/30 cursor-pointer transition-colors"
                            >
                                <input
                                    type="checkbox"
                                    checked={selectedIds.includes(user.id)}
                                    onChange={() => onToggle(user.id)}
                                    className="w-4 h-4 rounded"
                                />
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium text-foreground truncate">{user.name}</div>
                                    <div className="text-xs text-muted-foreground truncate">{user.email}</div>
                                </div>
                            </label>
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}

// Groups List Component
function GroupsList({
    groups,
    selectedIds,
    onToggle,
    search,
    onSearchChange,
}: {
    groups: Array<{ id: string; name: string; memberCount: number }>;
    selectedIds: string[];
    onToggle: (id: string) => void;
    search: string;
    onSearchChange: (value: string) => void;
}) {
    return (
        <>
            {/* Search */}
            <div className="relative shrink-0">
                <input
                    type="text"
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder="Search groups..."
                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-muted/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
            </div>

            <p className="text-xs text-primary bg-primary/10 border border-primary/20 rounded-lg p-3 shrink-0">
                Tip: All members of selected groups will automatically have access to this space.
            </p>

            {/* Group list */}
            <div className="flex-1 overflow-y-auto border border-border rounded-lg">
                {groups.length === 0 ? (
                    <div className="p-6 text-center text-muted-foreground">
                        No groups available
                    </div>
                ) : (
                    <div className="divide-y divide-border">
                        {groups.map((group) => (
                            <label
                                key={group.id}
                                className="flex items-center gap-3 p-3 hover:bg-muted/30 cursor-pointer transition-colors"
                            >
                                <input
                                    type="checkbox"
                                    checked={selectedIds.includes(group.id)}
                                    onChange={() => onToggle(group.id)}
                                    className="w-4 h-4 rounded"
                                />
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium text-foreground truncate">{group.name}</div>
                                    <div className="text-xs text-muted-foreground">
                                        {group.memberCount} member{group.memberCount !== 1 ? "s" : ""}
                                    </div>
                                </div>
                            </label>
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}
