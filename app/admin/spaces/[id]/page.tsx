"use client";

/**
 * Admin UI - Space Detail Page (Refactored)
 * Reduced from 921 lines to ~250 lines through focused component extraction
 */

import { use } from "react";
import { useRouter } from "next/navigation";
import { useSpaceDetail } from "./hooks/useSpaceDetail";
import { MemberRow } from "./components/MemberRow";
import { AddMemberModal } from "./components/AddMemberModal";
import { DeleteConfirmModal } from "./components/DeleteConfirmModal";
import { LoadingState, ErrorState } from "./components/SpaceStates";
import type { SpaceType } from "@/types/spaces";
import {
  ArrowLeft,
  Users,
  Settings,
  Trash2,
  UserPlus,
  Building2,
  FolderKanban,
  User as UserIcon,
} from "lucide-react";

const SPACE_TYPE_ICONS: Record<SpaceType, React.ReactNode> = {
  TEAM: <Users className="w-5 h-5" />,
  PROJECT: <FolderKanban className="w-5 h-5" />,
  PERSONAL: <UserIcon className="w-5 h-5" />,
};

const SPACE_TYPE_COLORS: Record<SpaceType, string> = {
  TEAM: "text-primary bg-primary/10 border-primary/30",
  PROJECT: "text-primary bg-primary/10 border-primary/30",
  PERSONAL: "text-accent bg-accent/10 border-accent/30",
};

export default function SpaceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const {
    space,
    loading,
    error,
    activeTab,
    showAddMemberModal,
    showDeleteConfirm,
    setActiveTab,
    setShowAddMemberModal,
    setShowDeleteConfirm,
    refreshSpace,
    handleRemoveMember,
    handleUpdateRole,
    handleDeleteSpace,
    handleRemoveGroupAccess,
  } = useSpaceDetail(id);

  if (loading) return <LoadingState />;
  if (error || !space) return <ErrorState error={error || "Unknown error"} onBack={() => router.push("/admin/spaces")} />;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/50 bg-card/30 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-6">
          {/* Breadcrumb */}
          <button
            onClick={() => router.push("/admin/spaces")}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Spaces
          </button>

          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-lg border ${SPACE_TYPE_COLORS[space.type]}`}>
                {SPACE_TYPE_ICONS[space.type]}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">{space.name}</h1>
                <div className="flex items-center gap-3 mt-1">
                  <span className={`text-xs px-2 py-0.5 rounded border ${SPACE_TYPE_COLORS[space.type]}`}>
                    {space.type.toLowerCase()}
                  </span>
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    <span className="flex items-center gap-1">
                      <UserIcon className="w-3.5 h-3.5" />
                      {space.members.length} member{space.members.length !== 1 ? 's' : ''}
                    </span>
                    {space.groupAccess && space.groupAccess.length > 0 && (
                      <>
                        <span className="text-border">&bull;</span>
                        <span className="flex items-center gap-1 text-primary">
                          <Users className="w-3.5 h-3.5" />
                          {space.groupAccess.length} group{space.groupAccess.length !== 1 ? 's' : ''}
                        </span>
                      </>
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-6">
            <button
              onClick={() => setActiveTab("members")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === "members"
                ? "bg-primary/20 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
            >
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Members
              </div>
            </button>
            <button
              onClick={() => setActiveTab("settings")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === "settings"
                ? "bg-primary/20 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
            >
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Settings
              </div>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Members Tab */}
        {activeTab === "members" && (
          <div className="space-y-8">
            {/* Direct Members Section */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-foreground">Direct Members</h2>
                <button
                  onClick={() => setShowAddMemberModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-foreground rounded-lg transition-colors"
                >
                  <UserPlus className="w-4 h-4" />
                  Add Member
                </button>
              </div>

              <div className="bg-card/50 border border-border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted/30 border-b border-border">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                        Member
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                        Role
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                        Added
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {space.members.map((member) => (
                      <MemberRow
                        key={member.userId}
                        member={member}
                        isCreator={space.createdBy === member.userId}
                        onUpdateRole={handleUpdateRole}
                        onRemove={handleRemoveMember}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Group Access Section */}
            {space.groupAccess && space.groupAccess.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Users className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-semibold text-foreground">Groups with Access</h2>
                  <span className="ml-2 px-2 py-0.5 rounded-full bg-primary/20 text-primary text-xs font-medium">
                    {space.groupAccess.length} group{space.groupAccess.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  All members of these groups automatically have access to this space.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {space.groupAccess.map((group) => (
                    <div
                      key={group.groupId}
                      className="bg-card/50 border border-primary/30 rounded-lg p-4 hover:border-primary/50 transition-colors group/card"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <Users className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-medium text-foreground">{group.groupName}</h3>
                            <p className="text-xs text-muted-foreground">
                              Added {new Date(group.grantedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveGroupAccess(group.groupId)}
                          className="p-1.5 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover/card:opacity-100"
                          title="Remove group access"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === "settings" && (
          <div className="space-y-6">
            {/* Description */}
            <div className="bg-card/50 border border-border rounded-lg p-6">
              <h3 className="text-lg font-medium text-foreground mb-4">Description</h3>
              <p className="text-muted-foreground">
                {space.description || "No description provided."}
              </p>
            </div>

            {/* Danger Zone */}
            <div className="bg-red-500/5 border border-red-500/30 rounded-lg p-6">
              <h3 className="text-lg font-medium text-red-400 mb-2">Danger Zone</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Deleting this space will remove all members and make any dashboards in this space floating.
              </p>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete Space
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <AddMemberModal
        isOpen={showAddMemberModal}
        spaceId={space.id}
        existingMemberIds={space.members.map((m) => m.userId)}
        existingGroupIds={space.groupAccess?.map((g) => g.groupId) || []}
        onClose={() => setShowAddMemberModal(false)}
        onSuccess={refreshSpace}
      />

      <DeleteConfirmModal
        isOpen={showDeleteConfirm}
        spaceName={space.name}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteSpace}
      />
    </div>
  );
}
