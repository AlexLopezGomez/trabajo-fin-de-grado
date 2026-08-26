"use client";

import { Users, Shield } from "lucide-react";
import { useRouter } from "next/navigation";

interface RoleUsageStatsProps {
    roleId: string;
    usage: { userCount: number; groupCount: number } | null;
}

export function RoleUsageStats({ roleId, usage }: RoleUsageStatsProps) {
    const router = useRouter();

    if (!usage) return null;

    return (
        <div className="bg-card/50 border border-border rounded-lg p-6 mt-6">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    Role Usage
                </h2>
                {usage.userCount > 0 && (
                    <button
                        onClick={() => router.push(`/admin/users?role=${roleId}`)}
                        className="text-sm text-primary hover:text-primary/80 transition-colors"
                    >
                        View users →
                    </button>
                )}
            </div>

            {usage.userCount === 0 && usage.groupCount === 0 ? (
                <div className="text-center py-8">
                    <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                    <p className="text-muted-foreground">No users or groups have this role</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-muted/20 border border-border">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-emerald-500/10">
                                <Users className="w-5 h-5 text-emerald-400" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Direct Users</p>
                                <p className="text-2xl font-bold text-white">{usage.userCount}</p>
                            </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                            Users with this role directly assigned
                        </p>
                    </div>

                    <div className="p-4 rounded-lg bg-muted/20 border border-border">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-blue-500/10">
                                <Shield className="w-5 h-5 text-blue-400" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Groups</p>
                                <p className="text-2xl font-bold text-white">{usage.groupCount}</p>
                            </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                            Groups with this role assigned
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
