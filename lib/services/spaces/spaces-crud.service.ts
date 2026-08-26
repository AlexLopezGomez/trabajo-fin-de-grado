import { getAuthDatabase } from "@/lib/db";
import { withAuthDatabaseTransaction } from "@/lib/db/helpers";
import type {
  Space,
  SpaceSummary,
  SpaceMember,
  CreateSpaceInput,
  SpaceType,
} from "@/types/spaces";
import type { ObjectId } from "mongodb";
import { AuditService } from "@/lib/services/audit.service";
import { withNamespaceField, namespaceOrLegacyFilter } from "@/lib/db/namespace";

/**
 * Create a new space (with initial members/groups and audit logging)
 */
export async function createSpaceService(
  input: CreateSpaceInput,
  creator: { id: string; name: string; email: string }
): Promise<Space> {
  return withAuthDatabaseTransaction(async (db, session, ObjectId) => {
    const now = new Date();

    // Build initial members array (always include creator)
    const initialMembers: SpaceMember[] = [
      {
        userId: creator.id,
        role: "ADMIN" as const,
        addedBy: creator.id,
        addedAt: now,
      },
    ];

    // Add additional initial members if provided
    if (input.initialMemberUserIds && input.initialMemberUserIds.length > 0) {
      const additionalUsers = await db
        .collection("app_users")
        .find({ _id: { $in: input.initialMemberUserIds.map((id) => new ObjectId(id)) } })
        .toArray();

      for (const user of additionalUsers) {
        // Don't duplicate creator
        if (user._id.toString() !== creator.id) {
          initialMembers.push({
            userId: user._id.toString(),
            role: "VIEWER" as const,
            addedBy: creator.id,
            addedAt: now,
          });
        }
      }
    }

    // Build initial group access array
    const initialGroupAccess: Array<{
      groupId: ObjectId;
      groupName: string;
      grantedAt: Date;
      grantedBy: ObjectId;
    }> = [];

    if (input.initialGroupIds && input.initialGroupIds.length > 0) {
      const groups = await db
        .collection("groups")
        .find({ _id: { $in: input.initialGroupIds.map((id) => new ObjectId(id)) } })
        .toArray();

      for (const group of groups) {
        initialGroupAccess.push({
          groupId: group._id,
          groupName: group.name,
          grantedAt: now,
          grantedBy: new ObjectId(creator.id),
        });

        // Also update the group's spaceAccess array (bidirectional relationship)
        await db.collection("groups").updateOne(
          { _id: group._id },
          {
            $push: {
              spaceAccess: {
                spaceId: null, // Will be updated after space is created
                spaceName: input.name,
                grantedAt: now,
              },
            },
            $set: { updatedAt: now },
          } as any,
          { session }
        );
      }
    }

    const spaceDoc = withNamespaceField({
      name: input.name,
      description: input.description || null,
      type: input.type,
      createdBy: creator.id,
      members: initialMembers,
      groupAccess: initialGroupAccess,
      defaultSharing: input.defaultSharing || {
        mode: "SPACE_MEMBERS" as const,
        defaultPermission: "VIEW" as const,
      },
      icon: input.icon || null,
      color: input.color || null,
      createdAt: now,
      updatedAt: now,
      isArchived: false,
    });

    const result = await db.collection("spaces").insertOne(spaceDoc, { session });

    // Update group spaceAccess with the actual space ID
    if (initialGroupAccess.length > 0) {
      await db.collection("groups").updateMany(
        {
          _id: { $in: initialGroupAccess.map((ga) => ga.groupId) },
          "spaceAccess.spaceId": null,
          "spaceAccess.spaceName": input.name,
        },
        {
          $set: {
            "spaceAccess.$.spaceId": result.insertedId,
          },
        },
        { session }
      );
    }

    // Audit log
    await AuditService.logAction({
      action: "SPACE_CREATED",
      actor: creator,
      targetType: "space",
      targetId: result.insertedId.toString(),
      targetName: input.name,
      details: {
        type: input.type,
        defaultSharing: spaceDoc.defaultSharing,
      },
      session,
    });

    return {
      id: result.insertedId.toString(),
      name: spaceDoc.name,
      description: spaceDoc.description || undefined,
      type: spaceDoc.type as SpaceType,
      createdBy: spaceDoc.createdBy,
      members: spaceDoc.members,
      groupAccess:
        initialGroupAccess.length > 0
          ? initialGroupAccess.map((ga) => ({
            groupId: ga.groupId.toString(),
            groupName: ga.groupName,
            grantedAt: ga.grantedAt,
            grantedBy: ga.grantedBy.toString(),
          }))
          : undefined,
      defaultSharing: spaceDoc.defaultSharing,
      icon: spaceDoc.icon || undefined,
      color: spaceDoc.color || undefined,
      createdAt: spaceDoc.createdAt,
      updatedAt: spaceDoc.updatedAt,
      isArchived: spaceDoc.isArchived,
    };
  });
}

/**
 * Get all spaces with dashboard counts
 */
export async function getSpacesService(
  filters?: { search?: string; type?: SpaceType; showArchived?: boolean },
  pagination?: { page: number; pageSize: number }
): Promise<{ spaces: SpaceSummary[]; total: number }> {
  const db = await getAuthDatabase();
  const page = pagination?.page || 1;
  const pageSize = pagination?.pageSize || 20;

  const query: Record<string, unknown> = {};

  if (!filters?.showArchived) {
    query.isArchived = { $ne: true };
  }

  if (filters?.search) {
    query.name = { $regex: filters.search, $options: "i" };
  }

  if (filters?.type) {
    query.type = filters.type;
  }

  const namespacedQuery = { $and: [namespaceOrLegacyFilter(), query] };

  const pipelines = [
    { $match: namespacedQuery },
    { $sort: { createdAt: -1 } },
    { $skip: (page - 1) * pageSize },
    { $limit: pageSize },
    {
      $lookup: {
        from: "dashboard_widgets",
        localField: "_id",
        foreignField: "spaceId",
        as: "widgets",
      },
    },
    {
      $addFields: {
        widgetCount: { $size: "$widgets" },
      },
    },
    {
      $project: {
        widgets: 0,
      },
    },
  ];

  const [spaces, total] = await Promise.all([
    db.collection("spaces").aggregate(pipelines).toArray(),
    db.collection("spaces").countDocuments(namespacedQuery),
  ]);

  const mappedSpaces: SpaceSummary[] = spaces.map((space) => ({
    id: space._id.toString(),
    name: space.name,
    description: space.description || undefined,
    type: space.type as SpaceType,
    createdBy: space.createdBy,
    createdAt: space.createdAt,
    updatedAt: space.updatedAt,
    isArchived: space.isArchived || false,
    // Fix missing properties for SpaceSummary
    dashboardCount: 0, // TODO: Implement dashboard counting
    widgetCount: space.widgetCount || 0,
    memberCount: space.members?.length || 0,
    members: [], // Lightweight view, don't return full members
    groupAccess: [], // Lightweight view
    defaultSharing: space.defaultSharing || { mode: "SPACE_MEMBERS", defaultPermission: "VIEW" },
    color: space.color || undefined,
    icon: space.icon || undefined,
  }));

  return { spaces: mappedSpaces, total };
}

