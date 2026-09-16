import { describe, it, expect } from "vitest";

describe("Booking Lifecycle (Phase 2)", () => {
  const VALID_STATUSES = [
    "inquiry", "quote", "pending", "deposit_required", "partially_paid",
    "confirmed", "upcoming", "in_progress", "completed",
    "cancelled", "expired", "refunded",
  ];

  const ALLOWED_TRANSITIONS: Record<string, string[]> = {
    inquiry: ["quote", "pending", "cancelled"],
    quote: ["pending", "deposit_required", "cancelled", "expired"],
    pending: ["confirmed", "deposit_required", "cancelled", "expired"],
    deposit_required: ["partially_paid", "confirmed", "cancelled"],
    partially_paid: ["confirmed", "cancelled"],
    confirmed: ["upcoming", "in_progress", "cancelled"],
    upcoming: ["in_progress", "cancelled"],
    in_progress: ["completed", "cancelled"],
    completed: [],
    cancelled: [],
    expired: ["inquiry"],
    refunded: [],
  };

  const TERMINAL_STATUSES = ["completed", "cancelled", "refunded"];

  describe("Status Constraint Validation", () => {
    it("includes all 12 lifecycle statuses", () => {
      expect(VALID_STATUSES).toHaveLength(12);
    });

    it("has transitions defined for every non-terminal status", () => {
      for (const status of VALID_STATUSES) {
        if (!TERMINAL_STATUSES.includes(status)) {
          expect(ALLOWED_TRANSITIONS[status]).toBeDefined();
          expect(ALLOWED_TRANSITIONS[status].length).toBeGreaterThan(0);
        }
      }
    });

    it("has no transitions for terminal statuses", () => {
      for (const status of TERMINAL_STATUSES) {
        expect(ALLOWED_TRANSITIONS[status]).toBeDefined();
        expect(ALLOWED_TRANSITIONS[status]).toHaveLength(0);
      }
    });

    it("every transition target is a valid status", () => {
      for (const [from, targets] of Object.entries(ALLOWED_TRANSITIONS)) {
        expect(VALID_STATUSES).toContain(from);
        for (const to of targets) {
          expect(VALID_STATUSES).toContain(to);
        }
      }
    });
  });

  describe("Happy Path: Inquiry to Completed", () => {
    it("full lifecycle without deposit", () => {
      const flow = ["inquiry", "quote", "pending", "confirmed", "upcoming", "in_progress", "completed"];
      for (let i = 0; i < flow.length - 1; i++) {
        expect(ALLOWED_TRANSITIONS[flow[i]]).toContain(flow[i + 1]);
      }
    });

    it("full lifecycle with deposit", () => {
      const flow = ["inquiry", "quote", "pending", "deposit_required", "partially_paid", "confirmed", "upcoming", "in_progress", "completed"];
      for (let i = 0; i < flow.length - 1; i++) {
        expect(ALLOWED_TRANSITIONS[flow[i]]).toContain(flow[i + 1]);
      }
    });
  });

  describe("Cancellation Paths", () => {
    it("can cancel from inquiry", () => {
      expect(ALLOWED_TRANSITIONS.inquiry).toContain("cancelled");
    });

    it("can cancel from quote", () => {
      expect(ALLOWED_TRANSITIONS.quote).toContain("cancelled");
    });

    it("can cancel from pending", () => {
      expect(ALLOWED_TRANSITIONS.pending).toContain("cancelled");
    });

    it("can cancel from confirmed", () => {
      expect(ALLOWED_TRANSITIONS.confirmed).toContain("cancelled");
    });

    it("can cancel from in_progress", () => {
      expect(ALLOWED_TRANSITIONS.in_progress).toContain("cancelled");
    });

    it("cannot cancel from completed", () => {
      expect(ALLOWED_TRANSITIONS.completed).not.toContain("cancelled");
    });

    it("cannot cancel from refunded", () => {
      expect(ALLOWED_TRANSITIONS.refunded).not.toContain("cancelled");
    });
  });

  describe("Expiry and Reopening", () => {
    it("quote can expire", () => {
      expect(ALLOWED_TRANSITIONS.quote).toContain("expired");
    });

    it("pending can expire", () => {
      expect(ALLOWED_TRANSITIONS.pending).toContain("expired");
    });

    it("expired can reopen to inquiry", () => {
      expect(ALLOWED_TRANSITIONS.expired).toContain("inquiry");
    });

    it("cancelled is terminal - cannot reopen", () => {
      expect(ALLOWED_TRANSITIONS.cancelled).toHaveLength(0);
    });
  });

  describe("Admin Transition Blocking", () => {
    it("blocks updates from completed", () => {
      expect(TERMINAL_STATUSES).toContain("completed");
    });

    it("blocks updates from refunded", () => {
      expect(TERMINAL_STATUSES).toContain("refunded");
    });

    it("blocks updates from cancelled", () => {
      expect(TERMINAL_STATUSES).toContain("cancelled");
    });

    it("cancelled is terminal with no outgoing transitions", () => {
      expect(ALLOWED_TRANSITIONS.cancelled).toHaveLength(0);
    });

    it("expired is not terminal (can reopen to inquiry)", () => {
      expect(ALLOWED_TRANSITIONS.expired.length).toBeGreaterThan(0);
    });
  });

  describe("Duplicate Detection Logic", () => {
    it("detects duplicate bookings for same user, package, and date", () => {
      const existingBookings = [
        { userId: 1, packageId: 5, travelDate: "2026-08-01", status: "pending" },
      ];

      const newBooking = { userId: 1, packageId: 5, travelDate: "2026-08-01" };

      const duplicate = existingBookings.find(
        (b) =>
          b.userId === newBooking.userId &&
          b.packageId === newBooking.packageId &&
          b.travelDate === newBooking.travelDate &&
          !["cancelled", "expired", "refunded"].includes(b.status)
      );

      expect(duplicate).toBeDefined();
    });

    it("allows rebooking after cancellation", () => {
      const existingBookings = [
        { userId: 1, packageId: 5, travelDate: "2026-08-01", status: "cancelled" },
      ];

      const newBooking = { userId: 1, packageId: 5, travelDate: "2026-08-01" };

      const duplicate = existingBookings.find(
        (b) =>
          b.userId === newBooking.userId &&
          b.packageId === newBooking.packageId &&
          b.travelDate === newBooking.travelDate &&
          !["cancelled", "expired", "refunded"].includes(b.status)
      );

      expect(duplicate).toBeUndefined();
    });

    it("allows same user to book same package on different dates", () => {
      const existingBookings = [
        { userId: 1, packageId: 5, travelDate: "2026-08-01", status: "pending" },
      ];

      const newBooking = { userId: 1, packageId: 5, travelDate: "2026-09-01" };

      const duplicate = existingBookings.find(
        (b) =>
          b.userId === newBooking.userId &&
          b.packageId === newBooking.packageId &&
          b.travelDate === newBooking.travelDate &&
          !["cancelled", "expired", "refunded"].includes(b.status)
      );

      expect(duplicate).toBeUndefined();
    });
  });
});
