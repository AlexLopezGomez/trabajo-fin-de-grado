'use server';

import { requireAuth } from '@/lib/auth/guards';
import { authz } from '@/lib/services/authorization.service';
import { NotificationService, type QueryNotification } from '@/lib/services/notification.service';

function validateObjectId(id: string, fieldName: string): void {
  if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
    throw new Error(`Invalid ${fieldName} format`);
  }
}

export async function getQueryNotifications(limit: number = 50): Promise<QueryNotification[]> {
  const user = await requireAuth();

  const capabilities = await authz.getEffectiveCapabilities(user.id);
  const hasPermission =
    capabilities.permissions.includes('view_query_approvals') ||
    capabilities.permissions.includes('*') ||
    capabilities.isAdmin;

  if (!hasPermission) {
    throw new Error('Access denied: You do not have permission to view query notifications');
  }

  return NotificationService.getNotificationsForSupervisors(limit);
}

export async function acknowledgeQueryNotification(notificationId: string): Promise<{ success: boolean }> {
  const user = await requireAuth();

  validateObjectId(notificationId, 'notificationId');

  const capabilities = await authz.getEffectiveCapabilities(user.id);
  const hasPermission =
    capabilities.permissions.includes('view_query_approvals') ||
    capabilities.permissions.includes('*') ||
    capabilities.isAdmin;

  if (!hasPermission) {
    throw new Error('Access denied: You do not have permission to acknowledge notifications');
  }

  await NotificationService.acknowledgeNotification(notificationId, user.id);
  return { success: true };
}

export async function dismissQueryNotification(notificationId: string): Promise<{ success: boolean }> {
  const user = await requireAuth();

  validateObjectId(notificationId, 'notificationId');

  const capabilities = await authz.getEffectiveCapabilities(user.id);
  const hasPermission =
    capabilities.permissions.includes('view_query_approvals') ||
    capabilities.permissions.includes('*') ||
    capabilities.isAdmin;

  if (!hasPermission) {
    throw new Error('Access denied: You do not have permission to dismiss notifications');
  }

  await NotificationService.dismissNotification(notificationId, user.id);
  return { success: true };
}
