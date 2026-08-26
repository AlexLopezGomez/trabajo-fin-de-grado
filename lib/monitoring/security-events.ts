/**
 * Comprehensive Security Event Logging and Monitoring
 *
 * Logs all security-relevant events for compliance, forensics, and threat detection.
 * Includes real-time anomaly detection and alerting capabilities.
 * 
 * EDGE RUNTIME COMPATIBLE: When called from Edge Runtime (middleware), 
 * only logs to console. Database operations are skipped to avoid Node.js dependencies.
 */

import { logger } from '@/lib/utils/logger';
import type { ObjectId } from 'mongodb';

export type SecurityEventType =
  | 'UNAUTHORIZED_ADMIN_ACCESS'
  | 'UNAUTHORIZED_ACCESS'
  | 'PRIVILEGE_ESCALATION'
  | 'ADMIN_ACTION'
  | 'AUTHENTICATION_FAILURE'
  | 'BRUTE_FORCE_ATTEMPT'
  | 'SUSPICIOUS_ACTIVITY'
  | 'ACCOUNT_LOCKOUT'
  | 'SUSPICIOUS_QUERY'
  | 'MASS_DATA_EXPORT'
  | 'REPEATED_FAILURES'
  | 'ACCOUNT_TAKEOVER'
  | 'DATA_MODIFICATION'
  | 'CONFIGURATION_CHANGE'
  | 'SESSION_HIJACK_ATTEMPT'
  | 'RESOURCE_ENUMERATION';

export type SecurityEventSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface SecurityEvent {
  _id?: ObjectId;
  type: SecurityEventType;
  severity: SecurityEventSeverity;

  // Actor (who performed the action)
  userId?: string;
  email?: string;
  role?: string;
  sessionId?: string;

  // Action details
  action?: string;
  resource?: string;
  resourceType?: 'dashboard' | 'space' | 'user' | 'role' | 'collection' | 'query';
  resourceId?: string;

  // Request metadata
  path?: string;
  ipAddress?: string;
  userAgent?: string;
  requestMethod?: string;

  // Additional context
  details?: Record<string, any>;
  reason?: string;

  // Timing and alerting
  timestamp: Date;
  alertSent?: boolean;
  alertedAt?: Date;
}

/**
 * Detect if we're running in Edge Runtime
 */
function isEdgeRuntime(): boolean {
  return process.env.NEXT_RUNTIME === 'edge';
}

/**
 * Log security event to database and monitoring service
 * 
 * EDGE RUNTIME: When called from middleware, only logs to console.
 * Database operations require Node.js runtime.
 */
export async function logSecurityEvent(event: Omit<SecurityEvent, '_id' | 'timestamp' | 'alertSent'>) {
  const fullEvent: SecurityEvent = {
    ...event,
    timestamp: new Date(),
    alertSent: false,
  };

  // Always log to console for visibility
  logger.warn('[SECURITY EVENT]', {
    type: fullEvent.type,
    severity: fullEvent.severity,
    userId: fullEvent.userId,
    email: fullEvent.email,
    action: fullEvent.action,
    resource: fullEvent.resource,
    ipAddress: fullEvent.ipAddress,
    timestamp: fullEvent.timestamp.toISOString(),
  });

  // Skip database operations in Edge Runtime
  if (isEdgeRuntime()) {
    logger.info('[Security] Edge Runtime detected - skipping database operations');
    return;
  }

  // Only import and use database in Node.js runtime
  try {
    const { withAuthDatabase } = await import('@/lib/db/helpers');

    const { withNamespaceField } = await import('@/lib/db/namespace');

    await withAuthDatabase(async (db) => {
      await db.collection('security_events').insertOne(
        withNamespaceField(fullEvent as unknown as Record<string, unknown>)
      );
    });

    // Run anomaly detection if we have a user ID
    if (fullEvent.userId && shouldRunAnomalyDetection(fullEvent.type)) {
      await detectAnomalies(fullEvent.userId).catch((error) => {
        logger.error('[Security] Anomaly detection failed', error);
      });
    }

    // Send alerts for critical events
    if (fullEvent.severity === 'CRITICAL' || shouldAlertForEventType(fullEvent.type)) {
      await sendSecurityAlert(fullEvent);
    }
  } catch (error) {
    logger.error('[Security] Failed to log security event', error);
  }
}

