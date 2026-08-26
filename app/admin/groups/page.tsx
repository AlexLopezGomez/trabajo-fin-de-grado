import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getGroups } from "@/app/actions/admin/groups";
import AdminGroupsClient from "./AdminGroupsClient";

function GroupsTableSkeleton() {
  return (
    <div className="min-h-screen bg-background animate-pulse">
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="h-8 w-32 bg-zinc-800 rounded mb-2" />
            <div className="h-4 w-48 bg-zinc-800/60 rounded" />
          </div>
          <div className="h-10 w-36 bg-zinc-800/40 rounded-lg" />
        </div>
        <div className="h-9 w-64 bg-zinc-800/40 rounded-lg mb-6" />
        <div className="border border-zinc-800 rounded-xl overflow-hidden">
          <div className="h-12 bg-zinc-800/40 border-b border-zinc-800" />
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-16 border-b border-zinc-800/50 flex items-center gap-4 px-4">
              <div className="h-4 w-36 bg-zinc-800/40 rounded" />
              <div className="h-4 w-24 bg-zinc-800/30 rounded ml-auto" />
              <div className="h-4 w-16 bg-zinc-800/20 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

async function GroupsContent() {
  const response = await getGroups(undefined, 1, 50);

  const groups = response.success && response.data
    ? response.data.groups
    : [];

  const total = response.success && response.data
    ? response.data.pagination.total
    : 0;

  return (
    <AdminGroupsClient
      initialGroups={groups}
      initialTotal={total}
    />
  );
}

export default async function AdminGroupsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <Suspense fallback={<GroupsTableSkeleton />}>
      <GroupsContent />
    </Suspense>
  );
}
