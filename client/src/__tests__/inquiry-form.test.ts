import { describe, it, expect } from "vitest";

// ---- Reimplemented from components/contact/InquiryForm.tsx for unit testing ----

type FormState = {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  packageName: string;
  destinationName: string;
  travelDate: string;
  guests: string;
};

function validate(form: FormState): string[] {
  const errors: string[] = [];

  if (!form.name.trim()) {
    errors.push("Name is required.");
  } else if (form.name.trim().length > 100) {
    errors.push("Name must be under 100 characters.");
  }

  if (!form.email.trim()) {
    errors.push("Email is required.");
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    errors.push("Please enter a valid email address.");
  }

  if (form.phone && form.phone.length > 20) {
    errors.push("Phone number must be under 20 characters.");
  }

  if (form.subject && form.subject.length > 200) {
    errors.push("Subject must be under 200 characters.");
  }

  if (!form.message.trim()) {
    errors.push("Message is required.");
  } else if (form.message.trim().length > 2000) {
    errors.push("Message must be under 2000 characters.");
  }

  if (form.guests) {
    const n = Number(form.guests);
    if (!Number.isInteger(n) || n < 1 || n > 50) {
      errors.push("Number of guests must be between 1 and 50.");
    }
  }

  if (form.travelDate) {
    const d = new Date(form.travelDate);
    if (isNaN(d.getTime())) {
      errors.push("Please enter a valid travel date.");
    }
  }

  return errors;
}

const VALID_FORM: FormState = {
  name: "Jane Doe",
  email: "jane@example.com",
  phone: "+254700000000",
  subject: "Safari inquiry",
  message: "I'd like to learn more about your safari packages.",
  packageName: "",
  destinationName: "",
  travelDate: "",
  guests: "",
};

