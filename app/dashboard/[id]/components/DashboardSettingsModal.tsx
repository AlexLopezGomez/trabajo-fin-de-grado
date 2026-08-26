'use client';

import { X, Settings, Trash2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils/common';

interface DashboardSettingsModalProps {
    isOpen: boolean;
    name: string;
    description: string;
    isPublic: boolean;
    isPending: boolean;
    onClose: () => void;
    onNameChange: (value: string) => void;
    onDescriptionChange: (value: string) => void;
    onIsPublicChange: (value: boolean) => void;
    onSave: () => void;
    onDelete: () => void;
}

/**
 * Dashboard Settings Modal Component
 * Modal for editing dashboard name, description, and visibility
 */
export function DashboardSettingsModal({
    isOpen,
    name,
    description,
    isPublic,
    isPending,
    onClose,
    onNameChange,
    onDescriptionChange,
    onIsPublicChange,
    onSave,
    onDelete,
}: DashboardSettingsModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />
            <div
                className={cn(
                    'relative z-10 w-full max-w-md mx-4',
                    'bg-zinc-900 border border-zinc-800 rounded-2xl',
                    'shadow-2xl shadow-black/50',
                    'animate-in fade-in-0 zoom-in-95 duration-200'
                )}
            >
                <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 bg-zinc-800 rounded-xl">
                            <Settings className="w-5 h-5 text-zinc-400" />
                        </div>
                        <h2 className="text-lg font-semibold text-white">Configuración</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="px-6 py-5 space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-300">Nombre</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => onNameChange(e.target.value)}
                            className={cn(
                                'w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700 rounded-xl',
                                'text-white placeholder:text-zinc-500',
                                'focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20'
                            )}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-300">
                            Descripción
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => onDescriptionChange(e.target.value)}
                            rows={3}
                            className={cn(
                                'w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700 rounded-xl',
                                'text-white placeholder:text-zinc-500',
                                'focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20',
                                'resize-none'
                            )}
                        />
                    </div>

                    <div className="flex items-center justify-between py-3">
                        <div>
                            <p className="text-sm font-medium text-zinc-300">Dashboard Público</p>
                            <p className="text-xs text-zinc-500">Otros usuarios podrán verlo</p>
                        </div>
                        <button
                            onClick={() => onIsPublicChange(!isPublic)}
                            className={cn(
                                'w-12 h-6 rounded-full transition-colors duration-200',
                                isPublic ? 'bg-primary' : 'bg-zinc-700'
                            )}
                        >
                            <div
                                className={cn(
                                    'w-5 h-5 bg-white rounded-full shadow transition-transform duration-200',
                                    isPublic ? 'translate-x-6' : 'translate-x-0.5'
                                )}
                            />
                        </button>
                    </div>

                    <div className="pt-4 border-t border-zinc-800">
                        <button
                            onClick={onDelete}
                            className="flex items-center gap-2 w-full px-4 py-3 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-colors"
                        >
                            <Trash2 className="w-4 h-4" />
                            Eliminar Dashboard
                        </button>
                    </div>
                </div>

                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-800">
                    <button
                        onClick={onClose}
                        className="px-4 py-2.5 text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={onSave}
                        disabled={isPending}
                        className={cn(
                            'flex items-center gap-2 px-5 py-2.5 text-sm font-medium',
                            'bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg',
                            'transition-colors duration-200',
                            'disabled:opacity-50'
                        )}
                    >
                        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                        Guardar Cambios
                    </button>
                </div>
            </div>
        </div>
    );
}
