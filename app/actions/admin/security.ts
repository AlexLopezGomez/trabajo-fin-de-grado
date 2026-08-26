/**
 * Admin Security Actions
 *
 * Server Actions for managing account security, including account lockouts,
 * failed login attempts, and comprehensive security event monitoring.
 *
 * SECURITY: All actions require admin authentication
 */

'use server';

import { requireAdmin } from '@/lib/auth/guards';
import {
  unlockAccount,
  getActiveLockouts,
  getAccountLockout,
  getRecentFailedAttempts,
  type AccountLockout,
  type FailedLoginAttempt,
} from '@/lib/auth/account-lockout.service';
import {
  logSecurityEvent,
  getCriticalEvents,
  getUserSecurityEvents,
  getEventsByType,
  getSecurityEventStats,
  type SecurityEvent,
  type SecurityEventType,
} from '@/lib/monitoring/security-events';
import { logger } from '@/lib/utils/logger';
import {
  UnlockAccountSchema,
  GetLockoutStatusSchema,
  GetFailedAttemptsSchema,
} from '@/lib/validation/security-schemas';
import type { ApiResponse } from '@/types/rbac';

/**
 * Manually unlock a user account (admin only)
 *
 * SECURITY: Requires admin authentication and logs security event
 */
export async function unlockUserAccount(
  rawInput: unknown
): Promise<ApiResponse<{ message: string }>> {
  try {
    const admin = await requireAdmin();

    // Validate input
    const input = UnlockAccountSchema.parse(rawInput);

    // Unlock the account
    await unlockAccount(input.email, admin.id);

    logger.info('[Admin Security] Account unlocked', {
      adminId: admin.id,
      adminEmail: admin.email,
      unlockedEmail: input.email,
    });

    return {
      success: true,
      data: { message: `Account ${input.email} has been unlocked successfully.` },
    };
  } catch (error) {
    logger.error('[Admin Security] Error unlocking account', error);

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to unlock account',
    };
  }
}

/**
 * Get all active account lockouts (admin only)
 *
 * SECURITY: Requires admin authentication
 */
export async function getActiveAccountLockouts(): Promise<
  ApiResponse<{ lockouts: AccountLockout[] }>
> {
  try {
    await requireAdmin();

    const lockouts = await getActiveLockouts();

    return {
      success: true,
      data: { lockouts },
    };
  } catch (error) {
    logger.error('[Admin Security] Error getting active lockouts', error);

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get lockouts',
    };
  }
}

/**
 * Get lockout status for a specific email (admin only)
 *
 * SECURITY: Requires admin authentication
 */
export async function getLockoutStatus(
  rawInput: unknown
): Promise<
  ApiResponse<{ locked: boolean; lockout: AccountLockout | null }>
> {
  try {
    await requireAdmin();

    // Validate input
    const input = GetLockoutStatusSchema.parse(rawInput);

    const lockout = await getAccountLockout(input.email);

    return {
      success: true,
      data: {
        locked: !!lockout,
        lockout,
      },
    };
  } catch (error) {
    logger.error('[Admin Security] Error getting lockout status', error);

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get lockout status',
    };
  }
}

/**
 * Get recent failed login attempts for an email (admin only)
 *
 * SECURITY: Requires admin authentication
 */
export async function getFailedLoginAttempts(
  rawInput: unknown
): Promise<ApiResponse<{ attempts: FailedLoginAttempt[] }>> {
  try {
    await requireAdmin();

    // Validate input
    const input = GetFailedAttemptsSchema.parse(rawInput);

    const attempts = await getRecentFailedAttempts(
      input.email,
      input.minutesBack
    );

    return {
      success: true,
      data: { attempts },
    };
  } catch (error) {
    logger.error('[Admin Security] Error getting failed attempts', error);

    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to get failed attempts',
    };
  }
}

/**
 * Get critical security events from last 24 hours (admin only)
 *
 * SECURITY: Requires admin authentication
 */
export async function getCriticalSecurityEvents(): Promise<
  ApiResponse<{ events: SecurityEvent[] }>
> {
  try {
    await requireAdmin();

    const events = await getCriticalEvents();

    return {
      success: true,
      data: { events },
    };
  } catch (error) {
    logger.error('[Admin Security] Error getting critical events', error);

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get critical events',
    };
  }
}

/**
 * Get security events for a specific user (admin only)
 *
 * SECURITY: Requires admin authentication
 */
export async function getSecurityEventsForUser(
  userId: string,
  limit: number = 100
): Promise<ApiResponse<{ events: SecurityEvent[] }>> {
  try {
    await requireAdmin();

    const events = await getUserSecurityEvents(userId, limit);

    return {
      success: true,
      data: { events },
    };
  } catch (error) {
    logger.error('[Admin Security] Error getting user events', error, { userId });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get user events',
    };
  }
}

/**
 * Get security events by type (admin only)
 *
 * SECURITY: Requires admin authentication
 */
export async function getSecurityEventsByType(
  eventType: SecurityEventType,
  hoursBack: number = 24
): Promise<ApiResponse<{ events: SecurityEvent[] }>> {
  try {
    await requireAdmin();

    const events = await getEventsByType(eventType, hoursBack);

    return {
      success: true,
      data: { events },
    };
  } catch (error) {
    logger.error('[Admin Security] Error getting events by type', error, { eventType });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get events by type',
    };
  }
}

/**
 * Get security event statistics (admin only)
 *
 * SECURITY: Requires admin authentication
 */
export async function getSecurityStats(
  hoursBack: number = 24
): Promise<
  ApiResponse<{
    total: number;
    bySeverity: Record<string, number>;
    byType: Record<string, number>;
    topUsers: Array<{ userId: string; email?: string; count: number }>;
  }>
> {
  try {
    await requireAdmin();

    const stats = await getSecurityEventStats(hoursBack);

    return {
      success: true,
      data: stats,
    };
  } catch (error) {
    logger.error('[Admin Security] Error getting security stats', error);

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get security stats',
    };
  }
}
