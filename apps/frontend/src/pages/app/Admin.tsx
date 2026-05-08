import { lazy, Suspense } from "react";
import { Routes, Route, Navigate, NavLink } from "react-router-dom";
import { BarChart2, Users, Smartphone, Code2, ToggleLeft } from "lucide-react";
import { cn } from "../../utils/cn";

const Analytics = lazy(() => import("./admin/Analytics"));
const UsersPage = lazy(() => import("./admin/Users"));
const MobileBuild = lazy(() => import("./admin/MobileBuild"));
const AICodeEditor = lazy(() => import("./admin/AICodeEditor"));
const FeatureFlags = lazy(() => import("./admin/FeatureFlags"));

const navItems = [
  { to: "analytics", label: "Analytics", icon: BarChart2 },
  { to: "users", label: "Users", icon: Users },
  { to: "mobile-build", label: "Mobile Build", icon: Smartphone },
  { to: "ai-code-editor", label: "AI Code Editor", icon: Code2 },
  { to: "feature-flags", label: "Feature Flags", icon: ToggleLeft },
] as const;

const SubPageFallback = () => (
  <div className="flex h-64 items-center justify-center text-slate-500 dark:text-slate-400 text-sm">
    Loading...
  </div>
);

export default function Admin() {
  return (
    <div className="flex flex-col h-full">
      {/* Secondary nav */}
      <nav className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-6 py-0 flex-shrink-0">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors",
                isActive
                  ? "border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400"
                  : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100",
              )
            }
          >
            <Icon className="w-4 h-4" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Content */}
      <main className="flex-1 overflow-auto bg-slate-50 dark:bg-slate-950">
        <Suspense fallback={<SubPageFallback />}>
          <Routes>
            <Route index element={<Navigate to="analytics" replace />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="mobile-build" element={<MobileBuild />} />
            <Route path="ai-code-editor" element={<AICodeEditor />} />
            <Route path="feature-flags" element={<FeatureFlags />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  );
}
