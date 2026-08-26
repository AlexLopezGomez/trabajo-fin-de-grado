'use client';

import { LayoutDashboard, Plus } from 'lucide-react';
import { cn } from '@/lib/utils/common';

interface EmptyStateProps {
    hasAnyDashboards: boolean;
    onCreateClick: () => void;
}

/**
 * Empty State Component
 * Displays when no dashboards are found or when filters don't match
 */
export function EmptyState({ hasAnyDashboards, onCreateClick }: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center py-20">
            <div className="flex items-center justify-center w-20 h-20 bg-zinc-800/50 rounded-2xl mb-6">
                <LayoutDashboard className="w-10 h-10 text-zinc-600" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
                {hasAnyDashboards ? 'No hay dashboards que coincidan' : 'Sin dashboards'}
            </h3>
            <p className="text-zinc-500 text-center max-w-md mb-6">
                {hasAnyDashboards
                    ? 'Ajusta los filtros para ver más dashboards.'
                    : 'Los dashboards te permiten guardar y organizar tus consultas favoritas para acceder a ellas rápidamente.'
                }
            </p>
            {!hasAnyDashboards && (
                <button
                    onClick={onCreateClick}
                    className={cn(
                        'flex items-center gap-2 px-5 py-3',
                        'bg-primary hover:bg-primary/90 text-primary-foreground',
                        'rounded-xl font-medium transition-colors duration-200'
                    )}
                >
                    <Plus className="w-5 h-5" />
                    Crear primer dashboard
                </button>
            )}
        </div>
    );
}