/**
 * Check if anomaly detection should run for this event type
 */
function shouldRunAnomalyDetection(eventType: SecurityEventType): boolean {
  const detectableEvents: SecurityEventType[] = [
    'UNAUTHORIZED_ACCESS',
    'AUTHENTICATION_FAILURE',
    'SUSPICIOUS_ACTIVITY',
  ];
  return detectableEvents.includes(eventType);
}

/**
 * Check if alert should be sent for this event type
 */
function shouldAlertForEventType(eventType: SecurityEventType): boolean {
  const alertableEvents: SecurityEventType[] = [
    'PRIVILEGE_ESCALATION',
    'ACCOUNT_TAKEOVER',
    'MASS_DATA_EXPORT',
    'DATA_MODIFICATION',
    'CONFIGURATION_CHANGE',
  ];
  return alertableEvents.includes(eventType);
}

/**
 * Real-time anomaly detection
 * Analyzes user behavior patterns to detect suspicious activity
 */
async function detectAnomalies(userId: string): Promise<void> {
  try {
    const { withAuthDatabase } = await import('@/lib/db/helpers');

    await withAuthDatabase(async (db) => {
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

      // Pattern 1: Repeated unauthorized access attempts
      const recentUnauthorized = await db.collection<SecurityEvent>('security_events').countDocuments({
        userId,
        type: 'UNAUTHORIZED_ACCESS',
        timestamp: { $gte: fiveMinutesAgo },
      });

      if (recentUnauthorized >= 5) {
        await logSecurityEvent({
          type: 'REPEATED_FAILURES',
          severity: 'CRITICAL',
          userId,
          action: 'ANOMALY_DETECTED',
          ipAddress: 'system',
          userAgent: 'anomaly-detector',
          details: {
            pattern: 'REPEATED_UNAUTHORIZED_ACCESS',
            count: recentUnauthorized,
            timeWindow: '5 minutes',
            reason: 'Possible privilege escalation attempt or account compromise',
          },
        });
      }

      // Pattern 2: Rapid resource enumeration
      const recentEvents = await db
        .collection<SecurityEvent>('security_events')
        .find({
          userId,
          timestamp: { $gte: fiveMinutesAgo },
        })
        .toArray();

      const uniqueResources = new Set(
        recentEvents.filter((e) => e.resource).map((e) => e.resource)
      );

      if (uniqueResources.size >= 20) {
        await logSecurityEvent({
          type: 'RESOURCE_ENUMERATION',
          severity: 'HIGH',
          userId,
          action: 'ANOMALY_DETECTED',
          ipAddress: 'system',
          userAgent: 'anomaly-detector',
          details: {
            pattern: 'RAPID_RESOURCE_ACCESS',
            uniqueResourcesAccessed: uniqueResources.size,
            timeWindow: '5 minutes',
            reason: 'Possible reconnaissance or data harvesting attempt',
          },
        });
      }
    });
  } catch (error) {
    logger.error('[Security] Anomaly detection error', error, { userId });
  }
}

/**
 * Send critical security alerts to Slack
 */
async function sendSecurityAlert(event: SecurityEvent) {
  const webhookUrl = process.env.SLACK_SECURITY_WEBHOOK;
  if (!webhookUrl) {
    logger.warn('[Security] No Slack webhook configured for alerts');
    return;
  }

  const severityEmoji = {
    LOW: '🔵',
    MEDIUM: '🟡',
    HIGH: '🟠',
    CRITICAL: '🔴',
  };

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `${severityEmoji[event.severity]} Security Alert: ${event.type}`,
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: `${severityEmoji[event.severity]} ${event.severity} Security Event`,
            },
          },
          {
            type: 'section',
            fields: [
              { type: 'mrkdwn', text: `*Type:*\n${event.type}` },
              { type: 'mrkdwn', text: `*Action:*\n${event.action || 'N/A'}` },
              { type: 'mrkdwn', text: `*User:*\n${event.email || event.userId || 'Unknown'}` },
              { type: 'mrkdwn', text: `*Role:*\n${event.role || 'N/A'}` },
              { type: 'mrkdwn', text: `*IP:*\n${event.ipAddress || 'N/A'}` },
              { type: 'mrkdwn', text: `*Time:*\n${event.timestamp.toISOString()}` },
            ],
          },
          ...(event.resource
            ? [
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: `*Resource:* ${event.resource}\n*Type:* ${event.resourceType || 'N/A'}`,
                },
              },
            ]
            : []),
          ...(event.details
            ? [
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: `*Details:*\n\`\`\`${JSON.stringify(event.details, null, 2)}\`\`\``,
                },
              },
            ]
            : []),
        ],
      }),
    });

    // Mark alert as sent
    const { withAuthDatabase } = await import('@/lib/db/helpers');
    await withAuthDatabase(async (db) => {
      if (event._id) {
        await db.collection('security_events').updateOne(
          { _id: event._id },
          { $set: { alertSent: true, alertedAt: new Date() } }
        );
      }
    });

    logger.info('[Security] Alert sent to Slack', { type: event.type, severity: event.severity });
  } catch (error) {
    logger.error('[Security] Failed to send Slack alert', error);
  }
}

