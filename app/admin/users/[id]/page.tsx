"use client";

/**
 * Admin UI - User Detail View
 * 
 * Refactored for scalability with modular components.
 * Uses custom hook for business logic and UI components for presentation.
 */

import { useParams, useRouter } from "next/navigation";
import { useUserDetail } from "./hooks/useUserDetail";
import { Sparkles, History } from "lucide-react";

// Existing shared components
import RoleChangeModal from "@/components/admin/role-change-modal";
import AuditLog from "@/components/admin/audit-log";
import EffectivePermissions from "@/components/admin/effective-permissions";

// New modular components
import { UserPageHeader } from "./components/UserPageHeader";
import { UserRoleSection } from "./components/UserRoleSection";
import { UserAuthSection } from "./components/UserAuthSection";
import { UserDetailsCard } from "./components/UserDetailsCard";
import { UserActionsCard } from "./components/UserActionsCard";
import { UserGroupsCard } from "./components/UserGroupsCard";
import { DeleteUserModal } from "./components/DeleteUserModal";
import { AdminLoadingState } from "./components/AdminLoadingState";
import { AdminErrorState } from "./components/AdminErrorState";

export default function UserDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  // All state and handlers from the hook
  const {
    user,
    loading,
    error,
    roles,
    userGroups,
    groupsLoading,
    auditLogs,
    auditLogsLoading,
    showRoleModal,
    showDeleteModal,
    deleteReason,
    deleting,
    deleteError,
    setShowRoleModal,
    setShowDeleteModal,
    setDeleteReason,
    setDeleteError,
    handleRoleChangeSuccess,
    handleDelete,
    getRoleBadgeClass,
  } = useUserDetail(id);

  // Loading state
  if (loading) {
    return <AdminLoadingState />;
  }

  // Error state
  if (error || !user) {
    return (
      <AdminErrorState
        error={error || "User not found"}
        onBack={() => router.push("/admin/users")}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <UserPageHeader
        user={user}
        onBack={() => router.push("/admin/users")}
      />

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column - Main info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Role Section */}
            <UserRoleSection
              userRole={user.role}
              roles={roles}
              getRoleBadgeClass={getRoleBadgeClass}
            />

            {/* Authentication Section */}
            <UserAuthSection
              providers={user.providers}
              lastLogin={user.lastLogin ?? null}
              createdAt={user.createdAt}
            />

            {/* Audit Log Section */}
            <div className="bg-card/50 border border-border rounded-lg p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <History className="w-5 h-5 text-primary" />
                Audit Trail
              </h2>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-muted-foreground">
                  Recent permission changes for this user
                </p>
              </div>
              <AuditLog
                logs={auditLogs}
                isLoading={auditLogsLoading}
                userId={user.id}
                showExport={true}
              />
            </div>
          </div>

          {/* Right column - Quick info */}
          <div className="space-y-6">
            {/* Contact info */}
            <UserDetailsCard
              email={user.email}
              country={user.country}
            />

            {/* Actions */}
            <UserActionsCard
              onChangeRole={() => setShowRoleModal(true)}
              onDelete={() => {
                setDeleteError(null);
                setShowDeleteModal(true);
              }}
            />

            {/* Groups section */}
            <UserGroupsCard
              userGroups={userGroups}
              isLoading={groupsLoading}
              onGroupClick={(groupId) => router.push(`/admin/groups/${groupId}`)}
            />
          </div>
        </div>
      </div>

      {/* Role Change Modal */}
      {user && (
        <RoleChangeModal
          isOpen={showRoleModal}
          onClose={() => setShowRoleModal(false)}
          userId={user.id}
          userName={user.name}
          currentRole={user.role}
          onSuccess={handleRoleChangeSuccess}
        />
      )}

      {/* Delete User Modal */}
      <DeleteUserModal
        isOpen={showDeleteModal}
        userName={user.name}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        deleteReason={deleteReason}
        setDeleteReason={setDeleteReason}
        isDeleting={deleting}
        error={deleteError}
      />
    </div>
  );
}
