/**
 * Phase 15 Tier 2 — direct backend notification trigger tests.
 * Exercises production helpers in supabase/functions/_shared/notification-triggers.ts
 * (the same module imported by admin/mpesa/reviews/quotations/bookings/email/notifications EFs).
 */
import { describe, it, expect, vi } from "vitest";
import {
  applyBookingStatusWithNotification,
  applyPaymentFailedWithNotification,
  applyQuotationAcceptedWithNotification,
  applyQuotationSentWithNotification,
  applyReviewModeratedWithNotification,
  applyReviewSubmittedWithNotification,
  buildBookingStatusNotification,
  buildCustomerCancellationNotification,
  buildPaymentFailedNotification,
  buildPaymentReceivedNotification,
  buildQuotationAcceptedNotification,
  buildQuotationSentNotification,
  buildReviewModeratedNotification,
  buildReviewSubmittedNotification,
  decideNotificationInsert,
  isEmailEligibleNotificationType,
  mapMpesaResultCodeToPaymentStatus,
  paymentFailedHtml,
  resolveNotificationEmailBranch,
  shouldEmitPaymentFailed,
  shouldEmitPaymentReceived,
  shouldNotifyAfterStkFailure,
  type ExistingNotificationRow,
  type NotificationCreatePayload,
} from "../../../supabase/functions/_shared/notification-triggers";

describe("Phase 15 Tier 2: Booking status notification triggers", () => {
  it("pending → confirmed emits booking_confirmed once with correct customer/reference", () => {
    const payload = buildBookingStatusNotification({
      previousStatus: "pending",
      newStatus: "confirmed",
      userId: 42,
      bookingId: 100,
      packageName: "Maasai Mara Safari",
    });

    expect(payload).not.toBeNull();
    expect(payload!.type).toBe("booking_confirmed");
    expect(payload!.type).not.toBe("booking_status_changed");
    expect(payload!.userId).toBe(42);
    expect(payload!.referenceType).toBe("booking");
    expect(payload!.referenceId).toBe(100);
    expect(payload!.title).toBe("Booking Confirmed");
  });

  it("meaningful other status change emits booking_status_changed with new status text", () => {
    const payload = buildBookingStatusNotification({
      previousStatus: "confirmed",
      newStatus: "upcoming",
      userId: 7,
      bookingId: 55,
      packageName: "Amboseli",
    });

    expect(payload).not.toBeNull();
    expect(payload!.type).toBe("booking_status_changed");
    expect(payload!.userId).toBe(7);
    expect(payload!.referenceType).toBe("booking");
    expect(payload!.referenceId).toBe(55);
    expect(payload!.message).toContain("upcoming");
    expect(payload!.message).toContain("Amboseli");
  });

  it("completed emits safari_completed and not booking_status_changed", () => {
    // completed is a supported admin booking status in admin/index.ts VALID_STATUSES
    const payload = buildBookingStatusNotification({
      previousStatus: "in_progress",
      newStatus: "completed",
      userId: 3,
      bookingId: 9,
      packageName: "Tsavo",
    });

    expect(payload!.type).toBe("safari_completed");
    expect(payload!.type).not.toBe("booking_status_changed");
    expect(payload!.userId).toBe(3);
    expect(payload!.referenceId).toBe(9);
  });

  it("cancelled emits booking_cancelled only (no generic status notification)", () => {
    const adminCancel = buildBookingStatusNotification({
      previousStatus: "pending",
      newStatus: "cancelled",
      userId: 11,
      bookingId: 22,
      packageName: "Samburu",
    });
    expect(adminCancel!.type).toBe("booking_cancelled");
    expect(adminCancel!.type).not.toBe("booking_status_changed");

    const customerCancel = buildCustomerCancellationNotification({
      userId: 11,
      bookingId: 22,
    });
    expect(customerCancel.type).toBe("booking_cancelled");
    expect(customerCancel.referenceType).toBe("booking");
    expect(customerCancel.referenceId).toBe(22);
  });

  it("repeated same status request creates no notification", () => {
    const payload = buildBookingStatusNotification({
      previousStatus: "confirmed",
      newStatus: "confirmed",
      userId: 1,
      bookingId: 1,
    });
    expect(payload).toBeNull();
  });
});

