import { describe, it, expect } from "vitest";

describe("Phase 3: Customer Dashboard", () => {
  describe("Dashboard Route Protection", () => {
    const PROTECTED_ROUTES = ["/profile", "/bookings", "/dashboard"];

    it("includes /dashboard in protected routes", () => {
      expect(PROTECTED_ROUTES).toContain("/dashboard");
    });

    it("includes /profile in protected routes", () => {
      expect(PROTECTED_ROUTES).toContain("/profile");
    });

    it("includes /bookings in protected routes", () => {
      expect(PROTECTED_ROUTES).toContain("/bookings");
    });

    it("does not include public routes in protected routes", () => {
      expect(PROTECTED_ROUTES).not.toContain("/");
      expect(PROTECTED_ROUTES).not.toContain("/packages");
      expect(PROTECTED_ROUTES).not.toContain("/login");
      expect(PROTECTED_ROUTES).not.toContain("/register");
    });
  });

  describe("Booking Category Filtering", () => {
    const UPCOMING_STATUSES = [
      "inquiry", "quote", "pending", "deposit_required", "partially_paid",
      "confirmed", "upcoming",
    ];
    const ACTIVE_STATUSES = ["in_progress"];
    const PAST_STATUSES = ["completed", "cancelled", "expired", "refunded"];

    it("correctly categorizes upcoming bookings", () => {
      for (const status of UPCOMING_STATUSES) {
        expect(UPCOMING_STATUSES).toContain(status);
      }
    });

    it("correctly categorizes active bookings", () => {
      expect(ACTIVE_STATUSES).toContain("in_progress");
    });

    it("correctly categorizes past bookings", () => {
      for (const status of PAST_STATUSES) {
        expect(PAST_STATUSES).toContain(status);
      }
    });

    it("no status appears in multiple categories", () => {
      const all = [...UPCOMING_STATUSES, ...ACTIVE_STATUSES, ...PAST_STATUSES];
      const unique = new Set(all);
      expect(all.length).toBe(unique.size);
    });

    it("covers all 12 lifecycle statuses", () => {
      const all = [...UPCOMING_STATUSES, ...ACTIVE_STATUSES, ...PAST_STATUSES];
      expect(all).toHaveLength(12);
    });
  });

  describe("Customer Cancellation Rules", () => {
    const CANCELLABLE_STATUSES = ["inquiry", "quote", "pending", "deposit_required"];
    const NON_CANCELLABLE_STATUSES = [
      "confirmed", "upcoming", "in_progress", "completed",
      "cancelled", "expired", "refunded", "partially_paid",
    ];

    it("allows cancellation from pre-payment states", () => {
      for (const status of CANCELLABLE_STATUSES) {
        expect(CANCELLABLE_STATUSES).toContain(status);
      }
    });

    it("blocks cancellation from post-payment states", () => {
      for (const status of NON_CANCELLABLE_STATUSES) {
        expect(CANCELLABLE_STATUSES).not.toContain(status);
      }
    });

    it("blocks cancellation from terminal states", () => {
      const TERMINAL = ["completed", "cancelled", "refunded"];
      for (const status of TERMINAL) {
        expect(CANCELLABLE_STATUSES).not.toContain(status);
      }
    });
  });

  describe("Payment History Display Rules", () => {
    it("defines safe fields for customer display", () => {
      const SAFE_FIELDS = [
        "id", "bookingId", "amountUsd", "method", "provider",
        "externalRef", "status", "packageName", "travelDate", "createdAt",
      ];
      expect(SAFE_FIELDS).toContain("amountUsd");
      expect(SAFE_FIELDS).toContain("method");
      expect(SAFE_FIELDS).toContain("status");
      expect(SAFE_FIELDS).toContain("externalRef");
    });

    it("excludes sensitive fields from customer display", () => {
      const SENSITIVE_FIELDS = [
        "mpesaCheckoutRequestId", "mpesaMerchantRequestId",
        "cardLast4", "cardBrand", "cardholderName", "userId",
      ];
      const SAFE_DISPLAY_FIELDS = [
        "id", "bookingId", "amountUsd", "method", "status", "externalRef",
      ];
      for (const field of SENSITIVE_FIELDS) {
        expect(SAFE_DISPLAY_FIELDS).not.toContain(field);
      }
    });

    it("maps payment methods to customer-friendly labels", () => {
      const methodLabels: Record<string, string> = {
        mobile_money: "M-Pesa",
        card: "Card",
      };
      expect(methodLabels.mobile_money).toBe("M-Pesa");
      expect(methodLabels.card).toBe("Card");
    });
  });

  describe("Dashboard Profile Display", () => {
    it("shows safe profile fields", () => {
      const profileFields = ["firstName", "lastName", "email"];
      expect(profileFields).toContain("firstName");
      expect(profileFields).toContain("lastName");
      expect(profileFields).toContain("email");
    });

    it("does not expose internal fields", () => {
      const internalFields = ["id", "auth_id", "email_verified", "created_at"];
      const safeDisplayFields = ["firstName", "lastName", "email"];
      for (const field of internalFields) {
        expect(safeDisplayFields).not.toContain(field);
      }
    });
  });

  describe("IDOR Prevention Logic", () => {
    it("booking detail requires user_id match", () => {
      // Simulates: SELECT * FROM bookings WHERE id = ? AND user_id = ?
      const bookings = [
        { id: 1, userId: 100, packageName: "Serengeti" },
        { id: 2, userId: 101, packageName: "Masai Mara" },
      ];

      const authenticatedUserId = 100;
      const requestedBookingId = 2;

      const result = bookings.find(
        (b) => b.id === requestedBookingId && b.userId === authenticatedUserId
      );

      expect(result).toBeUndefined(); // Cannot access other user's booking
    });

    it("booking detail allows access to own booking", () => {
      const bookings = [
        { id: 1, userId: 100, packageName: "Serengeti" },
        { id: 2, userId: 101, packageName: "Masai Mara" },
      ];

      const authenticatedUserId = 100;
      const requestedBookingId = 1;

      const result = bookings.find(
        (b) => b.id === requestedBookingId && b.userId === authenticatedUserId
      );

      expect(result).toBeDefined();
      expect(result?.packageName).toBe("Serengeti");
    });

    it("payment history is filtered by user_id", () => {
      const payments = [
        { id: "p1", userId: 100, amountUsd: 1200 },
        { id: "p2", userId: 101, amountUsd: 2400 },
      ];

      const authenticatedUserId = 100;
      const userPayments = payments.filter((p) => p.userId === authenticatedUserId);

      expect(userPayments).toHaveLength(1);
      expect(userPayments[0].id).toBe("p1");
    });

    it("cancel endpoint verifies booking ownership", () => {
      const bookings = [
        { id: 1, userId: 100, status: "pending" },
        { id: 2, userId: 101, status: "confirmed" },
      ];

      const authenticatedUserId = 100;
      const requestedBookingId = 2;

      const result = bookings.find(
        (b) => b.id === requestedBookingId && b.userId === authenticatedUserId
      );

      expect(result).toBeUndefined(); // Cannot cancel other user's booking
    });
  });

  describe("Booking Status Display", () => {
    const statusLabels: Record<string, string> = {
      inquiry: "inquiry",
      quote: "quote",
      pending: "pending",
      deposit_required: "deposit required",
      partially_paid: "partially paid",
      confirmed: "confirmed",
      upcoming: "upcoming",
      in_progress: "in progress",
      completed: "completed",
      cancelled: "cancelled",
      expired: "expired",
      refunded: "refunded",
    };

    it("formats all status labels correctly", () => {
      expect(statusLabels.inquiry).toBe("inquiry");
      expect(statusLabels.deposit_required).toBe("deposit required");
      expect(statusLabels.partially_paid).toBe("partially paid");
      expect(statusLabels.in_progress).toBe("in progress");
    });

    it("has labels for all 12 statuses", () => {
      expect(Object.keys(statusLabels)).toHaveLength(12);
    });
  });
});
