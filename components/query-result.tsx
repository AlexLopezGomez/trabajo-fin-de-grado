'use client';

import { useState } from 'react';
import { QueryResponse, VisualizationType } from '@/types';
import dynamic from 'next/dynamic';
import { SmartTable } from './smart-table';

const SmartChart = dynamic(
  () => import('./smart-chart').then(mod => ({ default: mod.SmartChart })),
  { loading: () => <div className="h-[350px] animate-pulse bg-zinc-800/50 rounded-lg" />, ssr: false }
);
import { MetricCard } from './metric-card';
import { cn } from '@/lib/utils/common';
import {
  Table2,
  BarChart3,
  LineChart as LineChartIcon,
  PieChart as PieChartIcon,
  Clock,
  Database,
  Zap,
  Code2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface QueryResultProps {
  result: QueryResponse;
  className?: string;
}

const visualizationIcons: Record<VisualizationType, React.ElementType> = {
  'table': Table2,
  'bar-chart': BarChart3,
  'line-chart': LineChartIcon,
  'pie-chart': PieChartIcon,
  'area-chart': LineChartIcon,
  'metric-card': Zap,
};

export function QueryResult({ result, className }: QueryResultProps) {
  const [currentView, setCurrentView] = useState<VisualizationType>(
    result.suggestedVisualization || 'table'
  );
  const [showQuery, setShowQuery] = useState(false);

  const availableViews: VisualizationType[] = ['table', 'bar-chart', 'line-chart', 'pie-chart'];

  return (
    <div className={cn('w-full', className)}>
      {/* Header with Stats */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        {/* Stats Pills */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800/50 rounded-full text-sm">
            <Database className="w-4 h-4 text-zinc-400" />
            <span className="text-zinc-300">{result.totalRecords} registros</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800/50 rounded-full text-sm">
            <Clock className="w-4 h-4 text-zinc-400" />
            <span className="text-zinc-300">{result.executionTime}ms</span>
          </div>
          {result.fromCache && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-sm">
              <Zap className="w-4 h-4 text-emerald-400" />
              <span className="text-emerald-400">Cached</span>
            </div>
          )}
        </div>

        {/* View Switcher */}
        <div className="flex items-center gap-1 p-1 bg-zinc-800/50 rounded-lg">
          {availableViews.map((view) => {
            const Icon = visualizationIcons[view];
            return (
              <button
                key={view}
                onClick={() => setCurrentView(view)}
                className={cn(
                  'flex items-center justify-center w-9 h-9 rounded-md transition-all duration-200',
                  currentView === view
                    ? 'bg-emerald-500 text-black'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-700'
                )}
                title={view}
              >
                <Icon className="w-4 h-4" />
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="p-6">
          {currentView === 'table' && <SmartTable data={result.data} />}
          {currentView === 'bar-chart' && <SmartChart data={result.data} type="bar-chart" />}
          {currentView === 'line-chart' && <SmartChart data={result.data} type="line-chart" />}
          {currentView === 'pie-chart' && <SmartChart data={result.data} type="pie-chart" />}
          {currentView === 'area-chart' && <SmartChart data={result.data} type="area-chart" />}
          {currentView === 'metric-card' && <MetricCard data={result.data} />}
        </div>

        {/* Query Preview Toggle */}
        <div className="border-t border-zinc-800">
          <button
            onClick={() => setShowQuery(!showQuery)}
            className="flex items-center justify-between w-full px-6 py-3 text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/30 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Code2 className="w-4 h-4" />
              <span>Ver consulta generada</span>
            </div>
            {showQuery ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>

          {showQuery && (
            <div className="px-6 pb-4">
              <pre className="p-4 bg-zinc-950 rounded-lg overflow-x-auto text-sm font-mono text-zinc-400">
                {result.query}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

