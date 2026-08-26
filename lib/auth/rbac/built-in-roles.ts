/**
 * Built-in Role Definitions
 *
 * Defines the default permission sets for system roles.
 * These roles cannot be modified via the admin UI.
 *
 * IMPORTANT: Only 4 built-in roles exist:
 * - admin: Full system access
 * - supervisor: Execute all queries and approve heavy queries
 * - operator: Create and execute queries (renamed from analyst)
 * - viewer: Read-only access
 *
 * All other roles (e.g., contributor, finance, sales) should be created
 * as custom roles via the admin UI.
 */

import { withDatabase } from '@/lib/db/helpers';

/**
 * Built-in role identifiers
 * Only these 4 roles are pre-defined in the system
 */
export enum BuiltInRoleId {
  ADMIN = 'admin',
  SUPERVISOR = 'supervisor',
  OPERATOR = 'operator',
  VIEWER = 'viewer',
}

/**
 * Data access configuration for a permission set
 */
export interface DataAccessConfig {
  collections: string[] | '*'; // '*' means all collections
  fieldMasking?: {
    [collection: string]: {
      [field: string]: boolean; // true = visible, false = masked
    };
  };
}

/**
 * Built-in permission set definition
 */
export interface BuiltInPermissionSet {
  id: BuiltInRoleId;
  name: string;
  description: string;
  dataAccess: DataAccessConfig;
  isBuiltIn: true;
}

/**
 * Get all available collections from the database
 * This makes the system flexible - collections are discovered dynamically
 *
 * @returns Array of collection names
 */
export async function getAvailableCollections(): Promise<string[]> {
  return withDatabase(async (db) => {
    const collections = await db.listCollections().toArray();

    // Filter out system collections and RBAC-internal collections
    const businessCollections = collections
      .map(c => c.name)
      .filter(name =>
        !name.startsWith('system.') &&
        !name.startsWith('auth_') &&
        !name.includes('permission') &&
        !name.includes('role_') &&
        !name.includes('audit') &&
        name !== 'app_users' &&
        name !== 'groups' &&
        name !== 'spaces' &&
        name !== 'dashboards' &&
        name !== 'dashboard_widgets' &&
        name !== 'saved_queries'
      );

    return businessCollections;
  });
}

/**
 * Built-in role definitions (static metadata)
 * Collections are resolved dynamically at runtime
 */
export const BUILT_IN_ROLE_METADATA: Record<BuiltInRoleId, Omit<BuiltInPermissionSet, 'dataAccess'> & {
  getDataAccess: () => Promise<DataAccessConfig>
}> = {
  admin: {
    id: BuiltInRoleId.ADMIN,
    name: 'Administrator',
    description: 'Full system access with unrestricted permissions',
    isBuiltIn: true,
    getDataAccess: async () => ({
      collections: '*',
      fieldMasking: {},
    }),
  },

  supervisor: {
    id: BuiltInRoleId.SUPERVISOR,
    name: 'Supervisor',
    description: 'Execute all queries and approve heavy queries from Operators',
    isBuiltIn: true,
    getDataAccess: async () => ({
      collections: '*',
      fieldMasking: {},
    }),
  },

  operator: {
    id: BuiltInRoleId.OPERATOR,
    name: 'Operator',
    description: 'Create and execute queries (heavy queries require Supervisor approval)',
    isBuiltIn: true,
    getDataAccess: async () => {
      /**
       * DEPRECATED (v2.0 - February 2026):
       * Field masking and collection restrictions for Operators are now DEPRECATED.
       *
       * Previous behavior:
       * - collections: Business collections only (via getAvailableCollections())
       * - fieldMasking: PII fields masked (email, phone, ip_address, etc.)
       *
       * Current behavior:
       * - collections: '*' (full access to all collections)
       * - fieldMasking: {} (no masking - full visibility)
       *
       * Rationale: Shifted from "Technical Restriction" (masking) to "Process Restriction"
       * (Supervisor approval workflow for RED tier queries). See RBAC_GOVERNANCE_MATRIX.md
       * for full documentation on the Four-Eyes Principle compliance.
       */
      return {
        collections: '*', // Full access - control via approval workflow
        fieldMasking: {}, // DEPRECATED: No masking - full visibility
      };
    },
  },

  viewer: {
    id: BuiltInRoleId.VIEWER,
    name: 'Viewer',
    description: 'Read-only access to shared dashboards',
    isBuiltIn: true,
    getDataAccess: async () => {
      /**
       * DEPRECATED (v2.0 - February 2026):
       * Field masking for Viewers is now DEPRECATED.
       *
       * Previous behavior:
       * - collections: Limited to "public" collections
       * - fieldMasking: email and device_info masked
       *
       * Current behavior:
       * - collections: [] (no direct collection access)
       * - fieldMasking: {} (no masking)
       *
       * Rationale: Viewers only access data through shared dashboards.
       * Access control is now handled at the dashboard sharing level,
       * not at the collection/field level. See RBAC_GOVERNANCE_MATRIX.md
       */
      return {
        collections: [], // No direct collection access - via shared dashboards only
        fieldMasking: {}, // DEPRECATED: No masking
      };
    },
  },
};

/**
 * Get built-in permission set by role ID (with resolved collections)
 *
 * @param roleId - The role identifier
 * @returns The permission set or undefined if not found
 */
export async function getBuiltInPermissionSet(
  roleId: string
): Promise<BuiltInPermissionSet | undefined> {
  const metadata = BUILT_IN_ROLE_METADATA[roleId as BuiltInRoleId];
  if (!metadata) return undefined;

  const dataAccess = await metadata.getDataAccess();

  return {
    id: metadata.id,
    name: metadata.name,
    description: metadata.description,
    isBuiltIn: metadata.isBuiltIn,
    dataAccess,
  };
}

/**
 * Check if a role ID is a built-in role
 *
 * @param roleId - The role identifier
 * @returns True if the role is built-in
 */
export function isBuiltInRole(roleId: string): roleId is BuiltInRoleId {
  return roleId === 'admin' || roleId === 'supervisor' || roleId === 'operator' || roleId === 'viewer';
}

/**
 * Check if a role can access a collection
 *
 * @param roleId - The role identifier
 * @param collection - The collection name
 * @returns True if the role can access the collection
 */
export async function roleCanAccessCollection(
  roleId: string,
  collection: string
): Promise<boolean> {
  const permissionSet = await getBuiltInPermissionSet(roleId);
  if (!permissionSet) return false;

  const { collections } = permissionSet.dataAccess;

  // Wildcard means access to all collections
  if (collections === '*') return true;

  // Check if collection is in the allowed list
  return collections.includes(collection);
}

/**
 * Check if a role can see a specific field (unmasked)
 *
 * @param roleId - The role identifier
 * @param collection - The collection name
 * @param field - The field name
 * @returns True if the field is visible (not masked)
 */
export async function roleCanSeeField(
  roleId: string,
  collection: string,
  field: string
): Promise<boolean> {
  const permissionSet = await getBuiltInPermissionSet(roleId);
  if (!permissionSet) return false;

  const fieldMasking = permissionSet.dataAccess.fieldMasking?.[collection];
  if (!fieldMasking) return true; // No masking rules = all visible

  const visibility = fieldMasking[field];
  if (visibility === undefined) return true; // No rule for field = visible

  return visibility;
}
