"use client";

import { ArrowLeft } from "lucide-react";

interface AdminErrorStateProps {
    error: string;
    onBack: () => void;
}

/**
 * Admin Error State Component
 * Error display for admin pages with back navigation
 */
export function AdminErrorState({ error, onBack }: AdminErrorStateProps) {
    return (
        <div className="min-h-screen bg-background">
            <div className="max-w-4xl mx-auto px-6 py-8">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-muted-foreground hover:text-white transition-colors mb-6"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to users
                </button>

                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6">
                    <h2 className="text-lg font-semibold text-red-400 mb-2">
                        Error Loading User
                    </h2>
                    <p className="text-red-300/80">{error || "User not found"}</p>
                </div>
            </div>
        </div>
    );
}
