"use client";

/**
 * Group Role Assignment Component
 * Allows admins to assign and revoke roles from groups
 */

import { useState, useEffect } from "react";
import {
  getGroupRoleAssignments,
  assignRoleToGroup,
  revokeRoleFromGroup,
} from "@/app/actions/admin/groups";
import { getPermissionSets } from "@/app/actions/admin/roles/index";
import type { RoleAssignment, Scope, PermissionSet } from "@/types/rbac";
import { Shield, Plus, Trash2, Globe, Building, AlertTriangle, X, CheckCircle2 } from "lucide-react";
import { error as logError } from "@/lib/utils/logger";

interface GroupRoleAssignmentProps {
  groupId: string;
  groupName: string;
  onRoleCountChange?: (count: number) => void;
}

export default function GroupRoleAssignment({
  groupId,
  groupName,
  onRoleCountChange,
}: GroupRoleAssignmentProps) {
  const [assignments, setAssignments] = useState<RoleAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Roles state
  const [roles, setRoles] = useState<PermissionSet[]>([]);
  const [rolesLoading, setRolesLoading] = useState(true);

  // Modal state
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedPermissionSet, setSelectedPermissionSet] = useState("");
  const [selectedScopeType, setSelectedScopeType] = useState<"GLOBAL" | "SPACE">("GLOBAL");
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);

  // Revoke confirmation state
  const [revokeTarget, setRevokeTarget] = useState<RoleAssignment | null>(null);
  const [revoking, setRevoking] = useState(false);

  // Fetch roles and assignments
  useEffect(() => {
    fetchInitialData();
  }, [groupId]);

  const fetchInitialData = async () => {
    setLoading(true);
    setRolesLoading(true);
    setError(null);

    try {
      const [rolesRes, assignmentsRes] = await Promise.all([
        getPermissionSets(),
        getGroupRoleAssignments(groupId)
      ]);

      if (rolesRes.success && rolesRes.data) {
        setRoles(rolesRes.data.roles);
      }

      if (assignmentsRes.success && assignmentsRes.data) {
        setAssignments(assignmentsRes.data.assignments);
        onRoleCountChange?.(assignmentsRes.data.assignments.length);
      } else {
        setError(assignmentsRes.error || "Failed to load data");
      }
    } catch (err) {
      logError("Error in GroupRoleAssignment", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
      setRolesLoading(false);
    }
  };

  const fetchAssignments = async () => {
    try {
      const response = await getGroupRoleAssignments(groupId);
      if (response.success && response.data) {
        setAssignments(response.data.assignments);
        onRoleCountChange?.(response.data.assignments.length);
      }
    } catch (err) {
      logError("Error fetching assignments", err);
    }
  };

  // Handle assign role
  const handleAssignRole = async () => {
    if (!selectedPermissionSet) {
      setAssignError("Please select a role");
      return;
    }

    setAssigning(true);
    setAssignError(null);

    try {
      const scope: Scope = {
        type: selectedScopeType,
        ...(selectedScopeType === "SPACE" ? { resourceId: undefined } : {}),
      };

      const response = await assignRoleToGroup(groupId, selectedPermissionSet, scope);

      if (response.success) {
        setShowAssignModal(false);
        setSelectedPermissionSet("");
        setSelectedScopeType("GLOBAL");
        await fetchAssignments();
      } else {
        setAssignError(response.error || "Failed to assign role");
      }
    } catch (err) {
      setAssignError(err instanceof Error ? err.message : "Failed to assign role");
    } finally {
      setAssigning(false);
    }
  };

  // Handle revoke role
  const handleRevokeRole = async () => {
    if (!revokeTarget) return;

    setRevoking(true);

    try {
      const response = await revokeRoleFromGroup(groupId, revokeTarget.id);

      if (response.success) {
        setRevokeTarget(null);
        await fetchAssignments();
      } else {
        alert(response.error || "Failed to revoke role");
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to revoke role");
    } finally {
      setRevoking(false);
    }
  };

  // Get role badge styling
  const getRoleBadgeClass = (roleId: string) => {
    const baseClass =
      "px-3 py-1.5 rounded-lg text-sm font-medium border inline-flex items-center gap-2";
    switch (roleId) {
      case "admin":
        return `${baseClass} bg-red-500/10 text-red-400 border-red-500/30`;
      case "supervisor":
        return `${baseClass} bg-teal-500/10 text-teal-400 border-teal-500/30`;
      case "operator":
        return `${baseClass} bg-blue-500/10 text-blue-400 border-blue-500/30`;
      case "viewer":
        return `${baseClass} bg-gray-500/10 text-gray-400 border-gray-500/30`;
      default:
        return `${baseClass} bg-orange-500/10 text-orange-400 border-orange-500/30 opacity-75`;
    }
  };

  // Get scope display
  const getScopeDisplay = (scope: Scope) => {
    if (scope.type === "GLOBAL") {
      return (
        <span className="inline-flex items-center gap-1 text-xs text-amber-400 font-medium">
          <Globe className="w-3.5 h-3.5 mr-0.5" />
          Global
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-xs text-blue-400 font-medium">
        <Building className="w-3.5 h-3.5 mr-0.5" />
        Space: {scope.resourceId || "All"}
      </span>
    );
  };

  // Loading state
  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
        <p className="mt-4 text-sm text-muted-foreground">Loading role assignments...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 shadow-lg">
        <div className="flex items-center gap-2 mb-1">
          <AlertTriangle className="w-5 h-5" />
          <p className="font-semibold text-sm">Error loading assignments</p>
        </div>
        <p className="text-sm opacity-90 pl-7">{error}</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header with Add button */}
      <div className="flex items-center justify-between mb-6">
        <div className="max-w-md">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Roles assigned to this group are inherited by all members across the platform.
          </p>
        </div>
        <button
          onClick={() => setShowAssignModal(true)}
          className="px-4 py-2.5 rounded-lg bg-primary text-white hover:bg-primary/90 transition-all flex items-center gap-2 text-sm font-semibold shadow-lg shadow-primary/20"
        >
          <Plus className="w-4 h-4" />
          Assign Role
        </button>
      </div>

      {/* Role assignments list */}
      {assignments.length === 0 ? (
        <div className="text-center py-12 rounded-xl bg-muted/10 border border-dashed border-border/50">
          <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-30" />
          <p className="text-muted-foreground font-medium">No roles assigned to this group</p>
          <p className="text-xs text-muted-foreground/60 mt-1 max-w-xs mx-auto">
            Assign roles to grant the designated permissions to all current and future members of this group.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {assignments.map((assignment) => (
            <div
              key={assignment.id}
              className="flex items-center justify-between p-4 rounded-xl border border-border bg-card/40 hover:bg-muted/10 transition-all group shadow-sm hover:shadow-md"
            >
              <div className="flex flex-col gap-2">
                {/* Role badge */}
                <span className={getRoleBadgeClass(assignment.permissionSetId)}>
                  <Shield className="w-4 h-4" />
                  {roles.find((p) => p.id === assignment.permissionSetId)?.name ||
                    assignment.permissionSetId}
                </span>

                <div className="flex items-center gap-4 ml-1">
                  {/* Scope */}
                  {getScopeDisplay(assignment.scope)}

                  {/* Assigned date */}
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    {new Date(assignment.assignedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Revoke button */}
              <button
                onClick={() => setRevokeTarget(assignment)}
                className="p-2.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                title="Revoke this role"
              >
                <Trash2 className="w-4.5 h-4.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Admin warning */}
      {assignments.some((a) => a.permissionSetId === "admin") && (
        <div className="mt-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
          <div className="p-1.5 rounded-full bg-amber-500/20 text-amber-400 mt-0.5">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <p className="text-sm text-amber-400 leading-relaxed">
            <strong className="font-semibold block mb-0.5">High Privilege Group</strong>
            This group has the <span className="font-mono bg-amber-500/20 px-1 rounded">Admin</span> role. All members have full access to system configuration and sensitive data.
          </p>
        </div>
      )}

      {/* Assign Role Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
            onClick={() => !assigning && setShowAssignModal(false)}
          />
          <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-5 border-b border-border flex items-center justify-between bg-muted/20">
              <div>
                <h3 className="text-lg font-bold text-white">Assign Role to Group</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Permissions will be inherited by all members of "{groupName}"
                </p>
              </div>
              <button
                onClick={() => setShowAssignModal(false)}
                className="p-2 rounded-full hover:bg-muted/50 transition-colors"
                disabled={assigning}
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            <div className="p-6">
              {assignError && (
                <div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  {assignError}
                </div>
              )}

              {/* Permission Set Selection */}
              <div className="space-y-3 mb-6">
                <label className="text-sm font-semibold text-slate-300">Available Roles</label>
                {rolesLoading ? (
                  <div className="py-8 text-center">
                    <div className="inline-block animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto pr-1">
                    {roles.map((ps) => {
                      const isAssigned = assignments.some(a => a.permissionSetId === ps.id && a.scope.type === selectedScopeType);
                      return (
                        <label
                          key={ps.id}
                          className={`flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-all ${isAssigned
                              ? "opacity-50 grayscale bg-muted/20 cursor-not-allowed"
                              : selectedPermissionSet === ps.id
                                ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                                : "border-border hover:border-primary/40 hover:bg-muted/10"
                            }`}
                        >
                          <input
                            type="radio"
                            name="permissionSet"
                            value={ps.id}
                            checked={selectedPermissionSet === ps.id}
                            onChange={(e) => setSelectedPermissionSet(e.target.value)}
                            className="mt-1.5 w-4 h-4 text-primary focus:ring-primary"
                            disabled={assigning || isAssigned}
                          />
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-white text-sm">{ps.name}</span>
                              {isAssigned && <span className="text-[10px] text-muted-foreground bg-muted px-1.5 rounded uppercase">Already Assigned</span>}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{ps.description}</p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Scope Selection */}
              <div className="space-y-3 mb-8">
                <label className="text-sm font-semibold text-slate-300">Assignment Scope</label>
                <div className="flex gap-4">
                  <label
                    className={`flex-1 flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${selectedScopeType === "GLOBAL"
                        ? "border-amber-500/50 bg-amber-500/10 ring-1 ring-amber-500/20"
                        : "border-border hover:border-amber-500/30 hover:bg-muted/10"
                      }`}
                  >
                    <input
                      type="radio"
                      name="scopeType"
                      value="GLOBAL"
                      checked={selectedScopeType === "GLOBAL"}
                      onChange={() => setSelectedScopeType("GLOBAL")}
                      disabled={assigning}
                      className="w-4 h-4 text-amber-500 focus:ring-amber-500"
                    />
                    <Globe className="w-5 h-5 text-amber-400" />
                    <div>
                      <div className="text-sm font-bold text-white">Global Access</div>
                      <p className="text-[10px] text-muted-foreground">Highest system priority</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-4">
                <button
                  onClick={() => setShowAssignModal(false)}
                  disabled={assigning}
                  className="flex-1 px-4 py-3 rounded-xl border border-border bg-card text-white font-semibold hover:bg-muted transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssignRole}
                  disabled={assigning || !selectedPermissionSet}
                  className="flex-1 px-4 py-3 rounded-xl bg-primary text-white font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {assigning ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      Assigning...
                    </div>
                  ) : "Confirm Assignment"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Revoke Confirmation Modal */}
      {revokeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
            onClick={() => !revoking && setRevokeTarget(null)}
          />
          <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="p-8 text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-6">
                <Shield className="w-8 h-8 text-red-500" />
              </div>

              <h3 className="text-xl font-bold text-white mb-2">Revoke Group Access?</h3>
              <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
                You are about to revoke the <strong className="text-white bg-muted px-1.5 py-0.5 rounded font-mono">{roles.find((p) => p.id === revokeTarget.permissionSetId)?.name || revokeTarget.permissionSetId}</strong> role from "{groupName}". This will immediately affect all group members.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setRevokeTarget(null)}
                  disabled={revoking}
                  className="flex-1 px-4 py-3 rounded-xl border border-border bg-card text-white font-semibold hover:bg-muted transition-colors disabled:opacity-50"
                >
                  No, Keep it
                </button>
                <button
                  onClick={handleRevokeRole}
                  disabled={revoking}
                  className="flex-1 px-4 py-3 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 transition-all border border-red-400/50 shadow-lg shadow-red-500/20 disabled:opacity-50"
                >
                  {revoking ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      Revoking...
                    </div>
                  ) : "Yes, Revoke Role"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