describe("Phase 15 Tier 2: Payment failure notification triggers", () => {
  const payment = { userId: 99, bookingId: 200, amountUsd: 1500 };

  it("STK HTTP failure path marks notify-eligible and builds payment_failed for customer/booking", () => {
    expect(shouldNotifyAfterStkFailure({ httpOk: false })).toBe(true);
    const payload = buildPaymentFailedNotification(payment);
    expect(payload.type).toBe("payment_failed");
    expect(payload.userId).toBe(99);
    expect(payload.referenceType).toBe("booking");
    expect(payload.referenceId).toBe(200);
    expect(payload.message).toContain("1500.00");
  });

  it("STK rejection produces payment_failed", () => {
    expect(shouldNotifyAfterStkFailure({ httpOk: true, responseCode: "1" })).toBe(true);
    expect(shouldNotifyAfterStkFailure({ httpOk: true, responseCode: "0" })).toBe(false);
    expect(buildPaymentFailedNotification(payment).type).toBe("payment_failed");
  });

  it("callback failure produces payment_failed; success produces payment_received", () => {
    expect(mapMpesaResultCodeToPaymentStatus(1)).toBe("failed");
    expect(shouldEmitPaymentFailed("failed")).toBe(true);
    expect(mapMpesaResultCodeToPaymentStatus(0)).toBe("completed");
    expect(shouldEmitPaymentReceived("completed")).toBe(true);
    expect(shouldEmitPaymentFailed("completed")).toBe(false);
  });

  it("polling failure produces payment_failed", () => {
    expect(mapMpesaResultCodeToPaymentStatus("1037")).toBe("failed");
    expect(shouldEmitPaymentFailed("failed")).toBe(true);
  });

  it("user cancellation ResultCode 1032 becomes cancelled and does NOT emit payment_failed", () => {
    expect(mapMpesaResultCodeToPaymentStatus(1032)).toBe("cancelled");
    expect(mapMpesaResultCodeToPaymentStatus("1032")).toBe("cancelled");
    expect(shouldEmitPaymentFailed("cancelled")).toBe(false);
    expect(shouldEmitPaymentReceived("cancelled")).toBe(false);
  });

  it("validation/auth style failures do not use STK failure notify helpers", () => {
    // Validation returns before STK; shouldNotifyAfterStkFailure is never called for those paths.
    // Successful STK (http ok + ResponseCode 0) must not notify failure.
    expect(shouldNotifyAfterStkFailure({ httpOk: true, responseCode: "0" })).toBe(false);
    expect(shouldNotifyAfterStkFailure({ httpOk: true, responseCode: 0 })).toBe(false);
  });
});

describe("Phase 15 Tier 2: Payment failure isolation", () => {
  it("notification throw does not change payment failed result", async () => {
    const result = await applyPaymentFailedWithNotification({
      userId: 5,
      bookingId: 8,
      amountUsd: 99,
      sendNotification: () => {
        throw new Error("notifications down");
      },
    });

    expect(result.paymentStatus).toBe("failed");
    expect(result.notification.type).toBe("payment_failed");
    expect(result.notifyError).toBeInstanceOf(Error);
    expect((result.notifyError as Error).message).toBe("notifications down");
  });
});

