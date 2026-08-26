import { withAuthDatabase } from '@/lib/db/helpers';
import type { CostTier } from '@/types/query-scoring';
import { dashboard as dashboardLogger } from '@/lib/utils/logger';
import { withNamespaceField, namespaceOrLegacyFilter } from '@/lib/db/namespace';

export interface QueryNotification {
  id?: string;
  type: 'medium_impact_query';
  userId: string;
  userName: string;
  userRole: string;
  widgetId?: string;
  widgetName?: string;
  dashboardId?: string;
  collection: string;
  costScore: number;
  tier: CostTier;
  suggestions: string[];
  estimatedDocsToScan?: number;
  executionTimeMs?: number;
  status: 'new' | 'acknowledged' | 'dismissed';
  createdAt: Date;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
}

export class NotificationService {
  static async notifyMediumImpactQuery(params: {
    userId: string;
    userName: string;
    userRole: string;
    widgetId?: string;
    widgetName?: string;
    dashboardId?: string;
    collection: string;
    costScore: number;
    tier: CostTier;
    suggestions: string[];
    estimatedDocsToScan?: number;
    executionTimeMs?: number;
  }): Promise<void> {
    try {
      await withAuthDatabase(async (db) => {
        await db.collection('query_notifications').insertOne(withNamespaceField({
          type: 'medium_impact_query',
          userId: params.userId,
          userName: params.userName,
          userRole: params.userRole,
          widgetId: params.widgetId,
          widgetName: params.widgetName,
          dashboardId: params.dashboardId,
          collection: params.collection,
          costScore: params.costScore,
          tier: params.tier,
          suggestions: params.suggestions,
          estimatedDocsToScan: params.estimatedDocsToScan,
          executionTimeMs: params.executionTimeMs,
          status: 'new',
          createdAt: new Date(),
        }));
      });

      dashboardLogger('Medium impact query notification created', {
        userId: params.userId,
        collection: params.collection,
        costScore: params.costScore,
        widgetId: params.widgetId,
      });
    } catch (error) {
      dashboardLogger('Failed to create notification', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: params.userId,
        collection: params.collection,
      });
    }
  }

  static async getNotificationsForSupervisors(limit: number = 50): Promise<QueryNotification[]> {
    return withAuthDatabase(async (db) => {
      const notifications = await db
        .collection('query_notifications')
        .find({ status: 'new', type: 'medium_impact_query', ...namespaceOrLegacyFilter() })
        .sort({ createdAt: -1 })
        .limit(limit)
        .toArray();

      return notifications.map((n) => ({
        id: n._id.toString(),
        type: n.type,
        userId: n.userId,
        userName: n.userName,
        userRole: n.userRole,
        widgetId: n.widgetId,
        widgetName: n.widgetName,
        dashboardId: n.dashboardId,
        collection: n.collection,
        costScore: n.costScore,
        tier: n.tier,
        suggestions: n.suggestions || [],
        estimatedDocsToScan: n.estimatedDocsToScan,
        executionTimeMs: n.executionTimeMs,
        status: n.status,
        createdAt: n.createdAt,
        acknowledgedBy: n.acknowledgedBy,
        acknowledgedAt: n.acknowledgedAt,
      }));
    });
  }

  static async acknowledgeNotification(
    notificationId: string,
    supervisorId: string
  ): Promise<void> {
    await withAuthDatabase(async (db, ObjectId) => {
      await db.collection('query_notifications').updateOne(
        { _id: new ObjectId(notificationId), ...namespaceOrLegacyFilter() },
        {
          $set: {
            status: 'acknowledged',
            acknowledgedBy: supervisorId,
            acknowledgedAt: new Date(),
          },
        }
      );
    });
  }

  static async dismissNotification(
    notificationId: string,
    supervisorId: string
  ): Promise<void> {
    await withAuthDatabase(async (db, ObjectId) => {
      await db.collection('query_notifications').updateOne(
        { _id: new ObjectId(notificationId), ...namespaceOrLegacyFilter() },
        {
          $set: {
            status: 'dismissed',
            acknowledgedBy: supervisorId,
            acknowledgedAt: new Date(),
          },
        }
      );
    });
  }
}

export const notificationService = new NotificationService();
