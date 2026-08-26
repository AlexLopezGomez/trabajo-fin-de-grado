import { getAuthMongoClient, getAuthDatabase } from "@/lib/db";
import type { Space, SpaceMember, SpaceDefaultSharing, SpaceType } from "@/types/spaces";
import type { ObjectId } from "mongodb";
import { namespaceOrLegacyFilter } from "@/lib/db/namespace";

type UserDetail = { _id: ObjectId; name?: string; email?: string };

type GroupAccessEntry = {
  groupId?: ObjectId | string;
  groupName: string;
  grantedAt: Date;
  grantedBy?: ObjectId | string;
};

type SpaceAggregate = {
  _id: ObjectId;
  name: string;
  description?: string;
  type: SpaceType;
  createdBy: string;
  members: SpaceMember[];
  groupAccess?: GroupAccessEntry[];
  defaultSharing: SpaceDefaultSharing;
  icon?: string | null;
  color?: string | null;
  createdAt: Date;
  updatedAt: Date;
  isArchived: boolean;
  userDetails?: UserDetail[];
};

/**
 * Get single space detail with member names populated
 */
export async function getSpaceDetailService(
  spaceId: string
): Promise<Space | null> {
  const db = await getAuthDatabase();
  const { ObjectId } = await import("mongodb");

  const result = await db.collection("spaces").aggregate<SpaceAggregate>([
    { $match: { _id: new ObjectId(spaceId), ...namespaceOrLegacyFilter() } },
    {
      $lookup: {
        from: "app_users",
        let: { members: "$members" },
        pipeline: [
          {
            $match: {
              $expr: {
                $in: [{ $toString: "$_id" }, "$$members.userId"]
              }
            }
          },
          {
            $project: {
              _id: 1,
              name: 1,
              email: 1,
            }
          }
        ],
        as: "userDetails"
      }
    }
  ]).toArray();

  if (result.length === 0) return null;

  const space = result[0];

  const userMap = new Map<string, { name: string; email: string }>(
    (space.userDetails || []).map((u: UserDetail) => [
      u._id.toString(),
      { name: u.name || "Unknown", email: u.email || "" },
    ])
  );

  const enrichedMembers = (space.members || []).map((member: SpaceMember) => {
    const userInfo = userMap.get(member.userId);
    return {
      userId: member.userId,
      userName: userInfo?.name || member.userId,
      userEmail: userInfo?.email || "",
      role: member.role,
      addedBy: member.addedBy,
      addedAt: member.addedAt,
    };
  });

  const enrichedGroupAccess = (space.groupAccess || []).map((ga: GroupAccessEntry) => ({
    groupId: ga.groupId?.toString() || "unknown",
    groupName: ga.groupName,
    grantedAt: ga.grantedAt,
    grantedBy: ga.grantedBy ? ga.grantedBy.toString() : "unknown",
  }));

  return {
    id: space._id.toString(),
    name: space.name,
    description: space.description,
    type: space.type,
    createdBy: space.createdBy,
    members: enrichedMembers,
    groupAccess: enrichedGroupAccess.length > 0 ? enrichedGroupAccess : undefined,
    defaultSharing: space.defaultSharing,
    icon: space.icon || undefined,
    color: space.color || undefined,
    createdAt: space.createdAt,
    updatedAt: space.updatedAt,
    isArchived: space.isArchived,
  };
}

/**
 * Add member to space
 */
export async function addSpaceMemberService(
  spaceId: string,
  userId: string,
  role: "VIEWER" | "CONTRIBUTOR" | "ADMIN",
  actor: { id: string; name: string; email: string }
): Promise<{ success: boolean; message: string }> {
  const client = await getAuthMongoClient();
  const db = client.db(process.env.AUTH_DATABASE || "internal_dashboard_auth_db");
  const { ObjectId } = await import("mongodb");
  const session = client.startSession();

  try {
    session.startTransaction();

    const user = await db.collection("app_users").findOne(
      { _id: new ObjectId(userId) },
      { session }
    );
    if (!user) throw new Error("User not found");

    const space = await db.collection("spaces").findOne(
      { _id: new ObjectId(spaceId), ...namespaceOrLegacyFilter() },
      { session }
    );
    if (!space) throw new Error("Space not found");

    const existingMember = space.members?.find((m: SpaceMember) => m.userId === userId);
    if (existingMember) throw new Error("User is already a member of this space");

    const newMember: SpaceMember = {
      userId,
      role,
      addedBy: actor.id,
      addedAt: new Date(),
    };

    await db.collection("spaces").updateOne(
      { _id: new ObjectId(spaceId) },
      { $push: { members: newMember }, $set: { updatedAt: new Date() } } as any,
      { session }
    );

    await db.collection("permission_audit_logs").insertOne(
      {
        action: "SPACE_MEMBER_ADDED",
        actorId: new ObjectId(actor.id),
        actorName: actor.name,
        actorEmail: actor.email,
        targetType: "space",
        targetId: new ObjectId(spaceId),
        targetName: space.name,
        details: {
          userId,
          role,
        },
        timestamp: new Date(),
      },
      { session }
    );

    await session.commitTransaction();
    return { success: true, message: "Member added successfully" };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
}


