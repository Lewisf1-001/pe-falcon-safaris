/**
 * Phase 15 Tier 2 — pure notification trigger helpers.
 * Shared by Edge Functions (Deno) and client Vitest (Node).
 * No Deno/Node APIs; keep this file runtime-agnostic.
 */

export type NotificationCreatePayload = {
  userId: number;
  type: string;
  title: string;
  message: string;
  referenceType: string | null;
  referenceId: number | null;
};

export const EMAIL_ELIGIBLE_TYPES = new Set([
  "booking_received",
  "payment_received",
  "payment_failed",
]);

export function isEmailEligibleNotificationType(type: string): boolean {
  return EMAIL_ELIGIBLE_TYPES.has(type);
}

/** Build booking status notification, or null when status did not change. */
export function buildBookingStatusNotification(input: {
  previousStatus: string;
  newStatus: string;
  userId: number;
  bookingId: number;
  packageName?: string | null;
}): NotificationCreatePayload | null {
  const { previousStatus, newStatus, userId, bookingId } = input;
  if (previousStatus === newStatus) return null;

  const packageName = input.packageName || "your safari";

  let type = "booking_status_changed";
  let title = "Booking Status Updated";
  let message = `Your booking for ${packageName} has been updated to ${newStatus.replace(/_/g, " ")}.`;

  if (newStatus === "confirmed") {
    type = "booking_confirmed";
    title = "Booking Confirmed";
    message = `Great news! Your booking for ${packageName} has been confirmed. We look forward to welcoming you on your safari!`;
  } else if (newStatus === "completed") {
    type = "safari_completed";
    title = "Safari Completed";
    message = `Your safari for ${packageName} has been marked as completed. We hope you had an amazing experience!`;
  } else if (newStatus === "cancelled") {
    type = "booking_cancelled";
    title = "Booking Cancelled";
    message = `Your booking for ${packageName} has been cancelled.`;
  }

  return {
    userId,
    type,
    title,
    message,
    referenceType: "booking",
    referenceId: bookingId,
  };
}

export function buildCustomerCancellationNotification(input: {
  userId: number;
  bookingId: number;
}): NotificationCreatePayload {
  return {
    userId: input.userId,
    type: "booking_cancelled",
    title: "Booking Cancelled",
    message: "Your booking has been cancelled successfully.",
    referenceType: "booking",
    referenceId: input.bookingId,
  };
}

export function buildPaymentFailedNotification(input: {
  userId: number;
  bookingId: number;
  amountUsd: number | string;
}): NotificationCreatePayload {
  return {
    userId: input.userId,
    type: "payment_failed",
    title: "Payment Failed",
    message: `Your payment of USD ${Number(input.amountUsd).toFixed(2)} could not be processed. Please try again or contact us for assistance.`,
    referenceType: "booking",
    referenceId: input.bookingId,
  };
}

export function buildPaymentReceivedNotification(input: {
  userId: number;
  bookingId: number;
  amountUsd: number | string;
}): NotificationCreatePayload {
  return {
    userId: input.userId,
    type: "payment_received",
    title: "Payment Received",
    message: `Your payment of USD ${Number(input.amountUsd).toFixed(2)} has been received.`,
    referenceType: "booking",
    referenceId: input.bookingId,
  };
}

/**
 * Maps M-Pesa ResultCode to payment status (callback/polling semantics).
 * Mirrors mpesa/index.ts handleCallback / handleStatus.
 */
export function mapMpesaResultCodeToPaymentStatus(
  resultCode: number | string | null | undefined
): "completed" | "cancelled" | "failed" | null {
  if (resultCode === undefined || resultCode === null || resultCode === "") {
    return null;
  }
  if (resultCode === 0 || resultCode === "0") return "completed";
  if (resultCode === 1032 || resultCode === "1032") return "cancelled";
  return "failed";
}

/** Whether a newly applied payment status should emit payment_failed. */
export function shouldEmitPaymentFailed(newStatus: string): boolean {
  return newStatus === "failed";
}

/** Whether a newly applied payment status should emit payment_received. */
export function shouldEmitPaymentReceived(newStatus: string): boolean {
  return newStatus === "completed";
}

/**
 * Whether STK push failure paths should notify (HTTP failure or Safaricom rejection).
 * Validation/auth errors never reach this — they return before STK.
 */
export function shouldNotifyAfterStkFailure(opts: {
  httpOk: boolean;
  responseCode?: string | number | null;
}): boolean {
  if (!opts.httpOk) return true;
  if (opts.responseCode !== undefined && opts.responseCode !== null && opts.responseCode !== "0" && opts.responseCode !== 0) {
    return true;
  }
  return false;
}

export function buildReviewSubmittedNotification(input: {
  userId: number;
  reviewId: number;
}): NotificationCreatePayload {
  return {
    userId: input.userId,
    type: "review_submitted",
    title: "Review Submitted",
    message: "Thank you for your review! It will be visible to other travelers after moderation.",
    referenceType: "review",
    referenceId: input.reviewId,
  };
}

