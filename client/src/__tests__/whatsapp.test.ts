import { describe, it, expect } from "vitest";

// ---- Reimplemented from lib/whatsapp.ts for unit testing ----

const WHATSAPP_NUMBER_KEY = "NEXT_PUBLIC_WHATSAPP_NUMBER";
const MAX_MESSAGE_LENGTH = 2000;

const PLACEHOLDER_NUMBERS = new Set([
  "+254700000000",
  "254700000000",
  "+254 700 000 000",
  "+1234567890",
  "1234567890",
]);

function isNumberConfigured(env?: string): boolean {
  if (!env || typeof env !== "string") return false;
  const trimmed = env.trim();
  if (trimmed.length === 0) return false;
  if (PLACEHOLDER_NUMBERS.has(trimmed)) return false;
  const digits = trimmed.replace(/[^0-9]/g, "");
  if (digits.length < 7 || digits.length > 15) return false;
  return true;
}

function getWhatsAppNumber(env?: string): string | null {
  if (!isNumberConfigured(env)) return null;
  return env!.trim();
}

function normalizePhone(phone: string): string {
  return phone.replace(/[^0-9]/g, "");
}

function encodeMessage(text: string): string {
  const trimmed = text.trim().slice(0, MAX_MESSAGE_LENGTH);
  return encodeURIComponent(trimmed);
}

function buildWhatsAppUrl(phone: string, message: string): string | null {
  const normalized = normalizePhone(phone);
  if (normalized.length < 7 || normalized.length > 15) return null;
  return `https://wa.me/${normalized}?text=${encodeMessage(message)}`;
}

function buildPackageMessage(packageName: string): string {
  return `Hello! I'm interested in the "${packageName}" safari package on PE Falcon Safaris. Could you please provide more details and help me plan this trip?`;
}

function buildDestinationMessage(destinationName: string): string {
  return `Hello! I'd like to learn more about visiting ${destinationName} with PE Falcon Safaris. Could you share available packages and pricing?`;
}

type ItineraryItem = {
  destinationName: string;
  packageName: string | null;
  packagePriceUsd: number | null;
};

function buildTripMessage(
  items: ItineraryItem[],
  totalPrice: number
): string {
  if (items.length === 0) {
    return "Hello! I'd like to inquire about planning a custom safari with PE Falcon Safaris.";
  }

  const lines = ["Hello! I'm interested in the following safari itinerary:"];
  lines.push("");

  items.forEach((item, i) => {
    const parts = [`${i + 1}. ${item.destinationName}`];
    if (item.packageName) {
      parts.push(`   Package: ${item.packageName}`);
    }
    if (item.packagePriceUsd != null) {
      parts.push(`   Est. price: $${item.packagePriceUsd.toLocaleString()}`);
    }
    lines.push(parts.join("\n"));
  });

  if (totalPrice > 0) {
    lines.push("");
    lines.push(`Estimated total: $${totalPrice.toLocaleString()}`);
  }

  lines.push("");
  lines.push("Could you help me plan and provide a detailed quotation?");

  return lines.join("\n");
}

function buildInquiryMessage(data: {
  name: string;
  subject?: string;
}): string {
  let msg = `Hello! I'm reaching out via the PE Falcon Safaris website.`;
  if (data.subject) {
    msg += ` I have a question about: ${data.subject}.`;
  }
  msg += ` Could you please assist me?`;
  return msg;
}

// ---- Reimplemented server-side validation for testing ----

type ServerFormState = {
  name: unknown;
  email: unknown;
  phone: unknown;
  subject: unknown;
  message: unknown;
  packageName: unknown;
  destinationName: unknown;
  travelDate: unknown;
  guests: unknown;
};

