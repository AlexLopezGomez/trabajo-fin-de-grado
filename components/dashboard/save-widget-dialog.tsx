'use client';

/**
 * SaveWidgetDialog
 * 
 * A beautiful modal that appears after a successful query.
 * Lets users save the query result as a reusable dashboard widget.
 */

import { useState, useTransition, useEffect } from 'react';
import {
  X,
  Save,
  Loader2,
  Check,
  Sparkles,
  BarChart3,
  Table2,
  LineChart,
  PieChart as PieChartIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils/common';
import { createDashboard } from '@/app/actions/dashboard/dashboards';
import { saveWidget } from '@/app/actions/dashboard/widgets';
import { getAccessibleDashboardsAction } from '@/app/actions/spaces';
import { scoreQueryPreview } from '@/app/actions/query-scoring';
import type { DashboardSummary, CreateWidgetInput, Dashboard } from '@/types/dashboard';
import type { VisualizationType } from '@/types';
import type { QueryCostScore } from '@/types/query-scoring';
import { error as logError } from '@/lib/utils/logger';
import { QueryOptimizationPanel } from './query-optimization-panel';
import { CostScoreBadge } from './cost-score-badge';

interface SaveWidgetDialogProps {
  isOpen: boolean;
  onClose: () => void;
  queryResult: {
    collection: string;
    pipeline: Record<string, unknown>[];
    visualization: VisualizationType;
    originalQuestion: string;
  };
  onSaved?: () => void;
}

const visualizationOptions: Array<{ type: VisualizationType; icon: typeof Table2; label: string }> = [
  { type: 'table', icon: Table2, label: 'Tabla' },
  { type: 'bar-chart', icon: BarChart3, label: 'Barras' },
  { type: 'line-chart', icon: LineChart, label: 'Líneas' },
  { type: 'pie-chart', icon: PieChartIcon, label: 'Circular' },
];

export function SaveWidgetDialog({
  isOpen,
  onClose,
  queryResult,
  onSaved,
}: SaveWidgetDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [dashboards, setDashboards] = useState<DashboardSummary[]>([]);
  const [selectedDashboardId, setSelectedDashboardId] = useState<string | 'new'>('new');
  const [widgetName, setWidgetName] = useState('');
  const [newDashboardName, setNewDashboardName] = useState('');
  const [visualization, setVisualization] = useState<VisualizationType>(queryResult.visualization);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loadingDashboards, setLoadingDashboards] = useState(true);
  const [costScore, setCostScore] = useState<QueryCostScore | null>(null);
  const [loadingScore, setLoadingScore] = useState(false);
  const [requiresApproval, setRequiresApproval] = useState(false);

  // Load dashboards and score query when dialog opens
  useEffect(() => {
    if (isOpen) {
      setWidgetName(queryResult.originalQuestion);
      setVisualization(queryResult.visualization);
      setError(null);
      setSuccess(false);
      setLoadingDashboards(true);
      setLoadingScore(true);
      setCostScore(null);
      setRequiresApproval(false);

      // Load dashboards
      getAccessibleDashboardsAction({})
        .then((result) => {
          if (!result.success || !result.data) {
            throw new Error(result.error || 'Failed to load dashboards');
          }
          const dashboards = result.data.dashboards.map((d): DashboardSummary => ({
            id: d.id,
            name: d.name,
            description: d.description,
            ownerId: d.createdBy,
            createdBy: d.createdBy,
            createdByName: d.createdByName,
            isPublic: d.sharing?.mode === 'PUBLIC',
            createdAt: d.createdAt,
            updatedAt: d.updatedAt,
            widgetCount: d.widgetCount || 0,
            spaceId: d.spaceId,
            spaceName: d.spaceName,
            sharingMode: d.sharing?.mode,
            sharing: d.sharing,
          }));
          setDashboards(dashboards);
          if (dashboards.length > 0) {
            setSelectedDashboardId(dashboards[0].id);
          } else {
            setSelectedDashboardId('new');
          }
        })
        .catch((err: Error) => {
          logError('Failed to load dashboards', err);
          setSelectedDashboardId('new');
        })
        .finally(() => {
          setLoadingDashboards(false);
        });

      // Score query
      scoreQueryPreview({
        collection: queryResult.collection,
        pipeline: queryResult.pipeline,
      })
        .then((result) => {
          if (result.success && result.costScore) {
            setCostScore(result.costScore);
            setRequiresApproval(result.requiresApproval || false);
          } else {
            logError('Query scoring failed', new Error(result.error));
          }
        })
        .catch((err: Error) => {
          logError('Query scoring error', err);
        })
        .finally(() => {
          setLoadingScore(false);
        });
    }
  }, [isOpen, queryResult]);

  const handleSave = () => {
    if (!widgetName.trim()) {
      setError('Por favor, ingresa un nombre para el widget');
      return;
    }

    if (selectedDashboardId === 'new' && !newDashboardName.trim()) {
      setError('Por favor, ingresa un nombre para el nuevo dashboard');
      return;
    }

    setError(null);

    startTransition(async () => {
      try {
        let dashboardId = selectedDashboardId;

        // Create new dashboard if needed
        if (selectedDashboardId === 'new') {
          const newDashboard = await createDashboard({
            name: newDashboardName.trim(),
          });
          dashboardId = newDashboard.id;
        }

        // Save the widget
        const widgetInput: CreateWidgetInput = {
          dashboardId,
          name: widgetName.trim(),
          originalQuestion: queryResult.originalQuestion,
          collection: queryResult.collection,
          pipeline: queryResult.pipeline,
          visualization,
        };

        await saveWidget(widgetInput);

        setSuccess(true);
        setTimeout(() => {
          onSaved?.();
          onClose();
        }, 1500);
      } catch (err) {
        logError('Failed to save widget', err);
        setError(err instanceof Error ? err.message : 'Error al guardar el widget');
      }
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div
        className={cn(
          'relative z-10 w-full max-w-lg mx-4',
          'bg-zinc-900 border border-zinc-800 rounded-2xl',
          'shadow-2xl shadow-black/50',
          'max-h-[85vh] overflow-hidden',
          'animate-in fade-in-0 zoom-in-95 duration-200'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 bg-primary/10 border border-primary/20 rounded-xl">
              <Save className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Guardar en Dashboard</h2>
              <p className="text-sm text-zinc-500">Crea un widget reutilizable</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-5 space-y-5 max-h-[65vh] overflow-y-auto pr-1">
          {/* Success State */}
          {success ? (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <div className="flex items-center justify-center w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                <Check className="w-8 h-8 text-emerald-400" />
              </div>
              <div className="text-center">
                <p className="text-lg font-medium text-white">¡Widget guardado!</p>
                <p className="text-sm text-zinc-500 mt-1">
                  Tu query está lista para usar en el dashboard
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Widget Name */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">
                  Nombre del Widget
                </label>
                <input
                  type="text"
                  value={widgetName}
                  onChange={(e) => setWidgetName(e.target.value)}
                  placeholder="Ej: Top usuarios por balance"
                  className={cn(
                    'w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700 rounded-xl',
                    'text-white placeholder:text-zinc-500',
                    'focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20',
                    'transition-all duration-200'
                  )}
                />
              </div>

              {/* Dashboard Selector */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">
                  Dashboard
                </label>
                {loadingDashboards ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-5 h-5 text-primary animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <select
                      value={selectedDashboardId}
                      onChange={(e) => setSelectedDashboardId(e.target.value)}
                      className={cn(
                        'w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700 rounded-xl',
                        'text-white',
                        'focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20',
                        'transition-all duration-200',
                        'appearance-none cursor-pointer'
                      )}
                      style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2371717a'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'right 1rem center',
                        backgroundSize: '1.25rem',
                      }}
                    >
                      {dashboards.map((dashboard) => (
                        <option key={dashboard.id} value={dashboard.id}>
                          {dashboard.name} ({dashboard.widgetCount} widgets)
                        </option>
                      ))}
                      <option value="new">+ Crear nuevo dashboard</option>
                    </select>

                    {/* New Dashboard Name Input */}
                    {selectedDashboardId === 'new' && (
                      <input
                        type="text"
                        value={newDashboardName}
                        onChange={(e) => setNewDashboardName(e.target.value)}
                        placeholder="Nombre del nuevo dashboard"
                        className={cn(
                          'w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700 rounded-xl',
                          'text-white placeholder:text-zinc-500',
                          'focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20',
                          'transition-all duration-200'
                        )}
                      />
                    )}
                  </div>
                )}
              </div>

              {/* Visualization Selector */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">
                  Visualización
                </label>
                <div className="flex items-center gap-2 p-1 bg-zinc-800/50 rounded-xl">
                  {visualizationOptions.map(({ type, icon: Icon, label }) => (
                    <button
                      key={type}
                      onClick={() => setVisualization(type)}
                      className={cn(
                        'flex items-center gap-2 flex-1 px-3 py-2.5 rounded-lg transition-all duration-200',
                        visualization === type
                          ? 'bg-primary text-primary-foreground'
                          : 'text-zinc-400 hover:text-white hover:bg-zinc-700'
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-sm">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Query Preview */}
              <div className="p-4 bg-zinc-800/30 border border-zinc-800 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="text-xs font-medium text-zinc-400 uppercase tracking-wide">
                    Query Original
                  </span>
                </div>
                <p className="text-sm text-zinc-300 leading-relaxed">
                  &ldquo;{queryResult.originalQuestion}&rdquo;
                </p>
                <div className="flex items-center gap-2 mt-3">
                  <span className="px-2 py-1 text-xs bg-zinc-700/50 rounded-md text-zinc-400">
                    {queryResult.collection}
                  </span>
                  <span className="px-2 py-1 text-xs bg-zinc-700/50 rounded-md text-zinc-400">
                    {queryResult.pipeline.length} stages
                  </span>
                </div>
              </div>

              {/* Cost Score & Optimization */}
              {loadingScore ? (
                <div className="flex items-center justify-center p-4 bg-zinc-800/30 border border-zinc-800 rounded-xl">
                  <Loader2 className="w-5 h-5 text-primary animate-spin mr-2" />
                  <span className="text-sm text-zinc-400">Analyzing query performance...</span>
                </div>
              ) : costScore ? (
                <div className="space-y-2">
                  <QueryOptimizationPanel costScore={costScore} />
                  {requiresApproval && (
                    <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                      <p className="text-sm text-orange-400">
                        ⚠️ This widget will require Supervisor approval before execution due to high query cost.
                      </p>
                    </div>
                  )}
                </div>
              ) : null}

              {/* Error Message */}
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!success && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-800">
            <button
              onClick={onClose}
              className={cn(
                'px-4 py-2.5 text-sm font-medium text-zinc-400',
                'hover:text-white hover:bg-zinc-800 rounded-lg transition-colors'
              )}
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={isPending}
              className={cn(
                'flex items-center gap-2 px-5 py-2.5 text-sm font-medium',
                'bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg',
                'transition-colors duration-200',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Guardar Widget
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

