'use client';

import Link from 'next/link';
import { FolderOpen } from 'lucide-react';

interface EmptySpacesStateProps {
    isAdmin: boolean;
}

/**
 * Empty Spaces State Component
 * Displays when user has no accessible spaces
 */
export function EmptySpacesState({ isAdmin }: EmptySpacesStateProps) {
    return (
        <div className="flex flex-col items-center justify-center py-20">
            <div className="flex items-center justify-center w-20 h-20 bg-zinc-800/50 rounded-2xl mb-6">
                <FolderOpen className="w-10 h-10 text-zinc-600" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
                Sin espacios
            </h3>
            <p className="text-zinc-500 text-center max-w-md mb-6">
                Los espacios te permiten organizar y compartir dashboards con tu equipo.
            </p>
            {isAdmin && (
                <Link
                    href="/admin/spaces"
                    className="px-5 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-medium transition-colors"
                >
                    Crear Espacio
                </Link>
            )}
        </div>
    );
}
