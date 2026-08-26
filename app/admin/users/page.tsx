import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getUsers, getGroupsForFilter } from "@/app/actions/admin/users";
import { getPermissionSets } from "@/app/actions/admin/roles/index";
import AdminUsersClient from "./AdminUsersClient";

function UsersTableSkeleton() {
  return (
    <div className="min-h-screen bg-background animate-pulse">
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="h-8 w-32 bg-zinc-800 rounded mb-2" />
            <div className="h-4 w-56 bg-zinc-800/60 rounded" />
          </div>
          <div className="h-10 w-32 bg-zinc-800/40 rounded-lg" />
        </div>
        <div className="flex gap-3 mb-6">
          <div className="h-9 w-64 bg-zinc-800/40 rounded-lg" />
          <div className="h-9 w-32 bg-zinc-800/40 rounded-lg" />
          <div className="h-9 w-32 bg-zinc-800/40 rounded-lg" />
        </div>
        <div className="border border-zinc-800 rounded-xl overflow-hidden">
          <div className="h-12 bg-zinc-800/40 border-b border-zinc-800" />
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <div key={i} className="h-16 border-b border-zinc-800/50 flex items-center gap-4 px-4">
              <div className="h-8 w-8 bg-zinc-800/60 rounded-full" />
              <div className="h-4 w-40 bg-zinc-800/40 rounded" />
              <div className="h-4 w-48 bg-zinc-800/30 rounded ml-auto" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

async function UsersContent() {
  const [usersResponse, groupsResponse, rolesResponse] = await Promise.all([
    getUsers({}),
    getGroupsForFilter(),
    getPermissionSets(),
  ]);

  const users = usersResponse.success && usersResponse.data
    ? usersResponse.data.users
    : [];

  const groups = groupsResponse.success && groupsResponse.data
    ? groupsResponse.data
    : [];

  const roles = rolesResponse.success && rolesResponse.data
    ? rolesResponse.data.roles
    : [];

  return (
    <AdminUsersClient
      initialUsers={users}
      initialGroups={groups}
      initialRoles={roles}
    />
  );
}

export default async function AdminUsersPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <Suspense fallback={<UsersTableSkeleton />}>
      <UsersContent />
    </Suspense>
  );
}
