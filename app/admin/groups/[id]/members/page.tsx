"use client";

/**
 * Group Members Management Page
 * Add or remove users from a group
 */

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  getGroupDetail,
  getGroupMembers,
  addUsersToGroup,
  removeUsersFromGroup,
} from "@/app/actions/admin/groups";
import { getUsers } from "@/app/actions/admin/users";
import GroupMemberModal from "@/components/admin/group-member-modal";
import type { Group, UserListItem } from "@/types/rbac";
import { ArrowLeft, UserPlus, UserMinus, Search, Users } from "lucide-react";
import { logger } from "@/lib/utils/logger";

export default function GroupMembersPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<
    Array<{
      id: string;
      name: string;
      email: string;
      role: string;
    }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);

  const fetchGroup = async () => {
    setLoading(true);
    setError(null);

    try {
      if (!id) {
        setError("Invalid group id");
        setLoading(false);
        return;
      }
      const response = await getGroupDetail(id);

      if (response.success && response.data) {
        setGroup(response.data.group);
      } else {
        setError(response.error || "Group not found");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async () => {
    try {
      if (!id) return;
      const response = await getGroupMembers(id, 1, 1000); // Get all members

      if (response.success && response.data) {
        setMembers(response.data.members);
      }
    } catch (err) {
      logger.error("Failed to fetch members", err);
    }
  };

  useEffect(() => {
    fetchGroup();
    fetchMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleSuccess = () => {
    fetchGroup();
    fetchMembers();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">Loading group...</p>
        </div>
      </div>
    );
  }

  if (error || !group) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400">{error || "Group not found"}</p>
          <button
            onClick={() => router.push("/admin/groups")}
            className="mt-4 px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors"
          >
            Back to Groups
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/50 bg-card/30 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push(`/admin/groups/${group.id}`)}
                className="p-2 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-muted-foreground" />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">
                    Manage Members
                  </h1>
                  <p className="text-sm text-muted-foreground">{group.name}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors flex items-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                Add Members
              </button>
              {members.length > 0 && (
                <button
                  onClick={() => setShowRemoveModal(true)}
                  className="px-4 py-2 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors flex items-center gap-2"
                >
                  <UserMinus className="w-4 h-4" />
                  Remove Members
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Members list */}
        <div className="bg-card/50 border border-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">
              Current Members ({members.length})
            </h2>
          </div>

          {members.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-muted-foreground">No members in this group</p>
              <p className="text-sm text-muted-foreground mt-1">
                Add members to start assigning group-based permissions
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/30 border-b border-border">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                      User
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                      Role
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {members.map((member) => (
                    <tr
                      key={member.id}
                      onClick={() => router.push(`/admin/users/${member.id}`)}
                      className="hover:bg-muted/20 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-3">
                        <div>
                          <div className="font-medium text-white">
                            {member.name}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {member.email}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                          {member.role}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add Members Modal */}
      {group && (
        <GroupMemberModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          groupId={group.id}
          groupName={group.name}
          existingMemberIds={group.memberIds}
          mode="add"
          onSuccess={handleSuccess}
        />
      )}

      {/* Remove Members Modal */}
      {group && (
        <GroupMemberModal
          isOpen={showRemoveModal}
          onClose={() => setShowRemoveModal(false)}
          groupId={group.id}
          groupName={group.name}
          existingMemberIds={group.memberIds}
          mode="remove"
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}

