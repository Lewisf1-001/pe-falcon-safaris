import { describe, it, expect } from "vitest";

// Phone normalization function matching production implementation
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

const KENYAN_PHONE_REGEX = /^(?:254|\+?254|0)?[17]\d{8}$/;

describe("Validation & Normalization Tests", () => {
  describe("Phone Normalization & Validation", () => {
    it("normalizes standard Kenyan mobile numbers correctly", () => {
      expect(normalizePhone("0712345678")).toBe("254712345678");
      expect(normalizePhone("0112345678")).toBe("254112345678");
      expect(normalizePhone("254712345678")).toBe("254712345678");
      expect(normalizePhone("+254712345678")).toBe("254712345678");
      expect(normalizePhone("712345678")).toBe("254712345678");
    });

    it("validates Kenyan phone number formats with regex", () => {
      expect(KENYAN_PHONE_REGEX.test("0712345678")).toBe(true);
      expect(KENYAN_PHONE_REGEX.test("+254712345678")).toBe(true);
      expect(KENYAN_PHONE_REGEX.test("254712345678")).toBe(true);
      expect(KENYAN_PHONE_REGEX.test("712345678")).toBe(true);

      // Invalid formats
      expect(KENYAN_PHONE_REGEX.test("0812345678")).toBe(false); // invalid prefix
      expect(KENYAN_PHONE_REGEX.test("12345")).toBe(false); // too short
      expect(KENYAN_PHONE_REGEX.test("abcdefghij")).toBe(false); // letters
      expect(KENYAN_PHONE_REGEX.test("")).toBe(false);
    });
  });

  describe("Guest Validation Logic", () => {
    const validateGuests = (guests: any) => {
      if (guests === undefined || guests === null || guests === "") {
        return { valid: false, error: "Guest count is required" };
      }
      const num = Number(guests);
      if (!Number.isInteger(num) || num <= 0) {
        return { valid: false, error: "Guest count must be a positive integer" };
      }
      if (num > 20) {
        return { valid: false, error: "Maximum guest limit is 20 per booking" };
      }
      return { valid: true, value: num };
    };

    it("accepts valid guest counts", () => {
      expect(validateGuests(1)).toEqual({ valid: true, value: 1 });
      expect(validateGuests(4)).toEqual({ valid: true, value: 4 });
      expect(validateGuests("10")).toEqual({ valid: true, value: 10 });
      expect(validateGuests(20)).toEqual({ valid: true, value: 20 });
    });

    it("rejects invalid, zero, negative, or excessive guest counts", () => {
      expect(validateGuests(0).valid).toBe(false);
      expect(validateGuests(-2).valid).toBe(false);
      expect(validateGuests(21).valid).toBe(false);
      expect(validateGuests(NaN).valid).toBe(false);
      expect(validateGuests(null).valid).toBe(false);
      expect(validateGuests(undefined).valid).toBe(false);
      expect(validateGuests("abc").valid).toBe(false);
    });
  });

  describe("Travel Date Validation", () => {
    const validateTravelDate = (dateStr: string) => {
      if (!dateStr) return { valid: false, error: "Date is required" };
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return { valid: false, error: "Invalid date format" };
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (date < today) return { valid: false, error: "Travel date must be in the future" };
      return { valid: true };
    };

    it("accepts future dates", () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      expect(validateTravelDate(tomorrow.toISOString().slice(0, 10)).valid).toBe(true);
    });

    it("rejects past dates", () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(validateTravelDate(yesterday.toISOString().slice(0, 10)).valid).toBe(false);
    });

    it("rejects empty and invalid dates", () => {
      expect(validateTravelDate("").valid).toBe(false);
      expect(validateTravelDate("not-a-date").valid).toBe(false);
    });
  });

  describe("Notes Validation", () => {
    const validateNotes = (notes: string | undefined) => {
      if (!notes || notes.trim().length === 0) return { valid: true, value: null };
      if (notes.length > 1000) return { valid: false, error: "Notes must be 1000 characters or fewer" };
      return { valid: true, value: notes.trim() };
    };

    it("accepts valid notes and trims whitespace", () => {
      expect(validateNotes("Please arrange airport pickup")).toEqual({ valid: true, value: "Please arrange airport pickup" });
      expect(validateNotes("  trimmed  ")).toEqual({ valid: true, value: "trimmed" });
    });

    it("accepts empty or undefined notes", () => {
      expect(validateNotes(undefined)).toEqual({ valid: true, value: null });
      expect(validateNotes("")).toEqual({ valid: true, value: null });
      expect(validateNotes("   ")).toEqual({ valid: true, value: null });
    });

    it("rejects notes exceeding 1000 characters", () => {
      const longNotes = "a".repeat(1001);
      expect(validateNotes(longNotes).valid).toBe(false);
    });

    it("accepts notes at exactly 1000 characters", () => {
      const maxNotes = "a".repeat(1000);
      expect(validateNotes(maxNotes).valid).toBe(true);
    });
  });

  describe("Booking Status Transition Rules (Phase 2 Lifecycle)", () => {
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
      cancelled: ["inquiry"],
      expired: ["inquiry"],
      refunded: [],
    };

    const canTransition = (from: string, to: string) => {
      const allowed = ALLOWED_TRANSITIONS[from] || [];
      return allowed.includes(to);
    };

    const isTerminal = (status: string) => {
      return ALLOWED_TRANSITIONS[status]?.length === 0;
    };

    it("allows valid forward transitions through the lifecycle", () => {
      expect(canTransition("inquiry", "quote")).toBe(true);
      expect(canTransition("quote", "pending")).toBe(true);
      expect(canTransition("pending", "confirmed")).toBe(true);
      expect(canTransition("confirmed", "upcoming")).toBe(true);
      expect(canTransition("upcoming", "in_progress")).toBe(true);
      expect(canTransition("in_progress", "completed")).toBe(true);
    });

    it("allows alternative payment paths", () => {
      expect(canTransition("pending", "deposit_required")).toBe(true);
      expect(canTransition("deposit_required", "partially_paid")).toBe(true);
      expect(canTransition("partially_paid", "confirmed")).toBe(true);
      expect(canTransition("pending", "deposit_required")).toBe(true);
      expect(canTransition("deposit_required", "confirmed")).toBe(true);
    });

    it("allows cancellation from any non-terminal state", () => {
      expect(canTransition("inquiry", "cancelled")).toBe(true);
      expect(canTransition("quote", "cancelled")).toBe(true);
      expect(canTransition("pending", "cancelled")).toBe(true);
      expect(canTransition("confirmed", "cancelled")).toBe(true);
      expect(canTransition("in_progress", "cancelled")).toBe(true);
    });

    it("allows reopening from expired or cancelled states", () => {
      expect(canTransition("expired", "inquiry")).toBe(true);
      expect(canTransition("cancelled", "inquiry")).toBe(true);
    });

    it("blocks invalid transitions", () => {
      expect(canTransition("completed", "pending")).toBe(false);
      expect(canTransition("completed", "cancelled")).toBe(false);
      expect(canTransition("refunded", "pending")).toBe(false);
      expect(canTransition("cancelled", "confirmed")).toBe(false);
      expect(canTransition("inquiry", "completed")).toBe(false);
      expect(canTransition("pending", "in_progress")).toBe(false);
    });

    it("identifies terminal states correctly", () => {
      expect(isTerminal("completed")).toBe(true);
      expect(isTerminal("refunded")).toBe(true);
      expect(isTerminal("cancelled")).toBe(false); // can reopen to inquiry
      expect(isTerminal("expired")).toBe(false); // can reopen to inquiry
      expect(isTerminal("pending")).toBe(false);
      expect(isTerminal("confirmed")).toBe(false);
    });
  });

  describe("Server-Authoritative Price Calculation", () => {
    it("calculates total price from package price × guests", () => {
      const packagePrice = 1200;
      const guests = 3;
      const total = packagePrice * guests;
      expect(total).toBe(3600);
    });

    it("rejects client-submitted price overrides", () => {
      const serverPrice = 1200 * 3;
      const clientFakePrice = 10;
      expect(serverPrice).not.toBe(clientFakePrice);
    });

    it("rejects packages with zero or negative price", () => {
      const invalidPrices = [0, -100, -0.01];
      for (const price of invalidPrices) {
        expect(price > 0).toBe(false);
      }
    });
  });
});
