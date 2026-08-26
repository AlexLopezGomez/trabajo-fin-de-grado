import { getAuthMongoClient } from "@/lib/db";
import type { ObjectId } from "mongodb";
import { AuditService } from "@/lib/services/audit.service";
import { namespaceOrLegacyFilter } from "@/lib/db/namespace";

type GroupAccessEntry = {
  groupId: ObjectId;
  groupName: string;
  grantedAt: Date;
  grantedBy: ObjectId;
};

type SpaceAccessEntry = {
  spaceId: ObjectId;
  spaceName: string;
  grantedAt: Date;
};

/**
 * Add group access to space
 */
export async function addSpaceGroupAccessService(
  spaceId: string,
  groupId: string,
  actor: { id: string; name: string; email: string }
): Promise<{ success: boolean; message: string }> {
  const client = await getAuthMongoClient();
  const db = client.db(process.env.AUTH_DATABASE || "internal_dashboard_auth_db");
  const { ObjectId } = await import("mongodb");
  const session = client.startSession();

  try {
    session.startTransaction();

    const now = new Date();

    const group = await db.collection("groups").findOne(
      { _id: new ObjectId(groupId) },
      { session }
    );
    if (!group) throw new Error("Group not found");

    const space = await db.collection("spaces").findOne<{ name: string; groupAccess?: GroupAccessEntry[] }>(
      { _id: new ObjectId(spaceId), ...namespaceOrLegacyFilter() },
      { session }
    );
    if (!space) throw new Error("Space not found");

    const existingAccess = (space.groupAccess || []).find(
      (ga: GroupAccessEntry) => ga.groupId?.toString() === groupId
    );
    if (existingAccess) throw new Error("Group already has access to this space");

    const groupAccessEntry: GroupAccessEntry = {
      groupId: new ObjectId(groupId),
      groupName: group.name,
      grantedAt: now,
      grantedBy: new ObjectId(actor.id),
    };

    await db.collection("spaces").updateOne(
      { _id: new ObjectId(spaceId) },
      {
        $push: {
          groupAccess: groupAccessEntry,
        },
        $set: { updatedAt: now },
      } as any,
      { session }
    );

    const spaceAccessEntry: SpaceAccessEntry = {
      spaceId: new ObjectId(spaceId),
      spaceName: space.name,
      grantedAt: now,
    };

    await db.collection("groups").updateOne(
      { _id: new ObjectId(groupId) },
      {
        $push: {
          spaceAccess: spaceAccessEntry,
        },
        $set: { updatedAt: now },
      } as any,
      { session }
    );

    await AuditService.logAction({
      action: "SPACE_GROUP_ADDED",
      actor,
      targetType: "space",
      targetId: spaceId,
      targetName: space.name,
      details: {
        groupId,
        groupName: group.name,
      },
      session,
    });

    await session.commitTransaction();
    return { success: true, message: `Group "${group.name}" added to space` };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
}

/**
 * Remove group access from space
 */
export async function removeSpaceGroupAccessService(
  spaceId: string,
  groupId: string,
  actor: { id: string; name: string; email: string }
): Promise<{ success: boolean; message: string }> {
  const client = await getAuthMongoClient();
  const db = client.db(process.env.AUTH_DATABASE || "internal_dashboard_auth_db");
  const { ObjectId } = await import("mongodb");
  const session = client.startSession();

  try {
    session.startTransaction();

    const space = await db.collection("spaces").findOne<{ name: string; groupAccess?: GroupAccessEntry[] }>(
      { _id: new ObjectId(spaceId), ...namespaceOrLegacyFilter() },
      { session }
    );
    if (!space) throw new Error("Space not found");

    const existingAccess = (space.groupAccess || []).find(
      (ga: GroupAccessEntry) => ga.groupId?.toString() === groupId
    );
    if (!existingAccess) throw new Error("Group does not have access to this space");

    await db.collection("spaces").updateOne(
      { _id: new ObjectId(spaceId) },
      {
        $pull: { groupAccess: { groupId: new ObjectId(groupId) } },
        $set: { updatedAt: new Date() },
      } as any,
      { session }
    );

    await db.collection("groups").updateOne(
      { _id: new ObjectId(groupId) },
      {
        $pull: { spaceAccess: { spaceId: new ObjectId(spaceId) } },
        $set: { updatedAt: new Date() },
      } as any,
      { session }
    );

    await AuditService.logAction({
      action: "SPACE_GROUP_REMOVED",
      actor,
      targetType: "space",
      targetId: spaceId,
      targetName: space.name,
      details: {
        groupId,
      },
      session,
    });

    await session.commitTransaction();
    return { success: true, message: "Group access removed from space" };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
}


