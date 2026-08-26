"use client";

import { Info } from "lucide-react";

export function RoleDescription({ description }: { description?: string }) {
    if (!description) return null;

    return (
        <div className="bg-card/50 border border-border rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                <Info className="w-5 h-5 text-primary" />
                Description
            </h2>
            <p className="text-muted-foreground leading-relaxed">
                {description}
            </p>
        </div>
    );
}
