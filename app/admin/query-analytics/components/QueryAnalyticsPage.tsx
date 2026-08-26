'use client';

/**
 * QueryAnalyticsPage Component
 *
 * Displays query cost analytics, trends, and performance metrics
 * for Admins and Supervisors.
 */

import { useEffect, useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Database,
  AlertTriangle,
  BarChart3,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils/common';
import { getQueryCostAnalytics } from '@/app/actions/query-analytics';
import { CostScoreBadge } from '@/components/dashboard/cost-score-badge';

interface QueryAnalytics {
  totalQueries: number;
  avgCostScore: number;
  costDistribution: Array<{ tier: 'green' | 'yellow' | 'red'; count: number; percentage: number }>;
  trends: Array<{ date: string; avgScore: number; count: number; highImpactCount: number }>;
  topExpensiveQueries: Array<{
    widgetName: string;
    collection: string;
    costScore: number;
    executedAt: Date;
    tier: 'green' | 'yellow' | 'red';
  }>;
}

export function QueryAnalyticsPage() {
  const [analytics, setAnalytics] = useState<QueryAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getQueryCostAnalytics()
      .then((result) => {
        if (result.success && result.data) {
          setAnalytics(result.data);
        } else {
          setError(result.error || 'Failed to load analytics');
        }
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Unknown error');
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-primary animate-spin" />
          <p className="text-zinc-400">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-red-400">{error || 'Failed to load analytics'}</p>
        </div>
      </div>
    );
  }

  const greenDist = analytics.costDistribution.find((d) => d.tier === 'green');
  const yellowDist = analytics.costDistribution.find((d) => d.tier === 'yellow');
  const redDist = analytics.costDistribution.find((d) => d.tier === 'red');

  return (
    <div className="min-h-screen bg-zinc-950 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Query Analytics</h1>
            <p className="text-zinc-400 mt-1">Monitor query performance and cost trends</p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg">
            <BarChart3 className="w-5 h-5 text-primary" />
            <span className="text-sm text-zinc-300">Last 30 Days</span>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Total Queries */}
          <div className="p-5 bg-zinc-900/60 border border-zinc-800 rounded-xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Activity className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-sm font-medium text-zinc-400">Total Queries</h3>
            </div>
            <p className="text-3xl font-bold text-white">{analytics.totalQueries.toLocaleString()}</p>
          </div>

          {/* Average Cost */}
          <div className="p-5 bg-zinc-900/60 border border-zinc-800 rounded-xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-yellow-500/10 rounded-lg">
                <TrendingUp className="w-5 h-5 text-yellow-500" />
              </div>
              <h3 className="text-sm font-medium text-zinc-400">Avg Cost Score</h3>
            </div>
            <p className="text-3xl font-bold text-white">{analytics.avgCostScore.toFixed(1)}</p>
          </div>

          {/* High Impact */}
          <div className="p-5 bg-zinc-900/60 border border-zinc-800 rounded-xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-red-500/10 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <h3 className="text-sm font-medium text-zinc-400">High Impact</h3>
            </div>
            <p className="text-3xl font-bold text-white">{redDist?.count || 0}</p>
            <p className="text-sm text-zinc-500 mt-1">{(redDist?.percentage ?? 0).toFixed(1)}% of total</p>
          </div>

          {/* Low Impact */}
          <div className="p-5 bg-zinc-900/60 border border-zinc-800 rounded-xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-emerald-500/10 rounded-lg">
                <TrendingDown className="w-5 h-5 text-emerald-400" />
              </div>
              <h3 className="text-sm font-medium text-zinc-400">Low Impact</h3>
            </div>
            <p className="text-3xl font-bold text-white">{greenDist?.count || 0}</p>
            <p className="text-sm text-zinc-500 mt-1">{(greenDist?.percentage ?? 0).toFixed(1)}% of total</p>
          </div>
        </div>

        {/* Cost Distribution Chart */}
        <div className="p-6 bg-zinc-900/60 border border-zinc-800 rounded-xl">
          <h3 className="text-lg font-semibold text-white mb-4">Query Cost Distribution</h3>
          <div className="space-y-4">
            {analytics.costDistribution.map((dist) => (
              <div key={dist.tier}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <CostScoreBadge costScore={0} tier={dist.tier} size="sm" />
                    <span className="text-sm text-zinc-300 capitalize">{dist.tier} Impact</span>
                  </div>
                  <span className="text-sm text-zinc-400">
                    {dist.count} queries ({dist.percentage.toFixed(1)}%)
                  </span>
                </div>
                <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full transition-all duration-500',
                      dist.tier === 'green' && 'bg-emerald-500',
                      dist.tier === 'yellow' && 'bg-yellow-500',
                      dist.tier === 'red' && 'bg-red-500'
                    )}
                    style={{ width: `${dist.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Trend Chart */}
        <div className="p-6 bg-zinc-900/60 border border-zinc-800 rounded-xl">
          <h3 className="text-lg font-semibold text-white mb-4">Cost Trend (Last 14 Days)</h3>
          <div className="h-64 relative">
            {analytics.trends.length > 0 ? (
              <div className="h-full flex items-end justify-between gap-2">
                {analytics.trends.map((trend, index) => {
                  const heightPercentage = (trend.avgScore / 100) * 100;
                  return (
                    <div key={trend.date} className="flex-1 flex flex-col items-center gap-2">
                      <div
                        className="w-full bg-primary/20 hover:bg-primary/40 rounded-t-lg transition-all cursor-pointer relative group"
                        style={{ height: `${heightPercentage}%` }}
                        title={`${trend.date}: ${trend.avgScore.toFixed(1)} avg score, ${trend.count} queries`}
                      >
                        {trend.highImpactCount > 0 && (
                          <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full">
                            {trend.highImpactCount}
                          </div>
                        )}
                        <div className="absolute inset-0 bg-primary opacity-0 group-hover:opacity-20 transition-opacity" />
                      </div>
                      <span className="text-xs text-zinc-500 rotate-45 origin-top-left mt-8">
                        {new Date(trend.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-zinc-500">
                No trend data available
              </div>
            )}
          </div>
        </div>

        {/*   {/* Top Expensive Queries 
        <div className="p-6 bg-zinc-900/60 border border-zinc-800 rounded-xl">
          <h3 className="text-lg font-semibold text-white mb-4">Most Expensive Queries</h3>
          <div className="space-y-3">
            {analytics.topExpensiveQueries.length > 0 ? (
              analytics.topExpensiveQueries.map((query, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 bg-zinc-800/40 hover:bg-zinc-800/60 border border-zinc-800 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <span className="text-lg font-bold text-zinc-600">#{index + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{query.widgetName}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Database className="w-3 h-3 text-zinc-500" />
                        <span className="text-xs text-zinc-500">{query.collection}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex it ems-center gap-3">
                    <span className="text-xl font-bold text-white">{query.costScore}</span>
                    <CostScoreBadge costScore={query.costScore} tier={query.tier} size="md" />
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-zinc-500">No expensive queries found</div>
            )}
          </div>
        </div> */}
      </div>
    </div>
  );
}
