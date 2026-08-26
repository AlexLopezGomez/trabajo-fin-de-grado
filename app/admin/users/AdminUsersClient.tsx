"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getUsers } from "@/app/actions/admin/users";
import type { UserListItem, UserListFilters, GroupFilterItem } from "@/types/rbac";
import type { PermissionSet } from "@/types/rbac";
import { Users, Search, Shield, UsersRound } from "lucide-react";

interface AdminUsersClientProps {
  initialUsers: UserListItem[];
  initialGroups: GroupFilterItem[];
  initialRoles: PermissionSet[];
}

export default function AdminUsersClient({
  initialUsers,
  initialGroups,
  initialRoles,
}: AdminUsersClientProps) {
  const router = useRouter();
  const [users, setUsers] = useState<UserListItem[]>(initialUsers);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<UserListFilters>({});
  const groups = initialGroups;
  const roles = initialRoles;

  // Re-fetch users when filters change (skip initial render — server already loaded)
  const [isInitialRender, setIsInitialRender] = useState(true);
  useEffect(() => {
    if (isInitialRender) {
      setIsInitialRender(false);
      return;
    }

    async function fetchUsers() {
      setLoading(true);
      setError(null);
      try {
        const usersResponse = await getUsers(filters);
        if (usersResponse.success && usersResponse.data) {
          setUsers(usersResponse.data.users);
        } else {
          setError(usersResponse.error || "Failed to load users");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    fetchUsers();
  }, [filters]); // eslint-disable-line react-hooks/exhaustive-deps

  const getRoleBadgeClass = (roleId: string) => {
    const baseClass =
      "px-3 py-1 rounded-full text-xs font-medium border inline-flex items-center gap-1";
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
        return `${baseClass} bg-orange-500/10 text-orange-400 border-orange-500/30 opacity-70`;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border/50 bg-card/30 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">
                  User Management
                </h1>
                <p className="text-sm text-muted-foreground">
                  View and manage user access and roles
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm">
              {filters.groupId && (
                <div className="px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center gap-2">
                  <UsersRound className="w-4 h-4 text-cyan-400" />
                  <span className="text-cyan-400 font-medium">
                    {groups.find((g) => g.id === filters.groupId)?.name || "Group"}
                  </span>
                </div>
              )}
              <div className="px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20">
                <span className="text-primary font-medium">
                  {users.length} users
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-6 flex flex-wrap gap-4">
          <div className="flex-1 min-w-[300px] relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name or email..."
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-card/50 text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              value={filters.search || ""}
              onChange={(e) =>
                setFilters({ ...filters, search: e.target.value })
              }
            />
          </div>

          <select
            className="px-4 py-2.5 rounded-lg border border-border bg-card/50 text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
            value={filters.role || ""}
            onChange={(e) =>
              setFilters({
                ...filters,
                role: e.target.value as any,
              })
            }
          >
            <option value="">All roles</option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>

          {groups.length > 0 && (
            <div className="relative">
              <select
                className={`pl-10 pr-4 py-2.5 rounded-lg border bg-card/50 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 ${filters.groupId
                  ? "border-cyan-500/50 bg-cyan-500/10"
                  : "border-border"
                  }`}
                value={filters.groupId || ""}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    groupId: e.target.value || undefined,
                  })
                }
              >
                <option value="">All groups</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name} ({group.memberCount})
                  </option>
                ))}
              </select>
              <UsersRound className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            </div>
          )}

          {(filters.search || filters.role || filters.groupId) && (
            <button
              onClick={() => setFilters({})}
              className="px-4 py-2.5 rounded-lg border border-border bg-card/50 text-muted-foreground hover:text-white hover:border-primary/50 transition-colors"
            >
              Clear filters
            </button>
          )}
        </div>

        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
            <p className="mt-4 text-muted-foreground">Loading users...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400">
            <p className="font-medium">Error loading users</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        )}

        {!loading && !error && (
          <div className="bg-card/50 border border-border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/30 border-b border-border">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Last Login
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center">
                        <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                        <p className="text-muted-foreground">No users found</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Try adjusting your filters
                        </p>
                      </td>
                    </tr>
                  ) : (
                    users.map((user) => (
                      <tr
                        key={user.id}
                        onClick={() => router.push(`/admin/users/${user.id}`)}
                        className="hover:bg-muted/20 transition-colors cursor-pointer"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {user.image ? (
                              <img
                                src={user.image}
                                alt={user.name}
                                className="w-10 h-10 rounded-full border border-border"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                                <span className="text-primary font-medium text-sm">
                                  {user.name
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")
                                    .toUpperCase()
                                    .slice(0, 2)}
                                </span>
                              </div>
                            )}
                            <div>
                              <div className="font-medium text-white">
                                {user.name}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {user.email}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <span className={getRoleBadgeClass(user.role)}>
                            <Shield className="w-3 h-3" />
                            {roles.find(r => r.id === user.role)?.name || user.role}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-sm text-muted-foreground">
                          {user.lastLogin
                            ? new Date(user.lastLogin).toLocaleDateString()
                            : "Never"}
                        </td>

                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            {user.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
