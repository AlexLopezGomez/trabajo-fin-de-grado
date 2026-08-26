"use client";

import { AlertTriangle } from "lucide-react";

export function AdminWarning() {
    return (
        <div className="mb-6 p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
            <div>
                <p className="text-sm text-amber-400 font-medium">
                    Full Administrative Access
                </p>
                <p className="text-sm text-amber-400/80 mt-1">
                    This role provides unrestricted access to all system resources and data.
                    Users with this role can view, create, edit, and delete any record, manage all users and groups,
                    and access sensitive administrative functions. Assign this role only to trusted administrators.
                </p>
            </div>
        </div>
    );
}
