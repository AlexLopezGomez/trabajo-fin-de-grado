import { getAuthDatabase, getAuthMongoClient } from "@/lib/db";
import type { Group, RoleAssignment, Scope } from "@/types/rbac";
import { AuditService } from "@/lib/services/audit.service";

export interface AdminActor {
  id: string;
  email?: string;
  name?: string | null;
}

export async function updateGroupService(groupId: string, updates: { name?: string; description?: string }, admin: AdminActor) {
  const db = await getAuthDatabase();
  const { ObjectId } = await import("mongodb");
  const client = await getAuthMongoClient();
  const session = client.startSession();

  try {
    let groupName = "";
    await session.withTransaction(async () => {
      const group = await db.collection("groups").findOne({ _id: new ObjectId(groupId) }, { session });
      if (!group) throw new Error("Group not found");
      if (group.deleted === true) throw new Error("Group is deleted");
      groupName = group.name;

      if (updates.name && updates.name.trim() !== group.name) {
        const conflict = await db.collection("groups").findOne({ name: updates.name.trim(), _id: { $ne: new ObjectId(groupId) }, deleted: { $ne: true } }, { session });
        if (conflict) throw new Error(`Group with name "${updates.name}" already exists`);
      }

      const updateDoc: Record<string, unknown> = { updatedAt: new Date() };
      if (updates.name !== undefined) updateDoc["name"] = updates.name.trim();
      if (updates.description !== undefined) updateDoc["description"] = updates.description.trim();

      await db.collection("groups").updateOne({ _id: new ObjectId(groupId) }, { $set: updateDoc }, { session });

      await AuditService.logAction({
        action: "GROUP_UPDATED",
        actor: { id: admin.id, name: admin.name || "", email: admin.email || "" },
        targetType: "group",
        targetId: groupId,
        targetName: updates.name?.trim() || groupName,
        details: { changes: updateDoc },
        session,
      });
    });

    const updated = await db.collection("groups").findOne({ _id: new ObjectId(groupId) });
    if (!updated) throw new Error("Failed to fetch updated group");
    const group: Group = {
      id: updated._id.toString(),
      name: updated.name,
      description: updated.description || "",
      memberIds: (updated.memberIds || []).map((id: unknown) => (id as { toString(): string }).toString()),
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt || updated.createdAt,
    };
    return group;
  } finally {
    await session.endSession();
  }
}

export async function addUsersToGroupService(groupId: string, userIds: string[], admin: AdminActor) {
  const db = await getAuthDatabase();
  const { ObjectId } = await import("mongodb");
  const client = await getAuthMongoClient();
  const session = client.startSession();
  try {
    let groupName = "";
    let addedCount = 0;
    await session.withTransaction(async () => {
      const group = await db.collection("groups").findOne({ _id: new ObjectId(groupId) }, { session });
      if (!group) throw new Error("Group not found");
      if (group.deleted === true) throw new Error("Cannot modify a deleted group");
      groupName = group.name;

      const existingMemberIds = (group.memberIds || []).map((id: unknown) => (id as { toString(): string }).toString());
      const newMemberIds = userIds.map((id) => new ObjectId(id));
      const toAdd = newMemberIds.filter((id) => !existingMemberIds.includes(id.toString()));
      if (toAdd.length === 0) throw new Error("All selected users are already members of this group");

      await db.collection("groups").updateOne({ _id: new ObjectId(groupId) }, { $addToSet: { memberIds: { $each: toAdd } }, $set: { updatedAt: new Date() } }, { session });
      await db.collection("app_users").updateMany({ _id: { $in: toAdd } }, { $addToSet: { groupIds: new ObjectId(groupId) }, $set: { updatedAt: new Date() } }, { session });
      addedCount = toAdd.length;

      const users = await db.collection("app_users").find({ _id: { $in: toAdd } }, { session }).toArray();
      await AuditService.logAction({
        action: "GROUP_MEMBER_ADDED",
        actor: { id: admin.id, name: admin.name || "", email: admin.email || "" },
        targetType: "group",
        targetId: groupId,
        targetName: groupName,
        details: {
          userIds: toAdd.map((id) => id.toString()),
          userNames: users.map((u) => u.name),
          userEmails: users.map((u) => u.email),
          count: addedCount,
        },
        session,
      });
    });
    return { added: addedCount, message: `Successfully added ${addedCount} user(s) to group` };
  } finally {
    await session.endSession();
  }
}