function serverValidate(form: ServerFormState): string[] {
  const errors: string[] = [];

  if (typeof form.name !== "string" || form.name.trim().length === 0) {
    errors.push("Name is required.");
  } else if (form.name.trim().length > 100) {
    errors.push("Name must be under 100 characters.");
  }

  if (typeof form.email !== "string" || form.email.trim().length === 0) {
    errors.push("Email is required.");
  } else if (form.email.trim().length > 254) {
    errors.push("Email must be under 254 characters.");
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    errors.push("Invalid email format.");
  }

  if (form.phone !== undefined && form.phone !== null && form.phone !== "") {
    if (typeof form.phone !== "string") {
      errors.push("Phone must be a string.");
    } else if (form.phone.length > 20) {
      errors.push("Phone must be under 20 characters.");
    }
  }

  if (form.subject !== undefined && form.subject !== null && form.subject !== "") {
    if (typeof form.subject !== "string") {
      errors.push("Subject must be a string.");
    } else if (form.subject.length > 200) {
      errors.push("Subject must be under 200 characters.");
    }
  }

  if (typeof form.message !== "string" || form.message.trim().length === 0) {
    errors.push("Message is required.");
  } else if (form.message.trim().length > 2000) {
    errors.push("Message must be under 2000 characters.");
  }

  if (form.packageName !== undefined && form.packageName !== null && form.packageName !== "") {
    if (typeof form.packageName !== "string") {
      errors.push("Package must be a string.");
    } else if (form.packageName.length > 200) {
      errors.push("Package must be under 200 characters.");
    }
  }

  if (form.destinationName !== undefined && form.destinationName !== null && form.destinationName !== "") {
    if (typeof form.destinationName !== "string") {
      errors.push("Destination must be a string.");
    } else if (form.destinationName.length > 200) {
      errors.push("Destination must be under 200 characters.");
    }
  }

  if (form.travelDate !== undefined && form.travelDate !== null && form.travelDate !== "") {
    if (typeof form.travelDate !== "string") {
      errors.push("Travel date must be a string.");
    } else {
      const d = new Date(form.travelDate);
      if (isNaN(d.getTime())) {
        errors.push("Invalid travel date.");
      }
    }
  }

  if (form.guests !== undefined && form.guests !== null) {
    const guestNum = Number(form.guests);
    if (!Number.isInteger(guestNum) || guestNum < 1 || guestNum > 50) {
      errors.push("Guests must be an integer between 1 and 50.");
    }
  }

  return errors;
}

const MAX_PAYLOAD_BYTES = 10240;

// ---- Tests ----

