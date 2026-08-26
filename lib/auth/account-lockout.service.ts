/**
 * Account Lockout Service
 *
 * Prevents brute force attacks by tracking failed login attempts
 * and temporarily locking accounts that exceed failure thresholds.
 *
 * Security Features:
 * - Multi-tier lockout thresholds
 * - IP address and user agent tracking
 * - Automatic lockout expiration
 * - Admin manual unlock capability
 * - Security event logging
 */

import { getAuthDatabase } from '@/lib/db';
import { ObjectId } from 'mongodb';
import { logSecurityEvent } from '@/lib/monitoring/security-events';
import { logger } from '@/lib/utils/logger';

// Lockout threshold configuration
// Format: { attempts, windowMinutes, lockoutMinutes }
const LOCKOUT_THRESHOLDS = [
  { attempts: 5, windowMinutes: 15, lockoutMinutes: 30 },   // Tier 1: 5 failures in 15 min = 30 min lockout
  { attempts: 10, windowMinutes: 60, lockoutMinutes: 120 }, // Tier 2: 10 failures in 1 hour = 2 hour lockout
  { attempts: 15, windowMinutes: 1440, lockoutMinutes: 1440 }, // Tier 3: 15 failures in 24 hours = 24 hour lockout
];

/**
 * Failed login attempt tracking
 */
export interface FailedLoginAttempt {
  _id?: ObjectId;
  email: string;
  attemptedAt: Date;
  ipAddress: string;
  userAgent: string;
  reason: 'INVALID_PASSWORD' | 'INVALID_EMAIL' | 'ACCOUNT_LOCKED';
}

/**
 * Account lockout record
 */
export interface AccountLockout {
  _id?: ObjectId;
  userId?: ObjectId;
  email: string;
  lockedAt: Date;
  unlockAt: Date;
  reason: string;
  failureCount: number;
  unlocked?: boolean;
  unlockedAt?: Date;
  unlockedBy?: string;
}

/**
 * Check if account is currently locked
 */
export async function isAccountLocked(email: string): Promise<boolean> {
  try {
    const db = await getAuthDatabase();

    const lockout = await db.collection<AccountLockout>('account_lockouts').findOne({
      email: email.toLowerCase(),
      unlockAt: { $gt: new Date() },
      unlocked: { $ne: true },
    });

    return !!lockout;
  } catch (error) {
    logger.error('[Account Lockout] Error checking lockout status', error, { email });
    return false;
  }
}

/**
 * Get lockout details if account is locked
 */
export async function getAccountLockout(email: string): Promise<AccountLockout | null> {
  try {
    const db = await getAuthDatabase();

    return db.collection<AccountLockout>('account_lockouts').findOne({
      email: email.toLowerCase(),
      unlockAt: { $gt: new Date() },
      unlocked: { $ne: true },
    });
  } catch (error) {
    logger.error('[Account Lockout] Error getting lockout details', error, { email });
    return null;
  }
}

/**
 * Record failed login attempt
 *
 * Tracks the attempt and checks if lockout thresholds are exceeded
 */
export async function recordFailedAttempt(
  email: string,
  ipAddress: string,
  userAgent: string,
  reason: FailedLoginAttempt['reason']
): Promise<void> {
  try {
    const db = await getAuthDatabase();

    // Record the failed attempt
    await db.collection<FailedLoginAttempt>('failed_login_attempts').insertOne({
      email: email.toLowerCase(),
      attemptedAt: new Date(),
      ipAddress,
      userAgent,
      reason,
    });

    logger.warn('[Account Lockout] Failed login attempt recorded', {
      email,
      ipAddress,
      reason,
    });

    // Check if lockout threshold reached
    await checkAndApplyLockout(email);
  } catch (error) {
    logger.error('[Account Lockout] Error recording failed attempt', error, { email });
  }
}

/**
 * Check failed attempts and apply lockout if threshold exceeded
 */
async function checkAndApplyLockout(email: string): Promise<void> {
  try {
    const db = await getAuthDatabase();

    // Check each lockout threshold (in order)
    for (const threshold of LOCKOUT_THRESHOLDS) {
      const windowStart = new Date(Date.now() - threshold.windowMinutes * 60 * 1000);

      // Count failures in this time window
      const failureCount = await db
        .collection<FailedLoginAttempt>('failed_login_attempts')
        .countDocuments({
          email: email.toLowerCase(),
          attemptedAt: { $gte: windowStart },
        });

      if (failureCount >= threshold.attempts) {
        // Threshold exceeded - apply lockout
        const lockoutDuration = threshold.lockoutMinutes * 60 * 1000;
        const unlockAt = new Date(Date.now() + lockoutDuration);

        // Get user ID if exists
        const user = await db.collection('app_users').findOne({
          email: email.toLowerCase(),
        });

        // Create lockout record
        const lockoutRecord: AccountLockout = {
          userId: user?._id,
          email: email.toLowerCase(),
          lockedAt: new Date(),
          unlockAt,
          reason: `${failureCount} failed attempts in ${threshold.windowMinutes} minutes`,
          failureCount,
        };

        await db.collection<AccountLockout>('account_lockouts').insertOne(lockoutRecord);

        logger.error('[Account Lockout] Account locked due to failed attempts', {
          email,
          failureCount,
          unlockAt: unlockAt.toISOString(),
          threshold,
        });

        // Log security event
        await logSecurityEvent({
          type: 'ACCOUNT_LOCKOUT',
          severity: user?.role === 'admin' ? 'CRITICAL' : 'HIGH',
          userId: user?._id?.toString(),
          email,
          role: user?.role,
          details: {
            failureCount,
            windowMinutes: threshold.windowMinutes,
            lockoutMinutes: threshold.lockoutMinutes,
            unlockAt: unlockAt.toISOString(),
          },
        });

        // Send alert
        await sendLockoutAlert(email, failureCount, unlockAt, user?.role);

        break; // Only apply first matching threshold
      }
    }
  } catch (error) {
    logger.error('[Account Lockout] Error checking/applying lockout', error, { email });
  }
}

