"use client";

import { ArrowLeft } from "lucide-react";
import type { UserDetail } from "@/types/rbac";

interface UserPageHeaderProps {
    user: UserDetail;
    onBack: () => void;
}

/**
 * User Page Header Component
 * Displays user header with avatar, name, and status
 */
export function UserPageHeader({ user, onBack }: UserPageHeaderProps) {
    return (
        <div className="border-b border-border/50 bg-card/30 backdrop-blur-sm sticky top-0 z-10">
            <div className="max-w-4xl mx-auto px-6 py-6">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-muted-foreground hover:text-white transition-colors mb-4"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to users
                </button>

                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                        {/* Avatar */}
                        {user.image ? (
                            <img
                                src={user.image}
                                alt={user.name}
                                className="w-16 h-16 rounded-full border-2 border-border"
                            />
                        ) : (
                            <div className="w-16 h-16 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center">
                                <span className="text-primary font-bold text-xl">
                                    {user.name
                                        .split(" ")
                                        .map((n) => n[0])
                                        .join("")
                                        .toUpperCase()
                                        .slice(0, 2)}
                                </span>
                            </div>
                        )}

                        {/* User info */}
                        <div>
                            <h1 className="text-2xl font-bold text-white">{user.name}</h1>
                            <p className="text-muted-foreground">{user.email}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Status badge */}
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30">
                            <div className="w-2 h-2 rounded-full bg-emerald-400" />
                            <span className="text-xs font-medium text-emerald-400">
                                {user.status}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
