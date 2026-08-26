import type { CollectionPolicyContext } from './types';

/**
 * Can user access collection based on their permission set?
 *
 * PURE FUNCTION - No database calls, no side effects
 *
 * @param ctx - Pre-fetched permission set and collection name
 * @returns true if user can query this collection
 */
export function canAccessCollection(ctx: CollectionPolicyContext): boolean {
    const { permissionSet, collection, role } = ctx;

    if (!permissionSet.dataAccess) return false;

    const collections = permissionSet.dataAccess.collections;

    // Wildcard = admin access to all collections
    if (collections === '*') return true;

    // Check if collection is in allowed list
    return Array.isArray(collections) && collections.includes(collection);
}

/**
 * Get reason why access was granted/denied
 * Useful for audit trails and debugging
 *
 * PURE FUNCTION
 */
export function getCollectionAccessReason(
    ctx: CollectionPolicyContext
): string {
    const { permissionSet, collection, role } = ctx;

    if (!permissionSet.dataAccess) {
        return `Role ${role} has no data access configuration`;
    }

    const collections = permissionSet.dataAccess.collections;

    if (collections === '*') {
        return `Role ${role} has wildcard access to all collections`;
    }

    if (Array.isArray(collections) && collections.includes(collection)) {
        return `Role ${role} explicitly grants access to ${collection}`;
    }

    return `Role ${role} does not grant access to ${collection}`;
}
