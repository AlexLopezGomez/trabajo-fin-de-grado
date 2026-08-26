'use client';

/**
 * QueryOptimizationPanel Component
 *
 * Displays query cost score and optimization suggestions.
 * Helps users understand query performance and how to improve it.
 */

import { Lightbulb, TrendingUp, Database, Clock, Zap } from 'lucide-react';
import { cn } from '@/lib/utils/common';
import { CostScoreBadge } from './cost-score-badge';
import type { QueryCostScore } from '@/types/query-scoring';

interface QueryOptimizationPanelProps {
  costScore: QueryCostScore;
  className?: string;
  compact?: boolean;
}

export function QueryOptimizationPanel({
  costScore,
  className,
  compact = false,
}: QueryOptimizationPanelProps) {
  const hasHighImpact = costScore.tier === 'red';
  const hasMediumImpact = costScore.tier === 'yellow';
  const hasSuggestions = costScore.suggestions && costScore.suggestions.length > 0;

  if (compact) {
    return (
      <div
        className={cn(
          'flex items-center gap-2 p-2 rounded-lg border',
          hasHighImpact && 'bg-red-500/5 border-red-500/20',
          hasMediumImpact && 'bg-yellow-500/5 border-yellow-500/20',
          !hasHighImpact && !hasMediumImpact && 'bg-emerald-500/5 border-emerald-500/20',
          className
        )}
      >
        <CostScoreBadge
          costScore={costScore.costScore}
          tier={costScore.tier}
          size="sm"
          showScore
        />
        {hasSuggestions && (
          <span className="text-xs text-zinc-500">
            {costScore.suggestions.length} suggestion{costScore.suggestions.length > 1 ? 's' : ''}
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'p-4 rounded-xl border',
        hasHighImpact && 'bg-red-500/5 border-red-500/20',
        hasMediumImpact && 'bg-yellow-500/5 border-yellow-500/20',
        !hasHighImpact && !hasMediumImpact && 'bg-emerald-500/5 border-emerald-500/20',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex items-center gap-2">
          <TrendingUp
            className={cn(
              'w-5 h-5',
              hasHighImpact && 'text-red-400',
              hasMediumImpact && 'text-yellow-500',
              !hasHighImpact && !hasMediumImpact && 'text-emerald-400'
            )}
          />
          <h4 className="text-sm font-medium text-white">Query Performance</h4>
        </div>
        <CostScoreBadge
          costScore={costScore.costScore}
          tier={costScore.tier}
          size="md"
          showScore
        />
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-3 mb-3">
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <Database className="w-3.5 h-3.5" />
          <span>{costScore.estimatedDocsToScan.toLocaleString()} docs</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <Clock className="w-3.5 h-3.5" />
          <span>~{costScore.estimatedTimeMs}ms</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <Zap className="w-3.5 h-3.5" />
          <span>{costScore.usesIndex ? 'Indexed' : 'No index'}</span>
        </div>
      </div>

      {/* Suggestions */}
      {hasSuggestions && (
        <div className="pt-3 border-t border-zinc-800/50">
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb className="w-4 h-4 text-primary" />
            <span className="text-xs font-medium text-zinc-300 uppercase tracking-wide">
              Optimization Tips
            </span>
          </div>
          <ul className="space-y-1.5">
            {costScore.suggestions.map((suggestion, index) => (
              <li
                key={index}
                className="flex items-start gap-2 text-xs text-zinc-400"
              >
                <span className="text-primary mt-0.5">•</span>
                <span>{suggestion}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Warning for high impact */}
      {hasHighImpact && (
        <div className="mt-3 pt-3 border-t border-red-500/20">
          <p className="text-xs text-red-400">
            ⚠️ This query may impact database performance. Supervisor approval required.
          </p>
        </div>
      )}
    </div>
  );
}
