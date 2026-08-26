import { z } from "zod";
import { VALIDATION } from "@/lib/constants/validation";

import { BuiltInRoleId } from "@/lib/auth/rbac/built-in-roles";

export const userIdSchema = z.string().min(1, "userId is required");

export const userPaginationSchema = z.object({
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(VALIDATION.MAX_PAGE_SIZE).default(VALIDATION.DEFAULT_PAGE_SIZE),
});

export const roleSchema = z.enum([
  BuiltInRoleId.ADMIN,
  BuiltInRoleId.SUPERVISOR,
  BuiltInRoleId.OPERATOR,
  BuiltInRoleId.VIEWER,
]).or(z.string().min(1)).or(z.literal(""));

export const groupIdFilterSchema = z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid group ID format").optional();

export const userFiltersSchema = z.object({
  search: z.string().trim().optional(),
  role: roleSchema.optional(),
  groupId: groupIdFilterSchema,
}).optional();

export const deleteUserSchema = z.object({
  userId: userIdSchema,
  reason: z.string().trim().max(VALIDATION.MAX_DESCRIPTION_LENGTH).optional(),
});