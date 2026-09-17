"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AuthUser, getAuthToken } from "@/lib/auth";
import {
  Notification,
  NOTIFICATION_TYPE_LABELS,
  getNotificationIcon,
} from "@/types/notification";
import {
  fetchUserNotifications,
  fetchUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
} from "@/lib/notifications";

type DashboardNotificationsProps = {
  user: AuthUser;
};

export default function DashboardNotifications({ user }: DashboardNotificationsProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  const loadData = useCallback(async () => {
    const token = await getAuthToken();
    if (!token) return;
    try {
      const [notifs, count] = await Promise.all([
        fetchUserNotifications(token, 20),
        fetchUnreadCount(token),
      ]);
      setNotifications(notifs);
      setUnreadCount(count);
    } catch {
      // Error handling
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleMarkRead(id: number) {
    const token = await getAuthToken();
    if (!token) return;
    try {
      await markNotificationRead(token, id);
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // Error handling
    }
  }

  async function handleMarkAllRead() {
    const token = await getAuthToken();
    if (!token) return;
    try {
      await markAllNotificationsRead(token);
      setNotifications((prev) =>
        prev.map((n) => ({
          ...n,
          isRead: true,
          readAt: n.readAt || new Date().toISOString(),
        }))
      );
      setUnreadCount(0);
    } catch {
      // Error handling
    }
  }

  function formatTime(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  function getNotificationLink(notif: Notification): string | null {
    if (notif.referenceType === "booking" && notif.referenceId) {
      return `/bookings/${notif.referenceId}`;
    }
    return null;
  }

  return (
    <section className="rounded-xl bg-white p-6 shadow-lg sm:p-8">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-forest">Notifications</h2>
          {unreadCount > 0 && (
            <span className="inline-flex items-center justify-center rounded-full bg-red-500 px-2.5 py-0.5 text-xs font-bold text-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="text-xs font-medium text-forest hover:underline"
            >
              Mark all read
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs font-medium text-forest hover:underline"
          >
            {isExpanded ? "Show less" : "View all"}
          </button>
        </div>
      </div>

      {isLoading ? (
        <p className="mt-4 text-sm text-gray-500">Loading notifications...</p>
      ) : notifications.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500">
          No notifications yet. You&apos;ll be notified about bookings, payments, and safari updates.
        </p>
      ) : (
        <div className="mt-4 space-y-2">
          {(isExpanded ? notifications : notifications.slice(0, 5)).map((notif) => {
            const link = getNotificationLink(notif);
            const content = (
              <div
                className={`flex items-start gap-3 rounded-lg p-3 transition-colors ${
                  notif.isRead
                    ? "bg-gray-50"
                    : "border border-champagne/30 bg-champagne/5"
                }`}
              >
                <span className="mt-0.5 text-lg" aria-hidden="true">
                  {getNotificationIcon(notif.type)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p
                      className={`text-sm font-medium ${
                        notif.isRead ? "text-gray-700" : "text-forest"
                      }`}
                    >
                      {notif.title}
                    </p>
                    {!notif.isRead && (
                      <span className="h-2 w-2 shrink-0 rounded-full bg-champagne" aria-label="Unread" />
                    )}
                  </div>
                  <p className="mt-0.5 text-sm text-gray-500 line-clamp-2">
                    {notif.message}
                  </p>
                  <div className="mt-1 flex items-center gap-3">
                    <span className="text-xs text-gray-400">
                      {formatTime(notif.createdAt)}
                    </span>
                    <span className="text-xs text-gray-400">
                      {NOTIFICATION_TYPE_LABELS[notif.type]}
                    </span>
                  </div>
                </div>
                {!notif.isRead && (
                  <button
                    type="button"
                    onClick={() => handleMarkRead(notif.id)}
                    className="shrink-0 text-xs text-gray-400 hover:text-forest"
                    aria-label="Mark as read"
                  >
                    ✓
                  </button>
                )}
              </div>
            );

            if (link) {
              return (
                <Link key={notif.id} href={link} className="block">
                  {content}
                </Link>
              );
            }

            return <div key={notif.id}>{content}</div>;
          })}
        </div>
      )}
    </section>
  );
}
