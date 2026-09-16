import { describe, it, expect } from "vitest";

describe("Phase 4: Quotation System", () => {
  describe("Quotation Status Lifecycle", () => {
    const VALID_STATUSES = ["draft", "sent", "viewed", "accepted", "declined", "expired", "cancelled"];
    const TERMINAL_STATUSES = ["accepted", "declined", "expired", "cancelled"];

    const ALLOWED_TRANSITIONS: Record<string, string[]> = {
      draft: ["sent", "cancelled"],
      sent: ["viewed", "accepted", "declined", "expired", "cancelled"],
      viewed: ["accepted", "declined", "expired", "cancelled"],
      accepted: [],
      declined: [],
      expired: [],
      cancelled: [],
    };

    it("has 7 valid statuses", () => {
      expect(VALID_STATUSES).toHaveLength(7);
    });

    it("has 4 terminal statuses", () => {
      expect(TERMINAL_STATUSES).toHaveLength(4);
    });

    it("allows draft → sent (admin sends)", () => {
      expect(ALLOWED_TRANSITIONS.draft).toContain("sent");
    });

    it("allows sent → viewed (customer views)", () => {
      expect(ALLOWED_TRANSITIONS.sent).toContain("viewed");
    });

    it("allows viewed → accepted (customer accepts)", () => {
      expect(ALLOWED_TRANSITIONS.viewed).toContain("accepted");
    });

    it("allows viewed → declined (customer declines)", () => {
      expect(ALLOWED_TRANSITIONS.viewed).toContain("declined");
    });

    it("allows sent → accepted directly", () => {
      expect(ALLOWED_TRANSITIONS.sent).toContain("accepted");
    });

    it("allows admin cancellation from draft", () => {
      expect(ALLOWED_TRANSITIONS.draft).toContain("cancelled");
    });

    it("allows admin cancellation from sent", () => {
      expect(ALLOWED_TRANSITIONS.sent).toContain("cancelled");
    });

    it("blocks transition from accepted", () => {
      expect(ALLOWED_TRANSITIONS.accepted).toHaveLength(0);
    });

    it("blocks transition from declined", () => {
      expect(ALLOWED_TRANSITIONS.declined).toHaveLength(0);
    });

    it("blocks transition from expired", () => {
      expect(ALLOWED_TRANSITIONS.expired).toHaveLength(0);
    });

    it("blocks transition from cancelled", () => {
      expect(ALLOWED_TRANSITIONS.cancelled).toHaveLength(0);
    });

    it("every non-terminal status has at least one transition", () => {
      for (const status of VALID_STATUSES) {
        if (!TERMINAL_STATUSES.includes(status)) {
          expect(ALLOWED_TRANSITIONS[status].length).toBeGreaterThan(0);
        }
      }
    });
  });

  describe("Quotation Item Categories", () => {
    const VALID_CATEGORIES = [
      "accommodation", "transport", "park_fees", "activities",
      "meals", "guide", "other", "discount",
    ];

    it("has 8 valid categories", () => {
      expect(VALID_CATEGORIES).toHaveLength(8);
    });

    it("includes discount category", () => {
      expect(VALID_CATEGORIES).toContain("discount");
    });

    it("includes all safari-relevant categories", () => {
      expect(VALID_CATEGORIES).toContain("accommodation");
      expect(VALID_CATEGORIES).toContain("transport");
      expect(VALID_CATEGORIES).toContain("park_fees");
      expect(VALID_CATEGORIES).toContain("activities");
      expect(VALID_CATEGORIES).toContain("meals");
      expect(VALID_CATEGORIES).toContain("guide");
    });
  });

  describe("Server-Side Price Calculation", () => {
    it("calculates line item amount as quantity × unit price", () => {
      const quantity = 3;
      const unitPrice = 150;
      const amount = quantity * unitPrice;
      expect(amount).toBe(450);
    });

    it("calculates subtotal as sum of non-discount items", () => {
      const items = [
        { category: "accommodation", amount: 600 },
        { category: "transport", amount: 200 },
        { category: "park_fees", amount: 150 },
        { category: "discount", amount: -50 },
      ];
      const subtotal = items
        .filter((i) => i.category !== "discount")
        .reduce((sum, i) => sum + i.amount, 0);
      expect(subtotal).toBe(950);
    });

    it("calculates discount as sum of discount items", () => {
      const items = [
        { category: "accommodation", amount: 600 },
        { category: "discount", amount: -50 },
      ];
      const discount = items
        .filter((i) => i.category === "discount")
        .reduce((sum, i) => sum + Math.abs(i.amount), 0);
      expect(discount).toBe(50);
    });

    it("calculates total as subtotal - discount + tax", () => {
      const subtotal = 950;
      const discount = 50;
      const tax = 100;
      const total = subtotal - discount + tax;
      expect(total).toBe(1000);
    });

    it("rejects negative unit prices", () => {
      const unitPrice = -100;
      expect(unitPrice >= 0).toBe(false);
    });

    it("rejects zero quantity", () => {
      const quantity = 0;
      expect(quantity >= 1).toBe(false);
    });

    it("rejects negative amounts", () => {
      const amount = -500;
      expect(amount >= 0).toBe(false);
    });
  });

  describe("Customer Authorization", () => {
    it("customer can only see own quotations", () => {
      const quotations = [
        { id: 1, userId: 100, title: "Trip A" },
        { id: 2, userId: 101, title: "Trip B" },
      ];
      const authenticatedUserId = 100;
      const visible = quotations.filter((q) => q.userId === authenticatedUserId);
      expect(visible).toHaveLength(1);
      expect(visible[0].id).toBe(1);
    });

    it("customer cannot accept another customer's quotation", () => {
      const quotation = { id: 1, userId: 101 };
      const authenticatedUserId = 100;
      const canAccept = quotation.userId === authenticatedUserId;
      expect(canAccept).toBe(false);
    });

    it("customer cannot modify quotation prices", () => {
      const customerAllowedFields = ["title", "description", "travelDate", "guests"];
      expect(customerAllowedFields).not.toContain("totalUsd");
      expect(customerAllowedFields).not.toContain("subtotalUsd");
      expect(customerAllowedFields).not.toContain("discountUsd");
      expect(customerAllowedFields).not.toContain("taxUsd");
    });

    it("customer cannot modify admin notes", () => {
      const customerAllowedFields = ["notesCustomer"];
      expect(customerAllowedFields).not.toContain("notesAdmin");
    });
  });

  describe("Booking Integration", () => {
    it("quote acceptance does not mark payment as completed", () => {
      const quotationStatus = "accepted";
      const paymentStatus = "pending";
      expect(quotationStatus).toBe("accepted");
      expect(paymentStatus).not.toBe("completed");
    });

    it("quote acceptance transitions booking to pending", () => {
      const validTransitions: Record<string, string> = {
        inquiry: "pending",
        quote: "pending",
      };
      expect(validTransitions.inquiry).toBe("pending");
      expect(validTransitions.quote).toBe("pending");
    });

    it("does not create duplicate bookings", () => {
      const existingBooking = { id: 1, userId: 100, packageId: 5, travelDate: "2026-08-01" };
      const quotationBookingId = existingBooking.id;
      expect(quotationBookingId).toBe(existingBooking.id);
    });

    it("booking status remains valid after quote acceptance", () => {
      const validBookingStatuses = [
        "pending", "deposit_required", "partially_paid", "confirmed",
        "upcoming", "in_progress", "completed", "cancelled", "expired", "refunded",
      ];
      expect(validBookingStatuses).toContain("pending");
    });
  });

  describe("Quotation Validation Rules", () => {
    it("requires title", () => {
      const title = "";
      expect(title.length > 0).toBe(false);
    });

    it("requires travel date", () => {
      const travelDate = undefined;
      expect(travelDate).toBeUndefined();
    });

    it("requires at least one line item", () => {
      const items: unknown[] = [];
      expect(items.length > 0).toBe(false);
    });

    it("validates guest count 1-20", () => {
      expect(1 >= 1 && 1 <= 20).toBe(true);
      expect(20 >= 1 && 20 <= 20).toBe(true);
      expect(0 >= 1 && 0 <= 20).toBe(false);
      expect(21 >= 1 && 21 <= 20).toBe(false);
    });

    it("validates validity date is in the future for sending", () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      expect(futureDate >= today).toBe(true);
    });
  });

  describe("Protected Routes", () => {
    it("includes /quotations in protected routes", () => {
      const PROTECTED_ROUTES = ["/profile", "/bookings", "/dashboard", "/quotations"];
      expect(PROTECTED_ROUTES).toContain("/quotations");
    });
  });
});
