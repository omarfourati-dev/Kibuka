import { NavLink, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  LayoutDashboard,
  MessageSquare,
  FolderOpen,
  Settings,
  Bot,
} from "lucide-react";
import { cn } from "../../utils/cn";

const navItems = [
  { to: "/app/dashboard", icon: LayoutDashboard, labelKey: "nav.dashboard" },
  { to: "/app/ai", icon: MessageSquare, labelKey: "nav.ai_chat" },
  { to: "/app/agents", icon: Bot, labelKey: "nav.agents" },
  { to: "/app/spaces", icon: FolderOpen, labelKey: "nav.spaces" },
  { to: "/app/settings", icon: Settings, labelKey: "nav.settings" },
];

export function Sidebar() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  return (
    <aside className="flex flex-col h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700">
      <div className="p-4 border-b border-slate-200 dark:border-slate-700">
        <span className="font-bold text-lg text-slate-900 dark:text-white">
          MyApp
        </span>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map(({ to, icon: Icon, labelKey }) => (
          <NavLink
            key={to}
            to={to}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors",
              pathname.startsWith(to)
                ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800",
            )}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {t(labelKey, labelKey)}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
