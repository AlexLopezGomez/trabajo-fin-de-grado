"use client";

import { Users } from "lucide-react";
import InheritedRoles from "@/components/admin/inherited-roles";
import type { UserGroup } from "../hooks/useUserDetail";

interface UserGroupsCardProps {
    userGroups: UserGroup[];
    isLoading: boolean;
    onGroupClick: (groupId: string) => void;
}

/**
 * User Groups Card Component
 * Displays user's group memberships and inherited roles
 */
export function UserGroupsCard({
    userGroups,
    isLoading,
    onGroupClick,
}: UserGroupsCardProps) {
    return (
        <div className="bg-card/50 border border-border rounded-lg p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Groups & Inherited Roles
            </h2>

            {isLoading ? (
                <div className="text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary"></div>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Loading groups...
                    </p>
                </div>
            ) : userGroups.length === 0 ? (
                <div className="text-center py-8">
                    <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                    <p className="text-muted-foreground">
                        Not a member of any groups
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                        Groups allow bulk permission management
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {/* Group membership list */}
                    <div>
                        <label className="text-sm text-muted-foreground mb-2 block">
                            Group Membership
                        </label>
                        <div className="space-y-2">
                            {userGroups.map((group) => (
                                <button
                                    key={group.groupId}
                                    onClick={() => onGroupClick(group.groupId)}
                                    className="w-full text-left p-3 rounded-lg border border-border bg-card/50 hover:bg-muted/20 transition-colors flex items-center justify-between"
                                >
                                    <div className="flex items-center gap-2">
                                        <Users className="w-4 h-4 text-primary" />
                                        <span className="font-medium text-white">
                                            {group.groupName}
                                        </span>
                                    </div>
                                    <span className="text-xs text-muted-foreground">
                                        {group.roles.length} role
                                        {group.roles.length !== 1 ? "s" : ""}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Inherited roles */}
                    <div>
                        <label className="text-sm text-muted-foreground mb-2 block">
                            Inherited Roles
                        </label>
                        <InheritedRoles roles={userGroups} isLoading={false} />
                    </div>
                </div>
            )}
        </div>
    );
}
