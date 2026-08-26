/**
 * Type definitions for authentication module
 * Replaces 'any' types with proper TypeScript definitions
 */

import type { ObjectId } from "mongodb";
// ============================================
// USER ROLES
// ============================================

/**
 * UserRole type - Now flexible to support dynamic roles from permission_sets
 *
 * After Migration 008 (4-Role RBAC System):
 * - Built-in functional roles: admin, supervisor, operator, viewer
 * - Custom roles: Any role created in permission_sets (e.g., finance_analyst, sales_contributor)
 * - Deprecated roles: sales, finance, support, analyst (migrated to custom roles or operator)
 *
 * This type is intentionally broad (string) to support the enterprise-grade
 * Hybrid RBAC model where roles are defined in the database, not in code.
 */
export type UserRole = string;

// ============================================
// USER DATABASE DOCUMENT TYPE
// ============================================

export interface UserDocument {
  _id: ObjectId;
  email: string;
  name: string;
  role: UserRole;
  country?: string;
  password?: string;
  providers?: string[];
  image?: string;
  groupIds?: string[];
  sessionVersion?: number;
  createdAt: Date;
  lastLoginAt?: Date;
  createdBy?: string;
}

// ============================================
// JWT TOKEN TYPE
// ============================================

export interface JWTPayload {
  id: string;
  email: string;
  name?: string;
  role: UserRole;
  country?: string;
  provider?: "google" | "credentials";
  picture?: string;
  sessionVersion: number;
  iat: number;
  exp: number;
  sub?: string;
  jti?: string;
}

// ============================================
// TYPE GUARDS
// ============================================

export function isValidJWTPayload(obj: unknown): obj is JWTPayload {
  if (typeof obj !== 'object' || obj === null) return false;
  const payload = obj as Record<string, unknown>;
  return (
    typeof payload.id === 'string' &&
    typeof payload.email === 'string' &&
    typeof payload.role === 'string' &&
    typeof payload.sessionVersion === 'number'
  );
}

export function isValidUserDocument(obj: unknown): obj is UserDocument {
  if (typeof obj !== 'object' || obj === null) return false;
  const doc = obj as Record<string, unknown>;
  return (
    typeof doc.email === 'string' &&
    typeof doc.name === 'string' &&
    typeof doc.role === 'string'
  );
}

// ============================================
// GLOBAL TYPE EXTENSIONS
// ============================================

declare global {
  // eslint-disable-next-line no-var
  var EdgeRuntime: string | undefined;
}