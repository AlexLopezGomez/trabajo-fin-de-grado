"use client";

import { Users, Shield, Calendar } from "lucide-react";

interface GroupStatsProps {
    memberCount: number;
    roleCount: number;
    createdAt: Date | string;
}

export function GroupStats({
    memberCount,
    roleCount,
    createdAt,
}: GroupStatsProps) {
    return (
        <div className="bg-card/50 border border-border rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-white mb-4">
                Group Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-muted-foreground" />
                    <div>
                        <div className="text-sm text-muted-foreground">Members</div>
                        <div className="text-lg font-semibold text-white">
                            {memberCount}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-muted-foreground" />
                    <div>
                        <div className="text-sm text-muted-foreground">Roles</div>
                        <div className="text-lg font-semibold text-white">
                            {roleCount}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-muted-foreground" />
                    <div>
                        <div className="text-sm text-muted-foreground">Created</div>
                        <div className="text-lg font-semibold text-white">
                            {new Date(createdAt).toLocaleDateString()}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
