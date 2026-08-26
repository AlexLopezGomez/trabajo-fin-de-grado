"use client";

/**
 * Role Change Modal Component
 * Enterprise-grade role assignment for the 4 core built-in roles
 */

import { useState, useEffect } from "react";
import { Shield, AlertTriangle, X, CheckCircle2 } from "lucide-react";
import { updateUserRole } from "@/app/actions/admin/users";
import { getPermissionSets } from "@/app/actions/admin/roles/index";
import type { UserRole } from "@/auth";
import type { PermissionSet } from "@/types/rbac";
import { error as logError } from "@/lib/utils/logger";

interface RoleChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
  currentRole: UserRole;
  onSuccess: () => void;
}

// Helper function to get selected role styling
function getSelectedRoleClass(color: string): string {
  switch (color) {
    case "red":
      return "bg-red-500/10 border-red-500/50";
    case "teal":
      return "bg-teal-500/10 border-teal-500/50";
    case "blue":
      return "bg-blue-500/10 border-blue-500/50";
    case "gray":
      return "bg-gray-500/10 border-gray-500/50";
    default:
      return "bg-primary/10 border-primary/50";
  }
}

export default function RoleChangeModal({
  isOpen,
  onClose,
  userId,
  userName,
  currentRole,
  onSuccess,
}: RoleChangeModalProps) {
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allRoles, setAllRoles] = useState<PermissionSet[]>([]);
  const [rolesLoading, setRolesLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchRoles();
    }
  }, [isOpen]);

  const fetchRoles = async () => {
    setRolesLoading(true);
    try {
      const response = await getPermissionSets();
      if (response.success && response.data) {
        setAllRoles(response.data.roles);
      }
    } catch (err) {
      logError("Error fetching roles", err);
    } finally {
      setRolesLoading(false);
    }
  };

  if (!isOpen) return null;

  const selectedRoleData = selectedRole
    ? allRoles.find((r) => r.id === selectedRole)
    : null;

  const currentRoleData = allRoles.find((r) => r.id === currentRole);

  const getRoleColor = (roleId: string) => {
    switch (roleId) {
      case "admin": return "red";
      case "supervisor": return "teal";
      case "operator": return "blue";
      case "viewer": return "gray";
      default: return "blue";
    }
  };

  const getRoleWarning = (roleId: string) => {
    if (roleId === "admin") {
      return "This grants full administrative access. Are you sure?";
    }
    return undefined;
  };

  const handleRoleSelect = (roleId: string) => {
    setSelectedRole(roleId as UserRole);
    setError(null);
    setShowConfirmation(false);
  };

  const handleConfirm = async () => {
    if (!selectedRole) return;

    setLoading(true);
    setError(null);

    try {
      const result = await updateUserRole(userId, selectedRole);

      if (result.success) {
        onSuccess();
        onClose();
        setSelectedRole(null);
        setShowConfirmation(false);
      } else {
        setError(result.error || "Failed to update role");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (loading) return;
    setSelectedRole(null);
    setShowConfirmation(false);
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-card border border-border rounded-lg shadow-xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Change Role</h2>
              <p className="text-sm text-muted-foreground">{userName}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={loading}
            className="p-1 rounded-lg hover:bg-muted/50 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {!showConfirmation ? (
            <>
              {/* Current Role */}
              <div className="mb-6">
                <label className="text-sm text-muted-foreground mb-2 block">
                  Current Role
                </label>
                <div className="px-3 py-2 rounded-lg bg-muted/30 border border-border">
                  <span className="text-white font-medium capitalize">
                    {currentRoleData?.name || currentRole}
                  </span>
                </div>
              </div>

              {/* Role Selection */}
              <div>
                <label className="text-sm text-muted-foreground mb-3 block">
                  Select New Role
                </label>

                {rolesLoading ? (
                  <div className="text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary"></div>
                    <p className="text-sm text-muted-foreground mt-2">Loading roles...</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                    {allRoles.map((role) => {
                      const isCurrent = role.id === currentRole;
                      const isSelected = selectedRole === role.id;
                      const color = getRoleColor(role.id);

                      return (
                        <button
                          key={role.id}
                          onClick={() => handleRoleSelect(role.id)}
                          disabled={isCurrent || loading}
                          className={`w-full text-left p-4 rounded-lg border transition-all ${isCurrent
                            ? "bg-muted/20 border-border opacity-50 cursor-not-allowed"
                            : isSelected
                              ? getSelectedRoleClass(color)
                              : "bg-card/50 border-border hover:border-primary/50 hover:bg-muted/20"
                            }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`font-medium ${isSelected ? 'text-white' : 'text-slate-200'}`}>
                                  {role.name}
                                </span>
                                {isCurrent && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground uppercase tracking-wider font-bold">
                                    Current
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {role.description}
                              </p>
                            </div>
                            {isSelected && (
                              <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="mt-6 flex gap-3">
                <button
                  onClick={handleClose}
                  disabled={loading}
                  className="flex-1 px-4 py-2 rounded-lg border border-border bg-card/50 text-white hover:bg-muted/50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (selectedRole) {
                      setShowConfirmation(true);
                    }
                  }}
                  disabled={!selectedRole || loading}
                  className="flex-1 px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Confirmation Dialog */}
              <div className="text-center">
                <div className="mx-auto w-12 h-12 rounded-full bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center mb-4">
                  <AlertTriangle className="w-6 h-6 text-yellow-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  Confirm Role Change
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  You are about to change{" "}
                  <span className="font-medium text-white">{userName}</span>
                  {"'s role from "}
                  <span className="font-medium text-white capitalize">
                    {currentRoleData?.name || currentRole}
                  </span>
                  {" to "}
                  <span className="font-medium text-white">
                    {selectedRoleData?.name}
                  </span>
                  .
                </p>

                {selectedRoleData && getRoleWarning(selectedRoleData.id) && (
                  <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30 mb-4 text-left">
                    <p className="text-xs text-yellow-400">
                      <strong className="block mb-0.5">Note:</strong> {getRoleWarning(selectedRoleData.id)}
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowConfirmation(false)}
                    disabled={loading}
                    className="flex-1 px-4 py-2 rounded-lg border border-border bg-card/50 text-white hover:bg-muted/50 transition-colors disabled:opacity-50"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleConfirm}
                    disabled={loading}
                    className="flex-1 px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {loading ? "Updating..." : "Confirm Change"}
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


