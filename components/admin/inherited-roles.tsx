"use client";

/**
 * Inherited Roles Component
 * Displays roles inherited from groups (read-only)
 */

import { Users, Shield } from "lucide-react";

interface InheritedRolesProps {
  roles: Array<{
    groupId: string;
    groupName: string;
    roles: Array<{
      permissionSetId: string;
      scope: {
        type: string;
        resourceId?: string;
      };
    }>;
  }>;
  isLoading?: boolean;
}

export default function InheritedRoles({
  roles,
  isLoading,
}: InheritedRolesProps) {
  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary"></div>
        <p className="mt-2 text-sm text-muted-foreground">
          Loading inherited roles...
        </p>
      </div>
    );
  }

  if (roles.length === 0) {
    return (
      <div className="text-center py-8">
        <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
        <p className="text-muted-foreground">No inherited roles</p>
        <p className="text-sm text-muted-foreground mt-1">
          Roles assigned to groups will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {roles.map((group) => (
        <div
          key={group.groupId}
          className="border border-border rounded-lg p-4 bg-muted/10"
        >
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium text-white">{group.groupName}</span>
            <span className="text-xs text-muted-foreground">
              (via group membership)
            </span>
          </div>

          {group.roles.length === 0 ? (
            <p className="text-sm text-muted-foreground pl-6">
              No roles assigned to this group
            </p>
          ) : (
            <div className="pl-6 space-y-2">
              {group.roles.map((role, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 text-sm"
                >
                  <Shield className="w-3 h-3 text-primary" />
                  <span className="text-white font-medium">
                    {role.permissionSetId}
                  </span>
                  <span className="text-muted-foreground">
                    ({role.scope.type}
                    {role.scope.resourceId
                      ? `: ${role.scope.resourceId}`
                      : ""}
                    )
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
