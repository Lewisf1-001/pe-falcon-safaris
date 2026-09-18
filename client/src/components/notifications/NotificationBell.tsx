"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { getAuthToken } from "@/lib/auth";
import type { Notification } from "@/types/notification";
import {
  fetchUserNotifications,
  fetchUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/notifications";
import {
  applyMarkAllRead,
  applyMarkOneRead,
  formatUnreadBadgeCount,
  getNotificationUserErrorMessage,
  NOTIFICATION_PANEL_LIMIT,
} from "@/lib/notification-ui";
import NotificationList from "@/components/notifications/NotificationList";

function BellIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}

export default function NotificationBell() {
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const markingIds = useRef<Set<number>>(new Set());

  const loadData = useCallback(async () => {
    const token = await getAuthToken();
    if (!token) return;
    setIsLoading(true);
    setError(null);
    try {
      const [notifs, count] = await Promise.all([
        fetchUserNotifications(token, NOTIFICATION_PANEL_LIMIT),
        fetchUnreadCount(token),
      ]);
      setNotifications(notifs);
      setUnreadCount(count);
      setHasLoaded(true);
    } catch {
      setError(getNotificationUserErrorMessage());
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Lightweight unread badge while closed
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = await getAuthToken();
      if (!token || cancelled) return;
      try {
        const count = await fetchUnreadCount(token);
        if (!cancelled) setUnreadCount(count);
      } catch {
        // Keep badge quiet if count fails; panel will show error on open.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    loadData();
  }, [isOpen, loadData]);

  useEffect(() => {
    if (!isOpen) return;

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

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

    // Optimistic UI
    const next = applyMarkOneRead(notifications, unreadCount, id);
    setNotifications(next.notifications);
    setUnreadCount(next.unreadCount);

    try {
      await markNotificationRead(token, id);
    } catch {
      // Revert on failure
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: false, readAt: null } : n))
      );
      setUnreadCount((prev) => prev + 1);
    } finally {
      markingIds.current.delete(id);
    }
  }

  async function handleMarkAllRead() {
    if (unreadCount <= 0 || isMarkingAll) return;
    setIsMarkingAll(true);
    const token = await getAuthToken();
    if (!token) {
      setIsMarkingAll(false);
      return;
    }

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
    } finally {
      setIsMarkingAll(false);
    }
  }

  const badge = formatUnreadBadgeCount(unreadCount);
  const label =
    unreadCount > 0
      ? `Notifications, ${unreadCount} unread`
      : "Notifications";

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        className="relative inline-flex items-center justify-center rounded-sm p-1.5 text-white/70 transition-colors hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-champagne"
        aria-label={label}
        aria-expanded={isOpen}
        aria-controls={panelId}
        aria-haspopup="dialog"
        onClick={() => setIsOpen((open) => !open)}
      >
        <BellIcon className="h-5 w-5" />
        {badge && (
          <span className="absolute -right-1 -top-1 inline-flex min-w-[1.15rem] items-center justify-center rounded-full bg-champagne px-1 py-0.5 text-[10px] font-bold leading-none text-forest">
            <span className="sr-only">{unreadCount} unread</span>
            <span aria-hidden="true">{badge}</span>
          </span>
        )}
      </button>

      {isOpen && (
        <div
          id={panelId}
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 z-50 mt-3 w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl"
        >
          <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-3 py-2.5">
            <p className="text-sm font-semibold text-forest">Notifications</p>
            <div className="flex items-center gap-3">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  disabled={isMarkingAll}
                  className="text-xs font-medium text-forest hover:underline disabled:opacity-50"
                >
                  Mark all as read
                </button>
              )}
              <Link
                href="/dashboard"
                className="text-xs font-medium text-gray-500 hover:text-forest"
                onClick={() => setIsOpen(false)}
              >
                View all
              </Link>
            </div>
          </div>

          <div className="max-h-[min(24rem,70vh)] overflow-y-auto">
            {isLoading && !hasLoaded ? (
              <p className="px-3 py-4 text-sm text-gray-500">Loading notifications...</p>
            ) : error ? (
              <div className="px-3 py-4">
                <p className="text-sm text-gray-600">{error}</p>
                <button
                  type="button"
                  onClick={loadData}
                  className="mt-2 text-xs font-medium text-forest hover:underline"
                >
                  Try again
                </button>
              </div>
            ) : (
              <NotificationList
                notifications={notifications}
                onMarkRead={handleMarkRead}
                onNavigate={() => setIsOpen(false)}
                emptyMessage="No notifications yet."
                compact
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
