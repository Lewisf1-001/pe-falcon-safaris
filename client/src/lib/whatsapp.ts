const WHATSAPP_NUMBER_KEY = "NEXT_PUBLIC_WHATSAPP_NUMBER";

const MAX_MESSAGE_LENGTH = 2000;

const PLACEHOLDER_NUMBERS = new Set([
  "+254700000000",
  "254700000000",
  "+254 700 000 000",
  "+1234567890",
  "1234567890",
]);

export function isNumberConfigured(): boolean {
  if (typeof process === "undefined") return false;
  const raw = process.env[WHATSAPP_NUMBER_KEY];
  if (!raw || typeof raw !== "string") return false;
  const trimmed = raw.trim();
  if (trimmed.length === 0) return false;
  if (PLACEHOLDER_NUMBERS.has(trimmed)) return false;
  const digits = trimmed.replace(/[^0-9]/g, "");
  if (digits.length < 7 || digits.length > 15) return false;
  return true;
}

export function getWhatsAppNumber(): string | null {
  if (!isNumberConfigured()) return null;
  return process.env[WHATSAPP_NUMBER_KEY]!.trim();
}

function normalizePhone(phone: string): string {
  return phone.replace(/[^0-9]/g, "");
}

function encodeMessage(text: string): string {
  const trimmed = text.trim().slice(0, MAX_MESSAGE_LENGTH);
  return encodeURIComponent(trimmed);
}

export function buildWhatsAppUrl(
  phone: string,
  message: string
): string | null {
  const normalized = normalizePhone(phone);
  if (normalized.length < 7 || normalized.length > 15) return null;
  return `https://wa.me/${normalized}?text=${encodeMessage(message)}`;
}

export function buildPackageMessage(packageName: string): string {
  return `Hello! I'm interested in the "${packageName}" safari package on PE Falcon Safaris. Could you please provide more details and help me plan this trip?`;
}

export function buildDestinationMessage(destinationName: string): string {
  return `Hello! I'd like to learn more about visiting ${destinationName} with PE Falcon Safaris. Could you share available packages and pricing?`;
}

export type ItineraryItem = {
  destinationName: string;
  packageName: string | null;
  packagePriceUsd: number | null;
};

export function buildTripMessage(
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

export function buildInquiryMessage(data: {
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
