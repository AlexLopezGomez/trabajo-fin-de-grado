'use client';

import Link from 'next/link';
import {
    LayoutDashboard,
    Layers,
    Clock,
    Globe,
    Lock,
    Share2,
} from 'lucide-react';
import { cn } from '@/lib/utils/common';
import type { DashboardSummary } from '@/types/dashboard';

interface SpaceDashboardCardProps {
    dashboard: DashboardSummary;
    spaceId: string;
    spaceName: string;
}

/**
 * Space Dashboard Card Component
 * Displays dashboard card within space context with badges
 */
export function SpaceDashboardCard({ dashboard, spaceId, spaceName }: SpaceDashboardCardProps) {
    return (
        <Link
            href={`/dashboard/${dashboard.id}?from=space&spaceId=${spaceId}&spaceName=${encodeURIComponent(spaceName)}`}
            className={cn(
                'block p-5',
                'bg-zinc-900/60 backdrop-blur-sm',
                'border border-zinc-800 rounded-xl',
                'transition-all duration-200',
                'hover:border-zinc-700 hover:shadow-lg hover:shadow-black/20',
                'group'
            )}
        >
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center justify-center w-12 h-12 bg-primary/10 border border-primary/20 rounded-xl">
                    <LayoutDashboard className="w-6 h-6 text-primary" />
                </div>
                <div className="flex items-center gap-1 flex-wrap justify-end">
                    {/* Show if dashboard belongs to space or is shared */}
                    {dashboard.spaceId === spaceId ? (
                        <span className="flex items-center gap-1 px-2 py-1 text-xs bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-md">
                            <Layers className="w-3 h-3" />
                            En este espacio
                        </span>
                    ) : (
                        <span className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-md">
                            <Share2 className="w-3 h-3" />
                            Compartido aquí
                        </span>
                    )}
                    {dashboard.sharingMode === 'PUBLIC' || dashboard.isPublic ? (
                        <span className="flex items-center gap-1 px-2 py-1 text-xs bg-emerald-500/10 text-emerald-400 rounded-md">
                            <Globe className="w-3 h-3" />
                            Público
                        </span>
                    ) : dashboard.sharingMode === 'CUSTOM' ? (
                        <span className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-500/10 text-blue-400 rounded-md">
                            <Share2 className="w-3 h-3" />
                            Compartido
                        </span>
                    ) : (
                        <span className="flex items-center gap-1 px-2 py-1 text-xs bg-zinc-700/50 text-zinc-400 rounded-md">
                            <Lock className="w-3 h-3" />
                            Privado
                        </span>
                    )}
                </div>
            </div>

            <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-primary transition-colors">
                {dashboard.name}
            </h3>
            {dashboard.description && (
                <p className="text-sm text-zinc-500 mb-4 line-clamp-2">
                    {dashboard.description}
                </p>
            )}

            <div className="flex items-center gap-4 pt-4 border-t border-zinc-800">
                <span className="flex items-center gap-1.5 text-xs text-zinc-500">
                    <Layers className="w-3.5 h-3.5" />
                    {dashboard.widgetCount} widgets
                </span>
                <span className="flex items-center gap-1.5 text-xs text-zinc-500">
                    <Clock className="w-3.5 h-3.5" />
                    {formatDate(dashboard.updatedAt)}
                </span>
            </div>
        </Link>
    );
}

function formatDate(date: Date): string {
    const now = new Date();
    const d = new Date(date);
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Hoy';
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 7) return `Hace ${diffDays} días`;

    return d.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
    });
}
