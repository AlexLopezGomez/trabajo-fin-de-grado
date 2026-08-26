

/**
 * Zod Schemas for Custom Role Management
 */

import { z } from "zod";

/**
 * Permission ID validation
 */
export const permissionIdSchema = z.string().min(1, "Permission ID required");

/**
 * Create custom role schema
 */
export const createCustomRoleSchema = z.object({
  name: z.string()
    .min(3, "Role name must be at least 3 characters")
    .max(50, "Role name must be less than 50 characters")
    .regex(/^[a-zA-Z0-9\s\-_]+$/, "Role name can only contain letters, numbers, spaces, hyphens, and underscores"),
  description: z.string()
    .min(10, "Description must be at least 10 characters")
    .max(500, "Description must be less than 500 characters"),
  permissionIds: z.array(permissionIdSchema)
    .min(1, "At least one permission must be selected")
    .max(100, "Too many permissions selected"),
});

/**
 * Update custom role schema
 */
export const updateCustomRoleSchema = z.object({
  name: z.string()
    .min(3, "Role name must be at least 3 characters")
    .max(50, "Role name must be less than 50 characters")
    .regex(/^[a-zA-Z0-9\s\-_]+$/, "Role name can only contain letters, numbers, spaces, hyphens, and underscores")
    .optional(),
  description: z.string()
    .min(10, "Description must be at least 10 characters")
    .max(500, "Description must be less than 500 characters")
    .optional(),
  permissionIds: z.array(permissionIdSchema)
    .min(1, "At least one permission must be selected")
    .max(100, "Too many permissions selected")
    .optional(),
});

/**
 * Role ID schema
 */
export const roleIdSchema = z.string().min(1, "Role ID required");

/**
 * Type exports
 */
export type CreateCustomRoleInput = z.infer<typeof createCustomRoleSchema>;
export type UpdateCustomRoleInput = z.infer<typeof updateCustomRoleSchema>;

