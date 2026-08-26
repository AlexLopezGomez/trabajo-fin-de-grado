"use client";

import { Shield } from "lucide-react";

export function RolesHeader() {
    return (
        <div className="border-b border-border/50 bg-card/30 backdrop-blur-sm sticky top-0 z-10">
            <div className="max-w-7xl mx-auto px-6 py-6">
                <div className="flex items-center gap-4">
                    <div className="p-3 rounded-lg border border-primary/30 bg-primary/10">
                        <Shield className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">System Roles</h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            View role-based permissions and access control
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

