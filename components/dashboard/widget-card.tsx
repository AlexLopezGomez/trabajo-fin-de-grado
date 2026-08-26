'use client';

/**
 * WidgetCard
 * 
 * A single widget in the dashboard grid.
 * Displays the visualization, controls, and metadata.
 */

import { useState, useTransition } from 'react';
import {
  RefreshCw,
  MoreVertical,
  Trash2,
  Edit2,
  Clock,
  Database,
  Loader2,
  AlertCircle,
  BarChart3,
  Table2,
  LineChart,
  PieChart as PieChartIcon,
  Maximize2,
  X,
  Zap,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Download,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { cn } from '@/lib/utils/common';
import { SmartTable } from '@/components/smart-table';

const SmartChart = dynamic(
  () => import('@/components/smart-chart').then(mod => ({ default: mod.SmartChart })),
  { loading: () => <div className="h-[350px] animate-pulse bg-zinc-800/50 rounded-lg" />, ssr: false }
);
import { executeWidget, deleteWidget, updateWidget, refreshWidget } from '@/app/actions/dashboard';
import type { WidgetWithData, UpdateWidgetInput } from '@/types/dashboard';
import type { VisualizationType } from '@/types';
import { error as logError } from '@/lib/utils/logger';
import { exportToCSV } from '@/lib/utils/export';

interface WidgetCardProps {
  widget: WidgetWithData;
  onRefresh?: (widgetId: string, data: Record<string, unknown>[]) => void;
  onDelete?: (widgetId: string) => void;
}

const visualizationOptions: Array<{ type: VisualizationType; icon: typeof Table2; label: string }> = [
  { type: 'table', icon: Table2, label: 'Tabla' },
  { type: 'bar-chart', icon: BarChart3, label: 'Barras' },
  { type: 'line-chart', icon: LineChart, label: 'Líneas' },
  { type: 'pie-chart', icon: PieChartIcon, label: 'Circular' },
];

export function WidgetCard({ widget, onRefresh, onDelete }: WidgetCardProps) {
  const [isPending, startTransition] = useTransition();
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(widget.name);
  const [currentVisualization, setCurrentVisualization] = useState(widget.visualization);
  const [currentData, setCurrentData] = useState(widget.data);
  const [executionTime, setExecutionTime] = useState(widget.executionTime);
  const [error, setError] = useState(widget.error);
  const [isExpanded, setIsExpanded] = useState(false);
  const [costScore, setCostScore] = useState(widget.costScore);
  const [lastExecutedAt, setLastExecutedAt] = useState(widget.lastExecutedAt);

  // Approval status from widget props
  const isPendingApproval = widget.requiresApproval &&
    (widget.approvalStatus === 'pending' || widget.approvalStatus === 'pending_reapproval');
  const isApprovalBlocked = widget.requiresApproval && widget.canExecute === false;

  const handleRefresh = () => {
    setError(undefined);
    startTransition(async () => {
      try {
        // Use refreshWidget instead of executeWidget for caching
        const result = await refreshWidget(widget.id);
        if (result.success) {
          setCurrentData(result.data);
          setExecutionTime(result.executionTime);
          setError(undefined);
          setCostScore(result.costScore);
          setLastExecutedAt(new Date());
          onRefresh?.(widget.id, result.data);
        } else {
          setError(result.error);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error refreshing widget');
      }
    });
  };

  const handleDelete = () => {
    if (!confirm('¿Estás seguro de eliminar este widget?')) return;

    startTransition(async () => {
      try {
        await deleteWidget(widget.id);
        onDelete?.(widget.id);
      } catch (err) {
        logError('Error deleting widget', err);
      }
    });
    setShowMenu(false);
  };

  const handleSaveEdit = () => {
    startTransition(async () => {
      try {
        const updates: UpdateWidgetInput = {};
        if (editName !== widget.name) updates.name = editName;
        if (currentVisualization !== widget.visualization) updates.visualization = currentVisualization;

        if (Object.keys(updates).length > 0) {
          await updateWidget(widget.id, updates);
        }
        setIsEditing(false);
      } catch (err) {
        logError('Error updating widget', err);
      }
    });
  };

  const handleVisualizationChange = (vis: VisualizationType) => {
    setCurrentVisualization(vis);
    if (!isEditing) {
      // Auto-save visualization change
      startTransition(async () => {
        try {
          await updateWidget(widget.id, { visualization: vis });
        } catch (err) {
          logError('Error updating visualization', err);
        }
      });
    }
  };

  const handleDownloadCSV = () => {
    if (currentData.length === 0) return;
    exportToCSV(currentData, widget.name);
  };

  // Expanded fullscreen view
  if (isExpanded) {
    return (
      <div className="fixed inset-0 z-50 bg-zinc-950/95 backdrop-blur-xl animate-in fade-in-0 duration-200">
        <div className="h-full flex flex-col p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-white">{widget.name}</h2>
              <p className="text-sm text-zinc-500 mt-1">{widget.originalQuestion}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDownloadCSV}
                disabled={currentData.length === 0}
                className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50"
                title="Descargar CSV"
              >
                <Download className="w-5 h-5" />
              </button>
              <button
                onClick={() => setIsExpanded(false)}
                className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
            {currentVisualization === 'table' ? (
              <div className="p-6 h-full overflow-auto">
                <SmartTable data={currentData} maxRows={100} />
              </div>
            ) : (
              <div className="p-6 h-full">
                <SmartChart data={currentData} type={currentVisualization} />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'h-full flex flex-col',
        'bg-zinc-900/60 backdrop-blur-sm',
        'border border-zinc-800 rounded-xl',
        'shadow-lg shadow-black/20',
        'transition-all duration-200',
        'hover:border-zinc-700'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className={cn(
                'w-full px-2 py-1 bg-zinc-800 border border-zinc-700 rounded-lg',
                'text-sm text-white',
                'focus:outline-none focus:border-primary'
              )}
              autoFocus
            />
          ) : (
            <h3 className="text-sm font-medium text-white truncate">{widget.name}</h3>
          )}
          <div className="flex items-center gap-2 mt-1">
            <span className="flex items-center gap-1 text-xs text-zinc-500">
              <Database className="w-3 h-3" />
              {widget.collection}
            </span>
            <span className="flex items-center gap-1 text-xs text-zinc-500">
              <Clock className="w-3 h-3" />
              {executionTime}ms
            </span>
            {/* Last executed timestamp */}
            {lastExecutedAt && (
              <span className="flex items-center gap-1 text-xs text-zinc-500" title={new Date(lastExecutedAt).toLocaleString()}>
                Updated {formatRelativeTime(lastExecutedAt)}
              </span>
            )}
            {/* Cost tier indicator - only show for yellow/red */}
            {costScore && costScore.tier !== 'green' && (
              <span
                className={cn(
                  'flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full',
                  costScore.tier === 'yellow' && 'bg-yellow-500/10 text-yellow-500',
                  costScore.tier === 'red' && 'bg-red-500/10 text-red-500'
                )}
                title={`Query cost: ${costScore.costScore}/100. ${costScore.suggestions?.[0] || ''}`}
              >
                <Zap className="w-3 h-3" />
                {costScore.tier === 'yellow' ? 'Med' : 'High'}
              </span>
            )}
            {/* Approval status badge */}
            {widget.requiresApproval && widget.approvalStatus && widget.approvalStatus !== 'not_required' && (
              <span
                className={cn(
                  'flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full',
                  widget.approvalStatus === 'approved' && 'bg-emerald-500/10 text-emerald-400',
                  widget.approvalStatus === 'pending' && 'bg-yellow-500/10 text-yellow-400',
                  widget.approvalStatus === 'pending_reapproval' && 'bg-orange-500/10 text-orange-400',
                  widget.approvalStatus === 'rejected' && 'bg-red-500/10 text-red-400',
                  widget.approvalStatus === 'expired' && 'bg-gray-500/10 text-gray-400',
                  widget.approvalStatus === 'cancelled' && 'bg-gray-500/10 text-gray-400'
                )}
                title={
                  widget.approvalStatus === 'pending' ? 'Waiting for Supervisor approval' :
                    widget.approvalStatus === 'pending_reapproval' ? 'Query changed - needs new approval' :
                      widget.approvalStatus === 'approved' ? 'Approved by Supervisor' :
                        widget.approvalStatus === 'rejected' ? 'Rejected by Supervisor' :
                          widget.approvalStatus === 'expired' ? 'Approval expired' : 'Cancelled'
                }
              >
                {widget.approvalStatus === 'approved' && <ShieldCheck className="w-3 h-3" />}
                {(widget.approvalStatus === 'pending' || widget.approvalStatus === 'pending_reapproval') && <ShieldAlert className="w-3 h-3" />}
                {(widget.approvalStatus === 'rejected' || widget.approvalStatus === 'expired' || widget.approvalStatus === 'cancelled') && <ShieldX className="w-3 h-3" />}
                {widget.approvalStatus === 'pending' ? 'Pending' :
                  widget.approvalStatus === 'pending_reapproval' ? 'Re-approval' :
                    widget.approvalStatus === 'approved' ? 'Approved' :
                      widget.approvalStatus === 'rejected' ? 'Rejected' :
                        widget.approvalStatus === 'expired' ? 'Expired' : 'Cancelled'}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {isEditing ? (
            <>
              <button
                onClick={() => setIsEditing(false)}
                className="p-1.5 text-zinc-500 hover:text-white rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={isPending}
                className="p-1.5 text-emerald-400 hover:text-emerald-300 rounded-lg transition-colors"
              >
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : '✓'}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setIsExpanded(true)}
                className="p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                title="Expandir"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
              <button
                onClick={handleDownloadCSV}
                disabled={currentData.length === 0}
                className={cn(
                  'p-1.5 rounded-lg transition-colors',
                  currentData.length === 0
                    ? 'text-zinc-600 cursor-not-allowed'
                    : 'text-zinc-500 hover:text-white hover:bg-zinc-800'
                )}
                title="Descargar CSV"
              >
                <Download className="w-4 h-4" />
              </button>
              <button
                onClick={handleRefresh}
                disabled={isPending || isApprovalBlocked}
                className={cn(
                  'p-1.5 rounded-lg transition-colors',
                  isApprovalBlocked
                    ? 'text-zinc-600 cursor-not-allowed'
                    : 'text-zinc-500 hover:text-white hover:bg-zinc-800'
                )}
                title={isApprovalBlocked ? 'Awaiting Supervisor approval' : 'Actualizar'}
              >
                {isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
              </button>
              <div className="relative">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>

                {/* Dropdown Menu */}
                {showMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowMenu(false)}
                    />
                    <div
                      className={cn(
                        'absolute right-0 top-full mt-1 z-20',
                        'w-40 py-1',
                        'bg-zinc-900 border border-zinc-800 rounded-lg',
                        'shadow-xl shadow-black/40',
                        'animate-in fade-in-0 slide-in-from-top-2 duration-150'
                      )}
                    >
                      <button
                        onClick={() => {
                          setIsEditing(true);
                          setShowMenu(false);
                        }}
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-zinc-300 hover:text-white hover:bg-zinc-800"
                      >
                        <Edit2 className="w-4 h-4" />
                        Editar
                      </button>
                      <button
                        onClick={handleDelete}
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-zinc-800"
                      >
                        <Trash2 className="w-4 h-4" />
                        Eliminar
                      </button>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Visualization Tabs */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-zinc-800/50">
        {visualizationOptions.map(({ type, icon: Icon }) => (
          <button
            key={type}
            onClick={() => handleVisualizationChange(type)}
            className={cn(
              'p-1.5 rounded-md transition-all duration-150',
              currentVisualization === type
                ? 'bg-primary/20 text-primary'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
            )}
            title={type}
          >
            <Icon className="w-3.5 h-3.5" />
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 p-4 overflow-auto min-h-0">
        {isPending ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <AlertCircle className="w-8 h-8 text-red-400 mb-2" />
            <p className="text-sm text-red-400">{error}</p>
            <button
              onClick={handleRefresh}
              className="mt-3 px-3 py-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-300 transition-colors"
            >
              Reintentar
            </button>
          </div>
        ) : currentData.length === 0 ? (
          <div className="flex items-center justify-center h-full text-zinc-500 text-sm">
            Sin datos
          </div>
        ) : currentVisualization === 'table' ? (
          <SmartTable data={currentData} maxRows={10} />
        ) : (
          <SmartChart data={currentData} type={currentVisualization} />
        )}
      </div>
    </div>
  );
}

/**
 * Format a date as relative time (e.g., "2m ago", "1h ago")
 */
function formatRelativeTime(date: Date | string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

  return new Date(date).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
  });
}