export async function removeUsersFromGroupService(groupId: string, userIds: string[], admin: AdminActor) {
  const db = await getAuthDatabase();
  const { ObjectId } = await import("mongodb");
  const client = await getAuthMongoClient();
  const session = client.startSession();
  try {
    let groupName = "";
    let removedCount = 0;
    await session.withTransaction(async () => {
      const group = await db.collection("groups").findOne({ _id: new ObjectId(groupId) }, { session });
      if (!group) throw new Error("Group not found");
      if (group.deleted === true) throw new Error("Cannot modify a deleted group");
      groupName = group.name;

      const memberIdsToRemove = userIds.map((id) => new ObjectId(id));
      const users = await db.collection("app_users").find({ _id: { $in: memberIdsToRemove } }, { session }).toArray();

      await db.collection("groups").updateOne({ _id: new ObjectId(groupId) }, { $pull: { memberIds: { $in: memberIdsToRemove } } as any, $set: { updatedAt: new Date() } }, { session });
      await db.collection("app_users").updateMany({ _id: { $in: memberIdsToRemove } }, { $pull: { groupIds: new ObjectId(groupId) } as any, $set: { updatedAt: new Date() } }, { session });
      removedCount = memberIdsToRemove.length;

      await AuditService.logAction({
        action: "GROUP_MEMBER_REMOVED",
        actor: { id: admin.id, name: admin.name || "", email: admin.email || "" },
        targetType: "group",
        targetId: groupId,
        targetName: groupName,
        details: {
          userIds: memberIdsToRemove.map((id) => id.toString()),
          userNames: users.map((u) => u.name),
          userEmails: users.map((u) => u.email),
          count: removedCount,
        },
        session,
      });
    });
    return { removed: removedCount, message: `Successfully removed ${removedCount} user(s) from group` };
  } finally {
    await session.endSession();
  }
}

export async function deleteGroupService(groupId: string, admin: AdminActor) {
  const db = await getAuthDatabase();
  const { ObjectId } = await import("mongodb");
  const client = await getAuthMongoClient();
  const session = client.startSession();
  try {
    let groupName = "";
    let memberCount = 0;
    await session.withTransaction(async () => {
      const group = await db.collection("groups").findOne({ _id: new ObjectId(groupId) }, { session });
      if (!group) throw new Error("Group not found");
      groupName = group.name;
      memberCount = (group.memberIds || []).length;

      if (memberCount > 0) {
        await db.collection("app_users").updateMany(
          { groupIds: new ObjectId(groupId) },
          ({ $pull: { groupIds: new ObjectId(groupId) }, $set: { updatedAt: new Date() } } as any),
          { session }
        );
      }

      await db.collection("groups").updateOne(
        { _id: new ObjectId(groupId) },
        { $set: { deleted: true, deletedAt: new Date(), deletedBy: new ObjectId(admin.id), updatedAt: new Date() } },
        { session }
      );

      await AuditService.logAction({
        action: "GROUP_DELETED",
        actor: { id: admin.id, name: admin.name || "", email: admin.email || "" },
        targetType: "group",
        targetId: groupId,
        targetName: groupName,
        details: { memberCount },
        session,
      });
    });
    return { success: true, message: `Group "${groupName}" deleted successfully` };
  } finally {
    await session.endSession();
  }
}

export async function fetchGroupAuditLogsService(groupId: string, limit: number) {
  const db = await getAuthDatabase();
  const { ObjectId } = await import("mongodb");
  const logs = await db
    .collection("permission_audit_logs")
    .find({ targetType: "group", targetId: new ObjectId(groupId) })
    .sort({ timestamp: -1 })
    .limit(limit)
    .toArray();
  const total = await db.collection("permission_audit_logs").countDocuments({ targetType: "group", targetId: new ObjectId(groupId) });

  const auditLogs = logs.map((log) => ({
    id: log._id.toString(),
    action: log.action,
    actorId: log.actorId.toString(),
    actorName: log.actorName,
    actorEmail: log.actorEmail,
    targetType: log.targetType,
    targetId: log.targetId.toString(),
    targetName: log.targetName,
    targetEmail: log.targetEmail,
    details: log.details || {},
    timestamp: log.timestamp,
    ipAddress: log.ipAddress,
    userAgent: log.userAgent,
  }));

  return { logs: auditLogs, total, hasMore: total > limit };
}

export async function fetchGroups(params: { search?: string; page: number; pageSize: number }) {
  const db = await getAuthDatabase();

  const query: Record<string, unknown> = { deleted: { $ne: true } };
  if (params.search) {
    query.$or = [
      { name: { $regex: params.search, $options: "i" } },
      { description: { $regex: params.search, $options: "i" } },
    ];
  }

  const total = await db.collection("groups").countDocuments(query);
  const groups = await db
    .collection("groups")
    .find(query)
    .sort({ createdAt: -1 })
    .skip((params.page - 1) * params.pageSize)
    .limit(params.pageSize)
    .toArray();

  const groupList: Group[] = groups.map((group) => ({
    id: group._id.toString(),
    name: group.name,
    description: group.description || "",
    memberIds: (group.memberIds || []).map((id: unknown) => (id as { toString(): string }).toString()),
    createdAt: group.createdAt,
    updatedAt: group.updatedAt || group.createdAt,
  }));

  return { groups: groupList, total };
}

