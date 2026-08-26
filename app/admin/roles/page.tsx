"use client";

/**
 * Admin UI - Role Catalog
 * Displays the 4 built-in roles with their permissions
 */

import { useRouter } from "next/navigation";
import { useAdminRoles } from "./hooks/useAdminRoles";
import { RolesHeader } from "./components/RolesHeader";
import { RoleCard } from "./components/RoleCard";
import { LoadingRoles, ErrorRoles } from "./components/RolesStates";
import { Shield } from "lucide-react";

export default function RoleCatalogPage() {
  const router = useRouter();
  const {
    builtInRoles,
    loading,
    error,
    refreshRoles,
  } = useAdminRoles();

  if (loading) {
    return <LoadingRoles />;
  }

  if (error) {
    return <ErrorRoles message={error} onRetry={refreshRoles} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <RolesHeader />

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Built-in Roles Section */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5" />
            System Roles ({builtInRoles.length})
          </h2>

          <div className="grid gap-4">
            {builtInRoles.map((role) => (
              <RoleCard
                key={role.id}
                role={role}
                onClick={() => router.push(`/admin/roles/${role.id}`)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

