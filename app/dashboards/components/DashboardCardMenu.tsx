'use client';

import { MoreVertical, Share2, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils/common';

interface DashboardCardMenuProps {
    dashboardId: string;
    isOpen: boolean;
    onToggle: () => void;
    onShare: () => void;
    onDelete: () => void;
    onClose: () => void;
}

/**
 * Dashboard Card Menu Component
 * Dropdown menu for dashboard actions (share, delete)
 */
export function DashboardCardMenu({
    dashboardId,
    isOpen,
    onToggle,
    onShare,
    onDelete,
    onClose,
}: DashboardCardMenuProps) {
    return (
        <div className="absolute top-4 right-4">
            <button
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onToggle();
                }}
                className={cn(
                    'p-1.5 rounded-lg transition-colors',
                    'text-zinc-500 hover:text-white hover:bg-zinc-800',
                    'opacity-0 group-hover:opacity-100'
                )}
            >
                <MoreVertical className="w-4 h-4" />
            </button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-10"
                        onClick={onClose}
                    />
                    <div
                        className={cn(
                            'absolute right-0 top-full mt-1 z-20',
                            'w-40 py-1',
                            'bg-zinc-900 border border-zinc-800 rounded-lg',
                            'shadow-xl shadow-black/40',
                            'animate-in fade-in-0 slide-in-from-top-2 duration-150'
                        )}
                    >
                        <button
                            onClick={() => {
                                onShare();
                                onClose();
                            }}
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-zinc-300 hover:text-white hover:bg-zinc-800"
                        >
                            <Share2 className="w-4 h-4" />
                            Compartir
                        </button>
                        <button
                            onClick={onDelete}
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-zinc-800"
                        >
                            <Trash2 className="w-4 h-4" />
                            Eliminar
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
