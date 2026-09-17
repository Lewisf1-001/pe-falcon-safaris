export type NotificationType =
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

export type NotificationChannel = "in_app" | "email" | "whatsapp";

export type DeliveryStatus = "pending" | "sent" | "delivered" | "failed";

export type Notification = {
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

export type NotificationDelivery = {
  id: number;
  notificationId: number;
  channel: NotificationChannel;
  status: DeliveryStatus;
  providerReference: string | null;
  errorMessage: string | null;
  attemptedAt: string;
  deliveredAt: string | null;
};

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
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

export function getNotificationIcon(type: NotificationType): string {
  if (type.startsWith("booking_")) return "📋";
  if (type.startsWith("payment_")) return "💰";
  if (type.startsWith("safari_") || type === "itinerary_changed") return "🦁";
  if (type.startsWith("quotation_")) return "📄";
  return "🔔";
}
