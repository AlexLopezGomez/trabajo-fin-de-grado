'use client';

import Link from 'next/link';
import { FolderOpen } from 'lucide-react';
import { DashboardHeader } from '@/components/dashboard-header';

interface ErrorStateProps {
    message: string;
}

/**
 * Error State Component
 * Displays error message with option to return to spaces list
 */
export function ErrorState({ message }: ErrorStateProps) {
    return (
        <div className="min-h-screen bg-background">
            <div className="fixed inset-0 bg-grid-pattern opacity-30 pointer-events-none" />
            <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <DashboardHeader />
                <div className="flex flex-col items-center justify-center py-20">
                    <div className="flex items-center justify-center w-20 h-20 bg-red-500/10 rounded-2xl mb-6">
                        <FolderOpen className="w-10 h-10 text-red-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">Error</h3>
                    <p className="text-zinc-500 text-center max-w-md mb-6">{message}</p>
                    <Link
                        href="/spaces"
                        className="px-4 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-medium transition-colors"
                    >
                        Volver a Espacios
                    </Link>
                </div>
            </div>
        </div>
    );
}
