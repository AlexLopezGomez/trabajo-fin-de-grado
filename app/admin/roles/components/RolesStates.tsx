"use client";

import { AlertTriangle } from "lucide-react";

export function LoadingRoles() {
    return (
        <div className="min-h-screen bg-background flex items-center justify-center">
            <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                <p className="mt-4 text-muted-foreground">Loading role catalog...</p>
            </div>
        </div>
    );
}

interface ErrorRolesProps {
    message: string;
    onRetry: () => void;
}

export function ErrorRoles({ message, onRetry }: ErrorRolesProps) {
    return (
        <div className="min-h-screen bg-background flex items-center justify-center">
            <div className="text-center">
                <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                <p className="text-red-400">{message}</p>
                <button
                    onClick={onRetry}
                    className="mt-4 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                    Retry
                </button>
            </div>
        </div>
    );
}
