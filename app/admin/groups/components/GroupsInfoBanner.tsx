"use client";

import { Info } from "lucide-react";

export function GroupsInfoBanner() {
    return (
        <div className="mb-6 p-4 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
            <div>
                <p className="text-sm text-blue-400 font-medium">Groups Control Access Boundaries</p>
                <p className="text-sm text-blue-400/80 mt-1">
                    Groups determine <strong className="text-blue-300">WHERE</strong> users can work.
                    Add users to groups, then assign groups to spaces to control visibility.
                </p>
                <p className="text-sm text-blue-400/70 mt-2 italic">
                    💡 Example: Add Sarah to &quot;Finance Team&quot; group, grant Finance Team access to &quot;Q4 Reports&quot; space
                    → Sarah sees Q4 Reports. Her role (Analyst) determines what she can do there.
                </p>
            </div>
        </div>
    );
}
