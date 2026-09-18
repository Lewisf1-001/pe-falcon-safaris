"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AuthUser, getAuthToken } from "@/lib/auth";
import type { Notification } from "@/types/notification";
import {
  fetchUserNotifications,
  fetchUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
} from "@/lib/notifications";
import {
  applyMarkAllRead,
  applyMarkOneRead,
  formatUnreadBadgeCount,
  getNotificationUserErrorMessage,
  NOTIFICATION_PANEL_LIMIT,
} from "@/lib/notification-ui";
import NotificationList from "@/components/notifications/NotificationList";

type DashboardNotificationsProps = {
  user: AuthUser;
};

export default function DashboardNotifications({ user: _user }: DashboardNotificationsProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const markingIds = useRef<Set<number>>(new Set());

  const loadData = useCallback(async () => {
    const token = await getAuthToken();
    if (!token) {
      setIsLoading(false);
      return;
    }
    setError(null);
    try {
      const [notifs, count] = await Promise.all([
        fetchUserNotifications(token, NOTIFICATION_PANEL_LIMIT),
        fetchUnreadCount(token),
      ]);
      setNotifications(notifs);
      setUnreadCount(count);
    } catch {
      setError(getNotificationUserErrorMessage());
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleMarkRead(id: number) {
    if (markingIds.current.has(id)) return;
    const target = notifications.find((n) => n.id === id);
    if (target?.isRead) return;

    markingIds.current.add(id);
    const token = await getAuthToken();
    if (!token) {
      markingIds.current.delete(id);
      return;
    }

    setNotifications((prev) => {
      const next = applyMarkOneRead(prev, unreadCount, id);
      setUnreadCount(next.unreadCount);
      return next.notifications;
    });

    try {
      await markNotificationRead(token, id);
    } catch {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: false, readAt: null } : n))
      );
      setUnreadCount((prev) => prev + 1);
    } finally {
      markingIds.current.delete(id);
    }
  }

  async function handleMarkAllRead() {
    if (unreadCount <= 0) return;
    const token = await getAuthToken();
    if (!token) return;

    const previous = notifications;
    const previousCount = unreadCount;
    const next = applyMarkAllRead(notifications);
    setNotifications(next.notifications);
    setUnreadCount(next.unreadCount);

    try {
      await markAllNotificationsRead(token);
    } catch {
      setNotifications(previous);
      setUnreadCount(previousCount);
    }
  }

  const badge = formatUnreadBadgeCount(unreadCount);
  const visible = isExpanded ? notifications : notifications.slice(0, 5);

  return (
    <section className="rounded-xl bg-white p-6 shadow-lg sm:p-8" aria-labelledby="dashboard-notifications-heading">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <h2 id="dashboard-notifications-heading" className="text-lg font-semibold text-forest">
            Notifications
          </h2>
          {badge && (
            <span
              className="inline-flex items-center justify-center rounded-full bg-red-500 px-2.5 py-0.5 text-xs font-bold text-white"
              aria-label={`${unreadCount} unread notifications`}
            >
              <span aria-hidden="true">{badge}</span>
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
              Mark all as read
            </button>
          )}
          {notifications.length > 5 && (
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs font-medium text-forest hover:underline"
            >
              {isExpanded ? "Show less" : "View all"}
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <p className="mt-4 text-sm text-gray-500">Loading notifications...</p>
      ) : error ? (
        <div className="mt-4">
          <p className="text-sm text-gray-600">{error}</p>
          <button
            type="button"
            onClick={() => {
              setIsLoading(true);
              loadData();
            }}
            className="mt-2 text-xs font-medium text-forest hover:underline"
          >
            Try again
          </button>
        </div>
      ) : (
        <NotificationList
          notifications={visible}
          onMarkRead={handleMarkRead}
          emptyMessage={"No notifications yet. You'll be notified about bookings, payments, and safari updates."}
        />
      )}
    </section>
  );
}