export async function fetchGroupDetail(groupId: string) {
  const db = await getAuthDatabase();
  const { ObjectId } = await import("mongodb");

  const group = await db
    .collection("groups")
    .findOne({ _id: new ObjectId(groupId), deleted: { $ne: true } });

  if (!group) return null;

  const memberIds = (group.memberIds || []).map((id: unknown) => new ObjectId((id as { toString(): string }).toString()));
  const memberCount = memberIds.length;

  const roleCount = await db.collection("role_assignments").countDocuments({
    targetType: "group",
    targetId: new ObjectId(groupId),
  });

  const groupDetail: Group = {
    id: group._id.toString(),
    name: group.name,
    description: group.description || "",
    memberIds: memberIds.map((id: { toString(): string }) => id.toString()),
    createdAt: group.createdAt,
    updatedAt: group.updatedAt || group.createdAt,
  };

  return { group: groupDetail, memberCount, roleCount };
}

export async function fetchGroupMembers(groupId: string, page: number, pageSize: number) {
  const db = await getAuthDatabase();
  const { ObjectId } = await import("mongodb");

  const group = await db
    .collection("groups")
    .findOne({ _id: new ObjectId(groupId), deleted: { $ne: true } });
  if (!group) return null;

  const memberIds = (group.memberIds || []).map((id: unknown) => new ObjectId((id as { toString(): string }).toString()));
  const total = memberIds.length;
  const paginatedIds = memberIds.slice((page - 1) * pageSize, page * pageSize);

  const users = await db.collection("app_users").find({ _id: { $in: paginatedIds } }).toArray();
  const members = users.map((user) => ({
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
  }));

  return { members, total };
}

export async function createGroupService(name: string, description: string | undefined, admin: AdminActor) {
  const db = await getAuthDatabase();
  const { ObjectId } = await import("mongodb");
  const client = await getAuthMongoClient();
  const session = client.startSession();

  try {
    let newGroupId = "";

    await session.withTransaction(async () => {
      const existing = await db
        .collection("groups")
        .findOne({ name: name.trim(), deleted: { $ne: true } }, { session });
      if (existing) {
        throw new Error(`Group with name "${name}" already exists`);
      }

      const now = new Date();
      const groupDoc = {
        name: name.trim(),
        description: (description || "").trim(),
        memberIds: [],
        createdAt: now,
        updatedAt: now,
        createdBy: new ObjectId(admin.id),
      };

      const result = await db.collection("groups").insertOne(groupDoc, { session });
      newGroupId = result.insertedId.toString();

      await AuditService.logAction({
        action: "GROUP_CREATED",
        actor: { id: admin.id, name: admin.name || "", email: admin.email || "" },
        targetType: "group",
        targetId: result.insertedId.toString(),
        targetName: name.trim(),
        details: { description: (description || "").trim() },
        session,
      });
    });

    const createdGroup = await db.collection("groups").findOne({ _id: new (await import("mongodb")).ObjectId(newGroupId) });
    if (!createdGroup) throw new Error("Failed to fetch created group");

    const group: Group = {
      id: createdGroup._id.toString(),
      name: createdGroup.name,
      description: createdGroup.description || "",
      memberIds: [],
      createdAt: createdGroup.createdAt,
      updatedAt: createdGroup.updatedAt || createdGroup.createdAt,
    };

    return group;
  } finally {
    await session.endSession();
  }
}

// ============================================
// ROLE ASSIGNMENT SERVICES
// ============================================

/**
 * Assign a role (permission set + scope) to a group
 * All members of the group inherit this role
 */
