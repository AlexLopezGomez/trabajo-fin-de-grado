'use server';

/**
 * Query Analytics Actions
 *
 * Server actions for query cost analytics and reporting.
 */

import { requireAuth, logAction } from '@/lib/auth/guards';
import { getAuthDatabase } from '@/lib/db';
import { error as logError } from '@/lib/utils/logger';
import { namespaceOrLegacyFilter } from '@/lib/db/namespace';

interface QueryCostTrend {
  date: string;
  avgScore: number;
  count: number;
  highImpactCount: number;
}

interface CostDistribution {
  tier: 'green' | 'yellow' | 'red';
  count: number;
  percentage: number;
}

interface TopExpensiveQuery {
  widgetName: string;
  collection: string;
  costScore: number;
  executedAt: Date;
  tier: 'green' | 'yellow' | 'red';
}

interface QueryAnalytics {
  totalQueries: number;
  avgCostScore: number;
  costDistribution: CostDistribution[];
  trends: QueryCostTrend[];
  topExpensiveQueries: TopExpensiveQuery[];
}

/**
 * Get query cost analytics for the last 30 days
 */
export async function getQueryCostAnalytics(): Promise<{
  success: boolean;
  data?: QueryAnalytics;
  error?: string;
}> {
  try {
    const user = await requireAuth();

    const userRole = user.role.toLowerCase();
    if (userRole !== 'admin' && userRole !== 'supervisor') {
      await logAction('analytics.unauthorized_access', user.id, {
        userRole: user.role,
      });
      return {
        success: false,
        error: 'Access denied: Only Admins and Supervisors can view analytics',
      };
    }

    const db = await getAuthDatabase();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const auditLogs = await db
      .collection('query_audit_logs')
      .find({
        executedAt: { $gte: thirtyDaysAgo },
        costScore: { $exists: true },
        ...namespaceOrLegacyFilter(),
      })
      .sort({ executedAt: -1 })
      .limit(1000)
      .toArray();

    const totalQueries = auditLogs.length;
    const avgCostScore =
      totalQueries > 0
        ? auditLogs.reduce((sum, log) => sum + (log.costScore || 0), 0) / totalQueries
        : 0;

    const costDistribution = [
      { tier: 'green' as const, count: 0, percentage: 0 },
      { tier: 'yellow' as const, count: 0, percentage: 0 },
      { tier: 'red' as const, count: 0, percentage: 0 },
    ];

    auditLogs.forEach((log) => {
      if (log.costTier === 'green') costDistribution[0].count++;
      else if (log.costTier === 'yellow') costDistribution[1].count++;
      else if (log.costTier === 'red') costDistribution[2].count++;
    });

    costDistribution.forEach((dist) => {
      dist.percentage = totalQueries > 0 ? (dist.count / totalQueries) * 100 : 0;
    });

    const trendMap = new Map<string, { sum: number; count: number; highCount: number }>();
    auditLogs.forEach((log) => {
      const date = new Date(log.executedAt).toISOString().split('T')[0];
      const existing = trendMap.get(date) || { sum: 0, count: 0, highCount: 0 };
      existing.sum += log.costScore || 0;
      existing.count++;
      if (log.costTier === 'red') existing.highCount++;
      trendMap.set(date, existing);
    });

    const trends: QueryCostTrend[] = Array.from(trendMap.entries())
      .map(([date, data]) => ({
        date,
        avgScore: data.sum / data.count,
        count: data.count,
        highImpactCount: data.highCount,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-14);

    const widgets = await db
      .collection('dashboard_widgets')
      .find({ costScore: { $exists: true }, ...namespaceOrLegacyFilter() })
      .toArray();

    const topExpensiveQueries: TopExpensiveQuery[] = widgets
      .filter((w) => w.costScore?.costScore)
      .sort((a, b) => (b.costScore?.costScore || 0) - (a.costScore?.costScore || 0))
      .slice(0, 10)
      .map((w) => ({
        widgetName: w.name,
        collection: w.collection,
        costScore: w.costScore?.costScore || 0,
        executedAt: w.lastExecutedAt || w.createdAt,
        tier: w.costScore?.tier || 'yellow',
      }));

    // Log analytics access
    const redDist = costDistribution.find((d) => d.tier === 'red');
    await logAction('analytics.query_cost_viewed', user.id, {
      totalQueries,
      avgCostScore: Math.round(avgCostScore * 10) / 10,
      highImpactCount: redDist?.count || 0,
    });

    return {
      success: true,
      data: {
        totalQueries,
        avgCostScore,
        costDistribution,
        trends,
        topExpensiveQueries,
      },
    };
  } catch (err) {
    logError('Failed to fetch query analytics', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to fetch analytics',
    };
  }
}
