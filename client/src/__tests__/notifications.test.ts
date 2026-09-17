import { describe, it, expect } from "vitest";

// ---- Reimplemented from notification system for unit testing ----

type NotificationType =
  | "booking_received"
  | "booking_confirmed"
  | "booking_status_changed"
  | "booking_cancelled"
  | "payment_received"
  | "payment_failed"
  | "payment_status_changed"
  | "safari_approaching"
  | "safari_reminder"
  | "itinerary_changed"
  | "safari_completed"
  | "quotation_sent"
  | "quotation_accepted"
  | "system";

type NotificationChannel = "in_app" | "email" | "whatsapp";
type DeliveryStatus = "pending" | "sent" | "delivered" | "failed";

const VALID_NOTIFICATION_TYPES: NotificationType[] = [
  "booking_received", "booking_confirmed", "booking_status_changed",
  "booking_cancelled", "payment_received", "payment_failed",
  "payment_status_changed", "safari_approaching", "safari_reminder",
  "itinerary_changed", "safari_completed", "quotation_sent",
  "quotation_accepted", "system",
];

const VALID_CHANNELS: NotificationChannel[] = ["in_app", "email", "whatsapp"];
const VALID_DELIVERY_STATUSES: DeliveryStatus[] = ["pending", "sent", "delivered", "failed"];

function isValidNotificationType(type: unknown): type is NotificationType {
  return typeof type === "string" && (VALID_NOTIFICATION_TYPES as string[]).includes(type);
}

function isValidChannel(channel: unknown): channel is NotificationChannel {
  return typeof channel === "string" && (VALID_CHANNELS as string[]).includes(channel);
}

function isValidDeliveryStatus(status: unknown): status is DeliveryStatus {
  return typeof status === "string" && (VALID_DELIVERY_STATUSES as string[]).includes(status);
}

function isBookingType(type: NotificationType): boolean {
  return type.startsWith("booking_");
}

function isPaymentType(type: NotificationType): boolean {
  return type.startsWith("payment_");
}

function isSafariType(type: NotificationType): boolean {
  return type.startsWith("safari_") || type === "itinerary_changed";
}

function getNotificationIcon(type: NotificationType): string {
  if (isBookingType(type)) return "📋";
  if (isPaymentType(type)) return "💰";
  if (isSafariType(type)) return "🦁";
  if (type.startsWith("quotation_")) return "📄";
  return "🔔";
}

const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  booking_received: "Booking Received",
  booking_confirmed: "Booking Confirmed",
  booking_status_changed: "Booking Status Changed",
  booking_cancelled: "Booking Cancelled",
  payment_received: "Payment Received",
  payment_failed: "Payment Failed",
  payment_status_changed: "Payment Status Changed",
  safari_approaching: "Safari Approaching",
  safari_reminder: "Safari Reminder",
  itinerary_changed: "Itinerary Changed",
  safari_completed: "Safari Completed",
  quotation_sent: "Quotation Sent",
  quotation_accepted: "Quotation Accepted",
  system: "System",
};

type Notification = {
  id: number;
  userId: number;
  type: NotificationType;
  title: string;
  message: string;
  referenceType: string | null;
  referenceId: number | null;
  isRead: boolean;
  createdAt: string;
  readAt: string | null;
};

function validateNotificationInput(input: {
  userId: unknown;
  type: unknown;
  title: unknown;
  message: unknown;
}): string[] {
  const errors: string[] = [];

  if (typeof input.userId !== "number" || !Number.isInteger(input.userId) || input.userId <= 0) {
    errors.push("Valid user ID is required.");
  }

  if (!isValidNotificationType(input.type)) {
    errors.push("Valid notification type is required.");
  }

  if (typeof input.title !== "string" || input.title.trim().length === 0) {
    errors.push("Title is required.");
  } else if (input.title.trim().length > 255) {
    errors.push("Title must be 255 characters or less.");
  }

  if (typeof input.message !== "string" || input.message.trim().length === 0) {
    errors.push("Message is required.");
  }

  return errors;
}

function checkIdempotency(
  existing: Notification[],
  userId: number,
  type: NotificationType,
  referenceType: string | null,
  referenceId: number | null
): boolean {
  if (!referenceType || !referenceId) return false;
  return existing.some(
    (n) =>
      n.userId === userId &&
      n.type === type &&
      n.referenceType === referenceType &&
      n.referenceId === referenceId
  );
}

