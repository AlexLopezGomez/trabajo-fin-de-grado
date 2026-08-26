'use client';

/**
 * Spaces List Page (User View)
 * Shows all spaces accessible to the current user
 * 
 * Refactored for scalability with modular components and reused hooks.
 */

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { DashboardHeader } from '@/components/dashboard-header';

// Reuse hook from dashboards page!
import { useSpaces } from '@/app/dashboards/hooks/useSpaces';

// Components
import { SpaceCard } from './components/SpaceCard';
import { EmptySpacesState } from './components/EmptySpacesState';

export default function SpacesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Reuse the spaces hook from dashboards - demonstrating hook reusability!
  const { spaces, isLoading } = useSpaces();

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

  return (
    <div
      className="min-h-screen"
      style={{
        background:
          'radial-gradient(ellipse 90% 50% at 50% 0%, hsl(0 0% 9%), hsl(0 0% 4%) 65%)',
      }}
    >
      {/* Background Effects */}
      <div className="fixed inset-0 bg-grid-pattern opacity-30 pointer-events-none" />
      <div className="fixed inset-0 bg-radial-glow pointer-events-none" />
      <div className="fixed inset-0 bg-radial-glow-amber pointer-events-none" />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="pt-8 pb-6">
          <DashboardHeader />
        </div>

        {/* Page Header */}
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboards"
              className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">Espacios</h1>
              <p className="text-zinc-500/80 font-light mt-1.5">
                Organiza tus dashboards en espacios colaborativos
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : spaces.length === 0 ? (
          <EmptySpacesState isAdmin={session.user.role === 'admin'} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {spaces.map((space) => (
              <SpaceCard key={space.id} space={space} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
