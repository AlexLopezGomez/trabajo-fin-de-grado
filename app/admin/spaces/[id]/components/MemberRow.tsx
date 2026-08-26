"use client";

import { useState, useEffect } from "react";
import { getUsers } from "@/app/actions/admin/users";
import type { SpaceMember } from "@/types/spaces";
import { Trash2 } from "lucide-react";

const ROLE_BADGES: Record<string, { label: string; class: string }> = {
    ADMIN: { label: "Admin", class: "text-primary bg-primary/15 border-primary/30" },
    CONTRIBUTOR: { label: "Contributor", class: "text-foreground bg-card border-border" },
    VIEWER: { label: "Viewer", class: "text-muted-foreground bg-muted/50 border-border" },
};

interface MemberRowProps {
    member: SpaceMember;
    isCreator: boolean;
    onUpdateRole: (userId: string, role: "VIEWER" | "CONTRIBUTOR" | "ADMIN") => void;
    onRemove: (userId: string) => void;
}

/**
 * Member Row Component
 * Displays individual member in the members table
 */
export function MemberRow({ member, isCreator, onUpdateRole, onRemove }: MemberRowProps) {
    const [userName, setUserName] = useState<string>(member.userName || "Loading...");
    const [userEmail, setUserEmail] = useState<string>(member.userEmail || "");

    useEffect(() => {
        if (member.userName) {
            setUserName(member.userName);
            setUserEmail(member.userEmail || "");
            return;
        }

        async function fetchUser() {
            try {
                const response = await getUsers({ search: member.userId }, 1, 1);
                if (response.success && response.data?.users?.[0]) {
                    setUserName(response.data.users[0].name);
                    setUserEmail(response.data.users[0].email);
                } else {
                    setUserName("Unknown User");
                }
            } catch {
                setUserName("Unknown User");
            }
        }
        fetchUser();
    }, [member.userId, member.userName, member.userEmail]);

    const roleInfo = ROLE_BADGES[member.role];

    return (
        <tr className="hover:bg-muted/10">
            <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
                        <span className="text-primary font-medium text-sm">
                            {userName.charAt(0).toUpperCase()}
                        </span>
                    </div>
                    <div>
                        <div className="font-medium text-foreground flex items-center gap-2">
                            {userName}
                            {isCreator && (
                                <span className="text-xs px-1.5 py-0.5 rounded bg-primary/15 text-primary border border-primary/30">
                                    Creator
                                </span>
                            )}
                        </div>
                        <div className="text-sm text-muted-foreground">{userEmail}</div>
                    </div>
                </div>
            </td>
            <td className="px-6 py-4">
                <select
                    value={member.role}
                    onChange={(e) => onUpdateRole(member.userId, e.target.value as any)}
                    disabled={isCreator}
                    className={`px-2 py-1 rounded border text-sm ${roleInfo.class} bg-transparent focus:outline-none ${isCreator ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                        }`}
                >
                    <option value="VIEWER">Viewer</option>
                    <option value="CONTRIBUTOR">Contributor</option>
                    <option value="ADMIN">Admin</option>
                </select>
            </td>
            <td className="px-6 py-4 text-sm text-muted-foreground">
                {new Date(member.addedAt).toLocaleDateString()}
            </td>
            <td className="px-6 py-4 text-right">
                {!isCreator && (
                    <button
                        onClick={() => onRemove(member.userId)}
                        className="p-2 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                )}
            </td>
        </tr>
    );
}
