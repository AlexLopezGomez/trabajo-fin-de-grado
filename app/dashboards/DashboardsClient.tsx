'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, Plus } from 'lucide-react';
import { cn } from '@/lib/utils/common';
import { DashboardHeader } from '@/components/dashboard-header';
import { ShareDashboardModal } from '@/components/dashboard/share-modal';
import {
  createDashboard as createDashboardAction,
  deleteDashboard as deleteDashboardAction,
} from '@/app/actions/dashboard/index';
import { getAccessibleDashboardsAction } from '@/app/actions/spaces/index';
import type { DashboardSummary } from '@/types/dashboard';
import type { DashboardWithAccess } from '@/types/spaces';
import type { SpaceSummary } from '@/types/spaces';
import { logger } from '@/lib/utils/logger';

import { useDashboardFilters } from './hooks/useDashboardFilters';
import { DashboardFilters } from './components/DashboardFilters';
import { EmptyState } from './components/EmptyState';
import { DashboardCard } from './components/DashboardCard';
import { CreateDashboardDialog } from './components/CreateDashboardDialog';

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

interface DashboardsClientProps {
  initialDashboards: DashboardSummary[];
  initialSpaces: SpaceSummary[];
  userId: string;
  userRole: string;
}

export default function DashboardsClient({
  initialDashboards,
  initialSpaces,
  userId,
  userRole,
}: DashboardsClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [dashboards, setDashboards] = useState<DashboardSummary[]>(initialDashboards);
  const spaces = initialSpaces;

  const {
    filterType,
    filterSpaceId,
    setFilterType,
    setFilterSpaceId,
    filteredDashboards,
  } = useDashboardFilters(dashboards, userId);

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState<string | null>(null);

  const loadDashboards = async () => {
    try {
      const result = await getAccessibleDashboardsAction({}, 1, 100);
      if (result.success && result.data) {
        setDashboards(result.data.dashboards.map(mapToDashboardSummary));
      }
    } catch (error) {
      logger.error('Failed to reload dashboards', error);
    }
  };

  const handleCreateDashboard = async (data: { name: string; description?: string; spaceId?: string }) => {
    return new Promise<void>((resolve, reject) => {
      startTransition(async () => {
        try {
          const dashboard = await createDashboardAction({
            name: data.name.trim(),
            description: data.description?.trim() || undefined,
            spaceId: data.spaceId || undefined,
          });
          setShowCreateDialog(false);
          router.push(`/dashboard/${dashboard.id}`);
          resolve();
        } catch (error) {
          logger.error('Failed to create dashboard', error);
          reject(error);
        }
      });
    });
  };

  const handleDeleteDashboard = async (dashboardId: string) => {
    if (!confirm('¿Estás seguro de eliminar este dashboard y todos sus widgets?')) return;

    startTransition(async () => {
      try {
        await deleteDashboardAction({ dashboardId });
        setDashboards((prev) => prev.filter((d) => d.id !== dashboardId));
      } catch (error) {
        logger.error('Failed to delete dashboard', error, { dashboardId });
      }
    });
  };

  return (
    <div
      className="min-h-screen"
      style={{
        background:
          'radial-gradient(ellipse 90% 50% at 50% 0%, hsl(0 0% 9%), hsl(0 0% 4%) 65%)',
      }}
    >
      <div className="fixed inset-0 bg-grid-pattern opacity-30 pointer-events-none" />
      <div className="fixed inset-0 bg-radial-glow pointer-events-none" />
      <div className="fixed inset-0 bg-radial-glow-amber pointer-events-none" />

      <div className="fixed top-1/3 -left-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none animate-pulse-slow" />
      <div className="fixed bottom-1/4 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl pointer-events-none animate-pulse-slow" style={{ animationDelay: '1s' }} />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="pt-8 pb-6">
          <DashboardHeader />
        </div>

        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-4">
            {userRole !== 'viewer' && (
              <Link
                href="/"
                className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
            )}
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">Mis Dashboards</h1>
              <p className="text-zinc-500/80 font-light mt-1.5">
                Gestiona tus dashboards y widgets guardados
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowCreateDialog(true)}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5',
              'bg-primary hover:bg-primary/90 text-primary-foreground',
              'rounded-xl font-medium transition-colors duration-200'
            )}
          >
            <Plus className="w-5 h-5" />
            Nuevo Dashboard
          </button>
        </div>

        <DashboardFilters
          filterType={filterType}
          filterSpaceId={filterSpaceId}
          spaces={spaces}
          onFilterTypeChange={setFilterType}
          onFilterSpaceIdChange={setFilterSpaceId}
        />

        {filteredDashboards.length === 0 ? (
          <EmptyState
            hasAnyDashboards={dashboards.length > 0}
            onCreateClick={() => setShowCreateDialog(true)}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDashboards.map((dashboard) => (
              <DashboardCard
                key={dashboard.id}
                dashboard={dashboard}
                isMenuOpen={activeMenu === dashboard.id}
                onMenuToggle={() => setActiveMenu(activeMenu === dashboard.id ? null : dashboard.id)}
                onMenuClose={() => setActiveMenu(null)}
                onDelete={handleDeleteDashboard}
                onShare={(id) => setShowShareModal(id)}
              />
            ))}
          </div>
        )}

        <CreateDashboardDialog
          isOpen={showCreateDialog}
          spaces={spaces}
          isCreating={isPending}
          onClose={() => setShowCreateDialog(false)}
          onCreate={handleCreateDashboard}
        />

        {showShareModal && (
          <ShareDashboardModal
            dashboardId={showShareModal}
            onClose={() => setShowShareModal(null)}
            onUpdate={loadDashboards}
          />
        )}
      </div>
    </div>
  );
}
