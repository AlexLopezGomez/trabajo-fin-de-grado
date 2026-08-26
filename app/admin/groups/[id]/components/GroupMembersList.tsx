"use client";

import { Users, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";

interface Member {
    id: string;
    name: string;
    email: string;
    role: string;
}

interface GroupMembersListProps {
    groupId: string;
    members: Member[];
}

export function GroupMembersList({ groupId, members }: GroupMembersListProps) {
    const router = useRouter();

    return (
        <div className="bg-card/50 border border-border rounded-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">Members</h2>
                <button
                    onClick={() => router.push(`/admin/groups/${groupId}/members`)}
                    className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors flex items-center gap-2 text-sm"
                >
                    <UserPlus className="w-4 h-4" />
                    Add Members
                </button>
            </div>

            {members.length === 0 ? (
                <div className="text-center py-8">
                    <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                    <p className="text-muted-foreground">No members in this group</p>
                    <p className="text-sm text-muted-foreground mt-1">
                        Add members to start assigning group-based permissions
                    </p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-muted/30 border-b border-border">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                                    User
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                                    Role
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {members.map((member) => (
                                <tr
                                    key={member.id}
                                    onClick={() => router.push(`/admin/users/${member.id}`)}
                                    className="hover:bg-muted/20 transition-colors cursor-pointer"
                                >
                                    <td className="px-4 py-3">
                                        <div>
                                            <div className="font-medium text-white">{member.name}</div>
                                            <div className="text-sm text-muted-foreground">
                                                {member.email}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                                            {member.role}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
