"use client";

import { Key, Clock, Calendar } from "lucide-react";

interface UserAuthSectionProps {
    providers: string[];
    lastLogin: Date | null;
    createdAt: Date;
}

/**
 * User Authentication Section Component
 * Displays auth methods, last login, and account creation date
 */
export function UserAuthSection({
    providers,
    lastLogin,
    createdAt,
}: UserAuthSectionProps) {
    return (
        <div className="bg-card/50 border border-border rounded-lg p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Key className="w-5 h-5 text-primary" />
                Authentication
            </h2>

            <div className="space-y-3">
                {/* Auth providers */}
                <div>
                    <label className="text-sm text-muted-foreground mb-2 block">
                        Sign-in Methods
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {providers && providers.length > 0 ? (
                            providers.map((provider) => (
                                <div
                                    key={provider}
                                    className="px-3 py-1.5 rounded-lg bg-muted/30 border border-border text-sm"
                                >
                                    {provider === "google" && (
                                        <div className="flex items-center gap-2">
                                            <div className="w-4 h-4 bg-white rounded-full" />
                                            <span>Google OAuth</span>
                                        </div>
                                    )}
                                    {provider === "credentials" && (
                                        <div className="flex items-center gap-2">
                                            <Key className="w-4 h-4" />
                                            <span>Email/Password</span>
                                        </div>
                                    )}
                                </div>
                            ))
                        ) : (
                            <span className="text-sm text-muted-foreground">
                                No auth providers configured
                            </span>
                        )}
                    </div>
                </div>

                {/* Last login */}
                <div>
                    <label className="text-sm text-muted-foreground mb-1 block">
                        Last Login
                    </label>
                    <div className="flex items-center gap-2 text-white">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span>
                            {lastLogin
                                ? new Date(lastLogin).toLocaleString()
                                : "Never logged in"}
                        </span>
                    </div>
                </div>

                {/* Created at */}
                <div>
                    <label className="text-sm text-muted-foreground mb-1 block">
                        Account Created
                    </label>
                    <div className="flex items-center gap-2 text-white">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span>
                            {new Date(createdAt).toLocaleDateString()}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
