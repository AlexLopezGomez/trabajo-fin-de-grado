"use client";

export function LoadingGroups() {
    return (
        <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
            <p className="mt-4 text-muted-foreground">Loading groups...</p>
        </div>
    );
}

interface ErrorGroupsProps {
    error: string;
}

export function ErrorGroups({ error }: ErrorGroupsProps) {
    return (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400">
            <p className="font-medium">Error loading groups</p>
            <p className="text-sm mt-1">{error}</p>
        </div>
    );
}
