'use client';

import { useState } from 'react';
import { LayoutDashboard, Plus, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils/common';
import type { SpaceSummary } from '@/types/spaces';

export interface CreateDashboardData {
    name: string;
    description?: string;
    spaceId?: string;
}

interface CreateDashboardDialogProps {
    isOpen: boolean;
    spaces: SpaceSummary[];
    isCreating: boolean;
    onClose: () => void;
    onCreate: (data: CreateDashboardData) => void;
}

/**
 * Create Dashboard Dialog Component
 * Modal for creating new dashboards with name, description, and space selection
 */
export function CreateDashboardDialog({
    isOpen,
    spaces,
    isCreating,
    onClose,
    onCreate,
}: CreateDashboardDialogProps) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [spaceId, setSpaceId] = useState('');

    if (!isOpen) return null;

    const handleCreate = () => {
        if (!name.trim()) return;

        onCreate({
            name: name.trim(),
            description: description.trim() || undefined,
            spaceId: spaceId || undefined,
        });

        // Reset form
        setName('');
        setDescription('');
        setSpaceId('');
    };

    const handleClose = () => {
        setName('');
        setDescription('');
        setSpaceId('');
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={handleClose}
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
                        <div className="flex items-center justify-center w-10 h-10 bg-primary/10 border border-primary/20 rounded-xl">
                            <LayoutDashboard className="w-5 h-5 text-primary" />
                        </div>
                        <h2 className="text-lg font-semibold text-white">Nuevo Dashboard</h2>
                    </div>
                    <button
                        onClick={handleClose}
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
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Ej: Dashboard de Ventas"
                            className={cn(
                                'w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700 rounded-xl',
                                'text-white placeholder:text-zinc-500',
                                'focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20',
                                'transition-all duration-200'
                            )}
                            autoFocus
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-300">
                            Descripción (opcional)
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="¿Qué tipo de métricas mostrará?"
                            rows={3}
                            className={cn(
                                'w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700 rounded-xl',
                                'text-white placeholder:text-zinc-500',
                                'focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20',
                                'transition-all duration-200 resize-none'
                            )}
                        />
                    </div>

                    {spaces.length > 0 && (
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-300">
                                Espacio (opcional)
                            </label>
                            <select
                                value={spaceId}
                                onChange={(e) => setSpaceId(e.target.value)}
                                className={cn(
                                    'w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700 rounded-xl',
                                    'text-white',
                                    'focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20',
                                    'transition-all duration-200'
                                )}
                            >
                                <option value="">🌐 Sin espacio (flotante)</option>
                                {spaces.map((space) => (
                                    <option key={space.id} value={space.id}>
                                        📁 {space.name}
                                    </option>
                                ))}
                            </select>
                            <p className="text-xs text-zinc-500">
                                Los dashboards pueden existir independientemente o dentro de un espacio para mejor organización.
                            </p>
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-800">
                    <button
                        onClick={handleClose}
                        className="px-4 py-2.5 text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleCreate}
                        disabled={isCreating || !name.trim()}
                        className={cn(
                            'flex items-center gap-2 px-5 py-2.5 text-sm font-medium',
                            'bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg',
                            'transition-colors duration-200',
                            'disabled:opacity-50 disabled:cursor-not-allowed'
                        )}
                    >
                        {isCreating ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Plus className="w-4 h-4" />
                        )}
                        Crear Dashboard
                    </button>
                </div>
            </div>
        </div>
    );
}
