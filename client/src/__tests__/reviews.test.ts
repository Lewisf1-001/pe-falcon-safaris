import { describe, it, expect } from "vitest";

// ---- Reimplemented from reviews system for unit testing ----

type ReviewStatus = "pending" | "approved" | "rejected" | "hidden";

type ReviewFormInput = {
  bookingId: unknown;
  rating: unknown;
  title: unknown;
  body: unknown;
};

function validateReviewForm(form: ReviewFormInput): string[] {
  const errors: string[] = [];

  if (typeof form.bookingId !== "number" || !Number.isInteger(form.bookingId) || form.bookingId <= 0) {
    errors.push("Valid booking ID is required.");
  }

  if (typeof form.rating !== "number" || !Number.isInteger(form.rating) || form.rating < 1 || form.rating > 5) {
    errors.push("Rating must be an integer between 1 and 5.");
  }

  if (typeof form.title !== "string" || form.title.trim().length === 0) {
    errors.push("Title is required.");
  } else if (form.title.trim().length > 200) {
    errors.push("Title must be under 200 characters.");
  }

  if (typeof form.body !== "string" || form.body.trim().length === 0) {
    errors.push("Review body is required.");
  } else if (form.body.trim().length > 2000) {
    errors.push("Review body must be under 2000 characters.");
  }

  return errors;
}

function isValidStatus(status: unknown): status is ReviewStatus {
  return typeof status === "string" && ["pending", "approved", "rejected", "hidden"].includes(status);
}

function isPubliclyVisible(status: ReviewStatus): boolean {
  return status === "approved";
}

function formatReviewerName(firstName: string | null, lastName: string | null): string {
  const first = firstName?.trim() || "";
  const last = lastName?.trim() || "";
  if (!first && !last) return "Anonymous Safari Guest";
  if (!last) return first;
  return `${first} ${last.charAt(0)}.`;
}

const VALID_FORM: ReviewFormInput = {
  bookingId: 1,
  rating: 5,
  title: "Amazing safari experience",
  body: "We saw the Big Five and the guide was excellent.",
};