export function buildReviewModeratedNotification(input: {
  userId: number;
  reviewId: number;
  status: string;
}): NotificationCreatePayload {
  let title = "Review Update";
  let message = "Your review status has been updated.";

  if (input.status === "approved") {
    title = "Review Approved";
    message = "Your review has been approved and is now visible to other travelers.";
  } else if (input.status === "rejected") {
    title = "Review Not Approved";
    message = "Your review was not approved. Please contact us if you have questions.";
  } else if (input.status === "hidden") {
    title = "Review Updated";
    message = "Your review has been updated by our team.";
  }

  return {
    userId: input.userId,
    type: "review_moderated",
    title,
    message,
    referenceType: "review",
    referenceId: input.reviewId,
  };
}

export function buildQuotationSentNotification(input: {
  userId: number;
  quotationId: number;
  title?: string | null;
}): NotificationCreatePayload {
  const quotationTitle = input.title || "your safari quotation";
  return {
    userId: input.userId,
    type: "quotation_sent",
    title: "Quotation Sent",
    message: `Your quotation "${quotationTitle}" has been sent. Please review it in your dashboard.`,
    referenceType: "quotation",
    referenceId: input.quotationId,
  };
}

export function buildQuotationAcceptedNotification(input: {
  userId: number;
  quotationId: number;
}): NotificationCreatePayload {
  return {
    userId: input.userId,
    type: "quotation_accepted",
    title: "Quotation Accepted",
    message: "You have accepted the quotation. Please proceed to payment to confirm your booking.",
    referenceType: "quotation",
    referenceId: input.quotationId,
  };
}

export type ExistingNotificationRow = {
  id: number;
  userId: number;
  type: string;
  referenceType: string | null;
  referenceId: number | null;
};

/**
 * Application-level duplicate check (mirrors notifications POST pre-insert lookup).
 * DB unique index idx_notifications_dedup remains the race-safe guarantee.
 */
export function findDuplicateNotification(
  existing: ExistingNotificationRow[],
  input: {
    userId: number;
    type: string;
    referenceType: string | null;
    referenceId: number | null;
  }
): ExistingNotificationRow | null {
  if (!input.referenceType || input.referenceId == null) return null;
  return (
    existing.find(
      (n) =>
        n.userId === input.userId &&
        n.type === input.type &&
        n.referenceType === input.referenceType &&
        n.referenceId === input.referenceId
    ) || null
  );
}

export type NotificationInsertDecision =
  | { action: "duplicate"; existing: ExistingNotificationRow }
  | { action: "create"; payload: NotificationCreatePayload };

export function decideNotificationInsert(
  existing: ExistingNotificationRow[],
  payload: NotificationCreatePayload
): NotificationInsertDecision {
  const dup = findDuplicateNotification(existing, payload);
  if (dup) return { action: "duplicate", existing: dup };
  return { action: "create", payload };
}

/**
 * Fire-and-forget wrapper matching Edge Function non-critical notification pattern.
 * Never throws; never alters the caller's business result.
 */
export async function fireAndForgetNotification(
  send: () => Promise<unknown> | unknown
): Promise<{ notified: boolean; error: unknown | null }> {
  try {
    await send();
    return { notified: true, error: null };
  } catch (error) {
    return { notified: false, error };
  }
}

