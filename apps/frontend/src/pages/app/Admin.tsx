import { lazy, Suspense } from "react";
import {
  Switch,
  Route,
  Redirect,
  NavLink,
  useRouteMatch,
  useLocation,
} from "react-router-dom";
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
  const { url, path } = useRouteMatch();
  const { pathname } = useLocation();
  return (
    <div className="flex flex-col h-full">
      {/* Secondary nav */}
      <nav className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-6 py-0 flex-shrink-0">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={`${url}/${to}`}
            className={cn(
              "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors",
              pathname.startsWith(`${url}/${to}`)
                ? "border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400"
                : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100",
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Content */}
      <main className="flex-1 overflow-auto bg-slate-50 dark:bg-slate-950">
        <Suspense fallback={<SubPageFallback />}>
          <Switch>
            <Route
              exact
              path={path}
              render={() => <Redirect to={`${url}/analytics`} />}
            />
            <Route path={`${path}/analytics`} component={Analytics} />
            <Route path={`${path}/users`} component={UsersPage} />
            <Route path={`${path}/mobile-build`} component={MobileBuild} />
            <Route path={`${path}/ai-code-editor`} component={AICodeEditor} />
            <Route path={`${path}/feature-flags`} component={FeatureFlags} />
          </Switch>
        </Suspense>
      </main>
    </div>
  );
}