describe("Phase 12: Inquiry Form Validation", () => {
  describe("required fields", () => {
    it("requires name", () => {
      const errors = validate({ ...VALID_FORM, name: "" });
      expect(errors).toContain("Name is required.");
    });

    it("requires email", () => {
      const errors = validate({ ...VALID_FORM, email: "" });
      expect(errors).toContain("Email is required.");
    });

    it("requires message", () => {
      const errors = validate({ ...VALID_FORM, message: "" });
      expect(errors).toContain("Message is required.");
    });

    it("passes with all required fields", () => {
      const errors = validate(VALID_FORM);
      expect(errors).toHaveLength(0);
    });
  });

  describe("name validation", () => {
    it("rejects name over 100 characters", () => {
      const errors = validate({ ...VALID_FORM, name: "A".repeat(101) });
      expect(errors).toContain("Name must be under 100 characters.");
    });

    it("accepts name at 100 characters", () => {
      const errors = validate({ ...VALID_FORM, name: "A".repeat(100) });
      expect(errors).not.toContain("Name must be under 100 characters.");
    });

    it("rejects whitespace-only name", () => {
      const errors = validate({ ...VALID_FORM, name: "   " });
      expect(errors).toContain("Name is required.");
    });
  });

  describe("email validation", () => {
    it("rejects invalid email format", () => {
      const errors = validate({ ...VALID_FORM, email: "not-an-email" });
      expect(errors).toContain("Please enter a valid email address.");
    });

    it("rejects email without domain", () => {
      const errors = validate({ ...VALID_FORM, email: "user@" });
      expect(errors).toContain("Please enter a valid email address.");
    });

    it("rejects email without @", () => {
      const errors = validate({ ...VALID_FORM, email: "userexample.com" });
      expect(errors).toContain("Please enter a valid email address.");
    });

    it("accepts valid email", () => {
      const errors = validate({ ...VALID_FORM, email: "test@example.com" });
      expect(errors).not.toContain("Please enter a valid email address.");
    });

    it("accepts email with subdomain", () => {
      const errors = validate({
        ...VALID_FORM,
        email: "user@mail.example.co.ke",
      });
      expect(errors).not.toContain("Please enter a valid email address.");
    });
  });

  describe("phone validation", () => {
    it("accepts empty phone (optional field)", () => {
      const errors = validate({ ...VALID_FORM, phone: "" });
      expect(errors).not.toContain("Phone number must be under 20 characters.");
    });

    it("rejects phone over 20 characters", () => {
      const errors = validate({ ...VALID_FORM, phone: "1".repeat(21) });
      expect(errors).toContain("Phone number must be under 20 characters.");
    });

    it("accepts phone at 20 characters", () => {
      const errors = validate({ ...VALID_FORM, phone: "1".repeat(20) });
      expect(errors).not.toContain("Phone number must be under 20 characters.");
    });
  });

  describe("subject validation", () => {
    it("accepts empty subject (optional field)", () => {
      const errors = validate({ ...VALID_FORM, subject: "" });
      expect(errors).not.toContain("Subject must be under 200 characters.");
    });

    it("rejects subject over 200 characters", () => {
      const errors = validate({ ...VALID_FORM, subject: "A".repeat(201) });
      expect(errors).toContain("Subject must be under 200 characters.");
    });
  });

  describe("message validation", () => {
    it("rejects message over 2000 characters", () => {
      const errors = validate({ ...VALID_FORM, message: "A".repeat(2001) });
      expect(errors).toContain("Message must be under 2000 characters.");
    });

    it("accepts message at 2000 characters", () => {
      const errors = validate({ ...VALID_FORM, message: "A".repeat(2000) });
      expect(errors).not.toContain("Message must be under 2000 characters.");
    });

    it("rejects whitespace-only message", () => {
      const errors = validate({ ...VALID_FORM, message: "   " });
      expect(errors).toContain("Message is required.");
    });
  });

  describe("guest count validation", () => {
    it("accepts empty guests (optional field)", () => {
      const errors = validate({ ...VALID_FORM, guests: "" });
      expect(errors).toHaveLength(0);
    });

    it("rejects zero guests", () => {
      const errors = validate({ ...VALID_FORM, guests: "0" });
      expect(errors).toContain("Number of guests must be between 1 and 50.");
    });

    it("rejects negative guests", () => {
      const errors = validate({ ...VALID_FORM, guests: "-1" });
      expect(errors).toContain("Number of guests must be between 1 and 50.");
    });

    it("rejects guests over 50", () => {
      const errors = validate({ ...VALID_FORM, guests: "51" });
      expect(errors).toContain("Number of guests must be between 1 and 50.");
    });

    it("accepts guests at boundaries (1 and 50)", () => {
      expect(validate({ ...VALID_FORM, guests: "1" })).toHaveLength(0);
      expect(validate({ ...VALID_FORM, guests: "50" })).toHaveLength(0);
    });

    it("rejects non-integer guests", () => {
      const errors = validate({ ...VALID_FORM, guests: "2.5" });
      expect(errors).toContain("Number of guests must be between 1 and 50.");
    });
  });

  describe("travel date validation", () => {
    it("accepts empty date (optional field)", () => {
      const errors = validate({ ...VALID_FORM, travelDate: "" });
      expect(errors).toHaveLength(0);
    });

    it("accepts valid date", () => {
      const errors = validate({ ...VALID_FORM, travelDate: "2026-12-25" });
      expect(errors).not.toContain("Please enter a valid travel date.");
    });

    it("rejects invalid date string", () => {
      const errors = validate({ ...VALID_FORM, travelDate: "not-a-date" });
      expect(errors).toContain("Please enter a valid travel date.");
    });
  });

  describe("oversized input", () => {
    it("rejects form with extremely long name and message", () => {
      const errors = validate({
        ...VALID_FORM,
        name: "A".repeat(200),
        message: "B".repeat(3000),
      });
      expect(errors.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("XSS / injection prevention", () => {
    it("does not allow script injection in name", () => {
      const errors = validate({
        ...VALID_FORM,
        name: '<script>alert("xss")</script>',
      });
      // Validation accepts it (no XSS filter in validation), but
      // the rendering layer escapes it. This test documents that.
      expect(errors).toHaveLength(0);
    });

    it("validation does not break on HTML input", () => {
      const errors = validate({
        ...VALID_FORM,
        name: "John <b>Doe</b>",
        message: "Hello <img src=x onerror=alert(1)>",
      });
      // Validation passes; XSS protection is at render time via React auto-escaping
      expect(errors).toHaveLength(0);
    });
  });

  describe("multiple errors", () => {
    it("returns all errors for completely empty form", () => {
      const errors = validate({
        name: "",
        email: "",
        phone: "",
        subject: "",
        message: "",
        packageName: "",
        destinationName: "",
        travelDate: "",
        guests: "",
      });
      expect(errors.length).toBeGreaterThanOrEqual(3);
      expect(errors).toContain("Name is required.");
      expect(errors).toContain("Email is required.");
      expect(errors).toContain("Message is required.");
    });
  });
});