function formatTimeAgo(dateStr: string): string {
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

describe("Phase 15: Notifications", () => {
  describe("Notification type validation", () => {
    it("accepts all valid types", () => {
      for (const type of VALID_NOTIFICATION_TYPES) {
        expect(isValidNotificationType(type)).toBe(true);
      }
    });

    it("rejects invalid type", () => {
      expect(isValidNotificationType("invalid")).toBe(false);
      expect(isValidNotificationType("")).toBe(false);
      expect(isValidNotificationType(null)).toBe(false);
    });
  });

  describe("Channel validation", () => {
    it("accepts all valid channels", () => {
      for (const ch of VALID_CHANNELS) {
        expect(isValidChannel(ch)).toBe(true);
      }
    });

    it("rejects invalid channel", () => {
      expect(isValidChannel("sms")).toBe(false);
      expect(isValidChannel("")).toBe(false);
    });
  });

  describe("Delivery status validation", () => {
    it("accepts all valid statuses", () => {
      for (const s of VALID_DELIVERY_STATUSES) {
        expect(isValidDeliveryStatus(s)).toBe(true);
      }
    });

    it("rejects invalid status", () => {
      expect(isValidDeliveryStatus("deleted")).toBe(false);
    });
  });

  describe("Notification type categories", () => {
    it("correctly identifies booking types", () => {
      expect(isBookingType("booking_received")).toBe(true);
      expect(isBookingType("booking_confirmed")).toBe(true);
      expect(isBookingType("booking_cancelled")).toBe(true);
      expect(isBookingType("payment_received")).toBe(false);
    });

    it("correctly identifies payment types", () => {
      expect(isPaymentType("payment_received")).toBe(true);
      expect(isPaymentType("payment_failed")).toBe(true);
      expect(isPaymentType("booking_received")).toBe(false);
    });

    it("correctly identifies safari types", () => {
      expect(isSafariType("safari_approaching")).toBe(true);
      expect(isSafariType("safari_reminder")).toBe(true);
      expect(isSafariType("itinerary_changed")).toBe(true);
      expect(isSafariType("booking_received")).toBe(false);
    });
  });

  describe("Notification icons", () => {
    it("returns correct icons for each category", () => {
      expect(getNotificationIcon("booking_received")).toBe("📋");
      expect(getNotificationIcon("payment_received")).toBe("💰");
      expect(getNotificationIcon("safari_approaching")).toBe("🦁");
      expect(getNotificationIcon("quotation_sent")).toBe("📄");
      expect(getNotificationIcon("system")).toBe("🔔");
    });
  });

  describe("Notification input validation", () => {
    const validInput = {
      userId: 1,
      type: "booking_received" as NotificationType,
      title: "Booking Received",
      message: "Your booking has been received.",
    };

    it("passes with valid input", () => {
      expect(validateNotificationInput(validInput)).toHaveLength(0);
    });

    it("requires valid user ID", () => {
      const errors = validateNotificationInput({ ...validInput, userId: 0 });
      expect(errors).toContain("Valid user ID is required.");
    });

    it("requires valid type", () => {
      const errors = validateNotificationInput({ ...validInput, type: "bad" });
      expect(errors).toContain("Valid notification type is required.");
    });

    it("requires title", () => {
      const errors = validateNotificationInput({ ...validInput, title: "" });
      expect(errors).toContain("Title is required.");
    });

    it("rejects long title", () => {
      const errors = validateNotificationInput({ ...validInput, title: "x".repeat(256) });
      expect(errors).toContain("Title must be 255 characters or less.");
    });

    it("requires message", () => {
      const errors = validateNotificationInput({ ...validInput, message: "" });
      expect(errors).toContain("Message is required.");
    });
  });

  describe("Idempotency / deduplication", () => {
    const existing: Notification[] = [
      {
        id: 1,
        userId: 10,
        type: "booking_received",
        title: "Booking Received",
        message: "Test",
        referenceType: "booking",
        referenceId: 100,
        isRead: false,
        createdAt: "",
        readAt: null,
      },
    ];

    it("detects duplicate when same user, type, and reference", () => {
      expect(checkIdempotency(existing, 10, "booking_received", "booking", 100)).toBe(true);
    });

    it("allows different reference ID", () => {
      expect(checkIdempotency(existing, 10, "booking_received", "booking", 101)).toBe(false);
    });

    it("allows different user", () => {
      expect(checkIdempotency(existing, 20, "booking_received", "booking", 100)).toBe(false);
    });

    it("allows different type", () => {
      expect(checkIdempotency(existing, 10, "booking_confirmed", "booking", 100)).toBe(false);
    });

    it("skips check when no reference", () => {
      expect(checkIdempotency(existing, 10, "booking_received", null, null)).toBe(false);
    });
  });

  describe("Time formatting", () => {
    it("formats recent time", () => {
      const now = new Date();
      now.setMinutes(now.getMinutes() - 5);
      const result = formatTimeAgo(now.toISOString());
      expect(result).toBe("5m ago");
    });

    it("formats hours ago", () => {
      const now = new Date();
      now.setHours(now.getHours() - 3);
      const result = formatTimeAgo(now.toISOString());
      expect(result).toBe("3h ago");
    });

    it("formats days ago", () => {
      const now = new Date();
      now.setDate(now.getDate() - 2);
      const result = formatTimeAgo(now.toISOString());
      expect(result).toBe("2d ago");
    });

    it("formats old dates", () => {
      const now = new Date();
      now.setDate(now.getDate() - 30);
      const result = formatTimeAgo(now.toISOString());
      // Old dates show month/day format (e.g., "Aug 18")
      expect(result).toMatch(/\w+ \d+/);
    });
  });

  describe("Type labels", () => {
    it("has labels for all types", () => {
      for (const type of VALID_NOTIFICATION_TYPES) {
        expect(NOTIFICATION_TYPE_LABELS[type]).toBeTruthy();
        expect(typeof NOTIFICATION_TYPE_LABELS[type]).toBe("string");
      }
    });
  });
});