/**
 * Clear failed attempts (on successful login)
 */
export async function clearFailedAttempts(email: string): Promise<void> {
  try {
    const db = await getAuthDatabase();

    const result = await db
      .collection<FailedLoginAttempt>('failed_login_attempts')
      .deleteMany({
        email: email.toLowerCase(),
      });

    if (result.deletedCount > 0) {
      logger.info('[Account Lockout] Failed attempts cleared', {
        email,
        clearedCount: result.deletedCount,
      });
    }
  } catch (error) {
    logger.error('[Account Lockout] Error clearing failed attempts', error, { email });
  }
}

/**
 * Manually unlock account (admin action)
 */
export async function unlockAccount(email: string, adminId: string): Promise<void> {
  try {
    const db = await getAuthDatabase();

    // Mark all active lockouts as unlocked
    const result = await db.collection<AccountLockout>('account_lockouts').updateMany(
      {
        email: email.toLowerCase(),
        unlockAt: { $gt: new Date() },
        unlocked: { $ne: true },
      },
      {
        $set: {
          unlocked: true,
          unlockedAt: new Date(),
          unlockedBy: adminId,
        },
      }
    );

    // Clear failed attempts
    await clearFailedAttempts(email);

    logger.info('[Account Lockout] Account manually unlocked', {
      email,
      adminId,
      unlockedCount: result.modifiedCount,
    });

    // Log security event
    await logSecurityEvent({
      type: 'ADMIN_ACTION',
      severity: 'HIGH',
      userId: adminId,
      details: {
        action: 'UNLOCK_ACCOUNT',
        unlockedEmail: email,
      },
    });
  } catch (error) {
    logger.error('[Account Lockout] Error unlocking account', error, { email, adminId });
    throw error;
  }
}

/**
 * Send lockout alert
 */
async function sendLockoutAlert(
  email: string,
  failureCount: number,
  unlockAt: Date,
  userRole?: string
): Promise<void> {
  try {
    // Critical alert for admin accounts
    if (userRole === 'admin') {
      logger.error('🚨 CRITICAL: Admin account locked due to failed login attempts', {
        email,
        failureCount,
        unlockAt: unlockAt.toISOString(),
      });

      // TODO: Send immediate alert to security team via Slack/email
    } else {
      logger.warn('[Security Alert] User account locked', {
        email,
        failureCount,
        unlockAt: unlockAt.toISOString(),
      });

      // TODO: Send email notification to user
    }
  } catch (error) {
    logger.error('[Account Lockout] Error sending alert', error);
  }
}

/**
 * Get client IP address from request headers
 */
export function getClientIp(headers: Headers): string {
  return (
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headers.get('x-real-ip') ||
    'unknown'
  );
}

/**
 * Get client user agent from request headers
 */
export function getClientUserAgent(headers: Headers): string {
  return headers.get('user-agent') || 'unknown';
}

/**
 * Get recent failed attempts for an email
 */
export async function getRecentFailedAttempts(
  email: string,
  minutesBack: number = 60
): Promise<FailedLoginAttempt[]> {
  try {
    const db = await getAuthDatabase();
    const windowStart = new Date(Date.now() - minutesBack * 60 * 1000);

    return db
      .collection<FailedLoginAttempt>('failed_login_attempts')
      .find({
        email: email.toLowerCase(),
        attemptedAt: { $gte: windowStart },
      })
      .sort({ attemptedAt: -1 })
      .toArray();
  } catch (error) {
    logger.error('[Account Lockout] Error getting recent attempts', error, { email });
    return [];
  }
}

/**
 * Get all active lockouts (admin utility)
 */
export async function getActiveLockouts(): Promise<AccountLockout[]> {
  try {
    const db = await getAuthDatabase();

    return db
      .collection<AccountLockout>('account_lockouts')
      .find({
        unlockAt: { $gt: new Date() },
        unlocked: { $ne: true },
      })
      .sort({ lockedAt: -1 })
      .toArray();
  } catch (error) {
    logger.error('[Account Lockout] Error getting active lockouts', error);
    return [];
  }
}
