'use client';

import { Clock, Sparkles } from 'lucide-react';

interface DashboardStatsBarProps {
    lastUpdated: Date;
    widgetCount: number;
}

/**
 * Dashboard Stats Bar Component
 * Displays last updated time and widget count
 */
export function DashboardStatsBar({ lastUpdated, widgetCount }: DashboardStatsBarProps) {
    return (
        <div className="flex items-center gap-6 mb-8 pb-6 border-b border-zinc-800">
            <div className="flex items-center gap-2 text-sm text-zinc-500">
                <Clock className="w-4 h-4" />
                Última actualización: {formatDate(lastUpdated)}
            </div>
            <div className="flex items-center gap-2 text-sm text-zinc-500">
                <Sparkles className="w-4 h-4" />
                {widgetCount} widgets
            </div>
        </div>
    );
}

function formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    });
}
