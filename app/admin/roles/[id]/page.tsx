"use client";

/**
 * Admin UI - Role Detail View (Refactored)
 * Shows detailed information about a specific role
 */

import { use } from "react";
import { useRoleDetail } from "./hooks/useRoleDetail";
import { RoleDetailHeader } from "./components/RoleDetailHeader";
import { AdminWarning } from "./components/AdminWarning";
import { RoleDescription } from "./components/RoleDescription";
import { PermissionsList } from "./components/PermissionsList";
import { AccessibleCollections } from "./components/AccessibleCollections";
import { FieldMaskingTable } from "./components/FieldMaskingTable";
import { RowLevelFilters } from "./components/RowLevelFilters";
import { RoleUsageStats } from "./components/RoleUsageStats";
import { RoleRestrictions } from "./components/RoleRestrictions";
import { LoadingRole, ErrorRole } from "./components/RoleDetailStates";

export default function RoleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { role, usage, loading, error, getRoleColor } = useRoleDetail(id);

  if (loading) return <LoadingRole />;
  if (error || !role) return <ErrorRole error={error || "Role not found"} />;

  const color = getRoleColor();

  return (
    <div className="min-h-screen bg-background">
      <RoleDetailHeader role={role} color={color} />

      <div className="max-w-7xl mx-auto px-6 py-8">
        {role.id === "admin" && <AdminWarning />}

        <RoleDescription description={role.description} />

        <div className="grid grid-cols-1 gap-6">
          <PermissionsList permissionIds={role.permissionIds} />
          {/* <AccessibleCollections collections={role.dataAccess?.collections} /> */}
        </div>

        {/* <FieldMaskingTable fieldMasking={role.dataAccess?.fieldMasking} /> */}

        {/* <RowLevelFilters dataAccess={role.dataAccess} /> */}

        <RoleUsageStats roleId={role.id} usage={usage} />

        <RoleRestrictions role={role} />
      </div>
    </div>
  );
}
