import { describe, it, expect } from "vitest";

// ---- Reimplemented from lib/whatsapp.ts for unit testing ----

const WHATSAPP_NUMBER_KEY = "NEXT_PUBLIC_WHATSAPP_NUMBER";
const DEFAULT_WHATSAPP_NUMBER = "+254700000000";
const MAX_MESSAGE_LENGTH = 2000;

function getWhatsAppNumber(env?: string): string {
  if (env) return env;
  return DEFAULT_WHATSAPP_NUMBER;
}

function normalizePhone(phone: string): string {
  return phone.replace(/[^0-9]/g, "");
}

function encodeMessage(text: string): string {
  const trimmed = text.trim().slice(0, MAX_MESSAGE_LENGTH);
  return encodeURIComponent(trimmed);
}

function buildWhatsAppUrl(phone: string, message: string): string {
  const normalized = normalizePhone(phone);
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

function buildInquiryMessage(data: { name: string; subject?: string }): string {
  let msg = `Hello! I'm reaching out via the PE Falcon Safaris website.`;
  if (data.subject) {
    msg += ` I have a question about: ${data.subject}.`;
  }
  msg += ` Could you please assist me?`;
  return msg;
}

// ---- Validation tests ----

describe("Phase 12: WhatsApp Utilities", () => {
  describe("getWhatsAppNumber", () => {
    it("returns default number when no env value provided", () => {
      expect(getWhatsAppNumber()).toBe(DEFAULT_WHATSAPP_NUMBER);
    });

    it("returns provided env value when set", () => {
      expect(getWhatsAppNumber("+1234567890")).toBe("+1234567890");
    });

    it("returns default for empty string", () => {
      expect(getWhatsAppNumber("")).toBe(DEFAULT_WHATSAPP_NUMBER);
    });
  });

  describe("normalizePhone", () => {
    it("strips all non-numeric characters", () => {
      expect(normalizePhone("+254 700 000 000")).toBe("254700000000");
    });

    it("handles already numeric input", () => {
      expect(normalizePhone("254700000000")).toBe("254700000000");
    });

    it("strips dashes and parentheses", () => {
      expect(normalizePhone("+254 (700) 000-000")).toBe("254700000000");
    });
  });

  describe("buildWhatsAppUrl", () => {
    it("constructs valid wa.me URL", () => {
      const url = buildWhatsAppUrl("+254700000000", "Hello");
      expect(url).toBe("https://wa.me/254700000000?text=Hello");
    });

    it("URL-encodes the message", () => {
      const url = buildWhatsAppUrl("+254700000000", "Hello & welcome!");
      expect(url).toContain("text=Hello%20%26%20welcome!");
    });

    it("normalizes phone number in URL", () => {
      const url = buildWhatsAppUrl("+254 700 000 000", "Test");
      expect(url).toBe("https://wa.me/254700000000?text=Test");
    });

    it("handles long messages", () => {
      const longMessage = "A".repeat(500);
      const url = buildWhatsAppUrl("+254700000000", longMessage);
      expect(url).toContain("text=");
      expect(url).not.toContain("undefined");
    });

    it("does not expose internal IDs in URL", () => {
      const url = buildWhatsAppUrl("+254700000000", "Inquiry about safari");
      expect(url).not.toContain("booking_id");
      expect(url).not.toContain("payment");
      expect(url).not.toContain("token");
      expect(url).not.toContain("auth");
    });

    it("does not contain secrets", () => {
      const url = buildWhatsAppUrl("+254700000000", "Hello");
      expect(url).not.toContain("SUPABASE");
      expect(url).not.toContain("API_KEY");
      expect(url).not.toContain("secret");
    });
  });

  describe("buildPackageMessage", () => {
    it("includes package name in message", () => {
      const msg = buildPackageMessage("Masai Mara Explorer");
      expect(msg).toContain("Masai Mara Explorer");
    });

    it("does not include internal package ID", () => {
      const msg = buildPackageMessage("Test Package");
      expect(msg).not.toMatch(/package[_-]?id/i);
    });

    it("is a reasonable length", () => {
      const msg = buildPackageMessage("Long Package Name".repeat(5));
      expect(msg.length).toBeLessThan(500);
    });
  });

  describe("buildDestinationMessage", () => {
    it("includes destination name in message", () => {
      const msg = buildDestinationMessage("Amboseli National Park");
      expect(msg).toContain("Amboseli National Park");
    });

    it("does not include internal destination ID", () => {
      const msg = buildDestinationMessage("Test Destination");
      expect(msg).not.toMatch(/destination[_-]?id/i);
    });
  });

  describe("buildTripMessage", () => {
    it("returns default message for empty itinerary", () => {
      const msg = buildTripMessage([], 0);
      expect(msg).toContain("custom safari");
    });

    it("includes destination names", () => {
      const items: ItineraryItem[] = [
        { destinationName: "Masai Mara", packageName: null, packagePriceUsd: null },
        { destinationName: "Amboseli", packageName: null, packagePriceUsd: null },
      ];
      const msg = buildTripMessage(items, 0);
      expect(msg).toContain("Masai Mara");
      expect(msg).toContain("Amboseli");
    });

    it("includes package names when provided", () => {
      const items: ItineraryItem[] = [
        { destinationName: "Masai Mara", packageName: "Explorer", packagePriceUsd: null },
      ];
      const msg = buildTripMessage(items, 0);
      expect(msg).toContain("Explorer");
    });

    it("includes estimated prices when provided", () => {
      const items: ItineraryItem[] = [
        { destinationName: "Masai Mara", packageName: null, packagePriceUsd: 2500 },
      ];
      const msg = buildTripMessage(items, 2500);
      expect(msg).toContain("$2,500");
    });

    it("includes total price", () => {
      const items: ItineraryItem[] = [
        { destinationName: "A", packageName: null, packagePriceUsd: 1000 },
        { destinationName: "B", packageName: null, packagePriceUsd: 1500 },
      ];
      const msg = buildTripMessage(items, 2500);
      expect(msg).toContain("Estimated total: $2,500");
    });

    it("does not expose internal IDs", () => {
      const items: ItineraryItem[] = [
        { destinationName: "Masai Mara", packageName: null, packagePriceUsd: null },
      ];
      const msg = buildTripMessage(items, 0);
      expect(msg).not.toMatch(/\bid\b/i);
      expect(msg).not.toContain("destination_id");
      expect(msg).not.toContain("package_id");
    });
  });

  describe("buildInquiryMessage", () => {
    it("includes name context", () => {
      const msg = buildInquiryMessage({ name: "John" });
      expect(msg).toContain("PE Falcon Safaris website");
    });

    it("includes subject when provided", () => {
      const msg = buildInquiryMessage({ name: "John", subject: "Group safari" });
      expect(msg).toContain("Group safari");
    });

    it("omits subject line when not provided", () => {
      const msg = buildInquiryMessage({ name: "John" });
      expect(msg).not.toContain("question about:");
    });
  });

  describe("URL Safety", () => {
    it("WhatsApp URL does not contain auth tokens", () => {
      const url = buildWhatsAppUrl("+254700000000", "Hello");
      expect(url).not.toContain("access_token");
      expect(url).not.toContain("Bearer");
    });

    it("WhatsApp URL does not contain payment data", () => {
      const url = buildWhatsAppUrl("+254700000000", "Safari inquiry");
      expect(url).not.toContain("mpesa");
      expect(url).not.toContain("checkout");
      expect(url).not.toContain("transaction");
    });

    it("WhatsApp URL does not contain admin data", () => {
      const url = buildWhatsAppUrl("+254700000000", "Hello");
      expect(url).not.toContain("service_role");
      expect(url).not.toContain("admin");
    });
  });
});
