import { useState } from "react";
import { Bell } from "lucide-react";
import {
  useNotifications,
  useMarkAllNotificationsRead,
} from "@omarsapp/shared-api";
import { Badge } from "../../ui/Badge";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { data: notifications } = useNotifications();
  const markAll = useMarkAllNotificationsRead();
  const unreadCount = (notifications || []).filter((n) => !n.read).length;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-80 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 z-50">
          <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
            <span className="font-medium text-sm">
              Notifications{" "}
              {unreadCount > 0 && <Badge variant="danger">{unreadCount}</Badge>}
            </span>
            <button
              onClick={() => {
                markAll.mutate();
                setOpen(false);
              }}
              className="text-xs text-blue-500 hover:underline"
            >
              Mark all read
            </button>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {(notifications || []).length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">
                No notifications
              </p>
            ) : (
              (notifications || []).map((n) => (
                <div
                  key={n.id}
                  className={`p-4 border-b border-slate-100 dark:border-slate-700 ${!n.read ? "bg-blue-50 dark:bg-blue-950/30" : ""}`}
                >
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {n.title}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">{n.message}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
