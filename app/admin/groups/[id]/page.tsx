"use client";

/**
 * Admin UI - Group Detail View (Refactored)
 * Step 5: Group detail with members, roles, and audit trail
 */

import { useState, use } from "react";
import { Shield } from "lucide-react";
import AuditLog from "@/components/admin/audit-log";
import GroupRoleAssignment from "@/components/admin/group-role-assignment";
import { useGroupDetail } from "./hooks/useGroupDetail";
import { GroupDetailHeader } from "./components/GroupDetailHeader";
import { GroupStats } from "./components/GroupStats";
import { GroupMembersList } from "./components/GroupMembersList";
import { DeleteGroupModal } from "./components/DeleteGroupModal";
import { LoadingGroupDetail, ErrorGroupDetail } from "./components/GroupDetailStates";

export default function GroupDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const {
    group,
    members,
    loading,
    error,
    memberCount,
    roleCount,
    setRoleCount,
    auditLogs,
    auditLogsLoading,
    deleting,
    handleDelete,
  } = useGroupDetail(id);

  if (loading) return <LoadingGroupDetail />;
  if (error || !group) return <ErrorGroupDetail error={error || "Group not found"} />;

  // Wrap delete handler to handle errors gracefully via alert (since modal handles loading)
  const onConfirmDelete = async () => {
    try {
      await handleDelete();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete group");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <GroupDetailHeader
        group={group}
        onDeleteClick={() => setShowDeleteConfirm(true)}
      />

      <div className="max-w-7xl mx-auto px-6 py-8">
        <GroupStats
          memberCount={memberCount}
          roleCount={roleCount}
          createdAt={group.createdAt}
        />

        <GroupMembersList groupId={group.id} members={members} />



        {/* Audit Trail */}
        <div className="bg-card/50 border border-border rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Audit Trail</h2>
          <AuditLog
            logs={auditLogs}
            isLoading={auditLogsLoading}
            userId={group.id}
            showExport={false}
          />
        </div>
      </div>

      {showDeleteConfirm && (
        <DeleteGroupModal
          groupName={group.name}
          memberCount={memberCount}
          deleting={deleting}
          onConfirm={onConfirmDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </div>
  );
}
