'use client';

/**
 * Space Detail Page (User View)
 * Shows dashboards within a space and basic space information
 * 
 * Refactored for scalability with custom hooks and modular components.
 */

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { DashboardHeader } from '@/components/dashboard-header';

// Custom Hook
import { useSpaceDetail } from './hooks/useSpaceDetail';

// Components
import { SpacePageHeader } from './components/SpacePageHeader';
import { SpaceDashboardCard } from './components/SpaceDashboardCard';
import { EmptySpaceDashboardsState } from './components/EmptySpaceDashboardsState';
import { SpaceMembersList } from './components/SpaceMembersList';
import { ErrorState } from './components/ErrorState';

export default function SpaceDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const spaceId = params.id as string;

  // Custom hook for space data management
  const { space, dashboards, isLoading, error } = useSpaceDetail(spaceId);

  // Redirect if unauthenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  // Loading state
  if (status === 'loading' || !session) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  // Error state
  if (error) {
    return <ErrorState message={error} />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Background Effects */}
      <div className="fixed inset-0 bg-grid-pattern opacity-30 pointer-events-none" />
      <div className="fixed inset-0 bg-radial-glow pointer-events-none" />
      <div className="fixed inset-0 bg-radial-glow-amber pointer-events-none" />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="pt-8 pb-6">
          <DashboardHeader />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : space ? (
          <>
            {/* Space Header */}
            <SpacePageHeader space={space} dashboardCount={dashboards.length} />

            {/* Dashboards Grid */}
            {dashboards.length === 0 ? (
              <EmptySpaceDashboardsState />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {dashboards.map((dashboard) => (
                  <SpaceDashboardCard
                    key={dashboard.id}
                    dashboard={dashboard}
                    spaceId={spaceId}
                    spaceName={space.name}
                  />
                ))}
              </div>
            )}

            {/* Members Section */}
            {space.members && <SpaceMembersList members={space.members} />}
          </>
        ) : null}
      </div>
    </div>
  );
}
