"use client";

import { useCurrency } from "@/components/currency/CurrencyProvider";
import { CURRENCY_LABELS, type CurrencyCode } from "@/lib/currency";

export default function CurrencySwitcher() {
  const { currency, currencies, setCurrency } = useCurrency();

  return (
    <label className="block px-3">
      <span className="mb-1.5 block text-xs text-white/60">Working currency</span>
      <select
        aria-label="Working currency"
        value={currency}
        onChange={(event) => setCurrency(event.target.value as CurrencyCode)}
        className="w-full rounded-md border border-white/30 bg-white px-2 py-1.5 text-sm font-medium text-forest outline-none focus:border-gold focus:ring-2 focus:ring-gold/40"
        title="Currency used when creating and editing package prices"
      >
        {currencies.map((code) => (
          <option key={code} value={code} className="bg-white text-forest">
            {code} · {CURRENCY_LABELS[code]}
          </option>
        ))}
      </select>
    </label>
  );
}