export async function assignRoleToGroupService(
  groupId: string,
  permissionSetId: string,
  scope: Scope,
  admin: AdminActor
): Promise<RoleAssignment> {
  const db = await getAuthDatabase();
  const { ObjectId } = await import("mongodb");
  const client = await getAuthMongoClient();
  const session = client.startSession();

  try {
    let newAssignmentId = "";
    let groupName = "";

    await session.withTransaction(async () => {
      // 1. Verify group exists and is not deleted
      const group = await db
        .collection("groups")
        .findOne({ _id: new ObjectId(groupId), deleted: { $ne: true } }, { session });

      if (!group) {
        throw new Error("Group not found");
      }
      groupName = group.name;

      // 2. Check for duplicate assignment (same permissionSet + scope for this group)
      const existingAssignment = await db.collection("role_assignments").findOne(
        {
          targetType: "group",
          targetId: new ObjectId(groupId),
          permissionSetId,
          "scope.type": scope.type,
          "scope.resourceId": scope.resourceId || null,
        },
        { session }
      );

      if (existingAssignment) {
        throw new Error(
          `This group already has the "${permissionSetId}" role with ${scope.type} scope`
        );
      }

      // 3. Create the role assignment
      const now = new Date();
      const assignmentDoc = {
        targetType: "group" as const,
        targetId: new ObjectId(groupId),
        permissionSetId,
        scope: {
          type: scope.type,
          resourceId: scope.resourceId || null,
        },
        assignedBy: new ObjectId(admin.id),
        assignedAt: now,
      };

      const result = await db
        .collection("role_assignments")
        .insertOne(assignmentDoc, { session });
      newAssignmentId = result.insertedId.toString();

      // 4. Create audit log entry
      await AuditService.logAction({
        action: "GROUP_MEMBER_ROLE_CHANGED",
        actor: { id: admin.id, name: admin.name || "", email: admin.email || "" },
        targetType: "group",
        targetId: groupId,
        targetName: groupName,
        details: {
          permissionSetId,
          scope,
          roleAssignmentId: newAssignmentId,
        },
        session,
      });
    });

    // Return the created assignment
    const assignment = await db.collection("role_assignments").findOne({
      _id: new (await import("mongodb")).ObjectId(newAssignmentId),
    });

    if (!assignment) {
      throw new Error("Failed to fetch created role assignment");
    }

    return {
      id: assignment._id.toString(),
      targetType: "group",
      targetId: assignment.targetId.toString(),
      permissionSetId: assignment.permissionSetId,
      scope: assignment.scope,
      assignedBy: assignment.assignedBy.toString(),
      assignedAt: assignment.assignedAt,
    };
  } finally {
    await session.endSession();
  }
}

/**
 * Revoke a role assignment from a group
 */
export async function revokeRoleFromGroupService(
  groupId: string,
  roleAssignmentId: string,
  admin: AdminActor
): Promise<{ success: boolean; message: string }> {
  const db = await getAuthDatabase();
  const { ObjectId } = await import("mongodb");
  const client = await getAuthMongoClient();
  const session = client.startSession();

  try {
    let groupName = "";
    let permissionSetId = "";
    let scope: Scope = { type: "GLOBAL" };

    await session.withTransaction(async () => {
      // 1. Verify group exists
      const group = await db
        .collection("groups")
        .findOne({ _id: new ObjectId(groupId), deleted: { $ne: true } }, { session });

      if (!group) {
        throw new Error("Group not found");
      }
      groupName = group.name;

      // 2. Find the role assignment
      const assignment = await db.collection("role_assignments").findOne(
        {
          _id: new ObjectId(roleAssignmentId),
          targetType: "group",
          targetId: new ObjectId(groupId),
        },
        { session }
      );

      if (!assignment) {
        throw new Error("Role assignment not found for this group");
      }

      permissionSetId = assignment.permissionSetId;
      scope = assignment.scope;

      // 3. Delete the role assignment
      await db.collection("role_assignments").deleteOne(
        { _id: new ObjectId(roleAssignmentId) },
        { session }
      );

      // 4. Create audit log entry
      await AuditService.logAction({
        action: "GROUP_MEMBER_ROLE_CHANGED",
        actor: { id: admin.id, name: admin.name || "", email: admin.email || "" },
        targetType: "group",
        targetId: groupId,
        targetName: groupName,
        details: {
          permissionSetId,
          scope,
          roleAssignmentId,
          action: "revoked",
        },
        session,
      });
    });

    return {
      success: true,
      message: `Role "${permissionSetId}" revoked from group "${groupName}"`,
    };
  } finally {
    await session.endSession();
  }
}

/**
 * Get all role assignments for a group
 */
export async function getGroupRoleAssignmentsService(
  groupId: string
): Promise<RoleAssignment[]> {
  const db = await getAuthDatabase();
  const { ObjectId } = await import("mongodb");

  // Verify group exists
  const group = await db
    .collection("groups")
    .findOne({ _id: new ObjectId(groupId), deleted: { $ne: true } });

  if (!group) {
    throw new Error("Group not found");
  }

  // Get all role assignments for this group
  const assignments = await db
    .collection("role_assignments")
    .find({
      targetType: "group",
      targetId: new ObjectId(groupId),
    })
    .sort({ assignedAt: -1 })
    .toArray();

  return assignments.map((a) => ({
    id: a._id.toString(),
    targetType: "group" as const,
    targetId: a.targetId.toString(),
    permissionSetId: a.permissionSetId,
    scope: a.scope,
    assignedBy: a.assignedBy.toString(),
    assignedAt: a.assignedAt,
  }));
}
