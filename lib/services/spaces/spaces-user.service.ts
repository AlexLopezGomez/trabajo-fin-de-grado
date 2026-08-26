import { getAuthDatabase } from "@/lib/db";
import type { SpaceSummary, SpaceType } from "@/types/spaces";
import { namespaceOrLegacyFilter } from "@/lib/db/namespace";

/**
 * Get spaces for a specific user (member of)
 */
export async function getUserSpacesService(
  userId: string,
  filters?: { search?: string; type?: SpaceType }
): Promise<SpaceSummary[]> {
  const db = await getAuthDatabase();

  const query: Record<string, unknown> = {
    "members.userId": userId,
    isArchived: { $ne: true },
  };

  if (filters?.search) {
    query.name = { $regex: filters.search, $options: "i" };
  }

  if (filters?.type) {
    query.type = filters.type;
  }

  const namespacedQuery = { $and: [namespaceOrLegacyFilter(), query] };

  const pipeline = [
    { $match: namespacedQuery },
    { $sort: { updatedAt: -1 } },
    {
      $lookup: {
        from: "dashboards",
        let: { spaceId: { $toString: "$_id" } },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $ne: ["$isArchived", true] },
                  {
                    $or: [
                      { $eq: ["$spaceId", "$$spaceId"] },
                      {
                        $gt: [
                          {
                            $size: {
                              $filter: {
                                input: { $ifNull: ["$sharing.rules", []] },
                                as: "rule",
                                cond: {
                                  $and: [
                                    { $eq: ["$$rule.type", "SPACE"] },
                                    { $eq: ["$$rule.targetId", "$$spaceId"] },
                                    {
                                      $or: [
                                        { $not: { $ifNull: ["$$rule.expiresAt", false] } },
                                        { $eq: ["$$rule.expiresAt", null] },
                                        { $gte: ["$$rule.expiresAt", new Date()] }
                                      ]
                                    }
                                  ]
                                }
                              }
                            }
                          },
                          0
                        ]
                      }
                    ]
                  }
                ]
              }
            }
          },
          { $count: "count" },
        ],
        as: "dashboardStats",
      },
    },
    {
      $addFields: {
        dashboardCount: {
          $ifNull: [{ $arrayElemAt: ["$dashboardStats.count", 0] }, 0],
        },
        memberCount: { $size: "$members" },
      },
    },
    { $project: { dashboardStats: 0 } },
  ];

  const spaces = await db.collection("spaces").aggregate(pipeline).toArray();

  return spaces.map((s) => ({
    id: s._id.toString(),
    name: s.name,
    description: s.description,
    type: s.type,
    createdBy: s.createdBy,
    members: s.members,
    defaultSharing: s.defaultSharing,
    icon: s.icon,
    color: s.color,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
    isArchived: s.isArchived,
    dashboardCount: s.dashboardCount,
    memberCount: s.memberCount,
  }));
}

