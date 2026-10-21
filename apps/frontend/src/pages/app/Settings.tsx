import { useEffect, useRef, useState } from "react";
import { useHistory } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { useAuthStore } from "@omarsapp/shared-stores";
import { apiClient } from "@omarsapp/shared-api";
import type { User } from "@omarsapp/shared-types";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import {
  AlertTriangle,
  CheckCircle,
  Trash2,
  User as UserIcon,
} from "lucide-react";

export default function Settings() {
  const history = useHistory();
  const { user, setUser, clearUser } = useAuthStore();

  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState("");

  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteError, setDeleteError] = useState("");

  const profileTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    document.title = "Settings — OmarsApp";
  }, []);

  useEffect(() => {
    if (user) {
      setName(user.name ?? "");
      setEmail(user.email ?? "");
    }
  }, [user]);

  useEffect(() => {
    return () => {
      if (profileTimerRef.current) clearTimeout(profileTimerRef.current);
    };
  }, []);

  const updateProfile = useMutation({
    mutationFn: (data: { name: string; avatarUrl?: string }) =>
      apiClient.patch<User>("/users/me", data),
    onSuccess: (updatedUser) => {
      setUser({
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        role: updatedUser.role,
        spaceId: updatedUser.spaceId,
      });
      setProfileSaved(true);
      setProfileError("");
      if (profileTimerRef.current) clearTimeout(profileTimerRef.current);
      profileTimerRef.current = setTimeout(() => setProfileSaved(false), 3000);
    },
    onError: (err: unknown) => {
      if (err instanceof Error) {
        setProfileError(err.message);
      } else {
        setProfileError("Failed to save profile.");
      }
    },
  });

  const deleteAccount = useMutation({
    mutationFn: () => apiClient.delete("/users/me"),
    onSuccess: () => {
      clearUser();
      history.replace("/");
    },
    onError: (err: unknown) => {
      if (err instanceof Error) {
        setDeleteError(err.message);
      } else {
        setDeleteError("Failed to delete account.");
      }
    },
  });

  const handleProfileSave = (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError("");
    setProfileSaved(false);
    if (avatarUrl && !avatarUrl.startsWith("https://")) {
      setProfileError("Avatar URL must use HTTPS.");
      return;
    }
    updateProfile.mutate({ name, ...(avatarUrl ? { avatarUrl } : {}) });
  };

  const handleDeleteAccount = () => {
    setDeleteError("");
    deleteAccount.mutate();
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Settings
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">
          Manage your account and preferences.
        </p>
      </div>

      {/* Profile section */}
      <Card className="mb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 bg-blue-50 dark:bg-blue-950 rounded-xl flex items-center justify-center">
            <UserIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Profile
          </h2>
        </div>

        <form onSubmit={handleProfileSave} className="space-y-4">
          <Input
            label="Full name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            required
          />
          <Input
            label="Email address"
            type="email"
            value={email}
            onChange={() => undefined}
            disabled
            className="opacity-60 cursor-not-allowed"
          />
          <Input
            label="Avatar URL"
            type="url"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            placeholder="https://example.com/avatar.jpg"
          />

          {profileError && (
            <p className="text-sm text-red-600 dark:text-red-400">
              {profileError}
            </p>
          )}

          <div className="flex items-center gap-3">
            <Button type="submit" loading={updateProfile.isPending}>
              Save Changes
            </Button>
            {profileSaved && (
              <span className="flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400">
                <CheckCircle className="w-4 h-4" />
                Saved!
              </span>
            )}
          </div>
        </form>
      </Card>

      {/* Danger zone */}
      <Card>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 bg-red-50 dark:bg-red-950 rounded-xl flex items-center justify-center">
            <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-lg font-semibold text-red-600 dark:text-red-400">
            Danger Zone
          </h2>
        </div>

        <div className="border border-red-200 dark:border-red-800 rounded-xl p-4">
          <h3 className="font-medium text-slate-900 dark:text-white mb-1">
            Delete Account
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            Permanently delete your account and all associated data. This action
            cannot be undone.
          </p>

          <div className="space-y-3">
            <Input
              label='Type "DELETE" to confirm'
              type="text"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder="DELETE"
            />
            {deleteError && (
              <p className="text-sm text-red-600 dark:text-red-400">
                {deleteError}
              </p>
            )}
            <Button
              variant="danger"
              loading={deleteAccount.isPending}
              disabled={deleteConfirm !== "DELETE"}
              onClick={handleDeleteAccount}
              className="gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Delete My Account
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