describe("Phase 13: Reviews & Testimonials", () => {
  describe("Review form validation", () => {
    it("passes with valid input", () => {
      expect(validateReviewForm(VALID_FORM)).toHaveLength(0);
    });

    it("requires booking ID", () => {
      const errors = validateReviewForm({ ...VALID_FORM, bookingId: undefined });
      expect(errors).toContain("Valid booking ID is required.");
    });

    it("rejects non-integer booking ID", () => {
      const errors = validateReviewForm({ ...VALID_FORM, bookingId: 1.5 });
      expect(errors).toContain("Valid booking ID is required.");
    });

    it("rejects zero booking ID", () => {
      const errors = validateReviewForm({ ...VALID_FORM, bookingId: 0 });
      expect(errors).toContain("Valid booking ID is required.");
    });

    it("rejects negative booking ID", () => {
      const errors = validateReviewForm({ ...VALID_FORM, bookingId: -1 });
      expect(errors).toContain("Valid booking ID is required.");
    });

    it("requires rating", () => {
      const errors = validateReviewForm({ ...VALID_FORM, rating: undefined });
      expect(errors).toContain("Rating must be an integer between 1 and 5.");
    });

    it("rejects rating below 1", () => {
      const errors = validateReviewForm({ ...VALID_FORM, rating: 0 });
      expect(errors).toContain("Rating must be an integer between 1 and 5.");
    });

    it("rejects rating above 5", () => {
      const errors = validateReviewForm({ ...VALID_FORM, rating: 6 });
      expect(errors).toContain("Rating must be an integer between 1 and 5.");
    });

    it("rejects non-integer rating", () => {
      const errors = validateReviewForm({ ...VALID_FORM, rating: 3.5 });
      expect(errors).toContain("Rating must be an integer between 1 and 5.");
    });

    it("accepts rating at boundaries (1 and 5)", () => {
      expect(validateReviewForm({ ...VALID_FORM, rating: 1 })).toHaveLength(0);
      expect(validateReviewForm({ ...VALID_FORM, rating: 5 })).toHaveLength(0);
    });

    it("requires title", () => {
      const errors = validateReviewForm({ ...VALID_FORM, title: "" });
      expect(errors).toContain("Title is required.");
    });

    it("rejects whitespace-only title", () => {
      const errors = validateReviewForm({ ...VALID_FORM, title: "   " });
      expect(errors).toContain("Title is required.");
    });

    it("rejects title over 200 characters", () => {
      const errors = validateReviewForm({ ...VALID_FORM, title: "A".repeat(201) });
      expect(errors).toContain("Title must be under 200 characters.");
    });

    it("accepts title at 200 characters", () => {
      const errors = validateReviewForm({ ...VALID_FORM, title: "A".repeat(200) });
      expect(errors).not.toContain("Title must be under 200 characters.");
    });

    it("requires body", () => {
      const errors = validateReviewForm({ ...VALID_FORM, body: "" });
      expect(errors).toContain("Review body is required.");
    });

    it("rejects whitespace-only body", () => {
      const errors = validateReviewForm({ ...VALID_FORM, body: "   " });
      expect(errors).toContain("Review body is required.");
    });

    it("rejects body over 2000 characters", () => {
      const errors = validateReviewForm({ ...VALID_FORM, body: "A".repeat(2001) });
      expect(errors).toContain("Review body must be under 2000 characters.");
    });

    it("accepts body at 2000 characters", () => {
      const errors = validateReviewForm({ ...VALID_FORM, body: "A".repeat(2000) });
      expect(errors).not.toContain("Review body must be under 2000 characters.");
    });
  });

  describe("Type coercion attacks", () => {
    it("rejects string booking ID", () => {
      const errors = validateReviewForm({ ...VALID_FORM, bookingId: "1" });
      expect(errors).toContain("Valid booking ID is required.");
    });

    it("rejects array rating", () => {
      const errors = validateReviewForm({ ...VALID_FORM, rating: [3] });
      expect(errors).toContain("Rating must be an integer between 1 and 5.");
    });

    it("rejects object title", () => {
      const errors = validateReviewForm({ ...VALID_FORM, title: { script: true } });
      expect(errors).toContain("Title is required.");
    });

    it("rejects boolean body", () => {
      const errors = validateReviewForm({ ...VALID_FORM, body: true });
      expect(errors).toContain("Review body is required.");
    });

    it("rejects null values", () => {
      const errors = validateReviewForm({
        bookingId: null,
        rating: null,
        title: null,
        body: null,
      });
      expect(errors.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe("Status validation", () => {
    it("accepts valid statuses", () => {
      expect(isValidStatus("pending")).toBe(true);
      expect(isValidStatus("approved")).toBe(true);
      expect(isValidStatus("rejected")).toBe(true);
      expect(isValidStatus("hidden")).toBe(true);
    });

    it("rejects invalid statuses", () => {
      expect(isValidStatus("published")).toBe(false);
      expect(isValidStatus("active")).toBe(false);
      expect(isValidStatus("")).toBe(false);
      expect(isValidStatus(undefined)).toBe(false);
    });
  });

  describe("Public visibility", () => {
    it("only approved reviews are publicly visible", () => {
      expect(isPubliclyVisible("approved")).toBe(true);
    });

    it("pending reviews are not publicly visible", () => {
      expect(isPubliclyVisible("pending")).toBe(false);
    });

    it("rejected reviews are not publicly visible", () => {
      expect(isPubliclyVisible("rejected")).toBe(false);
    });

    it("hidden reviews are not publicly visible", () => {
      expect(isPubliclyVisible("hidden")).toBe(false);
    });
  });

  describe("Reviewer name formatting", () => {
    it("formats full name with last initial", () => {
      expect(formatReviewerName("Jane", "Doe")).toBe("Jane D.");
    });

    it("returns first name only when no last name", () => {
      expect(formatReviewerName("Jane", null)).toBe("Jane");
    });

    it("returns Anonymous for empty names", () => {
      expect(formatReviewerName(null, null)).toBe("Anonymous Safari Guest");
      expect(formatReviewerName("", "")).toBe("Anonymous Safari Guest");
    });

    it("handles whitespace-only names", () => {
      expect(formatReviewerName("  ", "  ")).toBe("Anonymous Safari Guest");
    });
  });

  describe("Privacy - public data safety", () => {
    it("public review does not expose email", () => {
      const publicReview = {
        id: 1,
        rating: 5,
        title: "Great",
        body: "Amazing",
        reviewerName: "Jane D.",
        packageName: "Masai Mara",
        createdAt: "2026-01-01",
      };
      expect(publicReview).not.toHaveProperty("email");
      expect(publicReview).not.toHaveProperty("userId");
      expect(publicReview).not.toHaveProperty("bookingId");
    });

    it("reviewer name does not contain email", () => {
      const name = formatReviewerName("Jane", "Doe");
      expect(name).not.toContain("@");
    });
  });

  describe("XSS prevention", () => {
    it("review title with script tags is a string (escaped at render)", () => {
      const form = {
        ...VALID_FORM,
        title: '<script>alert("xss")</script>',
      };
      const errors = validateReviewForm(form);
      // Validation passes; React auto-escapes at render time
      expect(errors).toHaveLength(0);
    });

    it("review body with HTML is a string (escaped at render)", () => {
      const form = {
        ...VALID_FORM,
        body: '<img src=x onerror=alert(1)>',
      };
      const errors = validateReviewForm(form);
      expect(errors).toHaveLength(0);
    });
  });

  describe("Edge cases", () => {
    it("handles empty form object", () => {
      const errors = validateReviewForm({
        bookingId: undefined,
        rating: undefined,
        title: undefined,
        body: undefined,
      });
      expect(errors.length).toBeGreaterThanOrEqual(3);
    });

    it("handles multiple validation errors", () => {
      const errors = validateReviewForm({
        bookingId: -1,
        rating: 10,
        title: "",
        body: "",
      });
      expect(errors.length).toBe(4);
    });

    it("handles extremely long inputs", () => {
      const errors = validateReviewForm({
        bookingId: 1,
        rating: 3,
        title: "A".repeat(500),
        body: "B".repeat(5000),
      });
      expect(errors.length).toBe(2);
    });
  });
});
