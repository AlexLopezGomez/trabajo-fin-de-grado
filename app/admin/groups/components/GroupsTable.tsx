"use client";

import { Users } from "lucide-react";
import { useRouter } from "next/navigation";
import type { Group } from "@/types/rbac";

interface GroupsTableProps {
    groups: Group[];
    search: string;
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}

export function GroupsTable({
    groups,
    search,
    page,
    pageSize,
    total,
    totalPages,
    onPageChange,
}: GroupsTableProps) {
    const router = useRouter();

    return (
        <div className="bg-card/50 border border-border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-muted/30 border-b border-border">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Group
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Members
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Description
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Created
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {groups.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-12 text-center">
                                    <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                                    <p className="text-muted-foreground">No groups found</p>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        {search
                                            ? "Try adjusting your search"
                                            : "Create your first group to get started"}
                                    </p>
                                </td>
                            </tr>
                        ) : (
                            groups.map((group) => (
                                <tr
                                    key={group.id}
                                    onClick={() => router.push(`/admin/groups/${group.id}`)}
                                    className="hover:bg-muted/20 transition-colors cursor-pointer"
                                >
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                                                <Users className="w-5 h-5 text-primary" />
                                            </div>
                                            <div>
                                                <div className="font-medium text-white">{group.name}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/30">
                                            <Users className="w-3 h-3" />
                                            {group.memberIds.length} member
                                            {group.memberIds.length !== 1 ? "s" : ""}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-muted-foreground">
                                        {group.description || "—"}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-muted-foreground">
                                        {new Date(group.createdAt).toLocaleDateString()}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {total > pageSize && (
                <div className="px-6 py-4 border-t border-border flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                        Showing {(page - 1) * pageSize + 1} to{" "}
                        {Math.min(page * pageSize, total)} of {total} groups
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => onPageChange(page - 1)}
                            disabled={page === 1}
                            className="px-4 py-2 rounded-lg border border-border bg-card/50 text-white hover:bg-muted/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Previous
                        </button>
                        <button
                            onClick={() => onPageChange(page + 1)}
                            disabled={page >= totalPages}
                            className="px-4 py-2 rounded-lg border border-border bg-card/50 text-white hover:bg-muted/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
