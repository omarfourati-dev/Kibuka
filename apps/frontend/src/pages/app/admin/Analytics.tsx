import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@omarsapp/shared-api";
import { Card } from "../../../components/ui/Card";
import { Badge } from "../../../components/ui/Badge";
import { Users, TrendingUp, Bot, AlertTriangle } from "lucide-react";

interface AdminStats {
  totalUsers: number;
  mrr: number;
  aiRequestsLast30d: number;
  churnRate: number;
}

interface ActivityRow {
  timestamp: string;
  userEmail: string;
  action: string;
  status: "success" | "failed" | "pending";
}

const placeholderActivity: ActivityRow[] = [
  {
    timestamp: "2026-05-08 09:12",
    userEmail: "alice@example.com",
    action: "User registered",
    status: "success",
  },
  {
    timestamp: "2026-05-08 08:45",
    userEmail: "bob@acmecorp.de",
    action: "Subscription upgraded to Pro",
    status: "success",
  },
  {
    timestamp: "2026-05-08 07:30",
    userEmail: "carol@startup.io",
    action: "AI agent run (12 steps)",
    status: "success",
  },
  {
    timestamp: "2026-05-07 22:15",
    userEmail: "dave@example.com",
    action: "Document ingested (Q4-Report.pdf)",
    status: "failed",
  },
  {
    timestamp: "2026-05-07 18:00",
    userEmail: "eve@bigcorp.com",
    action: "Export user data (DSGVO)",
    status: "success",
  },
];

function StatCard({
  icon: Icon,
  label,
  value,
  loading,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number | undefined;
  loading: boolean;
}) {
  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">
            {label}
          </p>
          {loading ? (
            <div className="h-8 w-24 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse" />
          ) : (
            <p className="text-3xl font-bold text-slate-900 dark:text-white">
              {value ?? "—"}
            </p>
          )}
        </div>
        <div className="w-10 h-10 bg-blue-50 dark:bg-blue-950 rounded-xl flex items-center justify-center flex-shrink-0">
          <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </div>
      </div>
    </Card>
  );
}

export default function Analytics() {
  useEffect(() => {
    document.title = "Analytics — Admin";
  }, []);

  const {
    data: stats,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["admin", "platform-stats"],
    queryFn: () => apiClient.get<AdminStats>("/admin/stats"),
  });

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Analytics
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Platform KPIs and recent activity
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 p-4 text-red-700 dark:text-red-400 text-sm mb-6">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          Failed to load statistics. Please refresh the page.
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={Users}
          label="Total Users"
          value={stats?.totalUsers?.toLocaleString()}
          loading={isLoading}
        />
        <StatCard
          icon={TrendingUp}
          label="MRR (€)"
          value={
            stats?.mrr != null
              ? `€${stats.mrr.toLocaleString("de-DE", { minimumFractionDigits: 2 })}`
              : undefined
          }
          loading={isLoading}
        />
        <StatCard
          icon={Bot}
          label="AI Requests (30d)"
          value={stats?.aiRequestsLast30d?.toLocaleString()}
          loading={isLoading}
        />
        <StatCard
          icon={AlertTriangle}
          label="Churn Rate"
          value={
            stats?.churnRate != null
              ? `${stats.churnRate.toFixed(1)}%`
              : undefined
          }
          loading={isLoading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue chart placeholder */}
        <div className="lg:col-span-1">
          <Card>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-500" />
              Revenue Trend
            </h2>
            <div className="h-40 flex flex-col items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-600">
              <TrendingUp className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-2" />
              <p className="text-sm text-slate-400 dark:text-slate-500 text-center">
                Revenue chart coming soon
              </p>
            </div>
          </Card>
        </div>

        {/* Recent activity table */}
        <div className="lg:col-span-2">
          <Card padding={false}>
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Recent Activity
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Time
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      User
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Action
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {placeholderActivity.map((row, i) => (
                    <tr
                      key={i}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="px-6 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap font-mono text-xs">
                        {row.timestamp}
                      </td>
                      <td className="px-6 py-3 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {row.userEmail}
                      </td>
                      <td className="px-6 py-3 text-slate-900 dark:text-white">
                        {row.action}
                      </td>
                      <td className="px-6 py-3">
                        <Badge
                          variant={
                            row.status === "success"
                              ? "success"
                              : row.status === "failed"
                                ? "danger"
                                : "warning"
                          }
                        >
                          {row.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
