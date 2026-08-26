import type { UnifiedPermissionSet } from '@/lib/auth/rbac/role-resolver';

/**
 * Context provided to policy functions
 * All data needed for decision-making, pre-fetched
 */
export interface PolicyContext {
    role: string;
    userId: string;
    permissionSet: UnifiedPermissionSet;
}

export interface CollectionPolicyContext extends PolicyContext {
    collection: string;
}

export interface FieldPolicyContext extends PolicyContext {
    collection: string;
    field: string;
}

export type MaskLevel = 'visible' | 'masked' | 'hidden';