/** Escape HTML for email templates (matches email Edge Function). */
export function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** payment_failed notification email body (matches email/index.ts paymentFailedHtml). */
export function paymentFailedHtml(data: {
  clientName: string;
  amount: number;
  packageName: string;
}): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background:#f4f4f4;margin:0;padding:0}
.container{max-width:600px;margin:0 auto;background:#fff}
.header{background:#1a3c2a;padding:24px;text-align:center}
.header h1{color:#d4a843;margin:0;font-size:24px}
.content{padding:32px 24px;color:#333}
.highlight{background:#fff7e6;border-left:4px solid #d4a843;padding:16px;margin:16px 0;border-radius:4px}
.footer{background:#1a3c2a;padding:16px;text-align:center;color:#d4a843;font-size:12px}</style></head>
<body><div class="container"><div class="header"><h1>PE Falcon Safaris</h1></div>
<div class="content"><h2>Payment Not Processed</h2>
<p>Dear ${escapeHtml(data.clientName)},</p>
<p>We were unable to process your payment for <strong>${escapeHtml(data.packageName)}</strong>.</p>
<div class="highlight">
<p><strong>Amount:</strong> USD ${Number(data.amount).toFixed(2)}</p>
</div>
<p>Please try again or contact us for assistance. We&apos;re here to help ensure your safari booking is confirmed.</p>
<p>Warm regards,<br><strong>PE Falcon Safaris Team</strong></p></div>
<div class="footer"><p>&copy; ${new Date().getFullYear()} PE Falcon Safaris. All rights reserved.</p></div>
</div></body></html>`;
}

/**
 * Which notification-email template branch applies.
 * In-app-only types return "skip" (no notification-email send).
 */
export function resolveNotificationEmailBranch(
  notificationType: string
): "booking_received" | "payment_received" | "payment_failed" | "skip" {
  if (!isEmailEligibleNotificationType(notificationType)) return "skip";
  if (
    notificationType === "booking_received" ||
    notificationType === "payment_received" ||
    notificationType === "payment_failed"
  ) {
    return notificationType;
  }
  return "skip";
}

/** Simulate booking status update + non-critical notify (for isolation tests). */
export async function applyBookingStatusWithNotification(input: {
  previousStatus: string;
  newStatus: string;
  userId: number;
  bookingId: number;
  packageName?: string;
  sendNotification: (payload: NotificationCreatePayload) => Promise<unknown> | unknown;
}): Promise<{
  ok: true;
  previousStatus: string;
  newStatus: string;
  notification: NotificationCreatePayload | null;
  notifyError: unknown | null;
}> {
  const notification = buildBookingStatusNotification(input);
  let notifyError: unknown | null = null;
  if (notification) {
    const result = await fireAndForgetNotification(() => input.sendNotification(notification));
    notifyError = result.error;
  }
  return {
    ok: true,
    previousStatus: input.previousStatus,
    newStatus: input.newStatus,
    notification,
    notifyError,
  };
}

/** Simulate payment marked failed + non-critical notify. */
export async function applyPaymentFailedWithNotification(input: {
  userId: number;
  bookingId: number;
  amountUsd: number | string;
  sendNotification: (payload: NotificationCreatePayload) => Promise<unknown> | unknown;
}): Promise<{
  paymentStatus: "failed";
  notification: NotificationCreatePayload;
  notifyError: unknown | null;
}> {
  const notification = buildPaymentFailedNotification(input);
  const result = await fireAndForgetNotification(() => input.sendNotification(notification));
  return {
    paymentStatus: "failed",
    notification,
    notifyError: result.error,
  };
}

export async function applyReviewSubmittedWithNotification(input: {
  userId: number;
  reviewId: number;
  sendNotification: (payload: NotificationCreatePayload) => Promise<unknown> | unknown;
  sendAdminEmail?: () => Promise<unknown> | unknown;
}): Promise<{
  reviewCreated: true;
  notification: NotificationCreatePayload;
  notifyError: unknown | null;
  adminEmailError: unknown | null;
}> {
  let adminEmailError: unknown | null = null;
  if (input.sendAdminEmail) {
    const emailResult = await fireAndForgetNotification(() => input.sendAdminEmail!());
    adminEmailError = emailResult.error;
  }
  const notification = buildReviewSubmittedNotification(input);
  const result = await fireAndForgetNotification(() => input.sendNotification(notification));
  return {
    reviewCreated: true,
    notification,
    notifyError: result.error,
    adminEmailError,
  };
}

export async function applyReviewModeratedWithNotification(input: {
  userId: number;
  reviewId: number;
  status: string;
  sendNotification: (payload: NotificationCreatePayload) => Promise<unknown> | unknown;
}): Promise<{
  reviewUpdated: true;
  status: string;
  notification: NotificationCreatePayload;
  notifyError: unknown | null;
}> {
  const notification = buildReviewModeratedNotification(input);
  const result = await fireAndForgetNotification(() => input.sendNotification(notification));
  return {
    reviewUpdated: true,
    status: input.status,
    notification,
    notifyError: result.error,
  };
}

export async function applyQuotationSentWithNotification(input: {
  userId: number;
  quotationId: number;
  title?: string | null;
  sendNotification: (payload: NotificationCreatePayload) => Promise<unknown> | unknown;
  sendQuotationEmail?: () => Promise<unknown> | unknown;
}): Promise<{
  quotationSent: true;
  notification: NotificationCreatePayload;
  notifyError: unknown | null;
  emailError: unknown | null;
}> {
  let emailError: unknown | null = null;
  if (input.sendQuotationEmail) {
    const emailResult = await fireAndForgetNotification(() => input.sendQuotationEmail!());
    emailError = emailResult.error;
  }
  const notification = buildQuotationSentNotification(input);
  const result = await fireAndForgetNotification(() => input.sendNotification(notification));
  return {
    quotationSent: true,
    notification,
    notifyError: result.error,
    emailError,
  };
}

export async function applyQuotationAcceptedWithNotification(input: {
  userId: number;
  quotationId: number;
  sendNotification: (payload: NotificationCreatePayload) => Promise<unknown> | unknown;
  sendAdminEmail?: () => Promise<unknown> | unknown;
}): Promise<{
  quotationAccepted: true;
  notification: NotificationCreatePayload;
  notifyError: unknown | null;
  adminEmailError: unknown | null;
}> {
  let adminEmailError: unknown | null = null;
  if (input.sendAdminEmail) {
    const emailResult = await fireAndForgetNotification(() => input.sendAdminEmail!());
    adminEmailError = emailResult.error;
  }
  const notification = buildQuotationAcceptedNotification(input);
  const result = await fireAndForgetNotification(() => input.sendNotification(notification));
  return {
    quotationAccepted: true,
    notification,
    notifyError: result.error,
    adminEmailError,
  };
}
