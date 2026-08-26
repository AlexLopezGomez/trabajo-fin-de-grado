"use client";

import { Layers } from "lucide-react";

/**
 * Empty Spaces List Component
 * Displayed when no spaces match filters or exist
 */
export function EmptySpacesList() {
    return (
        <div className="col-span-full text-center py-12">
            <Layers className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-muted-foreground">No spaces found</p>
            <p className="text-sm text-muted-foreground mt-1">
                Create a space to organize your dashboards
            </p>
        </div>
    );
}