describe("Phase 15 Tier 2: Review notification triggers", () => {
  it("review submission emits review_submitted for customer with review reference", () => {
    const payload = buildReviewSubmittedNotification({ userId: 15, reviewId: 77 });
    expect(payload.type).toBe("review_submitted");
    expect(payload.userId).toBe(15);
    expect(payload.referenceType).toBe("review");
    expect(payload.referenceId).toBe(77);
    expect(payload.message.toLowerCase()).not.toContain("admin");
  });

  it("review submission keeps admin email side-effect independent of in-app notify", async () => {
    const adminEmail = vi.fn(async () => ({ action: "admin-notification" }));
    const sendNotification = vi.fn(async () => ({}));

    const result = await applyReviewSubmittedWithNotification({
      userId: 15,
      reviewId: 77,
      sendNotification,
      sendAdminEmail: adminEmail,
    });

    expect(result.reviewCreated).toBe(true);
    expect(adminEmail).toHaveBeenCalledTimes(1);
    expect(sendNotification).toHaveBeenCalledTimes(1);
    expect(result.notification.type).toBe("review_submitted");
  });

  it.each(["approved", "rejected", "hidden"] as const)(
    "review moderation %s emits review_moderated without internal notes",
    (status) => {
      const payload = buildReviewModeratedNotification({
        userId: 20,
        reviewId: 3,
        status,
      });
      expect(payload.type).toBe("review_moderated");
      expect(payload.userId).toBe(20);
      expect(payload.referenceType).toBe("review");
      expect(payload.referenceId).toBe(3);
      expect(payload.message).not.toMatch(/moderation note|internal|admin_response/i);
      expect(payload.message).not.toContain("<script>");
    }
  );
});

describe("Phase 15 Tier 2: Quotation notification triggers", () => {
  it("quotation sent emits quotation_sent for customer and preserves dedicated email call", async () => {
    const sendQuotationEmail = vi.fn(async () => ({ action: "quotation-sent" }));
    const sendNotification = vi.fn(async () => ({}));

    const result = await applyQuotationSentWithNotification({
      userId: 33,
      quotationId: 44,
      title: "Family Safari",
      sendNotification,
      sendQuotationEmail,
    });

    expect(result.quotationSent).toBe(true);
    expect(result.notification.type).toBe("quotation_sent");
    expect(result.notification.userId).toBe(33);
    expect(result.notification.referenceType).toBe("quotation");
    expect(result.notification.referenceId).toBe(44);
    expect(result.notification.message).toContain("Family Safari");
    expect(sendQuotationEmail).toHaveBeenCalledTimes(1);
    expect(sendNotification).toHaveBeenCalledTimes(1);
  });

  it("quotation accepted emits customer quotation_accepted and keeps admin email separate", async () => {
    const sendAdminEmail = vi.fn(async () => ({ action: "quotation-accepted", recipients: "admins" }));
    const sendNotification = vi.fn(async (_payload: NotificationCreatePayload) => ({}));

    const result = await applyQuotationAcceptedWithNotification({
      userId: 33,
      quotationId: 44,
      sendNotification,
      sendAdminEmail,
    });

    expect(result.quotationAccepted).toBe(true);
    expect(result.notification.type).toBe("quotation_accepted");
    expect(result.notification.userId).toBe(33);
    expect(result.notification.referenceType).toBe("quotation");
    expect(result.notification.referenceId).toBe(44);
    expect(result.notification.message).toMatch(/you have accepted/i);
    expect(sendAdminEmail).toHaveBeenCalledTimes(1);
    expect(sendNotification).toHaveBeenCalledTimes(1);
    const notifiedPayload = sendNotification.mock.calls[0]?.[0];
    expect(notifiedPayload?.type).toBe("quotation_accepted");
    expect(notifiedPayload?.userId).toBe(33);
  });
});

