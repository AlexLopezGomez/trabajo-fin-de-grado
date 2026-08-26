"use client";

import { AlertTriangle } from "lucide-react";

export function LoadingState() {
    return (
        <div className="min-h-screen bg-background flex items-center justify-center">
            <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                <p className="mt-4 text-muted-foreground">Loading space...</p>
            </div>
        </div>
    );
}

export function ErrorState({ error, onBack }: { error: string; onBack: () => void }) {
    return (
        <div className="min-h-screen bg-background flex items-center justify-center">
            <div className="text-center">
                <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                <p className="text-red-400 font-medium">Error loading space</p>
                <p className="text-sm text-muted-foreground mt-1">{error}</p>
                <button
                    onClick={onBack}
                    className="mt-4 px-4 py-2 bg-muted hover:bg-muted/80 rounded-lg transition-colors"
                >
                    Back to Spaces
                </button>
            </div>
        </div>
    );
}
