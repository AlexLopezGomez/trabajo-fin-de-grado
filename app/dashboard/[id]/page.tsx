import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { getDashboardWithWidgets } from '@/app/actions/dashboard/index';
import DashboardDetailClient from './DashboardDetailClient';

interface DashboardPageProps {
  params: Promise<{ id: string }>;
}

function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-background animate-pulse">
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="h-8 w-64 bg-zinc-800 rounded mb-2" />
        <div className="h-4 w-96 bg-zinc-800/60 rounded mb-8" />
        <div className="flex gap-4 mb-8">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-10 w-24 bg-zinc-800/40 rounded-lg" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-64 bg-zinc-800/30 rounded-xl border border-zinc-800" />
          ))}
        </div>
      </div>
    </div>
  );
}

async function DashboardContent({
  dashboardId,
  userId,
}: {
  dashboardId: string;
  userId: string;
}) {
  const dashboardData = await getDashboardWithWidgets(dashboardId);

  if (!dashboardData) {
    redirect('/dashboards');
  }

  return (
    <DashboardDetailClient
      dashboardId={dashboardId}
      userId={userId}
      initialData={dashboardData}
    />
  );
}

export default async function DashboardPage({ params }: DashboardPageProps) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const { id: dashboardId } = await params;

  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent dashboardId={dashboardId} userId={session.user.id} />
    </Suspense>
  );
}
