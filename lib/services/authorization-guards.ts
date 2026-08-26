/**
 * Enterprise Authorization Guards
 *
 * This module provides enterprise-grade validation helpers that wrap
 * AuthorizationService with additional security layers:
 * - Input validation
 * - Audit logging
 * - Error handling
 * - Performance monitoring
 *
 * USE THIS FOR: Server Actions that need comprehensive security checks
 *
 * @example
 * ```typescript
 * import { requireCollectionAccess } from '@/lib/services/authorization-guards';
 *
 * export async function myServerAction() {
 *   const user = await requireAuth();
 *
 *   // This throws if access denied, logs audit trail, and provides clear error
 *   await requireCollectionAccess(user.id, 'users', 'view', {
 *     action: 'myServerAction',
 *     metadata: { param1: 'value1' }
 *   });
 *
 *   // Proceed with operation...
 * }
 * ```
 */

import { authz } from './authorization.service';
import { logger } from '@/lib/utils/logger';
import type { Resource, Action } from './authorization.service';

/**
 * Audit context for security events
 */
export interface AuditContext {
  action: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Enterprise Security: Require collection access with audit trail
 *
 * This is the recommended way to check collection access in Server Actions.
 * It provides:
 * - Clear error messages
 * - Audit logging
 * - Performance monitoring
 * - Type safety
 *
 * @param userId - User ID performing the action
 * @param collection - MongoDB collection name
 * @param action - Action being performed (view, execute, etc.)
 * @param context - Audit context for logging
 * @throws Error if access denied
 *
 * @example
 * ```typescript
 * await requireCollectionAccess(user.id, 'users', 'view', {
 *   action: 'getUserList',
 *   metadata: { filters: {...} }
 * });
 * ```
 */
export async function requireCollectionAccess(
  userId: string,
  collection: string,
  action: Action = 'view',
  context?: AuditContext
): Promise<void> {
  const startTime = Date.now();

  try {
    // Input validation
    if (!userId || typeof userId !== 'string') {
      throw new Error('Invalid userId: must be a non-empty string');
    }

    if (!collection || typeof collection !== 'string') {
      throw new Error('Invalid collection: must be a non-empty string');
    }

    // Check access using unified authorization service
    const hasAccess = await authz.canAccess(
      userId,
      { type: 'collection', id: collection },
      action
    );

    const executionTime = Date.now() - startTime;

    if (!hasAccess) {
      // Audit log: Access denied
      logger.warn('[AuthGuard] Collection access denied', {
        userId,
        collection,
        action,
        contextAction: context?.action,
        executionTimeMs: executionTime,
        result: 'DENIED',
      });

      throw new Error(
        `Access denied: You do not have permission to ${action} the "${collection}" collection`
      );
    }

    // Audit log: Access granted (verbose mode only)
    if (process.env.NODE_ENV === 'development') {
      logger.debug('[AuthGuard] Collection access granted', {
        userId,
        collection,
        action,
        contextAction: context?.action,
        executionTimeMs: executionTime,
        result: 'GRANTED',
      });
    }
  } catch (error) {
    // Enhanced error logging
    logger.error('[AuthGuard] Collection access check failed', error, {
      userId,
      collection,
      action,
      contextAction: context?.action,
    });

    // Re-throw with context
    if (error instanceof Error) {
      throw error;
    }

    throw new Error('Collection access check failed: ' + String(error));
  }
}

/**
 * Enterprise Security: Require resource access with audit trail
 *
 * Generic resource access check for dashboards, spaces, etc.
 *
 * @param userId - User ID performing the action
 * @param resource - Resource being accessed
 * @param action - Action being performed
 * @param context - Audit context for logging
 * @throws Error if access denied
 *
 * @example
 * ```typescript
 * await requireResourceAccess(user.id, {
 *   type: 'dashboard',
 *   id: dashboardId
 * }, 'edit', {
 *   action: 'updateDashboard'
 * });
 * ```
 */
export async function requireResourceAccess(
  userId: string,
  resource: Resource,
  action: Action,
  context?: AuditContext
): Promise<void> {
  const startTime = Date.now();

  try {
    // Input validation
    if (!userId || typeof userId !== 'string') {
      throw new Error('Invalid userId: must be a non-empty string');
    }

    if (!resource || !resource.type) {
      throw new Error('Invalid resource: must have a type');
    }

    // Check access
    const hasAccess = await authz.canAccess(userId, resource, action);

    const executionTime = Date.now() - startTime;

    if (!hasAccess) {
      // Audit log: Access denied
      logger.warn('[AuthGuard] Resource access denied', {
        userId,
        resourceType: resource.type,
        resourceId: resource.id,
        action,
        contextAction: context?.action,
        executionTimeMs: executionTime,
        result: 'DENIED',
      });

      throw new Error(
        `Access denied: You do not have permission to ${action} this ${resource.type}`
      );
    }

    // Audit log: Access granted (verbose mode only)
    if (process.env.NODE_ENV === 'development') {
      logger.debug('[AuthGuard] Resource access granted', {
        userId,
        resourceType: resource.type,
        resourceId: resource.id,
        action,
        contextAction: context?.action,
        executionTimeMs: executionTime,
        result: 'GRANTED',
      });
    }
  } catch (error) {
    logger.error('[AuthGuard] Resource access check failed', error, {
      userId,
      resourceType: resource.type,
      resourceId: resource.id,
      action,
      contextAction: context?.action,
    });

    if (error instanceof Error) {
      throw error;
    }

    throw new Error('Resource access check failed: ' + String(error));
  }
}

/**
 * Enterprise Security: Batch collection access check
 *
 * Efficiently check access to multiple collections at once.
 * Useful for operations that span multiple collections.
 *
 * @param userId - User ID performing the action
 * @param collections - Array of collection names
 * @param action - Action being performed
 * @returns Map of collection → hasAccess
 *
 * @example
 * ```typescript
 * const accessMap = await checkMultipleCollections(user.id, [
 *   'users',
 *   'orders',
 *   'transactions'
 * ], 'view');
 *
 * if (!accessMap.get('users')) {
 *   throw new Error('Cannot access users collection');
 * }
 * ```
 */
export async function checkMultipleCollections(
  userId: string,
  collections: string[],
  action: Action = 'view'
): Promise<Map<string, boolean>> {
  const results = new Map<string, boolean>();

  // Check all collections in parallel for performance
  const checks = collections.map(async (collection) => {
    try {
      const hasAccess = await authz.canAccess(
        userId,
        { type: 'collection', id: collection },
        action
      );
      results.set(collection, hasAccess);
    } catch (error) {
      logger.error('[AuthGuard] Batch collection check failed', error, {
        userId,
        collection,
        action,
      });
      results.set(collection, false);
    }
  });

  await Promise.all(checks);

  return results;
}

/**
 * Enterprise Security: Get accessible collections
 *
 * Returns only the collections the user can access from a given list.
 * Useful for filtering UI options or validating multi-collection operations.
 *
 * @param userId - User ID
 * @param collections - Array of collection names to check
 * @param action - Action being performed
 * @returns Array of accessible collection names
 *
 * @example
 * ```typescript
 * const allCollections = ['users', 'orders', 'transactions', 'logs'];
 * const accessible = await getAccessibleCollections(user.id, allCollections, 'view');
 * // Returns: ['users', 'orders'] (if user only has access to those)
 * ```
 */
export async function getAccessibleCollections(
  userId: string,
  collections: string[],
  action: Action = 'view'
): Promise<string[]> {
  const accessMap = await checkMultipleCollections(userId, collections, action);

  return collections.filter((collection) => accessMap.get(collection) === true);
}

/**
 * Enterprise Security: Validate and sanitize collection name
 *
 * Prevents injection attacks by validating collection names match expected pattern.
 *
 * @param collection - Collection name to validate
 * @returns Sanitized collection name
 * @throws Error if collection name is invalid
 */
export function validateCollectionName(collection: string): string {
  // Collection names must be alphanumeric with underscores only
  const validPattern = /^[a-zA-Z0-9_]+$/;

  if (!collection || typeof collection !== 'string') {
    throw new Error('Invalid collection: must be a non-empty string');
  }

  if (!validPattern.test(collection)) {
    throw new Error(
      'Invalid collection name: must contain only alphanumeric characters and underscores'
    );
  }

  if (collection.length > 64) {
    throw new Error('Invalid collection name: maximum 64 characters');
  }

  return collection;
}

/**
 * Enterprise Security: Rate limit aware access check
 *
 * Combines authorization with rate limit checking.
 * Use for high-frequency operations like query execution.
 *
 * @param userId - User ID
 * @param collection - Collection name
 * @param action - Action being performed
 * @param context - Audit context
 * @returns Rate limit info along with access decision
 */
export async function requireCollectionAccessWithRateLimit(
  userId: string,
  collection: string,
  action: Action = 'execute',
  context?: AuditContext
): Promise<{
  hasAccess: boolean;
  rateLimit: {
    remaining: number;
    limit: number;
    reset: number;
  } | null;
}> {
  // First check authorization (cheap operation)
  await requireCollectionAccess(userId, collection, action, context);

  // Then check rate limit if available
  try {
    const { checkQueryRateLimit } = await import('@/lib/security/rate-limit');
    const rateLimitResult = await checkQueryRateLimit(userId);

    if (!rateLimitResult.success) {
      throw new Error(
        `Rate limit exceeded. Please try again after ${new Date(
          rateLimitResult.reset
        ).toLocaleTimeString()}`
      );
    }

    return {
      hasAccess: true,
      rateLimit: {
        remaining: rateLimitResult.remaining,
        limit: rateLimitResult.limit,
        reset: rateLimitResult.reset,
      },
    };
  } catch (error) {
    // If rate limiting is not configured, just return access
    if (error instanceof Error && error.message.includes('Rate limit exceeded')) {
      throw error;
    }

    return {
      hasAccess: true,
      rateLimit: null,
    };
  }
}
