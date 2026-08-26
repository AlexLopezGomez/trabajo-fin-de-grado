import Link from "next/link";
import { ReactNode } from "react";
import { auth } from "@/auth";
import { AdminNav } from "@/components/admin/admin-nav";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  const isAdmin = session?.user?.role === 'admin';
  const isSupervisor = session?.user?.role === 'supervisor';
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-card/30 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="text-white font-semibold hover:opacity-80">
              Home
            </Link>
            <AdminNav isAdmin={isAdmin} isSupervisor={isSupervisor} />
          </div>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
