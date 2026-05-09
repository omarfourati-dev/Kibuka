import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@omarsapp/shared-api";
import type { FeatureFlags } from "@omarsapp/shared-types";
import { Card } from "../../../components/ui/Card";
import { ToggleLeft, AlertTriangle } from "lucide-react";
import { cn } from "../../../utils/cn";

interface FlagConfig {
  key: keyof FeatureFlags;
  label: string;
  description: string;
}

const FLAG_CONFIGS: FlagConfig[] = [
  {
    key: "enableAi",
    label: "AI Chat",
    description: "Enable the AI chat interface for all users.",
  },
  {
    key: "enableRag",
    label: "Retrieval-Augmented Generation",
    description: "Allow users to query documents via RAG pipeline.",
  },
  {
    key: "enableAgents",
    label: "AI Agents",
    description:
      "Enable multi-step ReAct agents powered by OpenAI function calling.",
  },
  {
    key: "enableBilling",
    label: "Stripe Billing",
    description: "Activate subscription management and payment flows.",
  },
  {
    key: "enableMultiTenant",
    label: "Multi-Tenant Mode",
    description: "Isolate data by tenant for B2B deployments.",
  },
  {
    key: "enableWebsockets",
    label: "WebSockets",
    description: "Enable real-time connections for live collaboration.",
  },
  {
    key: "enableAiCodeEditor",
    label: "AI Code Editor",
    description: "Show the AI-powered code editor in the admin panel.",
  },
];

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

function ToggleSwitch({ checked, onChange, disabled }: ToggleSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent",
        "transition-colors duration-200 ease-in-out",
        "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        checked ? "bg-blue-600" : "bg-slate-200 dark:bg-slate-700",
      )}
    >
      <span
        className={cn(
          "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm ring-0",
          "transition-transform duration-200 ease-in-out",
          checked ? "translate-x-5" : "translate-x-0",
        )}
      />
    </button>
  );
}

export default function FeatureFlags() {
  useEffect(() => {
    document.title = "Feature Flags — Admin";
  }, []);

  const queryClient = useQueryClient();

  const {
    data: flags,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["admin", "feature-flags"],
    queryFn: () => apiClient.get<FeatureFlags>("/admin/feature-flags"),
  });

  const { mutate: toggleFlag, isPending } = useMutation({
    mutationFn: ({
      flag,
      enabled,
    }: {
      flag: keyof FeatureFlags;
      enabled: boolean;
    }) =>
      apiClient.patch<FeatureFlags>("/admin/feature-flags", { flag, enabled }),

    // Optimistic update
    onMutate: async ({ flag, enabled }) => {
      await queryClient.cancelQueries({ queryKey: ["admin", "feature-flags"] });
      const previous = queryClient.getQueryData<FeatureFlags>([
        "admin",
        "feature-flags",
      ]);
      queryClient.setQueryData<FeatureFlags>(
        ["admin", "feature-flags"],
        (old) => (old ? { ...old, [flag]: enabled } : old),
      );
      return { previous };
    },

    onError: (_err, _vars, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(["admin", "feature-flags"], context.previous);
      } else {
        // Cache was empty when mutation started — force refetch to get real state
        queryClient.invalidateQueries({ queryKey: ["admin", "feature-flags"] });
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "feature-flags"] });
    },
  });

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <ToggleLeft className="w-6 h-6" />
          Feature Flags
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Toggle features platform-wide. Changes take effect immediately.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 p-4 text-red-700 dark:text-red-400 text-sm mb-6">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          Failed to load feature flags. Please try again.
        </div>
      )}

      <Card padding={false}>
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {FLAG_CONFIGS.map(({ key, label, description }) => {
            const isChecked = flags ? !!flags[key] : false;
            return (
              <li
                key={key}
                className="flex items-center justify-between gap-4 px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  {isLoading ? (
                    <>
                      <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mb-1.5" />
                      <div className="h-3 w-56 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">
                        {label}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {description}
                      </p>
                    </>
                  )}
                </div>
                {isLoading ? (
                  <div className="h-6 w-11 bg-slate-200 dark:bg-slate-700 rounded-full animate-pulse flex-shrink-0" />
                ) : (
                  <ToggleSwitch
                    checked={isChecked}
                    onChange={(enabled) => toggleFlag({ flag: key, enabled })}
                    disabled={isPending}
                  />
                )}
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}
