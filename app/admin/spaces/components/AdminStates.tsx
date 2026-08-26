"use client";

/**
 * Loading Spinner Component
 * Reusable loading state for admin pages
 */
export function LoadingSpinner() {
    return (
        <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
            <p className="mt-4 text-muted-foreground">Loading spaces...</p>
        </div>
    );
}

/**
 * Error Alert Component
 * Reusable error display for admin pages
 */
export function ErrorAlert({ message }: { message: string }) {
    return (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400">
            <p className="font-medium">Error loading spaces</p>
            <p className="text-sm mt-1">{message}</p>
        </div>
    );
}
