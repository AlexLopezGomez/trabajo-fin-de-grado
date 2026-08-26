"use client";

/**
 * Audit Log Component
 * Displays audit trail of permission changes
 */

import { Clock, User, Shield, ArrowRight, Download } from "lucide-react";
import type { PermissionAuditLog } from "@/types/rbac";
import { exportAuditLogsToCSV } from "@/app/actions/admin/users";
import { useState } from "react";
import { error as logError } from "@/lib/utils/logger";

interface AuditLogProps {
  logs: PermissionAuditLog[];
  isLoading?: boolean;
  userId?: string; // For CSV export filtering
  showExport?: boolean; // Show export button
}

export default function AuditLog({
  logs,
  isLoading,
  userId,
  showExport = false,
}: AuditLogProps) {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    if (!userId) return;

    setExporting(true);
    try {
      const response = await exportAuditLogsToCSV({ userId });
      if (response.success && response.data) {
        // Create blob and download
        const blob = new Blob([response.data], { type: "text/csv" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `audit-log-${userId}-${new Date().toISOString().split("T")[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    } catch (err) {
      logError("Failed to export audit logs", err);
    } finally {
      setExporting(false);
    }
  };
  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
        <p className="mt-4 text-muted-foreground">Loading audit log...</p>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-12">
        <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
        <p className="text-muted-foreground">No audit log entries found</p>
        <p className="text-sm text-muted-foreground mt-1">
          Role changes will appear here
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Export button */}
      {showExport && userId && (
        <div className="mb-4 flex justify-end">
          <button
            onClick={handleExport}
            disabled={exporting || logs.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            {exporting ? "Exporting..." : "Export to CSV"}
          </button>
        </div>
      )}

      {/* Audit log entries */}
      <div className="space-y-3">
        {logs.map((log) => (
          <div
            key={log.id}
            className="bg-card/50 border border-border rounded-lg p-4 hover:bg-muted/20 transition-colors"
          >
            <div className="flex items-start justify-between gap-4">
              {/* Left: Action details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="font-medium text-white text-sm">
                    {getActionLabel(log.action)}
                  </span>
                </div>

                {/* Role change details */}
                {log.action === "ROLE_CHANGED" &&
                  log.details.oldRole &&
                  log.details.newRole && (
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className={getRoleBadgeClass(log.details.oldRole)}>
                        {log.details.oldRole}
                      </span>
                      <ArrowRight className="w-3 h-3 text-muted-foreground" />
                      <span className={getRoleBadgeClass(log.details.newRole)}>
                        {log.details.newRole}
                      </span>
                    </div>
                  )}

                {/* Actor info */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="w-3 h-3" />
                  <span className="truncate">
                    {log.actorName}
                    {log.actorEmail && (
                      <span className="text-muted-foreground/70">
                        {" "}
                        ({log.actorEmail})
                      </span>
                    )}
                  </span>
                </div>
              </div>

              {/* Right: Timestamp */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground flex-shrink-0">
                <Clock className="w-3 h-3" />
                <span className="whitespace-nowrap">
                  {formatTimestamp(log.timestamp)}
                </span>
              </div>
            </div>

            {/* Full timestamp */}
            <div className="mt-2 pt-2 border-t border-border/50">
              <p className="text-xs text-muted-foreground">
                {new Date(log.timestamp).toLocaleString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Helper functions
function formatTimestamp(timestamp: Date) {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getActionLabel(action: string) {
  switch (action) {
    case "ROLE_CHANGED":
      return "Role Changed";
    case "ROLE_ASSIGNED":
      return "Role Assigned";
    case "ROLE_REVOKED":
      return "Role Revoked";
    case "USER_CREATED":
      return "User Created";
    case "GROUP_MODIFIED":
      return "Group Modified";
    default:
      return action;
  }
}

function getRoleBadgeClass(role: string) {
  const baseClass =
    "px-2 py-0.5 rounded text-xs font-medium border inline-flex items-center gap-1";
  switch (role) {
    case "admin":
      return `${baseClass} bg-red-500/10 text-red-400 border-red-500/30`;
    case "finance":
      return `${baseClass} bg-emerald-500/10 text-emerald-400 border-emerald-500/30`;
    case "sales":
      return `${baseClass} bg-blue-500/10 text-blue-400 border-blue-500/30`;
    case "support":
      return `${baseClass} bg-purple-500/10 text-purple-400 border-purple-500/30`;
    case "viewer":
      return `${baseClass} bg-gray-500/10 text-gray-400 border-gray-500/30`;
    default:
      return `${baseClass} bg-gray-500/10 text-gray-400 border-gray-500/30`;
  }
}


