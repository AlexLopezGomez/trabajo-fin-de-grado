import {
    FolderOpen,
    Users,
    Building2,
    Briefcase,
    UserCircle,
    type LucideIcon,
} from 'lucide-react';

/**
 * Space type icon mapping
 */
export const SPACE_TYPE_ICONS: Record<string, LucideIcon> = {
    TEAM: Users,
    PROJECT: Briefcase,
    PERSONAL: UserCircle,
};

/**
 * Space type gradient color classes
 */
export const SPACE_TYPE_COLORS: Record<string, string> = {
    TEAM: 'from-blue-500/10 to-blue-600/10 border-blue-500/20',
    PROJECT: 'from-purple-500/10 to-purple-600/10 border-purple-500/20',
    PERSONAL: 'from-amber-500/10 to-amber-600/10 border-amber-500/20',
};

/**
 * Space type text color classes
 */
export const SPACE_TYPE_TEXT_COLORS: Record<string, string> = {
    TEAM: 'text-blue-400',
    PROJECT: 'text-purple-400',
    PERSONAL: 'text-amber-400',
};

/**
 * Get icon component for a space type
 */
export function getSpaceIcon(type: string): LucideIcon {
    return SPACE_TYPE_ICONS[type] || FolderOpen;
}

/**
 * Get gradient color classes for a space type
 */
export function getSpaceColors(type: string): string {
    return SPACE_TYPE_COLORS[type] || 'from-zinc-800/50 to-zinc-900/50 border-zinc-700';
}

/**
 * Get text color class for a space type
 */
export function getSpaceTextColor(type: string): string {
    return SPACE_TYPE_TEXT_COLORS[type] || 'text-zinc-400';
}
