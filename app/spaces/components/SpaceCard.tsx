'use client';

import Link from 'next/link';
import { LayoutDashboard, Users } from 'lucide-react';
import { cn } from '@/lib/utils/common';
import { getSpaceIcon, getSpaceColors, getSpaceTextColor } from '@/lib/utils/space-utils';
import type { SpaceSummary } from '@/types/spaces';

interface SpaceCardProps {
    space: SpaceSummary;
}

/**
 * Space Card Component
 * Displays individual space with icon, name, description, and stats
 */
export function SpaceCard({ space }: SpaceCardProps) {
    const Icon = getSpaceIcon(space.type);
    const bgColor = getSpaceColors(space.type);
    const textColor = getSpaceTextColor(space.type);

    return (
        <Link
            href={`/spaces/${space.id}`}
            className={cn(
                'block p-6',
                'bg-zinc-900/60 backdrop-blur-sm',
                'border border-zinc-800 rounded-xl',
                'transition-all duration-200',
                'hover:border-zinc-700 hover:shadow-lg hover:shadow-black/20',
                'group'
            )}
        >
            <div className="flex items-start justify-between mb-4">
                <div className={cn(
                    'flex items-center justify-center w-12 h-12 rounded-xl border',
                    'bg-gradient-to-br',
                    bgColor
                )}>
                    <Icon className={cn('w-6 h-6', textColor)} />
                </div>
                <span className="text-xs text-zinc-500 uppercase font-medium">
                    {space.type}
                </span>
            </div>

            <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-primary transition-colors">
                {space.name}
            </h3>
            {space.description && (
                <p className="text-sm text-zinc-500 mb-4 line-clamp-2">
                    {space.description}
                </p>
            )}

            <div className="flex items-center gap-4 pt-4 border-t border-zinc-800">
                <span className="flex items-center gap-1.5 text-xs text-zinc-500">
                    <LayoutDashboard className="w-3.5 h-3.5" />
                    {space.dashboardCount || 0} dashboards
                </span>
                <span className="flex items-center gap-1.5 text-xs text-zinc-500">
                    <Users className="w-3.5 h-3.5" />
                    {space.memberCount || 0} miembros
                </span>
            </div>
        </Link>
    );
}
