export const SUPPORTED_CURRENCIES = ["USD", "KES", "EUR", "GBP"] as const;

export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number];

/** Units of each currency per 1 USD (display / conversion rates). */
export function getUsdRates(): Record<CurrencyCode, number> {
  return {
    USD: 1,
    KES: Number(process.env.CURRENCY_USD_TO_KES || process.env.MPESA_USD_TO_KES || 129),
    EUR: Number(process.env.CURRENCY_USD_TO_EUR || 0.92),
    GBP: Number(process.env.CURRENCY_USD_TO_GBP || 0.79),
  };
}

export function convertFromUsd(amountUsd: number, currency: CurrencyCode) {
  const rates = getUsdRates();
  const rate = rates[currency] || 1;
  const converted = amountUsd * rate;

  if (currency === "KES") {
    return Math.max(0, Math.round(converted));
  }

  return Math.round(converted * 100) / 100;
}

/** Exact USD value for storage / booking totals (no integer rounding). */
export function toUsdExact(amount: number, currency: CurrencyCode) {
  const rate = getUsdRates()[currency] || 1;
  if (!Number.isFinite(amount) || amount <= 0 || rate <= 0) {
    return 0;
  }

  return Math.round((amount / rate) * 100_000_000) / 100_000_000;
}

export function isCurrencyCode(value: string): value is CurrencyCode {
  return (SUPPORTED_CURRENCIES as readonly string[]).includes(value);
}
