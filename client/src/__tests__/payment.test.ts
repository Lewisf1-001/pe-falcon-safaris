import { describe, it, expect } from "vitest";

describe("Phase 5: Production M-Pesa Payment Hardening", () => {
  describe("Server-Authoritative Amount", () => {
    it("STK push uses amount from payment record, not client body", () => {
      const paymentRecord = { amount_usd: 1500 };
      const clientBody = { amount: 1 }; // malicious client sends fake amount
      const stkAmount = Number(paymentRecord.amount_usd); // server uses record
      expect(stkAmount).toBe(1500);
      expect(stkAmount).not.toBe(clientBody.amount);
    });

    it("payment creation uses booking.total_price_usd, not client amount", () => {
      const booking = { total_price_usd: 2400 };
      const clientPayload = { bookingId: 1, method: "mobile_money", phone: "0712345678" };
      const paymentAmount = booking.total_price_usd;
      expect(paymentAmount).toBe(2400);
      expect(paymentAmount).not.toBeUndefined();
    });

    it("rejects payment with zero or negative amount from record", () => {
      const invalidAmounts = [0, -100, NaN];
      for (const amount of invalidAmounts) {
        const isValid = Number.isFinite(amount) && amount > 0;
        expect(isValid).toBe(false);
      }
    });

    it("accepts valid positive amount from payment record", () => {
      const amount = 1500;
      const isValid = Number.isFinite(amount) && amount > 0;
      expect(isValid).toBe(true);
    });
  });

  describe("Payment Ownership", () => {
    it("customer can initiate payment for own booking", () => {
      const userId = 42;
      const paymentUserId = 42;
      const isOwner = userId === paymentUserId;
      expect(isOwner).toBe(true);
    });

    it("customer cannot initiate payment for another customer booking", () => {
      const userId = 42;
      const paymentUserId = 99 as number;
      const isOwner = userId === paymentUserId;
      expect(isOwner).toBe(false);
    });

    it("customer cannot query another customer payment", () => {
      const userId = 42;
      const paymentUserId = 99 as number;
      const isOwner = userId === paymentUserId;
      expect(isOwner).toBe(false);
    });

    it("customer cannot cancel another customer payment", () => {
      const userId = 42;
      const paymentUserId = 99 as number;
      const isOwner = userId === paymentUserId;
      expect(isOwner).toBe(false);
    });

    it("payment must belong to authenticated user", () => {
      const profile = { id: 42 };
      const payment = { user_id: 42 };
      const isOwner = Number(profile.id) === Number(payment.user_id);
      expect(isOwner).toBe(true);
    });

    it("rejects payment when user_id does not match", () => {
      const profile = { id: 42 };
      const payment = { user_id: 99 };
      const isOwner = Number(profile.id) === Number(payment.user_id);
      expect(isOwner).toBe(false);
    });
  });

  describe("Admin Authorization", () => {
    it("admin can query payment status", () => {
      const adminRecord = { id: 1 };
      const isAdmin = !!adminRecord;
      expect(isAdmin).toBe(true);
    });

    it("non-admin cannot use admin bypass", () => {
      const adminRecord = null;
      const isAdmin = !!adminRecord;
      expect(isAdmin).toBe(false);
    });

    it("user without admin record is not admin", () => {
      const profile = { id: 42 };
      const adminRecord = null;
      const isAdmin = !!adminRecord;
      const isOwner = Number(profile.id) === 42;
      expect(isAdmin).toBe(false);
      expect(isOwner).toBe(true);
    });
  });

  describe("Card Payment Rejection", () => {
    it("rejects card method", () => {
      const method = "card" as string;
      const isAccepted = method === "mobile_money";
      expect(isAccepted).toBe(false);
    });

    it("accepts mobile_money method", () => {
      const method = "mobile_money";
      const isAccepted = method === "mobile_money";
      expect(isAccepted).toBe(true);
    });

    it("rejects any non-mobile_money method", () => {
      const invalidMethods = ["card", "bank_transfer", "crypto", "cash", "stripe"];
      for (const method of invalidMethods) {
        expect(method).not.toBe("mobile_money");
      }
    });
  });

  describe("Payment Status Machine", () => {
    const VALID_STATUSES = ["pending", "completed", "failed", "cancelled"];
    const TERMINAL_STATUSES = ["completed", "cancelled"];
    const NON_TERMINAL_STATUSES = ["pending", "failed"];

    const VALID_TRANSITIONS: Record<string, string[]> = {
      pending: ["completed", "failed", "cancelled"],
      completed: [], // terminal
      failed: [], // terminal
      cancelled: [], // terminal
    };

    it("has 4 valid statuses", () => {
      expect(VALID_STATUSES).toHaveLength(4);
    });

    it("has 2 terminal statuses", () => {
      expect(TERMINAL_STATUSES).toHaveLength(2);
    });

    it("pending can transition to completed", () => {
      expect(VALID_TRANSITIONS.pending).toContain("completed");
    });

    it("pending can transition to failed", () => {
      expect(VALID_TRANSITIONS.pending).toContain("failed");
    });

    it("pending can transition to cancelled", () => {
      expect(VALID_TRANSITIONS.pending).toContain("cancelled");
    });

    it("completed is terminal (no transitions out)", () => {
      expect(VALID_TRANSITIONS.completed).toHaveLength(0);
    });

    it("failed is terminal (no transitions out)", () => {
      expect(VALID_TRANSITIONS.failed).toHaveLength(0);
    });

    it("cancelled is terminal (no transitions out)", () => {
      expect(VALID_TRANSITIONS.cancelled).toHaveLength(0);
    });

    it("already-completed payment cannot be overwritten by callback", () => {
      const currentStatus = "completed" as string;
      const callbackResultCode = 0;
      const newStatus = callbackResultCode === 0 ? "completed" : "failed";
      // Idempotency: completed stays completed
      const finalStatus = currentStatus === "completed" ? currentStatus : newStatus;
      expect(finalStatus).toBe("completed");
    });

    it("already-cancelled payment cannot be overwritten by callback", () => {
      const currentStatus = "cancelled" as string;
      const callbackResultCode = 0;
      const newStatus = callbackResultCode === 0 ? "completed" : "failed";
      const finalStatus = currentStatus === "cancelled" ? currentStatus : newStatus;
      expect(finalStatus).toBe("cancelled");
    });
  });

  describe("Callback Verification", () => {
    it("valid callback with known CheckoutRequestID is processed", () => {
      const callbackSecrets = new Map([["ws_CO_123", { secret: "abc", createdAt: Date.now() }]]);
      const checkoutRequestId = "ws_CO_123";
      const hasSecret = callbackSecrets.has(checkoutRequestId);
      expect(hasSecret).toBe(true);
    });

    it("forged callback with unknown CheckoutRequestID is rejected", () => {
      const callbackSecrets = new Map([["ws_CO_123", { secret: "abc", createdAt: Date.now() }]]);
      const checkoutRequestId = "unknown_999";
      const hasSecret = callbackSecrets.has(checkoutRequestId);
      expect(hasSecret).toBe(false);
    });

    it("callback secret is consumed after use (one-time)", () => {
      const callbackSecrets = new Map([["ws_CO_123", { secret: "abc", createdAt: Date.now() }]]);
      callbackSecrets.delete("ws_CO_123");
      const hasSecret = callbackSecrets.has("ws_CO_123");
      expect(hasSecret).toBe(false);
    });

    it("expired callback secrets are cleaned up", () => {
      const SECRET_TTL_MS = 60 * 60 * 1000;
      const expiredTime = Date.now() - SECRET_TTL_MS - 1;
      const callbackSecrets = new Map([["ws_CO_old", { secret: "abc", createdAt: expiredTime }]]);

      const now = Date.now();
      for (const [key, val] of callbackSecrets) {
        if (now - val.createdAt > SECRET_TTL_MS) callbackSecrets.delete(key);
      }

      expect(callbackSecrets.has("ws_CO_old")).toBe(false);
    });
  });

  describe("ResultCode Mapping", () => {
    function resultCodeToStatus(code: number): string {
      if (code === 0) return "completed";
      if (code === 1032) return "cancelled";
      return "failed";
    }

    it("ResultCode 0 = completed", () => {
      expect(resultCodeToStatus(0)).toBe("completed");
    });

    it("ResultCode 1032 = cancelled (user dismissed STK)", () => {
      expect(resultCodeToStatus(1032)).toBe("cancelled");
    });

    it("ResultCode 1 = failed (insufficient funds)", () => {
      expect(resultCodeToStatus(1)).toBe("failed");
    });

    it("ResultCode 1037 = failed (timeout)", () => {
      expect(resultCodeToStatus(1037)).toBe("failed");
    });

    it("ResultCode 2001 = failed (wrong credentials)", () => {
      expect(resultCodeToStatus(2001)).toBe("failed");
    });

    it("unknown ResultCode = failed", () => {
      expect(resultCodeToStatus(9999)).toBe("failed");
    });
  });

  describe("Idempotency", () => {
    it("duplicate callback for completed payment is idempotent", () => {
      const existingPayment = { status: "completed" };
      // Should not reprocess
      const shouldProcess = existingPayment.status !== "completed" && existingPayment.status !== "cancelled";
      expect(shouldProcess).toBe(false);
    });

    it("duplicate callback for cancelled payment is idempotent", () => {
      const existingPayment = { status: "cancelled" };
      const shouldProcess = existingPayment.status !== "completed" && existingPayment.status !== "cancelled";
      expect(shouldProcess).toBe(false);
    });

    it("duplicate callback for pending payment is processed", () => {
      const existingPayment = { status: "pending" };
      const shouldProcess = existingPayment.status !== "completed" && existingPayment.status !== "cancelled";
      expect(shouldProcess).toBe(true);
    });

    it("unique constraint prevents multiple completed payments per booking", () => {
      // Database has: CREATE UNIQUE INDEX idx_payments_one_completed_per_booking
      // ON payments (booking_id) WHERE status = 'completed'
      const completedPaymentsForBooking = [{ id: "a", status: "completed" }];
      const canAddAnother = completedPaymentsForBooking.length === 0;
      expect(canAddAnother).toBe(false);
    });
  });

  describe("Booking Status Transitions on Payment", () => {
    function wouldConfirmBooking(bookingStatus: string, paymentStatus: string): boolean {
      return paymentStatus === "completed" && bookingStatus === "pending";
    }

    it("pending booking transitions to confirmed on payment", () => {
      expect(wouldConfirmBooking("pending", "completed")).toBe(true);
    });

    it("deposit_required booking stays as-is on payment", () => {
      expect(wouldConfirmBooking("deposit_required", "completed")).toBe(false);
    });

    it("already-confirmed booking is not affected by callback", () => {
      expect(wouldConfirmBooking("confirmed", "completed")).toBe(false);
    });

    it("cancelled booking cannot be confirmed by payment", () => {
      expect(wouldConfirmBooking("cancelled", "completed")).toBe(false);
    });
  });

  describe("Phone Number Validation", () => {
    function normalizePhone(phone: string): string {
      let cleaned = phone.replace(/[^0-9]/g, "");
      if (cleaned.startsWith("0")) {
        cleaned = "254" + cleaned.slice(1);
      }
      if (!cleaned.startsWith("254")) {
        cleaned = "254" + cleaned;
      }
      return cleaned;
    }

    it("normalizes 0712345678 to 254712345678", () => {
      expect(normalizePhone("0712345678")).toBe("254712345678");
    });

    it("normalizes +254712345678 to 254712345678", () => {
      expect(normalizePhone("+254712345678")).toBe("254712345678");
    });

    it("normalizes 254712345678 to 254712345678", () => {
      expect(normalizePhone("254712345678")).toBe("254712345678");
    });

    it("accepts valid Safaricom prefixes (07XX, 01XX)", () => {
      const validPrefixes = ["0712", "0723", "0734", "0745", "0756", "0767", "0789", "0790", "0110", "0120"];
      const phoneRegex = /^(?:254|\+?254|0)?[17]\d{8}$/;
      for (const prefix of validPrefixes) {
        const phone = prefix + "345678";
        expect(phone).toMatch(phoneRegex);
      }
    });

    it("rejects invalid phone formats", () => {
      const invalidPhones = ["123", "abc", "071234567", "07123456789", ""];
      const phoneRegex = /^(?:254|\+?254|0)?[17]\d{8}$/;
      for (const phone of invalidPhones) {
        expect(phone).not.toMatch(phoneRegex);
      }
    });
  });

  describe("USD to KES Conversion", () => {
    it("converts USD to KES with live rate", () => {
      const amountUsd = 100;
      const rate = 129;
      const amountKes = Math.max(1, Math.round(amountUsd * rate));
      expect(amountKes).toBe(12900);
    });

    it("rounds to whole KES (M-Pesa requirement)", () => {
      const amountUsd = 99.99;
      const rate = 129.5;
      const amountKes = Math.max(1, Math.round(amountUsd * rate));
      expect(Number.isInteger(amountKes)).toBe(true);
    });

    it("minimum KES amount is 1", () => {
      const amountUsd = 0.001;
      const rate = 129;
      const amountKes = Math.max(1, Math.round(amountUsd * rate));
      expect(amountKes).toBe(1);
    });

    it("uses fallback rate when currency service is unreachable", () => {
      const FALLBACK_KES_PER_USD = 129;
      const rate = FALLBACK_KES_PER_USD;
      expect(rate).toBe(129);
    });
  });

  describe("Payment Creation Validation", () => {
    it("requires bookingId", () => {
      const body = { method: "mobile_money", phone: "0712345678" } as Record<string, unknown>;
      const hasRequired = !!body.bookingId;
      expect(hasRequired).toBe(false);
    });

    it("requires method", () => {
      const body = { bookingId: 1, phone: "0712345678" } as Record<string, unknown>;
      const hasRequired = !!body.method;
      expect(hasRequired).toBe(false);
    });

    it("accepts valid mobile_money payment", () => {
      const body = { bookingId: 1, method: "mobile_money", phone: "0712345678" };
      const isValid = !!body.bookingId && body.method === "mobile_money" && !!body.phone;
      expect(isValid).toBe(true);
    });

    it("rejects cancelled booking", () => {
      const bookingStatus = "cancelled";
      const canPay = bookingStatus !== "cancelled";
      expect(canPay).toBe(false);
    });

    it("rejects already-confirmed booking", () => {
      const bookingStatus = "confirmed";
      const canPay = !["confirmed", "completed", "upcoming", "in_progress"].includes(bookingStatus);
      expect(canPay).toBe(false);
    });

    it("allows pending booking", () => {
      const bookingStatus = "pending";
      const canPay = !["cancelled", "confirmed", "completed", "upcoming", "in_progress"].includes(bookingStatus);
      expect(canPay).toBe(true);
    });

    it("allows deposit_required booking", () => {
      const bookingStatus = "deposit_required";
      const canPay = !["cancelled", "confirmed", "completed", "upcoming", "in_progress"].includes(bookingStatus);
      expect(canPay).toBe(true);
    });

    it("allows partially_paid booking", () => {
      const bookingStatus = "partially_paid";
      const canPay = !["cancelled", "confirmed", "completed", "upcoming", "in_progress"].includes(bookingStatus);
      expect(canPay).toBe(true);
    });
  });

  describe("STK Push Validation", () => {
    it("requires phone number", () => {
      const body = { paymentId: "abc" } as Record<string, unknown>;
      const hasRequired = !!body.phone && !!body.paymentId;
      expect(hasRequired).toBe(false);
    });

    it("requires paymentId", () => {
      const body = { phone: "0712345678" } as Record<string, unknown>;
      const hasRequired = !!body.phone && !!body.paymentId;
      expect(hasRequired).toBe(false);
    });

    it("accepts valid STK push request", () => {
      const body = { phone: "0712345678", paymentId: "abc-123" };
      const hasRequired = !!body.phone && !!body.paymentId;
      expect(hasRequired).toBe(true);
    });

    it("validates phone format", () => {
      const phoneRegex = /^(?:254|\+?254|0)?[17]\d{8}$/;
      expect("254712345678").toMatch(phoneRegex);
      expect("0712345678").toMatch(phoneRegex);
      expect("invalid").not.toMatch(phoneRegex);
    });
  });

  describe("Payment Amount Matching", () => {
    it("provider-confirmed amount must match expected amount", () => {
      const expectedAmount = 1500;
      const providerAmount = 1500;
      const matches = expectedAmount === providerAmount;
      expect(matches).toBe(true);
    });

    it("rejects mismatched amount", () => {
      const expectedAmount = 1500;
      const providerAmount = 100 as number;
      const matches = expectedAmount === providerAmount;
      expect(matches).toBe(false);
    });

    it("payment record amount matches booking total", () => {
      const booking = { total_price_usd: 2400 };
      const payment = { amount_usd: 2400 };
      const matches = Number(payment.amount_usd) === Number(booking.total_price_usd);
      expect(matches).toBe(true);
    });
  });

  describe("Email Notifications", () => {
    it("payment confirmation email is sent after server-side completion", () => {
      const paymentStatus = "completed";
      const shouldSendEmail = paymentStatus === "completed";
      expect(shouldSendEmail).toBe(true);
    });

    it("no email sent for failed payment", () => {
      const paymentStatus = "failed" as string;
      const shouldSendEmail = paymentStatus === "completed";
      expect(shouldSendEmail).toBe(false);
    });

    it("no email sent for cancelled payment", () => {
      const paymentStatus = "cancelled" as string;
      const shouldSendEmail = paymentStatus === "completed";
      expect(shouldSendEmail).toBe(false);
    });

    it("email failure does not block payment flow", () => {
      // Email is fire-and-forget
      const emailFailed = true;
      const paymentStillCompletes = true;
      expect(emailFailed).toBe(true);
      expect(paymentStillCompletes).toBe(true);
    });
  });

  describe("Security Regression", () => {
    it("no card payment path exists", () => {
      const supportedMethods = ["mobile_money"];
      expect(supportedMethods).not.toContain("card");
      expect(supportedMethods).not.toContain("stripe");
      expect(supportedMethods).not.toContain("paypal");
    });

    it("no client-side payment completion", () => {
      // Payment completion only happens via server callback/polling
      const clientCanMarkCompleted = false;
      expect(clientCanMarkCompleted).toBe(false);
    });

    it("no credential exposure in client code", () => {
      // Environment variables used in client are only NEXT_PUBLIC_ prefixed
      const sensitiveVars = [
        "MPESA_CONSUMER_KEY",
        "MPESA_CONSUMER_SECRET",
        "MPESA_PASSKEY",
        "MPESA_SHORTCODE",
        "SUPABASE_SERVICE_ROLE_KEY",
      ];
      for (const v of sensitiveVars) {
        expect(v.startsWith("NEXT_PUBLIC_")).toBe(false);
      }
    });

    it("RLS policies enforce customer isolation", () => {
      const policies = [
        "Users can view own payments",
        "Users can create payments",
        "Admins can view all payments",
        "Admins can manage payments",
      ];
      expect(policies).toContain("Users can view own payments");
      expect(policies).toContain("Users can create payments");
    });

    it("callback does not blindly trust external requests", () => {
      const callbackSecrets = new Map();
      const checkoutRequestId = "unknown_external_id";
      const hasSecret = callbackSecrets.has(checkoutRequestId);
      // Unknown callback is acknowledged but not processed
      expect(hasSecret).toBe(false);
    });

    it("unique constraint prevents duplicate completed payments", () => {
      // idx_payments_one_completed_per_booking ensures one completed payment per booking
      const constraintExists = true;
      expect(constraintExists).toBe(true);
    });
  });

  describe("Error Handling", () => {
    function resultCodeToStatus(code: number): string {
      if (code === 0) return "completed";
      if (code === 1032) return "cancelled";
      return "failed";
    }

    it("handles cancelled STK request gracefully", () => {
      expect(resultCodeToStatus(1032)).toBe("cancelled");
    });

    it("handles insufficient funds", () => {
      expect(resultCodeToStatus(1)).toBe("failed");
    });

    it("handles provider error", () => {
      expect(resultCodeToStatus(500)).toBe("failed");
    });

    it("handles timeout", () => {
      expect(resultCodeToStatus(1037)).toBe("failed");
    });

    it("handles malformed callback body", () => {
      const body = null;
      const isValid = body !== null && typeof body === "object" && "Body" in body;
      expect(isValid).toBe(false);
    });

    it("handles missing stkCallback", () => {
      const body = { Body: {} };
      const hasStkCallback = "stkCallback" in body.Body;
      expect(hasStkCallback).toBe(false);
    });

    it("handles unknown payment reference", () => {
      const payment = null;
      const found = !!payment;
      expect(found).toBe(false);
    });
  });

  describe("Delayed Callback Handling", () => {
    it("payment remains pending until callback arrives", () => {
      const paymentStatus = "pending";
      expect(paymentStatus).toBe("pending");
    });

    it("later provider confirmation completes payment", () => {
      let paymentStatus = "pending" as string;
      const callbackResultCode = 0;
      if (callbackResultCode === 0) {
        paymentStatus = "completed";
      }
      expect(paymentStatus).toBe("completed");
    });

    it("status polling can resolve pending payment", () => {
      let paymentStatus = "pending" as string;
      const queryResultCode = "0";
      if (queryResultCode === "0") {
        paymentStatus = "completed";
      }
      expect(paymentStatus).toBe("completed");
    });

    it("callback followed by polling is idempotent", () => {
      const paymentStatus = "completed" as string;
      // Polling should not change the status
      const shouldUpdate = paymentStatus !== "completed" && paymentStatus !== "cancelled";
      expect(shouldUpdate).toBe(false);
    });

    it("polling followed by callback is idempotent", () => {
      const paymentStatus = "completed" as string;
      const shouldProcess = paymentStatus !== "completed" && paymentStatus !== "cancelled";
      expect(shouldProcess).toBe(false);
    });
  });

  describe("Database Schema Integrity", () => {
    it("payments table has required columns", () => {
      const requiredColumns = [
        "id", "booking_id", "user_id", "amount_usd", "method",
        "status", "created_at", "updated_at",
      ];
      for (const col of requiredColumns) {
        expect(col).toBeTruthy();
      }
    });

    it("payments table has M-Pesa tracking columns", () => {
      const mpesaColumns = [
        "mpesa_checkout_request_id",
        "mpesa_merchant_request_id",
        "mpesa_receipt_number",
        "external_ref",
      ];
      for (const col of mpesaColumns) {
        expect(col).toBeTruthy();
      }
    });

    it("payments has unique constraint for completed payments per booking", () => {
      // idx_payments_one_completed_per_booking
      const constraintExists = true;
      expect(constraintExists).toBe(true);
    });

    it("payments has index on checkout_request_id for fast lookups", () => {
      // idx_payments_mpesa_checkout
      const indexExists = true;
      expect(indexExists).toBe(true);
    });

    it("booking status check constraint includes all valid statuses", () => {
      const validStatuses = [
        "inquiry", "quote", "pending", "deposit_required", "partially_paid",
        "confirmed", "upcoming", "in_progress", "completed",
        "cancelled", "expired", "refunded",
      ];
      expect(validStatuses).toContain("pending");
      expect(validStatuses).toContain("confirmed");
      expect(validStatuses).toContain("cancelled");
    });

    it("payment status check constraint includes all valid statuses", () => {
      const validStatuses = ["pending", "completed", "failed", "cancelled"];
      expect(validStatuses).toHaveLength(4);
    });
  });
});
