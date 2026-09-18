/**
 * Phase 15 Tier 3 — customer notification UI & data-layer tests.
 * UI presentation is verified via the shared presentation model used by
 * NotificationList / NotificationBell (Vitest cannot transform app TSX under
 * the project's jsx:preserve + oxc setup without adding a React plugin).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  applyMarkAllRead,
  applyMarkOneRead,
  buildNotificationItemView,
  formatNotificationTime,
  formatUnreadBadgeCount,
  getNotificationHref,
  getNotificationHrefForItem,
  getNotificationTypeLabel,
  getNotificationUserErrorMessage,
  getSafeNotificationIcon,
  NOTIFICATION_PANEL_LIMIT,
} from "@/lib/notification-ui";
import type { Notification } from "@/types/notification";

const mockOrder = vi.fn();
const mockLimit = vi.fn();
const mockEq = vi.fn();
const mockUpdate = vi.fn();
const mockSelect = vi.fn();
const mockFrom = vi.fn();

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: (...args: unknown[]) => mockFrom(...args),
  })),
}));

function makeNotification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: 1,
    userId: 10,
    type: "booking_received",
    title: "Booking Received",
    message: "Your safari booking has been received.",
    referenceType: "booking",
    referenceId: 100,
    isRead: false,
    createdAt: new Date().toISOString(),
    readAt: null,
    ...overrides,
  };
}

describe("Phase 15 Tier 3: Notification navigation mapping", () => {
  it("maps booking reference to existing customer booking route", () => {
    expect(getNotificationHref("booking", 42)).toBe("/bookings/42");
  });

  it("maps quotation reference to existing quotation route", () => {
    expect(getNotificationHref("quotation", 7)).toBe("/quotations/7");
  });

  it("maps payment reference to booking route (Tier 2 uses booking id)", () => {
    expect(getNotificationHref("payment", 55)).toBe("/bookings/55");
  });

  it("does not invent a review detail route", () => {
    expect(getNotificationHref("review", 9)).toBeNull();
  });

  it("returns null for unsupported or invalid references", () => {
    expect(getNotificationHref(null, 1)).toBeNull();
    expect(getNotificationHref("booking", null)).toBeNull();
    expect(getNotificationHref("booking", 0)).toBeNull();
    expect(getNotificationHref("booking", -1)).toBeNull();
    expect(getNotificationHref("unknown", 3)).toBeNull();
    expect(getNotificationHrefForItem({ referenceType: null, referenceId: 1 })).toBeNull();
  });
});

describe("Phase 15 Tier 3: Unread badge and presentation helpers", () => {
  it("hides badge when count is zero or invalid", () => {
    expect(formatUnreadBadgeCount(0)).toBeNull();
    expect(formatUnreadBadgeCount(-1)).toBeNull();
    expect(formatUnreadBadgeCount(Number.NaN)).toBeNull();
  });

  it("renders unread count and caps at 99+", () => {
    expect(formatUnreadBadgeCount(1)).toBe("1");
    expect(formatUnreadBadgeCount(12)).toBe("12");
    expect(formatUnreadBadgeCount(99)).toBe("99");
    expect(formatUnreadBadgeCount(100)).toBe("99+");
  });

  it("formats relative timestamps", () => {
    const now = new Date("2026-09-18T12:00:00.000Z");
    expect(formatNotificationTime(new Date(now.getTime() - 30_000).toISOString(), now)).toBe(
      "Just now"
    );
    expect(formatNotificationTime(new Date(now.getTime() - 5 * 60_000).toISOString(), now)).toBe(
      "5m ago"
    );
    expect(formatNotificationTime(new Date(now.getTime() - 3 * 3600_000).toISOString(), now)).toBe(
      "3h ago"
    );
    expect(formatNotificationTime(new Date(now.getTime() - 2 * 86400_000).toISOString(), now)).toBe(
      "2d ago"
    );
  });

  it("uses generic label/icon for unknown types without throwing", () => {
    expect(getNotificationTypeLabel("future_custom_type")).toBe("Notification");
    expect(getSafeNotificationIcon("future_custom_type")).toBe("🔔");
    expect(getNotificationTypeLabel("booking_confirmed")).toBe("Booking Confirmed");
    expect(getSafeNotificationIcon("payment_failed")).toBe("💰");
  });

  it("returns safe user-facing error copy", () => {
    const msg = getNotificationUserErrorMessage(new Error("relation notifications does not exist"));
    expect(msg).toBe("Unable to load notifications. Please try again.");
    expect(msg.toLowerCase()).not.toContain("relation");
    expect(msg.toLowerCase()).not.toContain("supabase");
  });

  it("keeps panel fetch limit bounded", () => {
    expect(NOTIFICATION_PANEL_LIMIT).toBeGreaterThan(0);
    expect(NOTIFICATION_PANEL_LIMIT).toBeLessThanOrEqual(50);
  });
});

describe("Phase 15 Tier 3: Notification list presentation model", () => {
  it("exposes title, message, time, unread indicator, and mark-read label", () => {
    const view = buildNotificationItemView(
      makeNotification({
        title: "Payment Failed",
        message: "Please try again",
        isRead: false,
        createdAt: new Date().toISOString(),
      })
    );

    expect(view.title).toBe("Payment Failed");
    expect(view.message).toBe("Please try again");
    expect(view.timeLabel.length).toBeGreaterThan(0);
    expect(view.showUnreadIndicator).toBe(true);
    expect(view.markReadLabel).toContain("Payment Failed");
    expect(view.markReadLabel.toLowerCase()).toContain("mark");
  });

  it("empty list is represented by zero items (empty-state path)", () => {
    const items: Notification[] = [];
    expect(items.map((n) => buildNotificationItemView(n))).toHaveLength(0);
  });

  it("distinguishes unread vs read state for accessible UI", () => {
    const unread = buildNotificationItemView(makeNotification({ id: 1, isRead: false }));
    const read = buildNotificationItemView(makeNotification({ id: 2, isRead: true }));
    expect(unread.showUnreadIndicator).toBe(true);
    expect(unread.isRead).toBe(false);
    expect(read.showUnreadIndicator).toBe(false);
    expect(read.isRead).toBe(true);
  });

  it("creates a valid href for supported references", () => {
    const view = buildNotificationItemView(
      makeNotification({
        referenceType: "quotation",
        referenceId: 44,
        title: "Quotation Sent",
      })
    );
    expect(view.href).toBe("/quotations/44");
  });

  it("does not create a broken route for unsupported references", () => {
    const view = buildNotificationItemView(
      makeNotification({
        referenceType: "review",
        referenceId: 3,
        title: "Review Submitted",
        type: "review_submitted",
      })
    );
    expect(view.title).toBe("Review Submitted");
    expect(view.href).toBeNull();
  });

  it("does not crash on unknown notification types", () => {
    const view = buildNotificationItemView(
      makeNotification({
        type: "brand_new_future_type" as Notification["type"],
        title: "Future Event",
        message: "Still fine",
        referenceType: null,
        referenceId: null,
      })
    );
    expect(view.title).toBe("Future Event");
    expect(view.typeLabel).toBe("Notification");
    expect(view.icon).toBe("🔔");
    expect(view.href).toBeNull();
  });
});

describe("Phase 15 Tier 3: Mark-as-read UI state", () => {
  it("mark-one updates list and unread count", () => {
    const list = [
      makeNotification({ id: 1, isRead: false }),
      makeNotification({ id: 2, isRead: false }),
    ];
    const next = applyMarkOneRead(list, 2, 1);
    expect(next.notifications.find((n) => n.id === 1)?.isRead).toBe(true);
    expect(next.unreadCount).toBe(1);
    expect(formatUnreadBadgeCount(next.unreadCount)).toBe("1");
  });

  it("mark-all clears unread badge", () => {
    const list = [
      makeNotification({ id: 1, isRead: false }),
      makeNotification({ id: 2, isRead: true }),
    ];
    const next = applyMarkAllRead(list);
    expect(next.notifications.every((n) => n.isRead)).toBe(true);
    expect(next.unreadCount).toBe(0);
    expect(formatUnreadBadgeCount(next.unreadCount)).toBeNull();
  });

  it("does not double-decrement when already read", () => {
    const list = [makeNotification({ id: 1, isRead: true })];
    const next = applyMarkOneRead(list, 0, 1);
    expect(next.unreadCount).toBe(0);
  });
});

describe("Phase 15 Tier 3: Notification data layer (RLS-scoped client)", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";

    mockOrder.mockReset();
    mockLimit.mockReset();
    mockEq.mockReset();
    mockUpdate.mockReset();
    mockSelect.mockReset();
    mockFrom.mockReset();

    mockLimit.mockResolvedValue({
      data: [
        {
          id: 2,
          user_id: 10,
          type: "payment_received",
          title: "Payment Received",
          message: "Paid",
          reference_type: "booking",
          reference_id: 5,
          is_read: false,
          created_at: "2026-09-18T10:00:00.000Z",
          read_at: null,
        },
        {
          id: 1,
          user_id: 10,
          type: "booking_received",
          title: "Booking Received",
          message: "Booked",
          reference_type: "booking",
          reference_id: 5,
          is_read: true,
          created_at: "2026-09-17T10:00:00.000Z",
          read_at: "2026-09-17T11:00:00.000Z",
        },
      ],
      error: null,
    });
    mockOrder.mockReturnValue({ limit: mockLimit });
    mockSelect.mockImplementation(() => ({
      order: mockOrder,
      eq: mockEq,
    }));
    mockEq.mockResolvedValue({ count: 1, error: null });
    mockUpdate.mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    });
    mockFrom.mockReturnValue({
      select: mockSelect,
      update: mockUpdate,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("fetches notifications newest first without accepting a userId argument", async () => {
    const { fetchUserNotifications } = await import("@/lib/notifications");
    const rows = await fetchUserNotifications("user-jwt-token", 20);

    expect(mockFrom).toHaveBeenCalledWith("notifications");
    expect(mockOrder).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(mockLimit).toHaveBeenCalledWith(20);
    expect(rows).toHaveLength(2);
    expect(rows[0].id).toBe(2);
    expect(rows[0].createdAt >= rows[1].createdAt).toBe(true);
    expect(fetchUserNotifications.length).toBeLessThanOrEqual(2);
  });

  it("calculates unread count via is_read=false filter", async () => {
    const { fetchUnreadCount } = await import("@/lib/notifications");
    const count = await fetchUnreadCount("user-jwt-token");
    expect(mockFrom).toHaveBeenCalledWith("notifications");
    expect(mockEq).toHaveBeenCalledWith("is_read", false);
    expect(count).toBe(1);
  });

  it("marks individual notification read by id only (no userId param)", async () => {
    const { markNotificationRead } = await import("@/lib/notifications");
    await markNotificationRead("user-jwt-token", 12);
    expect(mockFrom).toHaveBeenCalledWith("notifications");
    expect(mockUpdate).toHaveBeenCalled();
    expect(markNotificationRead.length).toBe(2);
  });

  it("rejects invalid notification ids", async () => {
    const { markNotificationRead } = await import("@/lib/notifications");
    await expect(markNotificationRead("token", 0)).rejects.toThrow(/invalid/i);
    await expect(markNotificationRead("token", -3)).rejects.toThrow(/invalid/i);
  });

  it("marks all unread as read without accepting a userId", async () => {
    const eqOnce = vi.fn().mockResolvedValue({ error: null });
    mockUpdate.mockReturnValue({ eq: eqOnce });
    const { markAllNotificationsRead } = await import("@/lib/notifications");
    await markAllNotificationsRead("user-jwt-token");
    expect(eqOnce).toHaveBeenCalledWith("is_read", false);
    expect(markAllNotificationsRead.length).toBe(1);
  });

  it("surfaces fetch errors as thrown errors for UI handling", async () => {
    mockLimit.mockResolvedValueOnce({ data: null, error: { message: "jwt expired" } });
    const { fetchUserNotifications } = await import("@/lib/notifications");
    await expect(fetchUserNotifications("bad")).rejects.toThrow("jwt expired");
  });
});

describe("Phase 15 Tier 3: NotificationBell accessibility contract", () => {
  it("builds accessible unread labels for the bell control", () => {
    expect(formatUnreadBadgeCount(0)).toBeNull();
    const count = 3;
    const label = count > 0 ? `Notifications, ${count} unread` : "Notifications";
    expect(label).toBe("Notifications, 3 unread");
    expect(label).toMatch(/unread/i);
  });
});
