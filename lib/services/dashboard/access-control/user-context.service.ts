import { getAuthDatabase } from "@/lib/db/index";
import type { SpaceMember } from "@/types/spaces";

/**
 * User Context Service
 *
 * Provides utilities for loading user context information needed for access control.
 * Includes user's group memberships, space memberships, and space roles.
 */

export interface UserGroup {
  id: string;
  name: string;
}

export interface UserSpace {
  id: string;
  name: string;
}

export interface UserContext {
  groups: UserGroup[];
  spaces: UserSpace[];
}

export interface SpaceMembershipInfo {
  isMember: boolean;
  spaceName?: string;
  spaceMemberRole?: "VIEWER" | "CONTRIBUTOR" | "ADMIN";
}

/**
 * Check if user is a member of a specific space and get their role.
 */
export async function isSpaceMember(
  userId: string,
  spaceId: string
): Promise<SpaceMembershipInfo> {
  const db = await getAuthDatabase();
  const { ObjectId } = await import("mongodb");

  const space = await db.collection("spaces").findOne({
    _id: new ObjectId(spaceId),
    "members.userId": userId,
    isArchived: { $ne: true },
  });

  if (space) {
    const member = space.members?.find((m: SpaceMember) => m.userId === userId);
    return {
      isMember: true,
      spaceName: space.name,
      spaceMemberRole: member?.role as "VIEWER" | "CONTRIBUTOR" | "ADMIN" | undefined
    };
  }
  return { isMember: false };
}

/**
 * Get all groups a user belongs to.
 * Returns groups that haven't been deleted (deletedAt is null).
 */
export async function getUserGroupIds(userId: string): Promise<UserGroup[]> {
  const db = await getAuthDatabase();
  const { ObjectId } = await import("mongodb");

  const groups = await db.collection("groups").find({
    memberIds: new ObjectId(userId),
    deletedAt: null,
  }).project({ name: 1 }).toArray();

  return groups.map(g => ({ id: g._id.toString(), name: g.name }));
}

/**
 * Get all spaces a user is a member of.
 * Returns spaces that haven't been archived.
 */
export async function getUserSpaceIds(userId: string): Promise<UserSpace[]> {
  const db = await getAuthDatabase();

  const spaces = await db.collection("spaces").find({
    "members.userId": userId,
    isArchived: { $ne: true },
  }).project({ name: 1 }).toArray();

  return spaces.map(s => ({ id: s._id.toString(), name: s.name }));
}

/**
 * Get comprehensive user context for access control.
 * Loads all groups and spaces the user belongs to in a single operation.
 */
export async function getUserContext(userId: string): Promise<{
  groups: UserGroup[];
  spaces: UserSpace[];
}> {
  const [groups, spaces] = await Promise.all([
    getUserGroupIds(userId),
    getUserSpaceIds(userId),
  ]);

  return { groups, spaces };
}

/**
 * Check if user belongs to a specific group.
 */
export async function isUserInGroup(userId: string, groupId: string): Promise<boolean> {
  const userGroups = await getUserGroupIds(userId);
  return userGroups.some(group => group.id === groupId);
}

/**
 * Check if user is a member of a specific space.
 */
export async function isUserInSpace(userId: string, spaceId: string): Promise<boolean> {
  const userSpaces = await getUserSpaceIds(userId);
  return userSpaces.some(space => space.id === spaceId);
}