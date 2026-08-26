"use client";

import { AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";

export function LoadingRole() {
    return (
        <div className="min-h-screen bg-background flex items-center justify-center">
            <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                <p className="mt-4 text-muted-foreground">Loading role details...</p>
            </div>
        </div>
    );
}

interface ErrorRoleProps {
    error: string;
}

export function ErrorRole({ error }: ErrorRoleProps) {
    const router = useRouter();

    return (
        <div className="min-h-screen bg-background flex items-center justify-center">
            <div className="text-center">
                <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                <p className="text-red-400">{error || "Role not found"}</p>
                <button
                    onClick={() => router.push("/admin/roles")}
                    className="mt-4 px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors"
                >
                    Back to Role Catalog
                </button>
            </div>
        </div>
    );
}
