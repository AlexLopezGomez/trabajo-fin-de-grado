'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { DashboardHeader } from '@/components/dashboard-header';
import { DashboardGrid } from '@/components/dashboard/dashboard-grid';
import { SaveWidgetDialog } from '@/components/dashboard/save-widget-dialog';
import { ShareDashboardModal } from '@/components/dashboard/share-modal';
import type { QueryResult } from '@/app/actions/query-assistant';
import type { DashboardWithWidgets } from '@/types/dashboard';

import { useDashboardDetail } from './hooks/useDashboardDetail';
import { useDashboardSettings } from './hooks/useDashboardSettings';
import { useWidgetPolling } from './hooks/useWidgetPolling';

import { DashboardPageHeader } from './components/DashboardPageHeader';
import { DashboardStatsBar } from './components/DashboardStatsBar';
import { QueryBuilderModal } from './components/QueryBuilderModal';
import { DashboardSettingsModal } from './components/DashboardSettingsModal';
import { exportMergedCSV, exportZipCSV } from '@/lib/utils/export';

interface DashboardDetailClientProps {
  dashboardId: string;
  userId: string;
  initialData: DashboardWithWidgets;
}

export default function DashboardDetailClient({
  dashboardId,
  userId,
  initialData,
}: DashboardDetailClientProps) {
  const searchParams = useSearchParams();

  const fromSource = searchParams.get('from');
  const spaceId = searchParams.get('spaceId');
  const spaceName = searchParams.get('spaceName');

  const backUrl = fromSource === 'space' && spaceId
    ? `/spaces/${spaceId}`
    : '/dashboards';

  const backLabel = fromSource === 'space' && spaceName
    ? decodeURIComponent(spaceName)
    : 'Dashboards';

  const {
    dashboardData,
    isRefreshing,
    loadDashboard,
    refreshAllWidgets,
    handleWidgetDelete,
    handleWidgetRefresh,
    updateDashboardState,
    setDashboardData,
  } = useDashboardDetail(dashboardId, initialData);

  const {
    editName,
    editDescription,
    editIsPublic,
    setEditName,
    setEditDescription,
    setEditIsPublic,
    isPending,
    initializeSettings,
    saveDashboardSettings,
    deleteDashboard,
  } = useDashboardSettings(dashboardId, updateDashboardState);

  useWidgetPolling(dashboardId, dashboardData, setDashboardData);

  const [showQueryBuilder, setShowQueryBuilder] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [pendingQueryResult, setPendingQueryResult] = useState<QueryResult | null>(null);

  useEffect(() => {
    if (dashboardData) {
      initializeSettings(dashboardData.dashboard);
    }
  }, [dashboardData?.dashboard.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleQueryResult = (result: QueryResult) => {
    if (result.success) {
      setPendingQueryResult(result);
      setSaveDialogOpen(true);
    }
  };

  const handleWidgetSaved = () => {
    setSaveDialogOpen(false);
    setPendingQueryResult(null);
    setShowQueryBuilder(false);
    loadDashboard();
  };

  const handleSaveSettings = async () => {
    try {
      await saveDashboardSettings();
      setShowSettings(false);
    } catch {
      // Error logged in hook
    }
  };

  const handleDeleteDashboard = async () => {
    try {
      await deleteDashboard();
    } catch {
      // Error logged in hook
    }
  };

  const handleExportAll = async (mode: 'merged' | 'zip') => {
    if (!dashboardData) return;
    const widgetsWithData = dashboardData.widgets
      .filter(w => w.data.length > 0)
      .map(w => ({ name: w.name, data: w.data }));
    if (widgetsWithData.length === 0) return;

    if (mode === 'merged') {
      exportMergedCSV(widgetsWithData, dashboardData.dashboard.name);
    } else {
      await exportZipCSV(widgetsWithData, dashboardData.dashboard.name);
    }
  };

  if (!dashboardData) return null;

  const { dashboard, widgets } = dashboardData;
  const isOwner = dashboard.ownerId === userId;

  return (
    <div className="min-h-screen bg-background">
      <div className="fixed inset-0 bg-grid-pattern opacity-30 pointer-events-none" />
      <div className="fixed inset-0 bg-radial-glow pointer-events-none" />
      <div className="fixed inset-0 bg-radial-glow-amber pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="pt-8 pb-6">
          <DashboardHeader />
        </div>

        <DashboardPageHeader
          dashboard={dashboard}
          isOwner={isOwner}
          isRefreshing={isRefreshing}
          backUrl={backUrl}
          backLabel={backLabel}
          widgetCount={widgets.length}
          onRefreshAll={refreshAllWidgets}
          onAddWidget={() => setShowQueryBuilder(true)}
          onOpenSettings={() => setShowSettings(true)}
          onExportAll={handleExportAll}
          onShare={() => setShowShareModal(true)}
        />

        <DashboardStatsBar
          lastUpdated={dashboard.updatedAt}
          widgetCount={widgets.length}
        />

        <DashboardGrid
          widgets={widgets}
          onAddWidget={isOwner ? () => setShowQueryBuilder(true) : undefined}
          onWidgetDelete={handleWidgetDelete}
          onWidgetRefresh={handleWidgetRefresh}
        />

        <QueryBuilderModal
          isOpen={showQueryBuilder}
          onClose={() => setShowQueryBuilder(false)}
          onQueryResult={handleQueryResult}
        />

        {pendingQueryResult && (
          <SaveWidgetDialog
            isOpen={saveDialogOpen}
            onClose={() => {
              setSaveDialogOpen(false);
              setPendingQueryResult(null);
            }}
            queryResult={{
              collection: pendingQueryResult.collection,
              pipeline: pendingQueryResult.pipeline,
              visualization: pendingQueryResult.suggestedVisualization as 'table' | 'bar-chart' | 'line-chart' | 'pie-chart' | 'area-chart' | 'metric-card',
              originalQuestion: '',
            }}
            onSaved={handleWidgetSaved}
          />
        )}

        <DashboardSettingsModal
          isOpen={showSettings}
          name={editName}
          description={editDescription}
          isPublic={editIsPublic}
          isPending={isPending}
          onClose={() => setShowSettings(false)}
          onNameChange={setEditName}
          onDescriptionChange={setEditDescription}
          onIsPublicChange={setEditIsPublic}
          onSave={handleSaveSettings}
          onDelete={handleDeleteDashboard}
        />

        {showShareModal && (
          <ShareDashboardModal
            dashboardId={dashboardId}
            onClose={() => setShowShareModal(false)}
            onUpdate={loadDashboard}
          />
        )}
      </div>
    </div>
  );
}
