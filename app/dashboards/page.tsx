import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { getAccessibleDashboardsAction } from '@/app/actions/spaces/index';
import { getMySpaces } from '@/app/actions/spaces/index';
import type { DashboardSummary } from '@/types/dashboard';
import type { DashboardWithAccess } from '@/types/spaces';
import DashboardsClient from './DashboardsClient';

function mapToDashboardSummary(d: DashboardWithAccess): DashboardSummary {
  return {
    id: d.id,
    name: d.name,
    description: d.description,
    ownerId: d.createdBy,
    isPublic: d.sharing?.mode === 'PUBLIC',
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
    widgetCount: d.widgetCount || 0,
    spaceId: d.spaceId,
    spaceName: d.spaceName,
    sharingMode: d.sharing?.mode,
  };
}

function DashboardsListSkeleton() {
  return (
    <div className="min-h-screen bg-background animate-pulse">
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="h-8 w-48 bg-zinc-800 rounded mb-2" />
            <div className="h-4 w-72 bg-zinc-800/60 rounded" />
          </div>
          <div className="h-10 w-36 bg-zinc-800/40 rounded-lg" />
        </div>
        <div className="flex gap-3 mb-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-9 w-28 bg-zinc-800/40 rounded-lg" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-48 bg-zinc-800/30 rounded-xl border border-zinc-800" />
          ))}
        </div>
      </div>
    </div>
  );
}

async function DashboardsContent({
  userId,
  userRole,
}: {
  userId: string;
  userRole: string;
}) {
  const [dashboardsResult, spacesResult] = await Promise.all([
    getAccessibleDashboardsAction({}, 1, 100),
    getMySpaces({}),
  ]);

  const dashboards = dashboardsResult.success && dashboardsResult.data
    ? dashboardsResult.data.dashboards.map(mapToDashboardSummary)
    : [];

  const spaces = spacesResult.success && spacesResult.data
    ? spacesResult.data.spaces
    : [];

  return (
    <DashboardsClient
      initialDashboards={dashboards}
      initialSpaces={spaces}
      userId={userId}
      userRole={userRole}
    />
  );
}

export default async function DashboardsPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  return (
    <Suspense fallback={<DashboardsListSkeleton />}>
      <DashboardsContent userId={session.user.id} userRole={session.user.role} />
    </Suspense>
  );
}
