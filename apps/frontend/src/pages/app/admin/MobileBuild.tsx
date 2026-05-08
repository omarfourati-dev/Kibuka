import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiClient } from "@omarsapp/shared-api";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import {
  CheckCircle,
  XCircle,
  RefreshCw,
  Clock,
  ExternalLink,
  Smartphone,
  AlertTriangle,
} from "lucide-react";
import { cn } from "../../../utils/cn";

type BuildProfile = "development" | "preview" | "production";
type BuildStatus =
  | "queued"
  | "in_progress"
  | "finished"
  | "errored"
  | "canceled";
type Platform = "ios" | "android" | "all";

interface Build {
  id: string;
  profile: BuildProfile;
  platform: Platform;
  status: BuildStatus;
  createdAt: string;
  artifactUrl?: string;
}

interface BuildsResponse {
  builds: Build[];
}

interface TriggerResponse {
  buildId: string;
  message: string;
}

const profiles: BuildProfile[] = ["development", "preview", "production"];

const profileLabels: Record<BuildProfile, string> = {
  development: "Development",
  preview: "Preview",
  production: "Production",
};

function StatusIcon({ status }: { status: BuildStatus }) {
  switch (status) {
    case "finished":
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    case "errored":
    case "canceled":
      return <XCircle className="w-4 h-4 text-red-500" />;
    case "in_progress":
      return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />;
    default:
      return <Clock className="w-4 h-4 text-slate-400" />;
  }
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

export default function MobileBuild() {
  useEffect(() => {
    document.title = "Mobile Build — Admin";
  }, []);

  const [selectedProfile, setSelectedProfile] =
    useState<BuildProfile>("development");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    data: buildsData,
    isLoading: buildsLoading,
    error: buildsError,
  } = useQuery({
    queryKey: ["admin", "mobile", "builds"],
    queryFn: () => apiClient.get<BuildsResponse>("/admin/mobile/builds"),
    refetchInterval: 15_000,
  });

  const { mutate: triggerBuild, isPending: isTriggering } = useMutation({
    mutationFn: (profile: BuildProfile) =>
      apiClient.post<TriggerResponse>("/admin/mobile/build", { profile }),
    onSuccess: (data) => {
      setSuccessMessage(data.message ?? `Build started (${data.buildId})`);
      setTimeout(() => setSuccessMessage(null), 5000);
    },
  });

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Smartphone className="w-6 h-6" />
          Mobile Build
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Trigger EAS builds via GitHub Actions. Build history refreshes every
          15s.
        </p>
      </div>

      {/* Trigger card */}
      <Card className="mb-6">
        <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-4">
          Start New Build
        </h2>

        {/* Profile selector */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {profiles.map((profile) => (
            <button
              key={profile}
              onClick={() => setSelectedProfile(profile)}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-medium transition-colors border",
                selectedProfile === profile
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-blue-400",
              )}
            >
              {profileLabels[profile]}
            </button>
          ))}
        </div>

        <Button
          onClick={() => triggerBuild(selectedProfile)}
          loading={isTriggering}
          disabled={isTriggering}
        >
          Start Build
        </Button>

        {successMessage && (
          <div className="mt-3 text-sm text-green-600 dark:text-green-400">
            {successMessage}
          </div>
        )}
      </Card>

      {/* Build history */}
      <Card padding={false}>
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            Build History
          </h2>
          <span className="text-xs text-slate-400 dark:text-slate-500">
            Auto-refreshes every 15s
          </span>
        </div>

        {buildsError && (
          <div className="flex items-center gap-2 m-4 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 p-4 text-red-700 dark:text-red-400 text-sm">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            Failed to load builds.
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Profile
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Platform
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Started
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Download
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {buildsLoading ? (
                <>
                  <SkeletonRow />
                  <SkeletonRow />
                  <SkeletonRow />
                </>
              ) : !buildsData?.builds?.length ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-12 text-center text-slate-500 dark:text-slate-400"
                  >
                    No builds yet. Start one above.
                  </td>
                </tr>
              ) : (
                buildsData.builds.map((build) => (
                  <tr
                    key={build.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <StatusIcon status={build.status} />
                        <span className="text-slate-700 dark:text-slate-300 capitalize">
                          {build.status.replace("_", " ")}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-700 dark:text-slate-300 capitalize">
                      {build.profile}
                    </td>
                    <td className="px-6 py-4 text-slate-700 dark:text-slate-300 uppercase">
                      {build.platform}
                    </td>
                    <td className="px-6 py-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {new Date(build.createdAt).toLocaleString("de-DE")}
                    </td>
                    <td className="px-6 py-4">
                      {build.artifactUrl ? (
                        <a
                          href={build.artifactUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline text-sm"
                        >
                          Download
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-600">
                          —
                        </span>
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
