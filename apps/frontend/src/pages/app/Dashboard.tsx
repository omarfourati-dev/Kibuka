import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@omarsapp/shared-stores";
import { apiClient } from "@omarsapp/shared-api";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import {
  FolderOpen,
  MessageSquare,
  Users,
  Webhook,
  Plus,
  Upload,
  TrendingUp,
  FileText,
  UserPlus,
  Bot,
  CreditCard,
} from "lucide-react";

interface AdminStats {
  totalSpaces: number;
  aiRequestsToday: number;
  activeUsers: number;
  webhookDeliveries: number;
}

interface ActivityItem {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  time: string;
}

const recentActivity: ActivityItem[] = [
  {
    id: "1",
    icon: UserPlus,
    title: "New user registered",
    description: "alice@example.com joined via Google OAuth",
    time: "2 minutes ago",
  },
  {
    id: "2",
    icon: FolderOpen,
    title: "Space created",
    description: '"Marketing Hub" space created by Omar Fourati',
    time: "14 minutes ago",
  },
  {
    id: "3",
    icon: Bot,
    title: "Agent run completed",
    description: "Research agent finished 12-step task in 48 seconds",
    time: "1 hour ago",
  },
  {
    id: "4",
    icon: FileText,
    title: "Document ingested",
    description: "Q4-Report.pdf processed — 42 chunks indexed",
    time: "3 hours ago",
  },
  {
    id: "5",
    icon: CreditCard,
    title: "Subscription upgraded",
    description: 'Tenant "Acme Corp" upgraded from Free to Pro',
    time: "5 hours ago",
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
  value: number | undefined;
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
            <div className="h-8 w-20 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse" />
          ) : (
            <p className="text-3xl font-bold text-slate-900 dark:text-white">
              {value?.toLocaleString() ?? "—"}
            </p>
          )}
        </div>
        <div className="w-10 h-10 bg-blue-50 dark:bg-blue-950 rounded-xl flex items-center justify-center">
          <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </div>
      </div>
    </Card>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();

  useEffect(() => {
    document.title = "Dashboard — OmarsApp";
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError,
  } = useQuery({
    queryKey: ["admin", "stats"],
    queryFn: () => apiClient.get<AdminStats>("/admin/stats"),
    enabled: isAuthenticated,
  });

  if (!isAuthenticated) return null;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Welcome back{user?.name ? `, ${user.name.split(" ")[0]}` : ""}!
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">
          Here's what's happening in your workspace.
        </p>
      </div>

      {/* Error state */}
      {statsError && (
        <div className="rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 p-4 text-red-700 dark:text-red-400 text-sm mb-8">
          Failed to load statistics. Please refresh the page.
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={FolderOpen}
          label="Total Spaces"
          value={stats?.totalSpaces}
          loading={statsLoading}
        />
        <StatCard
          icon={MessageSquare}
          label="AI Requests Today"
          value={stats?.aiRequestsToday}
          loading={statsLoading}
        />
        <StatCard
          icon={Users}
          label="Active Users"
          value={stats?.activeUsers}
          loading={statsLoading}
        />
        <StatCard
          icon={Webhook}
          label="Webhook Deliveries"
          value={stats?.webhookDeliveries}
          loading={statsLoading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity feed */}
        <div className="lg:col-span-2">
          <Card>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-500" />
                Recent Activity
              </h2>
            </div>
            <div className="space-y-4">
              {recentActivity.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.id} className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Icon className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-white">
                        {item.title}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {item.description}
                      </p>
                    </div>
                    <span className="text-xs text-slate-400 dark:text-slate-500 flex-shrink-0">
                      {item.time}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Quick actions */}
        <div>
          <Card>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              Quick Actions
            </h2>
            <div className="space-y-3">
              <Link to="/app/spaces" className="block">
                <Button
                  variant="secondary"
                  className="w-full justify-start gap-2"
                >
                  <Plus className="w-4 h-4" />
                  New Space
                </Button>
              </Link>
              <Link to="/app/ai" className="block">
                <Button
                  variant="secondary"
                  className="w-full justify-start gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Upload Document
                </Button>
              </Link>
              <Link to="/app/ai" className="block">
                <Button
                  variant="secondary"
                  className="w-full justify-start gap-2"
                >
                  <MessageSquare className="w-4 h-4" />
                  Start AI Chat
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
