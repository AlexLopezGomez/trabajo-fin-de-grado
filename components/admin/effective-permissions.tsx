"use client";

/**
 * Effective Permissions Component
 * FR-6: Effective Access Read-Only View from UI-ADMIN.md
 * 
 * Displays computed permissions for a user, showing:
 * - What collections they can access
 * - Permission sources (direct vs inherited)
 * - Field visibility
 * - Row-level filters
 */

import { useState, useEffect } from "react";
import { getEffectivePermissionsForUser, type ComputedAccessInfo } from "@/app/actions/admin/users";
import { getPermissionSets } from "@/app/actions/admin/roles/index";
import type { PermissionSet } from "@/types/rbac";
import { error as logError } from "@/lib/utils/logger";
import {
  Database,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  Filter,
  Shield,
  Users,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Info,
  Sparkles,
} from "lucide-react";

interface EffectivePermissionsProps {
  userId: string;
  userName: string;
  userRole: string;
}

export default function EffectivePermissions({
  userId,
  userName,
  userRole,
}: EffectivePermissionsProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ComputedAccessInfo | null>(null);
  const [roles, setRoles] = useState<PermissionSet[]>([]);
  const [expandedCollections, setExpandedCollections] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchPermissions();
    fetchRoles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const fetchRoles = async () => {
    try {
      const response = await getPermissionSets();
      if (response.success && response.data) {
        setRoles(response.data.roles);
      }
    } catch (err) {
      logError("Error fetching roles", err);
    }
  };

  const fetchPermissions = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await getEffectivePermissionsForUser(userId);
      if (response.success && response.data) {
        setData(response.data);
      } else {
        setError(response.error || "Failed to load permissions");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const toggleCollection = (collection: string) => {
    const newExpanded = new Set(expandedCollections);
    if (newExpanded.has(collection)) {
      newExpanded.delete(collection);
    } else {
      newExpanded.add(collection);
    }
    setExpandedCollections(newExpanded);
  };

  // Get role badge styling - Database-driven with functional role model
  const getRoleBadgeClass = (roleId: string, small: boolean = false) => {
    const baseClass = small
      ? "px-2 py-0.5 rounded text-xs font-medium border"
      : "px-3 py-1 rounded-lg text-sm font-medium border";

    // Built-in functional roles
    switch (roleId) {
      case "admin":
        return `${baseClass} bg-red-500/10 text-red-400 border-red-500/30`;
      case "supervisor":
        return `${baseClass} bg-teal-500/10 text-teal-400 border-teal-500/30`;
      case "operator":
        return `${baseClass} bg-blue-500/10 text-blue-400 border-blue-500/30`;
      case "viewer":
        return `${baseClass} bg-gray-500/10 text-gray-400 border-gray-500/30`;
      // Deprecated roles (if any users still have them)
      case "contributor":
      case "sales":
      case "finance":
      case "support":
        return `${baseClass} bg-orange-500/10 text-orange-400 border-orange-500/30`;
      default:
        // Unknown role fallback
        return `${baseClass} bg-muted/30 text-muted-foreground border-border`;
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary"></div>
        <p className="mt-2 text-sm text-muted-foreground">
          Computing effective permissions...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400">
        <div className="flex items-center gap-2 mb-1">
          <AlertTriangle className="w-4 h-4" />
          <span className="font-medium">Error loading permissions</span>
        </div>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3 rounded-lg bg-muted/20 border border-border">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Database className="w-4 h-4" />
            <span className="text-xs">Collections</span>
          </div>
          <div className="text-2xl font-bold text-white">
            {data.totalCollections}
            <span className="text-sm font-normal text-muted-foreground">/5</span>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-muted/20 border border-border">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Shield className="w-4 h-4" />
            <span className="text-xs">Direct Roles</span>
          </div>
          <div className="text-2xl font-bold text-white">
            {data.directRoleCount}
          </div>
        </div>

        <div className="p-3 rounded-lg bg-muted/20 border border-border">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Users className="w-4 h-4" />
            <span className="text-xs">Inherited</span>
          </div>
          <div className="text-2xl font-bold text-white">
            {data.inheritedRoleCount}
          </div>
        </div>

        <div className="p-3 rounded-lg bg-muted/20 border border-border">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Users className="w-4 h-4" />
            <span className="text-xs">Groups</span>
          </div>
          <div className="text-2xl font-bold text-white">
            {data.groupCount}
          </div>
        </div>
      </div>

      {/* Collection Access */}
      <div>
        <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
          <Database className="w-4 h-4 text-primary" />
          Collection Access
        </h4>
        <div className="space-y-2">
          {data.collections.map((collection) => (
            <div
              key={collection.name}
              className={`rounded-lg border ${collection.canAccess
                ? "bg-emerald-500/5 border-emerald-500/20"
                : "bg-muted/10 border-border"
                }`}
            >
              <button
                onClick={() => collection.canAccess && toggleCollection(collection.name)}
                className="w-full p-3 flex items-center justify-between text-left"
                disabled={!collection.canAccess}
              >
                <div className="flex items-center gap-3">
                  {collection.canAccess ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <XCircle className="w-5 h-5 text-muted-foreground" />
                  )}
                  <span className={`font-mono ${collection.canAccess ? "text-white" : "text-muted-foreground"}`}>
                    {collection.name}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {collection.canAccess && collection.sources.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {collection.sources.length} source{collection.sources.length !== 1 ? "s" : ""}
                    </span>
                  )}
                  {collection.canAccess && (
                    expandedCollections.has(collection.name) ? (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    )
                  )}
                </div>
              </button>

              {/* Expanded sources */}
              {collection.canAccess && expandedCollections.has(collection.name) && (
                <div className="px-3 pb-3 pt-0">
                  <div className="pl-8 space-y-1">
                    {collection.sources.map((source, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 text-sm text-muted-foreground"
                      >
                        {source.type === "direct" ? (
                          <Shield className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Users className="w-3 h-3 text-blue-400" />
                        )}
                        <span className={getRoleBadgeClass(source.roleName, true)}>
                          {source.roleName}
                        </span>
                        {source.type === "inherited" && source.groupName && (
                          <span className="text-xs">
                            via {source.groupName}
                          </span>
                        )}
                        {source.type === "direct" && (
                          <span className="text-xs text-emerald-400">direct</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Field Visibility */}
      {data.fieldVisibility.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
            <Eye className="w-4 h-4 text-primary" />
            Field Visibility
          </h4>
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/30">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase">
                    Collection
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase">
                    Field
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase">
                    Access
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.fieldVisibility.map((fv, idx) => (
                  <tr key={idx} className="hover:bg-muted/10">
                    <td className="px-3 py-2 font-mono text-white">{fv.collection}</td>
                    <td className="px-3 py-2 font-mono text-white">{fv.field}</td>
                    <td className="px-3 py-2">
                      {fv.visible ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400">
                          <Eye className="w-3 h-3" />
                          Full
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-amber-400">
                          <EyeOff className="w-3 h-3" />
                          Masked
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Row-Level Filters */}
      <div>
        <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
          <Filter className="w-4 h-4 text-primary" />
          Row-Level Filters
        </h4>
        <div className="p-3 rounded-lg bg-muted/20 border border-border">
          <p className="text-sm text-muted-foreground">{data.rowLevelFilters}</p>
        </div>
      </div>

      {/* Admin Notice */}
      {userRole === "admin" && (
        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm text-amber-400 font-medium">Full Administrative Access</p>
            <p className="text-xs text-amber-400/80 mt-1">
              This user has unrestricted access to all collections, fields, and administrative functions.
            </p>
          </div>
        </div>
      )}

      {/* No Access Notice */}
      {data.totalCollections === 0 && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-start gap-2">
          <XCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm text-red-400 font-medium">No Collection Access</p>
            <p className="text-xs text-red-400/80 mt-1">
              This user has no access to any data collections. Assign a role to grant access.
            </p>
          </div>
        </div>
      )}

      {/* Info footer */}
      <div className="flex items-start gap-2 text-xs text-muted-foreground">
        <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
        <p>
          Effective permissions are computed from the user&apos;s direct role assignment plus any roles inherited through group membership.
          Click on an accessible collection to see where access comes from.
        </p>
      </div>
    </div>
  );
}

