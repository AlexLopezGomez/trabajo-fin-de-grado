'use client';

import Link from 'next/link';
import { LayoutDashboard, Plus } from 'lucide-react';

/**
 * Empty Space Dashboards State Component
 * Displays when space has no dashboards
 */
export function EmptySpaceDashboardsState() {
    return (
        <div className="flex flex-col items-center justify-center py-20">
            <div className="flex items-center justify-center w-20 h-20 bg-zinc-800/50 rounded-2xl mb-6">
                <LayoutDashboard className="w-10 h-10 text-zinc-600" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
                Sin dashboards
            </h3>
            <p className="text-zinc-500 text-center max-w-md mb-6">
                Este espacio aún no tiene dashboards.
            </p>
            <Link
                href="/dashboards"
                className="flex items-center gap-2 px-5 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-medium transition-colors"
            >
                <Plus className="w-5 h-5" />
                Crear Dashboard
            </Link>
        </div>
    );
}
