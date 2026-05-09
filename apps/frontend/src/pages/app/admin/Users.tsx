import { useEffect, useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@omarsapp/shared-api";
import type { User } from "@omarsapp/shared-types";
import { Card } from "../../../components/ui/Card";
import { Input } from "../../../components/ui/Input";
import { Button } from "../../../components/ui/Button";
import { Badge } from "../../../components/ui/Badge";
import { Search, AlertTriangle, UserX } from "lucide-react";

interface UsersResponse {
  users: User[];
  total: number;
}

function SkeletonRow() {
  return (
    <tr>
      {[1, 2, 3, 4, 5].map((i) => (
        <td key={i} className="px-6 py-4">
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
        </td>
      ))}
    </tr>
  );
}

export default function Users() {
  useEffect(() => {
    document.title = "Users — Admin";
  }, []);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const queryClient = useQueryClient();

  // Debounce search input 300ms
  const debounceRef = useCallback((value: string) => {
    const timer = setTimeout(() => {
      setDebouncedSearch(value);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const cleanup = debounceRef(search);
    return cleanup;
  }, [search, debounceRef]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "users", debouncedSearch],
    queryFn: () => {
      const params = debouncedSearch
        ? `?search=${encodeURIComponent(debouncedSearch)}`
        : "";
      return apiClient.get<UsersResponse>(`/admin/users${params}`);
    },
  });

  const { mutate: updateRole, isPending: isUpdating } = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      apiClient.patch<User>(`/admin/users/${userId}`, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
  });

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Users
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {data?.total != null
              ? `${data.total} total users`
              : "Manage platform users"}
          </p>
        </div>
        <div className="w-64 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <Input
            placeholder="Search by email or name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 p-4 text-red-700 dark:text-red-400 text-sm mb-6">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          Failed to load users. Please try again.
        </div>
      )}

      <Card padding={false}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Email
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Name
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Role
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Created
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                <>
                  <SkeletonRow />
                  <SkeletonRow />
                  <SkeletonRow />
                </>
              ) : !data?.users?.length ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center">
                    <UserX className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                    <p className="text-slate-500 dark:text-slate-400">
                      {debouncedSearch
                        ? `No users found for "${debouncedSearch}"`
                        : "No users yet"}
                    </p>
                  </td>
                </tr>
              ) : (
                data.users.map((user) => (
                  <tr
                    key={user.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="px-6 py-4 text-slate-900 dark:text-white font-medium">
                      {user.email}
                    </td>
                    <td className="px-6 py-4 text-slate-700 dark:text-slate-300">
                      {user.name}
                    </td>
                    <td className="px-6 py-4">
                      <Badge
                        variant={
                          user.role === "admin" || user.role === "owner"
                            ? "danger"
                            : "info"
                        }
                      >
                        {user.role}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {new Date(user.createdAt).toLocaleDateString("de-DE")}
                    </td>
                    <td className="px-6 py-4">
                      {user.role === "admin" || user.role === "owner" ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          loading={isUpdating}
                          onClick={() =>
                            updateRole({ userId: user.id, role: "member" })
                          }
                        >
                          Remove Admin
                        </Button>
                      ) : (
                        <Button
                          variant="secondary"
                          size="sm"
                          loading={isUpdating}
                          onClick={() =>
                            updateRole({ userId: user.id, role: "admin" })
                          }
                        >
                          Make Admin
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
