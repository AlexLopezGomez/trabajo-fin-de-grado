import type { UnifiedPermissionSet } from '@/lib/auth/rbac/role-resolver';
import type { FieldPolicyContext, MaskLevel } from './types';

/**
 * DEPRECATED (v2.0 - February 2026):
 * Field masking logic is deprecated. As of v2.0, all built-in roles have
 * fieldMasking: {} configured, meaning this code effectively passes data through unchanged.
 * 
 * The system now uses Process Restriction (Supervisor approval workflow) instead of
 * Technical Restriction (field masking) for access control.
 * 
 * See RBAC_GOVERNANCE_MATRIX.md for the Four-Eyes Principle documentation.
 * 
 * This code is kept for backwards compatibility with any custom roles that may
 * still define fieldMasking rules, but should be considered deprecated.
 */

/**
 * Determine mask level for a field based on permission set
 *
 * PURE FUNCTION
 * @deprecated Field masking is deprecated. See RBAC_GOVERNANCE_MATRIX.md
 *
 * @returns 'visible' | 'masked' | 'hidden'
 */
export function getFieldMaskLevel(ctx: FieldPolicyContext): MaskLevel {
    const { permissionSet, collection, field } = ctx;

    const maskingRules = permissionSet.dataAccess?.fieldMasking?.[collection];

    // No masking rules = all fields visible
    if (!maskingRules) return 'visible';

    const rule = maskingRules[field];

    // No rule for this field = visible by default
    if (rule === undefined) return 'visible';

    // Handle both boolean (built-in roles) and string (custom roles) formats
    if (typeof rule === 'boolean') {
        return rule ? 'visible' : 'masked';
    }

    return rule; // 'visible' | 'masked' | 'hidden'
}

/**
 * Apply masking to a field value based on mask level
 *
 * PURE FUNCTION
 */
export function maskFieldValue(
    field: string,
    value: unknown,
    level: MaskLevel
): unknown {
    if (level === 'visible') return value;
    if (level === 'hidden') return undefined;

    // level === 'masked'
    if (value === null || value === undefined) return value;

    // Email masking: jo***@example.com
    if (field === 'email' && typeof value === 'string') {
        const [local, domain] = value.split('@');
        if (local && domain) {
            const maskedLocal = local.slice(0, 2) + '***';
            return `${maskedLocal}@${domain}`;
        }
    }

    // IP address, device info - completely redact
    if (field === 'ip_address' || field === 'device_info') {
        return '[REDACTED]';
    }

    // Default: generic masking
    return '[REDACTED]';
}

/**
 * Apply field masking to an array of documents
 *
 * PURE FUNCTION - processes all documents
 */
export function applyFieldMasking(
    data: Record<string, unknown>[],
    permissionSet: UnifiedPermissionSet,
    collection: string
): Record<string, unknown>[] {
    if (!Array.isArray(data)) return data;

    return data.map(doc => {
        if (!doc || typeof doc !== 'object') return doc;

        const maskedDoc: Record<string, unknown> = {};

        for (const [field, value] of Object.entries(doc)) {
            const level = getFieldMaskLevel({
                permissionSet,
                collection,
                field,
                role: permissionSet.id,
                userId: '', // Not needed for pure policy
            });

            if (level === 'hidden') {
                // Field is completely removed
                continue;
            }

            maskedDoc[field] = maskFieldValue(field, value, level);
        }

        return maskedDoc;
    });
}
