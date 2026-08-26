"use client";

/**
 * Group Member Management Modal
 * Add or remove users from a group
 */

import { useState, useEffect } from "react";
import { getUsers } from "@/app/actions/admin/users";
import { addUsersToGroup, removeUsersFromGroup } from "@/app/actions/admin/groups";
import type { UserListItem } from "@/types/rbac";
import { X, UserPlus, UserMinus, Search, CheckCircle2 } from "lucide-react";
import { error as logError } from "@/lib/utils/logger";

interface GroupMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  groupName: string;
  existingMemberIds: string[];
  mode: "add" | "remove";
  onSuccess: () => void;
}

export default function GroupMemberModal({
  isOpen,
  onClose,
  groupId,
  groupName,
  existingMemberIds,
  mode,
  onSuccess,
}: GroupMemberModalProps) {
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
      setSelectedUserIds(new Set());
      setSearch("");
      setError(null);
    }
  }, [isOpen, mode]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await getUsers({ search: search || undefined });
      if (response.success && response.data) {
        setUsers(response.data.users);
      }
    } catch (err) {
      logError("Failed to fetch users", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      const timeoutId = setTimeout(() => {
        fetchUsers();
      }, 300); // Debounce search

      return () => clearTimeout(timeoutId);
    }
  }, [search, isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleToggleUser = (userId: string) => {
    const newSelected = new Set(selectedUserIds);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUserIds(newSelected);
  };

  const handleSave = async () => {
    if (selectedUserIds.size === 0) {
      setError(`Please select at least one user to ${mode}`);
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const userIdsArray = Array.from(selectedUserIds);
      const response =
        mode === "add"
          ? await addUsersToGroup(groupId, userIdsArray)
          : await removeUsersFromGroup(groupId, userIdsArray);

      if (response.success) {
        onSuccess();
        onClose();
      } else {
        setError(response.error || `Failed to ${mode} users`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${mode} users`);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  // Filter users based on mode
  const availableUsers = users.filter((user) => {
    const isMember = existingMemberIds.includes(user.id);
    if (mode === "add") {
      return !isMember; // Show users NOT in group
    } else {
      return isMember; // Show users IN group
    }
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-card border border-border rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
              {mode === "add" ? (
                <UserPlus className="w-5 h-5 text-primary" />
              ) : (
                <UserMinus className="w-5 h-5 text-primary" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">
                {mode === "add" ? "Add Members" : "Remove Members"}
              </h2>
              <p className="text-sm text-muted-foreground">{groupName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={saving}
            className="p-1 rounded-lg hover:bg-muted/50 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-4 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search users by name or email..."
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-card/50 text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
              <p className="mt-4 text-muted-foreground">Loading users...</p>
            </div>
          ) : availableUsers.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {mode === "add"
                  ? "No users available to add"
                  : "No members to remove"}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {availableUsers.map((user) => {
                const isSelected = selectedUserIds.has(user.id);
                return (
                  <button
                    key={user.id}
                    onClick={() => handleToggleUser(user.id)}
                    className={`w-full text-left p-4 rounded-lg border transition-all ${isSelected
                      ? "bg-primary/10 border-primary/50"
                      : "bg-card/50 border-border hover:border-primary/50 hover:bg-muted/20"
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-white">{user.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {user.email}
                        </div>
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

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {selectedUserIds.size} user{selectedUserIds.size !== 1 ? "s" : ""}{" "}
              selected
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={saving}
                className="px-4 py-2 rounded-lg border border-border bg-card/50 text-white hover:bg-muted/50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || selectedUserIds.size === 0}
                className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {saving
                  ? "Saving..."
                  : mode === "add"
                    ? `Add ${selectedUserIds.size} User${selectedUserIds.size !== 1 ? "s" : ""}`
                    : `Remove ${selectedUserIds.size} User${selectedUserIds.size !== 1 ? "s" : ""}`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

