import { z } from "zod";

export const groupIdParamSchema = z.string().min(1, "groupId is required");

export const paginationSchema = z.object({
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(500).default(50),
});

export const createGroupSchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500).optional(),
});

export const updateGroupSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  description: z.string().trim().max(500).optional(),
});

export const modifyMembersSchema = z.object({
  groupId: groupIdParamSchema,
  userIds: z.array(z.string().min(1)).min(1, "Select at least one user"),
});

// ============================================
// ROLE ASSIGNMENT SCHEMAS
// ============================================

/**
 * Available permission sets (roles)
 * These map to the existing UserRole type in auth.ts
 */
export const permissionSetIdSchema = z.enum([
  "admin",
  "finance",
  "sales",
  "support",
  "viewer",
]);

/**
 * Scope types - where the permission applies
 * Starting with GLOBAL; SPACE support can be added later
 */
export const scopeTypeSchema = z.enum(["GLOBAL", "SPACE"]);

/**
 * Scope object - defines where permissions apply
 */
export const scopeSchema = z.object({
  type: scopeTypeSchema,
  resourceId: z.string().optional(), // Required if type is SPACE
}).refine(
  (data) => data.type === "GLOBAL" || (data.type === "SPACE" && data.resourceId),
  { message: "resourceId is required for SPACE scope" }
);

/**
 * Assign role to group
 */
export const assignRoleToGroupSchema = z.object({
  groupId: groupIdParamSchema,
  permissionSetId: permissionSetIdSchema,
  scope: scopeSchema,
});

/**
 * Revoke role from group
 */
export const revokeRoleFromGroupSchema = z.object({
  groupId: groupIdParamSchema,
  roleAssignmentId: z.string().min(1, "roleAssignmentId is required"),
});

/**
 * Role assignment ID param
 */
export const roleAssignmentIdSchema = z.string().min(1, "roleAssignmentId is required");