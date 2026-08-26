'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/common";

interface AdminNavProps {
    isAdmin: boolean;
    isSupervisor: boolean;
}

export function AdminNav({ isAdmin, isSupervisor }: AdminNavProps) {
    const pathname = usePathname();

    const isActive = (path: string) => {
        if (path === '/admin') return pathname === '/admin';
        return pathname.startsWith(path);
    };

    const getLinkClasses = (path: string) => {
        return cn(
            "px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200",
            isActive(path)
                ? "bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20"
                : "text-muted-foreground hover:text-white hover:bg-white/5 border border-transparent"
        );
    };

    return (
        <nav className="flex items-center gap-4 text-sm">
            <Link className={getLinkClasses("/admin")} href="/admin">
                Panel
            </Link>

            {isAdmin && (
                <>
                    <Link className={getLinkClasses("/admin/users")} href="/admin/users">
                        Users
                    </Link>
                    <Link className={getLinkClasses("/admin/groups")} href="/admin/groups">
                        Groups
                    </Link>
                    <Link className={getLinkClasses("/admin/roles")} href="/admin/roles">
                        Roles
                    </Link>
                    <Link className={getLinkClasses("/admin/spaces")} href="/admin/spaces">
                        Spaces
                    </Link>
                </>
            )}

            {(isAdmin || isSupervisor) && (
                <>
                    <Link className={getLinkClasses("/admin/approvals")} href="/admin/approvals">
                        Approvals
                    </Link>
                    <Link className={getLinkClasses("/admin/query-analytics")} href="/admin/query-analytics">
                        Query Analytics
                    </Link>
                </>
            )}
        </nav>
    );
}