/**
 * Get security events for a specific user
 */
export async function getUserSecurityEvents(
  userId: string,
  limit: number = 100
): Promise<SecurityEvent[]> {
  try {
    const { withAuthDatabase } = await import('@/lib/db/helpers');
    return await withAuthDatabase(async (db) => {
      return db
        .collection<SecurityEvent>('security_events')
        .find({ userId })
        .sort({ timestamp: -1 })
        .limit(limit)
        .toArray();
    });
  } catch (error) {
    logger.error('[Security] Error getting user security events', error, { userId });
    return [];
  }
}

/**
 * Get critical security events (last 24 hours)
 */
export async function getCriticalEvents(): Promise<SecurityEvent[]> {
  try {
    const { withAuthDatabase } = await import('@/lib/db/helpers');
    return await withAuthDatabase(async (db) => {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      return db
        .collection<SecurityEvent>('security_events')
        .find({
          severity: { $in: ['HIGH', 'CRITICAL'] },
          timestamp: { $gte: oneDayAgo },
        })
        .sort({ timestamp: -1 })
        .toArray();
    });
  } catch (error) {
    logger.error('[Security] Error getting critical events', error);
    return [];
  }
}

/**
 * Get security events by type
 */
export async function getEventsByType(
  eventType: SecurityEventType,
  hoursBack: number = 24
): Promise<SecurityEvent[]> {
  try {
    const { withAuthDatabase } = await import('@/lib/db/helpers');
    return await withAuthDatabase(async (db) => {
      const cutoffTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000);

      return db
        .collection<SecurityEvent>('security_events')
        .find({
          type: eventType,
          timestamp: { $gte: cutoffTime },
        })
        .sort({ timestamp: -1 })
        .toArray();
    });
  } catch (error) {
    logger.error('[Security] Error getting events by type', error, { eventType });
    return [];
  }
}

/**
 * Get security event statistics
 */
export async function getSecurityEventStats(hoursBack: number = 24): Promise<{
  total: number;
  bySeverity: Record<SecurityEventSeverity, number>;
  byType: Record<string, number>;
  topUsers: Array<{ userId: string; email?: string; count: number }>;
}> {
  try {
    const { withAuthDatabase } = await import('@/lib/db/helpers');
    return await withAuthDatabase(async (db) => {
      const cutoffTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000);

      const events = await db
        .collection<SecurityEvent>('security_events')
        .find({ timestamp: { $gte: cutoffTime } })
        .toArray();

      const bySeverity: Record<SecurityEventSeverity, number> = {
        LOW: 0,
        MEDIUM: 0,
        HIGH: 0,
        CRITICAL: 0,
      };

      const byType: Record<string, number> = {};
      const userCounts: Record<string, { email?: string; count: number }> = {};

      events.forEach((event) => {
        bySeverity[event.severity]++;
        byType[event.type] = (byType[event.type] || 0) + 1;

        if (event.userId) {
          if (!userCounts[event.userId]) {
            userCounts[event.userId] = { email: event.email, count: 0 };
          }
          userCounts[event.userId].count++;
        }
      });

      const topUsers = Object.entries(userCounts)
        .map(([userId, data]) => ({ userId, email: data.email, count: data.count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      return {
        total: events.length,
        bySeverity,
        byType,
        topUsers,
      };
    });
  } catch (error) {
    logger.error('[Security] Error getting security event stats', error);
    return {
      total: 0,
      bySeverity: { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 },
      byType: {},
      topUsers: [],
    };
  }
}