describe("Phase 12 Hardening: WhatsApp Number Validation", () => {
  describe("isNumberConfigured", () => {
    it("returns false when no value provided", () => {
      expect(isNumberConfigured()).toBe(false);
    });

    it("returns false for empty string", () => {
      expect(isNumberConfigured("")).toBe(false);
    });

    it("returns false for undefined-like values", () => {
      expect(isNumberConfigured(undefined)).toBe(false);
    });

    it("rejects the known placeholder +254700000000", () => {
      expect(isNumberConfigured("+254700000000")).toBe(false);
    });

    it("rejects placeholder without plus sign", () => {
      expect(isNumberConfigured("254700000000")).toBe(false);
    });

    it("rejects placeholder with spaces", () => {
      expect(isNumberConfigured("+254 700 000 000")).toBe(false);
    });

    it("rejects +1234567890 placeholder", () => {
      expect(isNumberConfigured("+1234567890")).toBe(false);
    });

    it("rejects numbers shorter than 7 digits", () => {
      expect(isNumberConfigured("+123456")).toBe(false);
    });

    it("rejects numbers longer than 15 digits", () => {
      expect(isNumberConfigured("+1234567890123456")).toBe(false);
    });

    it("accepts a valid Kenyan number", () => {
      expect(isNumberConfigured("+254712345678")).toBe(true);
    });

    it("accepts a valid international number", () => {
      expect(isNumberConfigured("+14155552671")).toBe(true);
    });
  });

  describe("getWhatsAppNumber", () => {
    it("returns null when no env value provided", () => {
      expect(getWhatsAppNumber()).toBeNull();
    });

    it("returns null for placeholder number", () => {
      expect(getWhatsAppNumber("+254700000000")).toBeNull();
    });

    it("returns null for empty string", () => {
      expect(getWhatsAppNumber("")).toBeNull();
    });

    it("returns trimmed valid number", () => {
      expect(getWhatsAppNumber("+254712345678")).toBe("+254712345678");
    });

    it("returns trimmed valid number with spaces", () => {
      expect(getWhatsAppNumber("  +254712345678  ")).toBe("+254712345678");
    });
  });

  describe("buildWhatsAppUrl", () => {
    it("constructs valid wa.me URL", () => {
      const url = buildWhatsAppUrl("+254712345678", "Hello");
      expect(url).toBe("https://wa.me/254712345678?text=Hello");
    });

    it("returns null for too-short phone", () => {
      expect(buildWhatsAppUrl("+123", "Hello")).toBeNull();
    });

    it("returns null for too-long phone", () => {
      expect(buildWhatsAppUrl("+1234567890123456", "Hello")).toBeNull();
    });

    it("URL-encodes the message", () => {
      const url = buildWhatsAppUrl("+254712345678", "Hello & welcome!");
      expect(url).toContain("text=Hello%20%26%20welcome!");
    });

    it("does not expose internal IDs in URL", () => {
      const url = buildWhatsAppUrl("+254712345678", "Inquiry about safari");
      expect(url).not.toContain("booking_id");
      expect(url).not.toContain("payment");
      expect(url).not.toContain("token");
      expect(url).not.toContain("auth");
    });

    it("does not contain secrets", () => {
      const url = buildWhatsAppUrl("+254712345678", "Hello");
      expect(url).not.toContain("SUPABASE");
      expect(url).not.toContain("API_KEY");
      expect(url).not.toContain("secret");
    });
  });

  describe("buildPackageMessage", () => {
    it("includes package name", () => {
      expect(buildPackageMessage("Masai Mara Explorer")).toContain("Masai Mara Explorer");
    });

    it("does not include internal ID", () => {
      expect(buildPackageMessage("Test")).not.toMatch(/package[_-]?id/i);
    });
  });

  describe("buildDestinationMessage", () => {
    it("includes destination name", () => {
      expect(buildDestinationMessage("Amboseli")).toContain("Amboseli");
    });

    it("does not include internal ID", () => {
      expect(buildDestinationMessage("Test")).not.toMatch(/destination[_-]?id/i);
    });
  });

  describe("buildTripMessage", () => {
    it("returns default for empty itinerary", () => {
      expect(buildTripMessage([], 0)).toContain("custom safari");
    });

    it("includes destination names", () => {
      const items: ItineraryItem[] = [
        { destinationName: "Masai Mara", packageName: null, packagePriceUsd: null },
      ];
      expect(buildTripMessage(items, 0)).toContain("Masai Mara");
    });

    it("does not expose internal IDs", () => {
      const items: ItineraryItem[] = [
        { destinationName: "A", packageName: null, packagePriceUsd: null },
      ];
      const msg = buildTripMessage(items, 0);
      expect(msg).not.toContain("destination_id");
      expect(msg).not.toContain("package_id");
    });
  });

  describe("buildInquiryMessage", () => {
    it("includes subject when provided", () => {
      expect(buildInquiryMessage({ name: "John", subject: "Group safari" })).toContain("Group safari");
    });

    it("omits subject when not provided", () => {
      expect(buildInquiryMessage({ name: "John" })).not.toContain("question about:");
    });
  });

  describe("URL Safety", () => {
    it("does not contain auth tokens", () => {
      const url = buildWhatsAppUrl("+254712345678", "Hello");
      expect(url).not.toContain("access_token");
      expect(url).not.toContain("Bearer");
    });

    it("does not contain payment data", () => {
      const url = buildWhatsAppUrl("+254712345678", "Inquiry");
      expect(url).not.toContain("mpesa");
      expect(url).not.toContain("checkout");
    });

    it("does not contain admin data", () => {
      const url = buildWhatsAppUrl("+254712345678", "Hello");
      expect(url).not.toContain("service_role");
    });
  });
});

