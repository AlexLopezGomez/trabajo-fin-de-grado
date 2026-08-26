import { getAuthMongoClient } from "@/lib/db";
import type { Space, UpdateSpaceInput } from "@/types/spaces";
import { namespaceOrLegacyFilter } from "@/lib/db/namespace";

/**
 * Update space
 */
export async function updateSpaceService(
  spaceId: string,
  input: UpdateSpaceInput,
  actor: { id: string; name: string; email: string }
): Promise<Space> {
  const client = await getAuthMongoClient();
  const db = client.db(process.env.AUTH_DATABASE || "internal_dashboard_auth_db");
  const { ObjectId } = await import("mongodb");
  const session = client.startSession();

  try {
    session.startTransaction();

    const update: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (input.name !== undefined) update.name = input.name;
    if (input.description !== undefined) update.description = input.description;
    if (input.type !== undefined) update.type = input.type;
    if (input.icon !== undefined) update.icon = input.icon;
    if (input.color !== undefined) update.color = input.color;
    if (input.defaultSharing !== undefined) update.defaultSharing = input.defaultSharing;
    if (input.isArchived !== undefined) update.isArchived = input.isArchived;

    const result = await db.collection("spaces").findOneAndUpdate(
      { _id: new ObjectId(spaceId), ...namespaceOrLegacyFilter() },
      { $set: update },
      { returnDocument: "after", session }
    );

    if (!result) {
      throw new Error("Space not found");
    }

    await db.collection("permission_audit_logs").insertOne(
      {
        action: "SPACE_UPDATED",
        actorId: new ObjectId(actor.id),
        actorName: actor.name,
        actorEmail: actor.email,
        targetType: "space",
        targetId: new ObjectId(spaceId),
        targetName: result.name,
        details: { changes: input },
        timestamp: new Date(),
      },
      { session }
    );

    await session.commitTransaction();

    return {
      id: result._id.toString(),
      name: result.name,
      description: result.description,
      type: result.type,
      createdBy: result.createdBy,
      members: result.members,
      defaultSharing: result.defaultSharing,
      icon: result.icon,
      color: result.color,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
      isArchived: result.isArchived,
    };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
}

/**
 * Delete space (soft delete)
 */
export async function deleteSpaceService(
  spaceId: string,
  actor: { id: string; name: string; email: string }
): Promise<{ success: boolean; message: string }> {
  const client = await getAuthMongoClient();
  const db = client.db(process.env.AUTH_DATABASE || "internal_dashboard_auth_db");
  const { ObjectId } = await import("mongodb");
  const session = client.startSession();

  try {
    session.startTransaction();

    const space = await db.collection("spaces").findOne(
      { _id: new ObjectId(spaceId), ...namespaceOrLegacyFilter() },
      { session }
    );

    if (!space) {
      throw new Error("Space not found");
    }

    await db.collection("spaces").updateOne(
      { _id: new ObjectId(spaceId), ...namespaceOrLegacyFilter() },
      {
        $set: {
          isArchived: true,
          deletedAt: new Date(),
          deletedBy: actor.id,
          updatedAt: new Date(),
        },
      },
      { session }
    );

    await db.collection("dashboards").updateMany(
      { spaceId },
      {
        $set: {
          spaceId: null,
          spaceName: null,
          updatedAt: new Date(),
        },
      },
      { session }
    );

    await db.collection("permission_audit_logs").insertOne(
      {
        action: "SPACE_DELETED",
        actorId: new ObjectId(actor.id),
        actorName: actor.name,
        actorEmail: actor.email,
        targetType: "space",
        targetId: new ObjectId(spaceId),
        targetName: space.name,
        details: {},
        timestamp: new Date(),
      },
      { session }
    );

    await session.commitTransaction();

    return { success: true, message: "Space deleted" };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
}