describe("Phase 15 Tier 2: Notification failure isolation", () => {
  const failingSend = async () => {
    throw new Error("notify failed");
  };

  it("booking status update still succeeds when notification fails", async () => {
    const result = await applyBookingStatusWithNotification({
      previousStatus: "pending",
      newStatus: "confirmed",
      userId: 1,
      bookingId: 2,
      packageName: "Safari",
      sendNotification: failingSend,
    });
    expect(result.ok).toBe(true);
    expect(result.newStatus).toBe("confirmed");
    expect(result.notification?.type).toBe("booking_confirmed");
    expect(result.notifyError).toBeTruthy();
  });

  it("payment failure handling still returns failed when notification fails", async () => {
    const result = await applyPaymentFailedWithNotification({
      userId: 1,
      bookingId: 2,
      amountUsd: 10,
      sendNotification: failingSend,
    });
    expect(result.paymentStatus).toBe("failed");
    expect(result.notifyError).toBeTruthy();
  });

  it("review submission still succeeds when notification fails", async () => {
    const result = await applyReviewSubmittedWithNotification({
      userId: 1,
      reviewId: 2,
      sendNotification: failingSend,
      sendAdminEmail: async () => {
        throw new Error("email failed");
      },
    });
    expect(result.reviewCreated).toBe(true);
    expect(result.notifyError).toBeTruthy();
    expect(result.adminEmailError).toBeTruthy();
  });

  it("review moderation still succeeds when notification fails", async () => {
    const result = await applyReviewModeratedWithNotification({
      userId: 1,
      reviewId: 2,
      status: "approved",
      sendNotification: failingSend,
    });
    expect(result.reviewUpdated).toBe(true);
    expect(result.status).toBe("approved");
    expect(result.notifyError).toBeTruthy();
  });

  it("quotation sent still succeeds when notification fails", async () => {
    const result = await applyQuotationSentWithNotification({
      userId: 1,
      quotationId: 2,
      sendNotification: failingSend,
    });
    expect(result.quotationSent).toBe(true);
    expect(result.notifyError).toBeTruthy();
  });

  it("quotation accepted still succeeds when notification fails", async () => {
    const result = await applyQuotationAcceptedWithNotification({
      userId: 1,
      quotationId: 2,
      sendNotification: failingSend,
    });
    expect(result.quotationAccepted).toBe(true);
    expect(result.notifyError).toBeTruthy();
  });
});

describe("Phase 15 Tier 2: Idempotency at notification create boundary", () => {
  it("repeated booking status event does not create duplicate", () => {
    const payload = buildBookingStatusNotification({
      previousStatus: "pending",
      newStatus: "confirmed",
      userId: 1,
      bookingId: 10,
    })!;
    const existing: ExistingNotificationRow[] = [
      {
        id: 1,
        userId: payload.userId,
        type: payload.type,
        referenceType: payload.referenceType,
        referenceId: payload.referenceId,
      },
    ];
    expect(decideNotificationInsert(existing, payload).action).toBe("duplicate");
    // Same status again also yields null from builder
    expect(
      buildBookingStatusNotification({
        previousStatus: "confirmed",
        newStatus: "confirmed",
        userId: 1,
        bookingId: 10,
      })
    ).toBeNull();
  });

  it("repeated payment_received / payment_failed for same user/type/booking is duplicate", () => {
    const received = buildPaymentReceivedNotification({
      userId: 2,
      bookingId: 50,
      amountUsd: 100,
    });
    const failed = buildPaymentFailedNotification({
      userId: 2,
      bookingId: 50,
      amountUsd: 100,
    });
    const store: ExistingNotificationRow[] = [];

    const firstReceived = decideNotificationInsert(store, received);
    expect(firstReceived.action).toBe("create");
    store.push({
      id: 1,
      userId: received.userId,
      type: received.type,
      referenceType: received.referenceType,
      referenceId: received.referenceId,
    });
    expect(decideNotificationInsert(store, received).action).toBe("duplicate");

    const firstFailed = decideNotificationInsert(store, failed);
    expect(firstFailed.action).toBe("create");
    store.push({
      id: 2,
      userId: failed.userId,
      type: failed.type,
      referenceType: failed.referenceType,
      referenceId: failed.referenceId,
    });
    expect(decideNotificationInsert(store, failed).action).toBe("duplicate");
  });

  it("repeated review notifications for same review/type/reference are duplicates", () => {
    const submitted = buildReviewSubmittedNotification({ userId: 3, reviewId: 9 });
    const moderated = buildReviewModeratedNotification({
      userId: 3,
      reviewId: 9,
      status: "approved",
    });
    const store: ExistingNotificationRow[] = [];

    expect(decideNotificationInsert(store, submitted).action).toBe("create");
    store.push({
      id: 1,
      userId: submitted.userId,
      type: submitted.type,
      referenceType: submitted.referenceType,
      referenceId: submitted.referenceId,
    });
    expect(decideNotificationInsert(store, submitted).action).toBe("duplicate");

    expect(decideNotificationInsert(store, moderated).action).toBe("create");
    store.push({
      id: 2,
      userId: moderated.userId,
      type: moderated.type,
      referenceType: moderated.referenceType,
      referenceId: moderated.referenceId,
    });
    // Second moderation status still same type+reference → duplicate at app boundary
    const moderatedAgain = buildReviewModeratedNotification({
      userId: 3,
      reviewId: 9,
      status: "hidden",
    });
    expect(decideNotificationInsert(store, moderatedAgain).action).toBe("duplicate");
  });

  it("repeated quotation sent/accepted for same quotation are duplicates", () => {
    const sent = buildQuotationSentNotification({
      userId: 4,
      quotationId: 12,
      title: "Trip",
    });
    const accepted = buildQuotationAcceptedNotification({
      userId: 4,
      quotationId: 12,
    });
    const store: ExistingNotificationRow[] = [];

    expect(decideNotificationInsert(store, sent).action).toBe("create");
    store.push({
      id: 1,
      userId: sent.userId,
      type: sent.type,
      referenceType: sent.referenceType,
      referenceId: sent.referenceId,
    });
    expect(decideNotificationInsert(store, sent).action).toBe("duplicate");

    expect(decideNotificationInsert(store, accepted).action).toBe("create");
    store.push({
      id: 2,
      userId: accepted.userId,
      type: accepted.type,
      referenceType: accepted.referenceType,
      referenceId: accepted.referenceId,
    });
    expect(decideNotificationInsert(store, accepted).action).toBe("duplicate");
    // Race-safe guarantee remains DB unique index idx_notifications_dedup (migration 012).
  });
});

