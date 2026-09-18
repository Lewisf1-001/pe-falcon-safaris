import type { Notification, NotificationType } from "@/types/notification";
import {
  NOTIFICATION_TYPE_LABELS,
  getNotificationIcon as getTypedNotificationIcon,
} from "@/types/notification";

/** Default fetch window for notification panels (bounded, newest first). */
export const NOTIFICATION_PANEL_LIMIT = 20;

/**
 * Map supported reference types to existing customer-facing routes.
 * Only routes that exist in this repository are returned.
 * Destination page auth remains the final authority.
 */
export function getNotificationHref(
  referenceType: string | null | undefined,
  referenceId: number | null | undefined
): string | null {
  if (!referenceType || referenceId == null || !Number.isFinite(referenceId) || referenceId <= 0) {
    return null;
  }

  switch (referenceType) {
    case "booking":
      return `/bookings/${referenceId}`;
    case "quotation":
      return `/quotations/${referenceId}`;
    case "payment":
      // Tier 2 payment notifications reference the booking id.
      return `/bookings/${referenceId}`;
    // review: no customer /reviews/[id] route — do not invent one
    default:
      return null;
  }
}

export function getNotificationHrefForItem(
  notif: Pick<Notification, "referenceType" | "referenceId">
): string | null {
  return getNotificationHref(notif.referenceType, notif.referenceId);
}

export function formatNotificationTime(dateStr: string, now = new Date()): string {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "";

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

export function getNotificationTypeLabel(type: string): string {
  if (type in NOTIFICATION_TYPE_LABELS) {
    return NOTIFICATION_TYPE_LABELS[type as NotificationType];
  }
  return "Notification";
}

export function getSafeNotificationIcon(type: string): string {
  if (
    type.startsWith("booking_") ||
    type.startsWith("payment_") ||
    type.startsWith("safari_") ||
    type === "itinerary_changed" ||
    type.startsWith("quotation_") ||
    type.startsWith("review_") ||
    type === "system"
  ) {
    return getTypedNotificationIcon(type as NotificationType);
  }
  return "🔔";
}

export function formatUnreadBadgeCount(count: number): string | null {
  if (!Number.isFinite(count) || count <= 0) return null;
  if (count > 99) return "99+";
  return String(Math.floor(count));
}

/** User-facing error copy — never surface Supabase/SQL internals. */
export function getNotificationUserErrorMessage(_error?: unknown): string {
  return "Unable to load notifications. Please try again.";
}

/** Presentation model used by NotificationList / NotificationBell. */
export type NotificationItemView = {
  id: number;
  title: string;
  message: string;
  timeLabel: string;
  typeLabel: string;
  icon: string;
  isRead: boolean;
  href: string | null;
  showUnreadIndicator: boolean;
  markReadLabel: string;
};

export function buildNotificationItemView(
  notif: Notification,
  now = new Date()
): NotificationItemView {
  return {
    id: notif.id,
    title: notif.title,
    message: notif.message,
    timeLabel: formatNotificationTime(notif.createdAt, now),
    typeLabel: getNotificationTypeLabel(notif.type),
    icon: getSafeNotificationIcon(notif.type),
    isRead: notif.isRead,
    href: getNotificationHrefForItem(notif),
    showUnreadIndicator: !notif.isRead,
    markReadLabel: `Mark "${notif.title}" as read`,
  };
}

export function applyMarkOneRead(
  notifications: Notification[],
  unreadCount: number,
  id: number
): { notifications: Notification[]; unreadCount: number } {
  const target = notifications.find((n) => n.id === id);
  if (!target || target.isRead) {
    return { notifications, unreadCount };
  }
  return {
    notifications: notifications.map((n) =>
      n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n
    ),
    unreadCount: Math.max(0, unreadCount - 1),
  };
}

export function applyMarkAllRead(
  notifications: Notification[]
): { notifications: Notification[]; unreadCount: number } {
  const now = new Date().toISOString();
  return {
    notifications: notifications.map((n) => ({
      ...n,
      isRead: true,
      readAt: n.readAt || now,
    })),
    unreadCount: 0,
  };
}
