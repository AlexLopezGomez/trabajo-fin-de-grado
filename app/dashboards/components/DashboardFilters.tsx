'use client';

import { Filter } from 'lucide-react';
import { cn } from '@/lib/utils/common';
import type { SpaceSummary } from '@/types/spaces';
import type { FilterType } from '../hooks/useDashboardFilters';

interface DashboardFiltersProps {
    filterType: FilterType;
    filterSpaceId: string;
    spaces: SpaceSummary[];
    onFilterTypeChange: (type: FilterType) => void;
    onFilterSpaceIdChange: (spaceId: string) => void;
}

/**
 * Dashboard Filters Component
 * Provides filtering controls for ownership and space
 */
export function DashboardFilters({
    filterType,
    filterSpaceId,
    spaces,
    onFilterTypeChange,
    onFilterSpaceIdChange,
}: DashboardFiltersProps) {
    return (
        <div className="flex items-center gap-3 mb-6 flex-wrap">
            <div className="flex items-center gap-2 text-sm">
                <Filter className="w-4 h-4 text-zinc-500" />
                <span className="text-zinc-400">Filtros:</span>
            </div>

            {/* Filter by ownership */}
            <div className="flex items-center gap-2">
                <button
                    onClick={() => onFilterTypeChange('all')}
                    className={cn(
                        'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                        filterType === 'all'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-zinc-800/50 text-zinc-400 hover:text-white hover:bg-zinc-800'
                    )}
                >
                    Todos
                </button>
                <button
                    onClick={() => onFilterTypeChange('mine')}
                    className={cn(
                        'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                        filterType === 'mine'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-zinc-800/50 text-zinc-400 hover:text-white hover:bg-zinc-800'
                    )}
                >
                    Míos
                </button>
                <button
                    onClick={() => onFilterTypeChange('shared')}
                    className={cn(
                        'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                        filterType === 'shared'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-zinc-800/50 text-zinc-400 hover:text-white hover:bg-zinc-800'
                    )}
                >
                    Compartidos conmigo
                </button>
            </div>

            {/* Filter by space */}
            {spaces.length > 0 && (
                <select
                    value={filterSpaceId}
                    onChange={(e) => onFilterSpaceIdChange(e.target.value)}
                    className={cn(
                        'px-3 py-1.5 rounded-lg text-sm font-medium',
                        'bg-zinc-800/50 border border-zinc-700 text-white',
                        'focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20',
                        'transition-all'
                    )}
                >
                    <option value="">Todos los espacios</option>
                    <option value="_floating">🌐 Sin espacio (flotantes)</option>
                    {spaces.map((space) => (
                        <option key={space.id} value={space.id}>
                            📁 {space.name}
                        </option>
                    ))}
                </select>
            )}
        </div>
    );
}