describe("Phase 15 Tier 2: Notification email eligibility", () => {
  it("payment_failed is email-eligible and selects paymentFailedHtml content", () => {
    expect(isEmailEligibleNotificationType("payment_failed")).toBe(true);
    expect(resolveNotificationEmailBranch("payment_failed")).toBe("payment_failed");

    const html = paymentFailedHtml({
      clientName: 'Sam <script>alert(1)</script>',
      amount: 250.5,
      packageName: "Mara & Lodge",
    });
    expect(html).toContain("Payment Not Processed");
    expect(html).toContain("250.50");
    expect(html).toContain("Sam &lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).not.toMatch(/passkey|consumer_secret|access_token|stk_password|Bearer /i);
    expect(html).not.toMatch(/mpesa_checkout_request_id|CheckoutRequestID/i);
  });

  it("in-app-only Tier 2 types skip notification-email", () => {
    const inAppOnly = [
      "booking_confirmed",
      "booking_status_changed",
      "safari_completed",
      "review_submitted",
      "review_moderated",
      "quotation_sent",
      "quotation_accepted",
    ];
    for (const type of inAppOnly) {
      expect(isEmailEligibleNotificationType(type)).toBe(false);
      expect(resolveNotificationEmailBranch(type)).toBe("skip");
    }
  });

  it("existing email-eligible types remain recognized", () => {
    expect(resolveNotificationEmailBranch("booking_received")).toBe("booking_received");
    expect(resolveNotificationEmailBranch("payment_received")).toBe("payment_received");
  });
});

describe("Phase 15 Tier 2: payment_failed dedup key (documented)", () => {
  it("uses booking reference (not payment transaction id) per current architecture", () => {
    const a = buildPaymentFailedNotification({
      userId: 1,
      bookingId: 99,
      amountUsd: 10,
    });
    const b = buildPaymentFailedNotification({
      userId: 1,
      bookingId: 99,
      amountUsd: 20,
    });
    // Same user/type/booking → same dedup identity regardless of amount/payment row
    expect(a.userId).toBe(b.userId);
    expect(a.type).toBe(b.type);
    expect(a.referenceType).toBe("booking");
    expect(a.referenceId).toBe(b.referenceId);
    const store: ExistingNotificationRow[] = [
      {
        id: 1,
        userId: a.userId,
        type: a.type,
        referenceType: a.referenceType,
        referenceId: a.referenceId,
      },
    ];
    expect(decideNotificationInsert(store, b).action).toBe("duplicate");
  });
});
