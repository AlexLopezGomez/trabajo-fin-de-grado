'use client';

import Link from 'next/link';
import { ArrowLeft, FolderOpen, LayoutDashboard, Users } from 'lucide-react';
import type { Space } from '@/types/spaces';

interface SpacePageHeaderProps {
    space: Space;
    dashboardCount: number;
}

/**
 * Space Page Header Component
 * Displays space name, description, type, and stats
 */
export function SpacePageHeader({ space, dashboardCount }: SpacePageHeaderProps) {
    return (
        <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
                <Link
                    href="/spaces"
                    className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="flex items-center justify-center w-12 h-12 bg-purple-500/10 border border-purple-500/20 rounded-xl">
                            <FolderOpen className="w-6 h-6 text-purple-400" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-white">{space.name}</h1>
                            <span className="text-sm text-zinc-500 uppercase font-medium">
                                {space.type}
                            </span>
                        </div>
                    </div>
                    {space.description && (
                        <p className="text-zinc-400 ml-15">{space.description}</p>
                    )}
                </div>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-6 ml-15 text-sm">
                <div className="flex items-center gap-2 text-zinc-400">
                    <LayoutDashboard className="w-4 h-4" />
                    <span>{dashboardCount} dashboards</span>
                </div>
                <div className="flex items-center gap-2 text-zinc-400">
                    <Users className="w-4 h-4" />
                    <span>{space.members?.length || 0} miembros</span>
                </div>
            </div>
        </div>
    );
}
