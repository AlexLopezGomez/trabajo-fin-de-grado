'use client';

import { LogOut, User, Shield, LayoutDashboard, Home, FolderOpen } from 'lucide-react';
import { cn } from '@/lib/utils/common';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { useSession } from 'next-auth/react';

interface DashboardHeaderProps {
  className?: string;
}

export function DashboardHeader({ className }: DashboardHeaderProps) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const displayName =
    session?.user?.name?.trim().toLowerCase() === "admin enterprise"
      ? "Admin"
      : (session?.user?.name || "User");

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' });
  };

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/';
    return pathname.startsWith(path);
  };



  return (
    <header className={cn('w-full', className)}>
      <div className="flex items-center justify-between">
        {/* Logo & Brand */}
        <div className="flex items-center gap-3">
          <Image
            src="/logo-dashboard.svg"
            alt="Sistema conversacional para dashboards"
            width={180}
            height={52}
            className="h-10 w-auto"
            priority
          />
        </div>

        {/* Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          {/* Consultar link - hidden for viewers */}
          {session?.user?.role !== 'viewer' && (
            <Link
              href="/query"
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                isActive('/query')
                  ? 'bg-primary/10 text-primary border border-primary/20'
                  : 'text-muted-foreground hover:text-white hover:bg-secondary'
              )}
            >
              <Home className="w-4 h-4" />
              Consultar
            </Link>
          )}
          <Link
            href="/dashboards"
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
              isActive('/dashboard')
                ? 'bg-primary/10 text-primary border border-primary/20'
                : 'text-muted-foreground hover:text-white hover:bg-secondary'
            )}
          >
            <LayoutDashboard className="w-4 h-4" />
            Dashboards
          </Link>
          <Link
            href="/spaces"
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
              isActive('/spaces')
                ? 'bg-brand-sky/10 text-brand-sky border border-brand-sky/20'
                : 'text-muted-foreground hover:text-white hover:bg-brand-sky/10 hover:border-brand-sky/20'
              )}
            >
            <FolderOpen className="w-4 h-4" />
            Espacios
          </Link>

          {/* Admin link (for admin and supervisor) */}
          {(session?.user?.role === 'admin' || session?.user?.role === 'supervisor') && (
            <Link
              href={session?.user?.role === 'supervisor' ? '/admin/approvals' : '/admin/users'}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                isActive('/admin')
                  ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                  : 'text-muted-foreground hover:text-white hover:bg-red-500/10 hover:border-red-500/20'
              )}
            >
              <Shield className="w-4 h-4" />
              Admin
            </Link>
          )}
        </nav>
        {/* User Info */}
        {session?.user && (
          <>
            {/* User Avatar & Name */}
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-secondary/80 border border-border rounded-full backdrop-blur-sm">
              {session.user.image ? (
                <Image
                  src={session.user.image}
                  alt={displayName}
                  width={18}
                  height={18}
                  className="rounded-full"
                />
              ) : (
                <User className="w-3.5 h-3.5 text-muted-foreground" />
              )}
              <span className="text-xs text-foreground font-medium">{displayName}</span>
            </div>
            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 active:bg-red-500/10 transition-all duration-200"
              title="Cerrar sesiónn"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Cerrar sesión</span>
            </button>
          </>
        )}
      </div>
    </header>
  );
}


