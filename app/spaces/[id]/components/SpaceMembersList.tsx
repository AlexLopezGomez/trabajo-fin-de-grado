'use client';

import { Users } from 'lucide-react';
import type { Space } from '@/types/spaces';

interface SpaceMembersListProps {
    members: NonNullable<Space['members']>;
}

/**
 * Space Members List Component
 * Displays grid of space members with their roles
 */
export function SpaceMembersList({ members }: SpaceMembersListProps) {
    if (!members || members.length === 0) return null;

    return (
        <div className="mt-12">
            <h2 className="text-lg font-semibold text-white mb-4">
                Miembros ({members.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {members.map((member) => (
                    <div
                        key={member.userId}
                        className="flex items-center gap-3 p-4 bg-zinc-900/60 border border-zinc-800 rounded-lg"
                    >
                        <div className="flex items-center justify-center w-10 h-10 bg-zinc-800 rounded-full">
                            <Users className="w-5 h-5 text-zinc-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">
                                {member.userName || member.userId}
                            </p>
                            <p className="text-xs text-zinc-500 uppercase">
                                {member.role}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
