export const SUPPORTED_CURRENCIES = ["USD", "KES", "EUR", "GBP"] as const;

export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number];

export type CurrencyRates = Record<CurrencyCode, number>;

export const DEFAULT_RATES: CurrencyRates = {
  USD: 1,
  KES: 129,
  EUR: 0.92,
  GBP: 0.79,
};

export const CURRENCY_LABELS: Record<CurrencyCode, string> = {
  USD: "US Dollar",
  KES: "Kenyan Shilling",
  EUR: "Euro",
  GBP: "British Pound",
};

/** Fixed locale so SSR and the browser format currency the same way. */
const FORMAT_LOCALE = "en-US";

const STORAGE_KEY = "pe_falcon_display_currency";

export function isCurrencyCode(value: string): value is CurrencyCode {
  return (SUPPORTED_CURRENCIES as readonly string[]).includes(value);
}

export function getStoredCurrency(): CurrencyCode {
  if (typeof window === "undefined") {
    return "USD";
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored && isCurrencyCode(stored)) {
    return stored;
  }

  return "USD";
}

export function storeCurrency(currency: CurrencyCode) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, currency);
}

export function toUsdExact(amount: number, currency: CurrencyCode, rates: CurrencyRates) {
  const rate = rates[currency] || 1;
  if (!Number.isFinite(amount) || amount <= 0 || rate <= 0) {
    return 0;
  }

  return Math.round((amount / rate) * 1_000_000) / 1_000_000;
}

export function convertFromUsd(amountUsd: number, currency: CurrencyCode, rates: CurrencyRates) {
  const rate = rates[currency] || 1;
  const converted = amountUsd * rate;

  if (currency === "KES") {
    return Math.max(0, Math.round(converted));
  }

  return Math.round(converted * 100) / 100;
}

export function convertAmount(
  amount: number,
  from: CurrencyCode,
  to: CurrencyCode,
  rates: CurrencyRates
) {
  if (from === to) {
    return amount;
  }

  return convertFromUsd(toUsdExact(amount, from, rates), to, rates);
}

export function formatMoney(amountUsd: number, currency: CurrencyCode, rates: CurrencyRates) {
  const amount = convertFromUsd(amountUsd, currency, rates);
  return formatAmount(amount, currency);
}

export function formatAmount(amount: number, currency: CurrencyCode) {
  try {
    return new Intl.NumberFormat(FORMAT_LOCALE, {
      style: "currency",
      currency,
      maximumFractionDigits: currency === "KES" ? 0 : 2,
      minimumFractionDigits: currency === "KES" ? 0 : amount % 1 === 0 ? 0 : 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString(FORMAT_LOCALE)}`;
  }
}
