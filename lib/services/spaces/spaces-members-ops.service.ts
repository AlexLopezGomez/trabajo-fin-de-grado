import { withAuthDatabaseTransaction } from "@/lib/db/helpers";
import type { SpaceMember } from "@/types/spaces";
import { AuditService } from "@/lib/services/audit.service";
import { namespaceOrLegacyFilter } from "@/lib/db/namespace";

/**
 * Update space member role
 */
export async function updateSpaceMemberService(
  spaceId: string,
  userId: string,
  newRole: "VIEWER" | "CONTRIBUTOR" | "ADMIN",
  actor: { id: string; name: string; email: string }
): Promise<{ success: boolean; message: string }> {
  return withAuthDatabaseTransaction(async (db, session, ObjectId) => {
    const space = await db.collection("spaces").findOne(
      { _id: new ObjectId(spaceId), "members.userId": userId, ...namespaceOrLegacyFilter() },
      { session }
    );
    if (!space) throw new Error("Space or member not found");

    const oldRole = space.members.find((m: SpaceMember) => m.userId === userId)?.role;

    await db.collection("spaces").updateOne(
      { _id: new ObjectId(spaceId), "members.userId": userId },
      {
        $set: {
          "members.$.role": newRole,
          updatedAt: new Date(),
        },
      },
      { session }
    );

    await AuditService.logAction({
      action: "SPACE_MEMBER_ROLE_CHANGED",
      actor,
      targetType: "space",
      targetId: spaceId,
      targetName: space.name,
      details: {
        userId,
        oldRole,
        newRole,
      },
      session,
    });

    return { success: true, message: `Member role updated to ${newRole}` };
  });
}

/**
 * Remove member from space
 */
export async function removeSpaceMemberService(
  spaceId: string,
  userId: string,
  actor: { id: string; name: string; email: string }
): Promise<{ success: boolean; message: string }> {
  return withAuthDatabaseTransaction(async (db, session, ObjectId) => {
    const space = await db.collection("spaces").findOne(
      { _id: new ObjectId(spaceId), ...namespaceOrLegacyFilter() },
      { session }
    );
    if (!space) throw new Error("Space not found");

    const admins = space.members.filter((m: SpaceMember) => m.role === "ADMIN");
    const memberToRemove = space.members.find((m: SpaceMember) => m.userId === userId);
    if (memberToRemove?.role === "ADMIN" && admins.length === 1) {
      throw new Error("Cannot remove the last admin from the space");
    }

    await db.collection("spaces").updateOne(
      { _id: new ObjectId(spaceId) },
      {
        $pull: { members: { userId } },
        $set: { updatedAt: new Date() },
      } as any,
      { session }
    );

    await AuditService.logAction({
      action: "SPACE_MEMBER_REMOVED",
      actor,
      targetType: "space",
      targetId: spaceId,
      targetName: space.name,
      details: {
        removedUserId: userId,
      },
      session,
    });

    return { success: true, message: "Member removed from space" };
  });
}