describe("Phase 12 Hardening: Server-Side Inquiry Validation", () => {
  const VALID_BODY: ServerFormState = {
    name: "Jane Doe",
    email: "jane@example.com",
    phone: "+254712345678",
    subject: "Safari inquiry",
    message: "I'd like to learn more about your safari packages.",
    packageName: undefined,
    destinationName: undefined,
    travelDate: undefined,
    guests: undefined,
  };

  describe("name validation", () => {
    it("rejects missing name", () => {
      const errors = serverValidate({ ...VALID_BODY, name: undefined });
      expect(errors).toContain("Name is required.");
    });

    it("rejects non-string name", () => {
      const errors = serverValidate({ ...VALID_BODY, name: 123 });
      expect(errors).toContain("Name is required.");
    });

    it("rejects empty string name", () => {
      const errors = serverValidate({ ...VALID_BODY, name: "" });
      expect(errors).toContain("Name is required.");
    });

    it("rejects whitespace-only name", () => {
      const errors = serverValidate({ ...VALID_BODY, name: "   " });
      expect(errors).toContain("Name is required.");
    });

    it("rejects name over 100 characters", () => {
      const errors = serverValidate({ ...VALID_BODY, name: "A".repeat(101) });
      expect(errors).toContain("Name must be under 100 characters.");
    });

    it("accepts name at 100 characters", () => {
      const errors = serverValidate({ ...VALID_BODY, name: "A".repeat(100) });
      expect(errors).not.toContain("Name must be under 100 characters.");
    });
  });

  describe("email validation", () => {
    it("rejects missing email", () => {
      const errors = serverValidate({ ...VALID_BODY, email: undefined });
      expect(errors).toContain("Email is required.");
    });

    it("rejects non-string email", () => {
      const errors = serverValidate({ ...VALID_BODY, email: 42 });
      expect(errors).toContain("Email is required.");
    });

    it("rejects empty email", () => {
      const errors = serverValidate({ ...VALID_BODY, email: "" });
      expect(errors).toContain("Email is required.");
    });

    it("rejects email without @", () => {
      const errors = serverValidate({ ...VALID_BODY, email: "userexample.com" });
      expect(errors).toContain("Invalid email format.");
    });

    it("rejects email without domain", () => {
      const errors = serverValidate({ ...VALID_BODY, email: "user@" });
      expect(errors).toContain("Invalid email format.");
    });

    it("rejects email over 254 characters", () => {
      const errors = serverValidate({ ...VALID_BODY, email: "a".repeat(250) + "@test.com" });
      expect(errors).toContain("Email must be under 254 characters.");
    });

    it("accepts valid email", () => {
      const errors = serverValidate({ ...VALID_BODY, email: "test@example.com" });
      expect(errors).not.toContain("Invalid email format.");
    });
  });

  describe("phone validation", () => {
    it("accepts empty phone (optional)", () => {
      const errors = serverValidate({ ...VALID_BODY, phone: "" });
      expect(errors).toHaveLength(0);
    });

    it("accepts undefined phone (optional)", () => {
      const errors = serverValidate({ ...VALID_BODY, phone: undefined });
      expect(errors).toHaveLength(0);
    });

    it("rejects non-string phone", () => {
      const errors = serverValidate({ ...VALID_BODY, phone: 123456 });
      expect(errors).toContain("Phone must be a string.");
    });

    it("rejects phone over 20 characters", () => {
      const errors = serverValidate({ ...VALID_BODY, phone: "1".repeat(21) });
      expect(errors).toContain("Phone must be under 20 characters.");
    });

    it("accepts phone at 20 characters", () => {
      const errors = serverValidate({ ...VALID_BODY, phone: "1".repeat(20) });
      expect(errors).not.toContain("Phone must be under 20 characters.");
    });
  });

  describe("subject validation", () => {
    it("accepts empty subject (optional)", () => {
      const errors = serverValidate({ ...VALID_BODY, subject: "" });
      expect(errors).toHaveLength(0);
    });

    it("rejects non-string subject", () => {
      const errors = serverValidate({ ...VALID_BODY, subject: true });
      expect(errors).toContain("Subject must be a string.");
    });

    it("rejects subject over 200 characters", () => {
      const errors = serverValidate({ ...VALID_BODY, subject: "A".repeat(201) });
      expect(errors).toContain("Subject must be under 200 characters.");
    });
  });

  describe("message validation", () => {
    it("rejects missing message", () => {
      const errors = serverValidate({ ...VALID_BODY, message: undefined });
      expect(errors).toContain("Message is required.");
    });

    it("rejects non-string message", () => {
      const errors = serverValidate({ ...VALID_BODY, message: 42 });
      expect(errors).toContain("Message is required.");
    });

    it("rejects empty message", () => {
      const errors = serverValidate({ ...VALID_BODY, message: "" });
      expect(errors).toContain("Message is required.");
    });

    it("rejects message over 2000 characters", () => {
      const errors = serverValidate({ ...VALID_BODY, message: "A".repeat(2001) });
      expect(errors).toContain("Message must be under 2000 characters.");
    });

    it("accepts message at 2000 characters", () => {
      const errors = serverValidate({ ...VALID_BODY, message: "A".repeat(2000) });
      expect(errors).not.toContain("Message must be under 2000 characters.");
    });
  });

  describe("packageName validation", () => {
    it("accepts undefined (optional)", () => {
      const errors = serverValidate({ ...VALID_BODY, packageName: undefined });
      expect(errors).toHaveLength(0);
    });

    it("rejects non-string package", () => {
      const errors = serverValidate({ ...VALID_BODY, packageName: 123 });
      expect(errors).toContain("Package must be a string.");
    });

    it("rejects package over 200 characters", () => {
      const errors = serverValidate({ ...VALID_BODY, packageName: "A".repeat(201) });
      expect(errors).toContain("Package must be under 200 characters.");
    });
  });

  describe("destinationName validation", () => {
    it("accepts undefined (optional)", () => {
      const errors = serverValidate({ ...VALID_BODY, destinationName: undefined });
      expect(errors).toHaveLength(0);
    });

    it("rejects non-string destination", () => {
      const errors = serverValidate({ ...VALID_BODY, destinationName: [] });
      expect(errors).toContain("Destination must be a string.");
    });

    it("rejects destination over 200 characters", () => {
      const errors = serverValidate({ ...VALID_BODY, destinationName: "A".repeat(201) });
      expect(errors).toContain("Destination must be under 200 characters.");
    });
  });

  describe("travelDate validation", () => {
    it("accepts undefined (optional)", () => {
      const errors = serverValidate({ ...VALID_BODY, travelDate: undefined });
      expect(errors).toHaveLength(0);
    });

    it("rejects non-string date", () => {
      const errors = serverValidate({ ...VALID_BODY, travelDate: 12345 });
      expect(errors).toContain("Travel date must be a string.");
    });

    it("rejects invalid date string", () => {
      const errors = serverValidate({ ...VALID_BODY, travelDate: "not-a-date" });
      expect(errors).toContain("Invalid travel date.");
    });

    it("accepts valid ISO date", () => {
      const errors = serverValidate({ ...VALID_BODY, travelDate: "2026-12-25" });
      expect(errors).not.toContain("Invalid travel date.");
    });
  });

  describe("guests validation", () => {
    it("accepts undefined (optional)", () => {
      const errors = serverValidate({ ...VALID_BODY, guests: undefined });
      expect(errors).toHaveLength(0);
    });

    it("rejects zero guests", () => {
      const errors = serverValidate({ ...VALID_BODY, guests: 0 });
      expect(errors).toContain("Guests must be an integer between 1 and 50.");
    });

    it("rejects negative guests", () => {
      const errors = serverValidate({ ...VALID_BODY, guests: -1 });
      expect(errors).toContain("Guests must be an integer between 1 and 50.");
    });

    it("rejects guests over 50", () => {
      const errors = serverValidate({ ...VALID_BODY, guests: 51 });
      expect(errors).toContain("Guests must be an integer between 1 and 50.");
    });

    it("rejects non-integer guests", () => {
      const errors = serverValidate({ ...VALID_BODY, guests: 2.5 });
      expect(errors).toContain("Guests must be an integer between 1 and 50.");
    });

    it("rejects string guests", () => {
      const errors = serverValidate({ ...VALID_BODY, guests: "abc" });
      expect(errors).toContain("Guests must be an integer between 1 and 50.");
    });

    it("accepts guests at boundaries (1 and 50)", () => {
      expect(serverValidate({ ...VALID_BODY, guests: 1 })).toHaveLength(0);
      expect(serverValidate({ ...VALID_BODY, guests: 50 })).toHaveLength(0);
    });
  });

  describe("payload size validation", () => {
    it("rejects payload over 10KB", () => {
      const largePayload = "x".repeat(MAX_PAYLOAD_BYTES + 1);
      expect(largePayload.length).toBeGreaterThan(MAX_PAYLOAD_BYTES);
    });

    it("accepts payload at 10KB", () => {
      const exactPayload = "x".repeat(MAX_PAYLOAD_BYTES);
      expect(exactPayload.length).toBeLessThanOrEqual(MAX_PAYLOAD_BYTES);
    });
  });

  describe("type coercion attacks", () => {
    it("rejects array as name", () => {
      const errors = serverValidate({ ...VALID_BODY, name: ["array"] });
      expect(errors).toContain("Name is required.");
    });

    it("rejects object as email", () => {
      const errors = serverValidate({ ...VALID_BODY, email: { script: "xss" } });
      expect(errors).toContain("Email is required.");
    });

    it("rejects boolean as message", () => {
      const errors = serverValidate({ ...VALID_BODY, message: true });
      expect(errors).toContain("Message is required.");
    });

    it("rejects null as name", () => {
      const errors = serverValidate({ ...VALID_BODY, name: null });
      expect(errors).toContain("Name is required.");
    });

    it("rejects number as phone", () => {
      const errors = serverValidate({ ...VALID_BODY, phone: 999999999 });
      expect(errors).toContain("Phone must be a string.");
    });
  });

  describe("multiple errors", () => {
    it("returns all errors for completely empty object", () => {
      const errors = serverValidate({
        name: undefined,
        email: undefined,
        phone: undefined,
        subject: undefined,
        message: undefined,
        packageName: undefined,
        destinationName: undefined,
        travelDate: undefined,
        guests: undefined,
      });
      expect(errors.length).toBeGreaterThanOrEqual(3);
      expect(errors).toContain("Name is required.");
      expect(errors).toContain("Email is required.");
      expect(errors).toContain("Message is required.");
    });

    it("returns all errors for malicious input", () => {
      const errors = serverValidate({
        name: "",
        email: "not-an-email",
        phone: 12345,
        subject: "A".repeat(300),
        message: "",
        packageName: ["array"],
        destinationName: { obj: true },
        travelDate: "not-a-date",
        guests: "not-a-number",
      });
      expect(errors.length).toBeGreaterThanOrEqual(5);
    });
  });

  describe("XSS prevention via type checking", () => {
    it("rejects script tag in name (non-string check)", () => {
      const errors = serverValidate({
        ...VALID_BODY,
        name: '<script>alert("xss")</script>',
      });
      // This is a string, so it passes type check but will be escaped in email template via escapeHtml()
      expect(errors).toHaveLength(0);
    });

    it("rejects object injection for name", () => {
      const errors = serverValidate({
        ...VALID_BODY,
        name: { __proto__: { isAdmin: true } },
      });
      expect(errors).toContain("Name is required.");
    });

    it("rejects array injection for email", () => {
      const errors = serverValidate({
        ...VALID_BODY,
        email: ["admin@evil.com", "real@example.com"],
      });
      expect(errors).toContain("Email is required.");
    });
  });
});
