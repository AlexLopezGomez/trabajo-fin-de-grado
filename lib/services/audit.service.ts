import { withAuthDatabase } from '@/lib/db/helpers';
import type { ClientSession, ObjectId as ObjectIdType } from 'mongodb';
import { withNamespaceField, namespaceOrLegacyFilter } from '@/lib/db/namespace';

/**
 * Audit Action Types
 * Centralized definition of all audit actions in the system
 */
export type AuditAction =
  // Dashboard actions
  | 'DASHBOARD_SHARING_MODE_CHANGED'
  | 'DASHBOARD_RULE_ADDED'
  | 'DASHBOARD_RULE_REMOVED'
  | 'DASHBOARD_RULE_UPDATED'
  | 'DASHBOARD_SHARE_ADDED'
  | 'DASHBOARD_SHARE_REMOVED'
  | 'DASHBOARD_SHARE_UPDATED'
  | 'DASHBOARD_CREATED'
  | 'DASHBOARD_MOVED_TO_SPACE'
  | 'DASHBOARD_REMOVED_FROM_SPACE'
  // User actions
  | 'USER_ROLE_CHANGED'
  | 'USER_DELETED'
  | 'USER_CREATED'
  // Group actions
  | 'GROUP_CREATED'
  | 'GROUP_DELETED'
  | 'GROUP_UPDATED'
  | 'GROUP_MEMBER_ADDED'
  | 'GROUP_MEMBER_REMOVED'
  | 'GROUP_MEMBER_ROLE_CHANGED'
  // Space actions
  | 'SPACE_CREATED'
  | 'SPACE_DELETED'
  | 'SPACE_UPDATED'
  | 'SPACE_MEMBER_ADDED'
  | 'SPACE_MEMBER_REMOVED'
  | 'SPACE_MEMBER_ROLE_CHANGED'
  | 'SPACE_GROUP_ADDED'
  | 'SPACE_GROUP_REMOVED'
  | 'SPACE_GROUP_ROLE_CHANGED'
  // Query actions
  | 'QUERY_APPROVED'
  | 'QUERY_REJECTED'
  // System actions
  | 'SYSTEM_MAINTENANCE'
  | 'CONFIGURATION_CHANGED';

/**
 * Audit Target Types
 * Types of entities that can be audited
 */
export type AuditTargetType = 'dashboard' | 'user' | 'group' | 'space' | 'query' | 'system';

/**
 * Parameters for logging a single audit action
 */
export interface AuditLogParams {
  action: AuditAction;
  actor: {
    id: string;
    name?: string;
    email: string;
  };
  targetType: AuditTargetType;
  targetId: string;
  targetName?: string;
  details?: Record<string, unknown>;
  session?: ClientSession;
}

/**
 * Audit log entry as stored in database
 */
export interface AuditLogEntry {
  _id?: ObjectIdType;
  action: AuditAction;
  actorId: ObjectIdType;
  actorName: string;
  actorEmail: string;
  targetType: AuditTargetType;
  targetId: ObjectIdType;
  targetName?: string;
  details: Record<string, unknown>;
  timestamp: Date;
}

/**
 * Centralized Audit Service
 *
 * Provides standardized audit logging functionality across the application.
 * Eliminates code duplication and ensures consistent audit trail management.
 */
export class AuditService {
  /**
   * Log a single audit action
   */
  static async logAction(params: AuditLogParams): Promise<void> {
    return withAuthDatabase(async (db, ObjectId) => {
      await db.collection("permission_audit_logs").insertOne(withNamespaceField({
        action: params.action,
        actorId: new ObjectId(params.actor.id),
        actorName: params.actor.name || params.actor.email,
        actorEmail: params.actor.email,
        targetType: params.targetType,
        targetId: new ObjectId(params.targetId),
        targetName: params.targetName,
        details: params.details || {},
        timestamp: new Date(),
      }), { session: params.session });
    });
  }

  /**
   * Log multiple audit actions in bulk (for performance)
   */
  static async logActions(logs: AuditLogParams[], session?: ClientSession): Promise<void> {
    if (logs.length === 0) return;

    return withAuthDatabase(async (db, ObjectId) => {
      const documents = logs.map(params => withNamespaceField({
        action: params.action,
        actorId: new ObjectId(params.actor.id),
        actorName: params.actor.name || params.actor.email,
        actorEmail: params.actor.email,
        targetType: params.targetType,
        targetId: new ObjectId(params.targetId),
        targetName: params.targetName,
        details: params.details || {},
        timestamp: new Date(),
      }));

      await db.collection("permission_audit_logs").insertMany(documents, { session });
    });
  }

  /**
   * Get audit logs for a specific target
   */
  static async getLogsForTarget(
    targetType: AuditTargetType,
    targetId: string,
    limit: number = 50
  ): Promise<AuditLogEntry[]> {
    return withAuthDatabase(async (db, ObjectId) => {
      return db.collection("permission_audit_logs")
        .find({ targetType, targetId: new ObjectId(targetId), ...namespaceOrLegacyFilter() })
        .sort({ timestamp: -1 })
        .limit(limit)
        .toArray() as Promise<AuditLogEntry[]>;
    });
  }

  /**
   * Get audit logs for a specific actor
   */
  static async getLogsForActor(
    actorId: string,
    limit: number = 50
  ): Promise<AuditLogEntry[]> {
    return withAuthDatabase(async (db, ObjectId) => {
      return db.collection("permission_audit_logs")
        .find({ actorId: new ObjectId(actorId), ...namespaceOrLegacyFilter() })
        .sort({ timestamp: -1 })
        .limit(limit)
        .toArray() as Promise<AuditLogEntry[]>;
    });
  }

  /**
   * Get audit logs by action type
   */
  static async getLogsByAction(
    action: AuditAction,
    limit: number = 50
  ): Promise<AuditLogEntry[]> {
    return withAuthDatabase(async (db) => {
      return db.collection("permission_audit_logs")
        .find({ action, ...namespaceOrLegacyFilter() })
        .sort({ timestamp: -1 })
        .limit(limit)
        .toArray() as Promise<AuditLogEntry[]>;
    });
  }

  /**
   * Get recent audit logs across all targets
   */
  static async getRecentLogs(limit: number = 100  ): Promise<AuditLogEntry[]> {
    return withAuthDatabase(async (db) => {
      return db.collection("permission_audit_logs")
        .find({ ...namespaceOrLegacyFilter() })
        .sort({ timestamp: -1 })
        .limit(limit)
        .toArray() as Promise<AuditLogEntry[]>;
    });
  }

  /**
   * Count audit logs for a specific target
   */
  static async countLogsForTarget(targetType: AuditTargetType, targetId: string): Promise<number> {
    return withAuthDatabase(async (db, ObjectId) => {
      return db.collection("permission_audit_logs")
        .countDocuments({ targetType, targetId: new ObjectId(targetId), ...namespaceOrLegacyFilter() });
    });
  }
}