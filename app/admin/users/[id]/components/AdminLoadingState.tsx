"use client";

/**
 * Admin Loading State Component
 * Loading spinner for admin pages
 */
export function AdminLoadingState() {
    return (
        <div className="min-h-screen bg-background flex items-center justify-center">
            <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                <p className="mt-4 text-muted-foreground">Loading user...</p>
            </div>
        </div>
    );
}
