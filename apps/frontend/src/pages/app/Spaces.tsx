import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@omarsapp/shared-stores";
import { useSpaces, useCreateSpace } from "@omarsapp/shared-api";
import type { Space } from "@omarsapp/shared-types";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Badge } from "../../components/ui/Badge";
import { cn } from "../../utils/cn";
import { Plus, FolderOpen, X, ExternalLink } from "lucide-react";

function planVariant(
  plan: Space["plan"],
): "default" | "info" | "success" | "warning" {
  switch (plan) {
    case "pro":
      return "info";
    case "enterprise":
      return "success";
    case "starter":
      return "warning";
    default:
      return "default";
  }
}

function SpaceSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 animate-pulse">
      <div className="h-10 w-10 bg-slate-200 dark:bg-slate-700 rounded-xl mb-4" />
      <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded mb-2" />
      <div className="h-3 w-20 bg-slate-200 dark:bg-slate-700 rounded mb-4" />
      <div className="h-8 w-full bg-slate-200 dark:bg-slate-700 rounded-xl" />
    </div>
  );
}

export default function Spaces() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  const [showForm, setShowForm] = useState(false);
  const [spaceName, setSpaceName] = useState("");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    document.title = "Spaces — OmarsApp";
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const { data: spaces, isLoading, error } = useSpaces();

  const createSpace = useCreateSpace();

  const slugify = (str: string) =>
    str
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    const slug = slugify(spaceName);
    if (!slug) {
      setFormError("Please enter a valid space name.");
      return;
    }
    createSpace.mutate(
      { name: spaceName, slug },
      {
        onSuccess: () => {
          setSpaceName("");
          setShowForm(false);
        },
        onError: (err: unknown) => {
          if (err instanceof Error) {
            setFormError(err.message);
          } else {
            setFormError("Failed to create space.");
          }
        },
      },
    );
  };

  if (!isAuthenticated) return null;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Spaces
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Manage your workspaces and collaborations.
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="gap-2">
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? "Cancel" : "New Space"}
        </Button>
      </div>

      {/* Create form */}
      {showForm && (
        <Card className="mb-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Create Space
          </h2>
          <form onSubmit={handleCreate} className="flex gap-3 items-end">
            <div className="flex-1">
              <Input
                label="Space name"
                placeholder="e.g. Marketing Hub"
                value={spaceName}
                onChange={(e) => setSpaceName(e.target.value)}
                error={formError || undefined}
                required
                autoFocus
              />
            </div>
            <Button
              type="submit"
              loading={createSpace.isPending}
              className="mb-0.5"
            >
              Create
            </Button>
          </form>
          {spaceName && (
            <p className="text-xs text-slate-400 mt-2">
              Slug: <code className="font-mono">{slugify(spaceName)}</code>
            </p>
          )}
        </Card>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl px-4 py-3 text-sm mb-6">
          Failed to load spaces. Please refresh the page.
        </div>
      )}

      {/* Grid */}
      <div
        className={cn(
          "grid gap-4",
          "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
        )}
      >
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => <SpaceSkeleton key={i} />)
          : spaces?.map((space) => (
              <Card key={space.id} className="flex flex-col">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 bg-blue-50 dark:bg-blue-950 rounded-xl flex items-center justify-center">
                    <FolderOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <Badge variant={planVariant(space.plan)}>
                    {space.plan.charAt(0).toUpperCase() + space.plan.slice(1)}
                  </Badge>
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-white mb-1">
                  {space.name}
                </h3>
                <p className="text-xs text-slate-400 font-mono mb-4">
                  /{space.slug}
                </p>
                <div className="mt-auto">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full gap-2"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Open Space
                  </Button>
                </div>
              </Card>
            ))}

        {!isLoading && spaces?.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
            <FolderOpen className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-1">
              No spaces yet
            </h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">
              Create your first space to get started.
            </p>
            <Button onClick={() => setShowForm(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Create Space
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
