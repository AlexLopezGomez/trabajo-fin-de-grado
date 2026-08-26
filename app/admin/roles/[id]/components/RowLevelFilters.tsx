"use client";

import { Filter } from "lucide-react";
import type { DataAccess } from "@/types/rbac";

export function RowLevelFilters({ dataAccess }: { dataAccess?: DataAccess }) {
    const filterType = dataAccess?.rowLevelFilters?.filterType;

    return (
        <div className="bg-card/50 border border-border rounded-lg p-6 mt-6">
            <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                <Filter className="w-5 h-5 text-primary" />
                Row-Level Filters
            </h2>
            <p className="text-muted-foreground">
                {filterType === "none"
                    ? "No row-level filtering - sees all data in accessible collections"
                    : filterType === "country"
                        ? "Country-based filtering - only sees data matching user's country attribute"
                        : "No row-level filters configured"}
            </p>
        </div>
    );
}
