'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
    ArrowLeft,
    RefreshCw,
    Plus,
    Settings,
    Globe,
    Lock,
    Download,
    ChevronDown,
    Share2,
} from 'lucide-react';
import { cn } from '@/lib/utils/common';
import type { DashboardWithWidgets } from '@/types/dashboard';

interface DashboardPageHeaderProps {
    dashboard: DashboardWithWidgets['dashboard'];
    isOwner: boolean;
    isRefreshing: boolean;
    backUrl: string;
    backLabel: string;
    widgetCount: number;
    onRefreshAll: () => void;
    onAddWidget: () => void;
    onOpenSettings: () => void;
    onExportAll?: (mode: 'merged' | 'zip') => void;
    onShare?: () => void;
}

/**
 * Dashboard Page Header Component
 * Displays title, description, visibility badge, and action buttons
 */
export function DashboardPageHeader({
    dashboard,
    isOwner,
    isRefreshing,
    backUrl,
    backLabel,
    widgetCount,
    onRefreshAll,
    onAddWidget,
    onOpenSettings,
    onExportAll,
    onShare,
}: DashboardPageHeaderProps) {
    const [showExportMenu, setShowExportMenu] = useState(false);
    return (
        <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
                <Link
                    href={backUrl}
                    className="flex items-center gap-2 p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors group"
                    title={`Volver a ${backLabel}`}
                >
                    <ArrowLeft className="w-5 h-5" />
                    <span className="text-sm font-medium hidden sm:inline">{backLabel}</span>
                </Link>
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold text-white">{dashboard.name}</h1>
                        {dashboard.isPublic ? (
                            <span className="flex items-center gap-1 px-2 py-1 text-xs bg-emerald-500/10 text-emerald-400 rounded-md">
                                <Globe className="w-3 h-3" />
                                Público
                            </span>
                        ) : (
                            <span className="flex items-center gap-1 px-2 py-1 text-xs bg-zinc-700/50 text-zinc-400 rounded-md">
                                <Lock className="w-3 h-3" />
                                Privado
                            </span>
                        )}
                    </div>
                    {dashboard.description && (
                        <p className="text-zinc-500 mt-1">{dashboard.description}</p>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-2">
                <button
                    onClick={onRefreshAll}
                    disabled={isRefreshing}
                    className={cn(
                        'flex items-center gap-2 px-4 py-2.5',
                        'text-zinc-400 hover:text-white hover:bg-zinc-800',
                        'rounded-lg transition-colors duration-200',
                        'disabled:opacity-50'
                    )}
                >
                    <RefreshCw className={cn('w-4 h-4', isRefreshing && 'animate-spin')} />
                    Actualizar todo
                </button>

                {isOwner && onShare && (
                    <button
                        onClick={onShare}
                        className={cn(
                            'flex items-center gap-2 px-4 py-2.5',
                            'text-zinc-400 hover:text-white hover:bg-zinc-800',
                            'rounded-lg transition-colors duration-200'
                        )}
                    >
                        <Share2 className="w-4 h-4" />
                        Compartir
                    </button>
                )}

                {widgetCount > 0 && onExportAll && (
                    <div className="relative">
                        <button
                            onClick={() => setShowExportMenu(!showExportMenu)}
                            className={cn(
                                'flex items-center gap-2 px-4 py-2.5',
                                'text-zinc-400 hover:text-white hover:bg-zinc-800',
                                'rounded-lg transition-colors duration-200'
                            )}
                        >
                            <Download className="w-4 h-4" />
                            Exportar
                            <ChevronDown className="w-3 h-3" />
                        </button>
                        {showExportMenu && (
                            <>
                                <div className="fixed inset-0 z-10" onClick={() => setShowExportMenu(false)} />
                                <div className={cn(
                                    'absolute right-0 top-full mt-1 z-20',
                                    'w-48 py-1',
                                    'bg-zinc-900 border border-zinc-800 rounded-lg',
                                    'shadow-xl shadow-black/40'
                                )}>
                                    <button
                                        onClick={() => { onExportAll('merged'); setShowExportMenu(false); }}
                                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-zinc-300 hover:text-white hover:bg-zinc-800"
                                    >
                                        CSV Combinado
                                    </button>
                                    <button
                                        onClick={() => { onExportAll('zip'); setShowExportMenu(false); }}
                                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-zinc-300 hover:text-white hover:bg-zinc-800"
                                    >
                                        ZIP (CSVs separados)
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {isOwner && (
                    <>
                        <button
                            onClick={onAddWidget}
                            className={cn(
                                'flex items-center gap-2 px-4 py-2.5',
                                'bg-primary hover:bg-primary/90 text-primary-foreground',
                                'rounded-lg font-medium transition-colors duration-200'
                            )}
                        >
                            <Plus className="w-4 h-4" />
                            Añadir Widget
                        </button>

                        <button
                            onClick={onOpenSettings}
                            className="p-2.5 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                        >
                            <Settings className="w-5 h-5" />
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
