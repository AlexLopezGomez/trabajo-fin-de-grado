"use client";

import { useAdminGroups } from "./hooks/useAdminGroups";
import { useCreateGroup } from "./hooks/useCreateGroup";
import { GroupsHeader } from "./components/GroupsHeader";
import { GroupsSearch } from "./components/GroupsSearch";
import { GroupsTable } from "./components/GroupsTable";
import { CreateGroupModal } from "./components/CreateGroupModal";
import { LoadingGroups, ErrorGroups } from "./components/GroupsStates";
import type { Group } from "@/types/rbac";

interface AdminGroupsClientProps {
  initialGroups: Group[];
  initialTotal: number;
}

export default function AdminGroupsClient({
  initialGroups,
  initialTotal,
}: AdminGroupsClientProps) {
  const {
    groups,
    loading,
    error,
    search,
    page,
    total,
    totalPages,
    refreshList,
    setSearch,
    setPage,
  } = useAdminGroups(50, { groups: initialGroups, total: initialTotal });

  const {
    showCreate,
    creating,
    error: createError,
    newName,
    newDesc,
    setShowCreate,
    setNewName,
    setNewDesc,
    handleCreateGroup,
    openModal,
  } = useCreateGroup(refreshList);

  return (
    <div className="min-h-screen bg-background">
      <GroupsHeader total={total} onCreate={openModal} />

      <div className="max-w-7xl mx-auto px-6 py-8">
        <GroupsSearch value={search} onChange={setSearch} />

        {loading ? (
          <LoadingGroups />
        ) : error ? (
          <ErrorGroups error={error} />
        ) : (
          <GroupsTable
            groups={groups}
            search={search}
            page={page}
            pageSize={50}
            total={total}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        )}
      </div>

      <CreateGroupModal
        show={showCreate}
        creating={creating}
        error={createError}
        newName={newName}
        newDesc={newDesc}
        onClose={() => setShowCreate(false)}
        onNameChange={setNewName}
        onDescChange={setNewDesc}
        onCreate={handleCreateGroup}
      />
    </div>
  );
}
