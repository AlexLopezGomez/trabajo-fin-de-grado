'use client';

import { X, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils/common';
import { AIQueryBuilder } from '@/components/dashboard/ai-query-builder';
import type { QueryResult } from '@/app/actions/query-assistant';

interface QueryBuilderModalProps {
    isOpen: boolean;
    onClose: () => void;
    onQueryResult: (result: QueryResult) => void;
}

/**
 * Query Builder Modal Component
 * Modal for creating new widgets via AI query builder
 */
export function QueryBuilderModal({
    isOpen,
    onClose,
    onQueryResult,
}: QueryBuilderModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />
            <div className="relative min-h-screen flex items-start justify-center py-10 px-4">
                <div
                    className={cn(
                        'relative w-full max-w-4xl',
                        'bg-zinc-900 border border-zinc-800 rounded-2xl',
                        'shadow-2xl shadow-black/50',
                        'animate-in fade-in-0 slide-in-from-bottom-4 duration-300'
                    )}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
                        <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-10 h-10 bg-primary/10 border border-primary/20 rounded-xl">
                                <Sparkles className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-white">Nuevo Widget</h2>
                                <p className="text-sm text-zinc-500">Haz una consulta y guárdala como widget</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Query Builder */}
                    <div className="p-6">
                        <AIQueryBuilder
                            onQueryResult={onQueryResult}
                            showSaveButton={false}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
