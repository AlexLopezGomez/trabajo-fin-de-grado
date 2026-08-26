/**
 * Namespace Isolation Helpers
 *
 * Each deployment uses MONGODB_DATABASE as namespace value so
 * multiple projects sharing the same AUTH_DATABASE only see their own
 * dashboards, widgets, queries, spaces, and analytics.
 */

export const NAMESPACED_COLLECTIONS = [
  'dashboards',
  'dashboard_widgets',
  'saved_queries',
  'query_audit_logs',
  'query_approvals',
  'query_notifications',
  'spaces',
  'dashboard_cache_v1',
  'permission_audit_logs',
  'action_audit_logs',
  'audit_log_failures',
  'security_events',
  'security_alerts',
] as const;

export function getCurrentNamespace(): string {
  return process.env.MONGODB_DATABASE || 'default';
}

export function namespaceFilter(): { namespace: string } {
  return { namespace: getCurrentNamespace() };
}

export function namespaceOrLegacyFilter(): {
  $or: [{ namespace: string }, { namespace: { $exists: false } }];
} {
  return {
    $or: [
      { namespace: getCurrentNamespace() },
      { namespace: { $exists: false } },
    ],
  };
}

export function withNamespaceField<T extends Record<string, unknown>>(
  doc: T
): T & { namespace: string } {
  return { ...doc, namespace: getCurrentNamespace() };
}
