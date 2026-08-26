/**
 * Platform collections that live in the Auth/Admin database (AUTH_MONGODB_URI).
 * Business/project-specific collections are NOT listed here and route to MONGODB_URI.
 */
export const AUTH_COLLECTIONS = [
  // NextAuth adapter
  'app_users',
  'users',
  'accounts',
  'sessions',
  'verification_tokens',

  // RBAC & permissions
  'permission_sets',
  'groups',
  'role_assignments',

  // Dashboards & widgets
  'dashboards',
  'dashboard_widgets',
  'saved_queries',
  'dashboard_cache_v1',

  // Spaces
  'spaces',

  // Audit & security
  'auth_audit_logs',
  'query_audit_logs',
  'security_events',
  'security_alerts',
  'action_audit_logs',
  'permission_audit_logs',
  'audit_log_failures',

  // Account security
  'account_lockouts',
  'failed_login_attempts',

  // Workflows & notifications
  'query_approvals',
  'query_notifications',
  'user_invites',
] as const;

export type AuthCollection = (typeof AUTH_COLLECTIONS)[number];

export function isAuthCollection(name: string): boolean {
  return (AUTH_COLLECTIONS as readonly string[]).includes(name);
}
