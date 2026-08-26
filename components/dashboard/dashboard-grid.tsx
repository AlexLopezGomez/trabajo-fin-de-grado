'use client';

/**
 * DashboardGrid
 * 
 * A responsive grid layout for dashboard widgets.
 * Uses CSS Grid for a clean, simple layout (no external dependencies).
 */

import { useState, useCallback } from 'react';
import { Plus, Sparkles, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils/common';
import { WidgetCard } from './widget-card';
import type { WidgetWithData } from '@/types/dashboard';

interface DashboardGridProps {
  widgets: WidgetWithData[];
  onAddWidget?: () => void;
  onWidgetDelete?: (widgetId: string) => void;
  onWidgetRefresh?: (widgetId: string, data: Record<string, unknown>[]) => void;
  isLoading?: boolean;
}

export function DashboardGrid({
  widgets,
  onAddWidget,
  onWidgetDelete,
  onWidgetRefresh,
  isLoading = false,
}: DashboardGridProps) {
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());

  const handleDelete = useCallback((widgetId: string) => {
    setDeletedIds((prev) => new Set([...prev, widgetId]));
    onWidgetDelete?.(widgetId);
  }, [onWidgetDelete]);

  // Filter out deleted widgets
  const visibleWidgets = widgets.filter((w) => !deletedIds.has(w.id));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-4" />
          <p className="text-zinc-400">Cargando widgets...</p>
        </div>
      </div>
    );
  }

  if (visibleWidgets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="flex items-center justify-center w-20 h-20 bg-zinc-800/50 rounded-2xl mb-6">
          <Sparkles className="w-10 h-10 text-zinc-600" />
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">
          Sin widgets aún
        </h3>
        <p className="text-zinc-500 text-center max-w-md mb-6">
          Este dashboard está vacío. Haz una consulta con lenguaje natural y guárdala como widget para comenzar.
        </p>
        {onAddWidget && (
          <button
            onClick={onAddWidget}
            className={cn(
              'flex items-center gap-2 px-5 py-3',
              'bg-primary hover:bg-primary/90 text-primary-foreground',
              'rounded-xl font-medium transition-colors duration-200'
            )}
          >
            <Plus className="w-5 h-5" />
            Crear primer widget
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Grid */}
      <div
        className={cn(
          'grid gap-4',
          'grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3'
        )}
      >
        {visibleWidgets.map((widget) => (
          <div
            key={widget.id}
            className={cn(
              'min-h-[360px]',
              // Large widgets span 2 columns on larger screens
              widget.position?.w >= 8 && 'lg:col-span-2'
            )}
          >
            <WidgetCard
              widget={widget}
              onDelete={handleDelete}
              onRefresh={onWidgetRefresh}
            />
          </div>
        ))}

        {/* Add Widget Card */}
        {onAddWidget && (
          <button
            onClick={onAddWidget}
            className={cn(
              'min-h-[360px] flex flex-col items-center justify-center',
              'bg-zinc-900/30 border-2 border-dashed border-zinc-800',
              'rounded-xl transition-all duration-200',
              'hover:border-primary/50 hover:bg-zinc-900/50',
              'group'
            )}
          >
            <div
              className={cn(
                'flex items-center justify-center w-14 h-14',
                'bg-zinc-800/50 rounded-xl mb-4',
                'group-hover:bg-primary/20 group-hover:border group-hover:border-primary/30',
                'transition-all duration-200'
              )}
            >
              <Plus className="w-6 h-6 text-zinc-500 group-hover:text-primary transition-colors" />
            </div>
            <span className="text-zinc-500 group-hover:text-zinc-300 font-medium transition-colors">
              Añadir Widget
            </span>
            <span className="text-xs text-zinc-600 mt-1">
              Haz una consulta para añadir
            </span>
          </button>
        )}
      </div>
    </div>
  );
}

