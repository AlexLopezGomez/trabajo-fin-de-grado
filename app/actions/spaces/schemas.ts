/**
 * Zod Schemas for Space and Dashboard Sharing validation
 */

import { z } from "zod";

// ============================================
// BASE SCHEMAS
// ============================================

export const objectIdSchema = z.string().regex(
  /^[a-fA-F0-9]{24}$/,
  "Invalid ObjectId format"
);

export const spaceTypeSchema = z.enum(["TEAM", "PROJECT", "PERSONAL"], {
  message: "Invalid space type",
});

export const dashboardSharingModeSchema = z.enum(["PRIVATE", "CUSTOM", "PUBLIC"], {
  message: "Invalid sharing mode",
});

export const dashboardPermissionSchema = z.enum(["VIEW", "EDIT", "ADMIN"], {
  message: "Invalid permission level",
});

export const sharingTargetTypeSchema = z.enum(["USER", "GROUP", "SPACE"], {
  message: "Invalid target type",
});

export const spaceMemberRoleSchema = z.enum(["VIEWER", "CONTRIBUTOR", "ADMIN"], {
  message: "Invalid member role",
});

// ============================================
// SPACE SCHEMAS
// ============================================

export const spaceDefaultSharingSchema = z.object({
  mode: z.enum(["PRIVATE", "SPACE_MEMBERS", "PUBLIC"]),
  defaultPermission: dashboardPermissionSchema,
});

export const createSpaceSchema = z.object({
  name: z.string()
    .min(1, "Space name is required")
    .max(100, "Space name too long"),
  description: z.string().max(500, "Description too long").optional(),
  type: spaceTypeSchema,
  icon: z.string().max(50).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid color format").optional(),
  defaultSharing: spaceDefaultSharingSchema.optional(),
  // Initial access control
  initialGroupIds: z.array(objectIdSchema).optional(),
  initialMemberUserIds: z.array(objectIdSchema).optional(),
});

export const updateSpaceSchema = z.object({
  name: z.string()
    .min(1, "Space name is required")
    .max(100, "Space name too long")
    .optional(),
  description: z.string().max(500, "Description too long").optional(),
  type: spaceTypeSchema.optional(),
  icon: z.string().max(50).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid color format").optional(),
  defaultSharing: spaceDefaultSharingSchema.optional(),
  isArchived: z.boolean().optional(),
});

export const addSpaceMemberSchema = z.object({
  spaceId: objectIdSchema,
  userId: objectIdSchema,
  role: spaceMemberRoleSchema,
});

export const updateSpaceMemberSchema = z.object({
  spaceId: objectIdSchema,
  userId: objectIdSchema,
  role: spaceMemberRoleSchema,
});

export const removeSpaceMemberSchema = z.object({
  spaceId: objectIdSchema,
  userId: objectIdSchema,
});

// ============================================
// DASHBOARD SHARING SCHEMAS
// ============================================

export const addSharingRuleSchema = z.object({
  dashboardId: objectIdSchema,
  type: sharingTargetTypeSchema,
  targetId: objectIdSchema,
  permission: dashboardPermissionSchema,
  expiresAt: z.coerce.date().optional(),
  note: z.string().max(200, "Note too long").optional(),
});

export const updateSharingRuleSchema = z.object({
  dashboardId: objectIdSchema,
  ruleId: z.string().min(1, "Rule ID is required"),
  permission: dashboardPermissionSchema.optional(),
  expiresAt: z.coerce.date().nullable().optional(),
  note: z.string().max(200, "Note too long").optional(),
});

export const removeSharingRuleSchema = z.object({
  dashboardId: objectIdSchema,
  ruleId: z.string().min(1, "Rule ID is required"),
});

export const updateSharingModeSchema = z.object({
  dashboardId: objectIdSchema,
  mode: dashboardSharingModeSchema,
  publicPermission: dashboardPermissionSchema.optional(),
});

export const moveDashboardToSpaceSchema = z.object({
  dashboardId: objectIdSchema,
  spaceId: objectIdSchema.nullable(), // null = remove from space (floating)
});

// ============================================
// QUERY SCHEMAS
// ============================================

export const paginationSchema = z.object({
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(100).default(20),
});

export const spaceFiltersSchema = z.object({
  search: z.string().max(100).optional(),
  type: spaceTypeSchema.optional(),
  showArchived: z.boolean().optional(),
}).optional();

export const dashboardFiltersSchema = z.object({
  search: z.string().max(100).optional(),
  spaceId: objectIdSchema.nullable().optional(),
  sharingMode: dashboardSharingModeSchema.optional(),
  permission: z.enum(["CAN_EDIT", "VIEW_ONLY"]).optional(),
  showArchived: z.boolean().optional(),
  showSharedWithMe: z.boolean().optional(),
  showMyDashboards: z.boolean().optional(),
}).optional();

export const shareTargetSearchSchema = z.object({
  query: z.string().min(1).max(100),
  types: z.array(sharingTargetTypeSchema).optional(),
  excludeIds: z.array(z.string()).optional().transform((ids) => ids?.filter(id => /^[a-fA-F0-9]{24}$/.test(id))),
  limit: z.number().int().positive().max(20).default(10),
});

// ============================================
// PERMISSION CHECK SCHEMAS
// ============================================

export const checkPermissionSchema = z.object({
  dashboardId: objectIdSchema,
  requiredPermission: dashboardPermissionSchema,
});

