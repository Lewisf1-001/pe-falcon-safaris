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
      if (num > 50) {
        return { valid: false, error: "Maximum guest limit is 50 per booking" };
      }
      return { valid: true, value: num };
    };

    it("accepts valid guest counts", () => {
      expect(validateGuests(1)).toEqual({ valid: true, value: 1 });
      expect(validateGuests(4)).toEqual({ valid: true, value: 4 });
      expect(validateGuests("10")).toEqual({ valid: true, value: 10 });
    });

    it("rejects invalid, zero, negative, or excessive guest counts", () => {
      expect(validateGuests(0).valid).toBe(false);
      expect(validateGuests(-2).valid).toBe(false);
      expect(validateGuests(51).valid).toBe(false);
      expect(validateGuests(NaN).valid).toBe(false);
      expect(validateGuests(null).valid).toBe(false);
      expect(validateGuests(undefined).valid).toBe(false);
      expect(validateGuests("abc").valid).toBe(false);
    });
  });

  describe("Booking Status Transition Rules", () => {
    const ALLOWED_TRANSITIONS: Record<string, string[]> = {
      pending: ["confirmed", "cancelled"],
      confirmed: ["cancelled", "completed"],
      cancelled: [],
      completed: [],
    };

    const canTransition = (from: string, to: string) => {
      const allowed = ALLOWED_TRANSITIONS[from] || [];
      return allowed.includes(to);
    };

    it("allows valid status transitions", () => {
      expect(canTransition("pending", "confirmed")).toBe(true);
      expect(canTransition("pending", "cancelled")).toBe(true);
      expect(canTransition("confirmed", "cancelled")).toBe(true);
      expect(canTransition("confirmed", "completed")).toBe(true);
    });

    it("blocks invalid status transitions", () => {
      expect(canTransition("cancelled", "pending")).toBe(false);
      expect(canTransition("cancelled", "confirmed")).toBe(false);
      expect(canTransition("completed", "pending")).toBe(false);
      expect(canTransition("confirmed", "pending")).toBe(false);
    });
  });
});
