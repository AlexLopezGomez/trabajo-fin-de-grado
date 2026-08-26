import Link from "next/link";
import { Users as UsersIcon, Shield } from "lucide-react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function AdminHomePage() {
  const session = await auth();

  // Redirect Supervisors to their specific workspace
  if (session?.user?.role === 'supervisor') {
    redirect('/admin/approvals');
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold text-foreground mb-6">Panel de Administración</h1>
        <p className="text-sm text-muted-foreground mb-8">
          Gestiona usuarios, grupos y permisos.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <Link
            href="/admin/users"
            className="block rounded-lg border border-border bg-card/50 p-6 hover:bg-muted/20 transition-colors"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                <UsersIcon className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-lg font-semibold text-foreground">Usuarios</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Consulta, busca y gestiona perfiles y roles de usuario.
            </p>
          </Link>

          <Link
            href="/admin/groups"
            className="block rounded-lg border border-border bg-card/50 p-6 hover:bg-muted/20 transition-colors"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-lg font-semibold text-foreground">Grupos</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Gestiona grupos y permisos basados en grupos.
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}
