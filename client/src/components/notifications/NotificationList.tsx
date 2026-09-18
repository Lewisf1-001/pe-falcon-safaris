"use client";

import Link from "next/link";
import type { Notification } from "@/types/notification";
import { buildNotificationItemView } from "@/lib/notification-ui";

type NotificationListProps = {
  notifications: Notification[];
  onMarkRead: (id: number) => void;
  onNavigate?: (notif: Notification) => void;
  emptyMessage?: string;
  compact?: boolean;
};

export default function NotificationList({
  notifications,
  onMarkRead,
  onNavigate,
  emptyMessage = "No notifications yet.",
  compact = false,
}: NotificationListProps) {
  if (notifications.length === 0) {
    return (
      <p className={`text-sm text-gray-500 ${compact ? "px-3 py-4" : "mt-4"}`}>{emptyMessage}</p>
    );
  }

  return (
    <ul className={compact ? "divide-y divide-gray-100" : "mt-4 space-y-2"} role="list">
      {notifications.map((notif) => {
        const view = buildNotificationItemView(notif);

        const body = (
          <div
            className={`flex items-start gap-3 transition-colors ${
              compact ? "px-3 py-3 hover:bg-gray-50" : "rounded-lg p-3"
            } ${
              view.isRead
                ? compact
                  ? ""
                  : "bg-gray-50"
                : compact
                  ? "bg-champagne/5"
                  : "border border-champagne/30 bg-champagne/5"
            }`}
          >
            <span className="mt-0.5 text-lg" aria-hidden="true">
              {view.icon}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p
                  className={`text-sm ${
                    view.isRead ? "font-medium text-gray-700" : "font-semibold text-forest"
                  }`}
                >
                  {view.title}
                </p>
                {view.showUnreadIndicator && (
                  <span
                    className="h-2 w-2 shrink-0 rounded-full bg-champagne"
                    aria-label="Unread"
                    title="Unread"
                  />
                )}
              </div>
              <p className="mt-0.5 text-sm text-gray-500 line-clamp-2">{view.message}</p>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="text-xs text-gray-400">{view.timeLabel}</span>
                <span className="text-xs text-gray-400">{view.typeLabel}</span>
              </div>
            </div>
            {view.showUnreadIndicator && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onMarkRead(view.id);
                }}
                className="shrink-0 rounded px-1.5 py-0.5 text-xs text-gray-400 hover:bg-white hover:text-forest focus:outline-none focus-visible:ring-2 focus-visible:ring-champagne"
                aria-label={view.markReadLabel}
              >
                ✓
              </button>
            )}
          </div>
        );

        if (view.href) {
          return (
            <li key={view.id}>
              <Link
                href={view.href}
                className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-champagne"
                onClick={() => {
                  if (!view.isRead) onMarkRead(view.id);
                  onNavigate?.(notif);
                }}
              >
                {body}
              </Link>
            </li>
          );
        }

        return (
          <li key={view.id}>
            <button
              type="button"
              className="block w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-champagne"
              onClick={() => {
                if (!view.isRead) onMarkRead(view.id);
                onNavigate?.(notif);
              }}
            >
              {body}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
