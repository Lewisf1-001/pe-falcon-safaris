"use client";

import { useCurrency } from "@/components/currency/CurrencyProvider";
import { CURRENCY_LABELS, type CurrencyCode } from "@/lib/currency";

export default function CurrencySwitcher() {
  const { currency, currencies, setCurrency } = useCurrency();

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="sr-only">Display currency</span>
      <select
        aria-label="Display currency"
        value={currency}
        onChange={(event) => setCurrency(event.target.value as CurrencyCode)}
        className="rounded-md border border-white/40 bg-white px-2 py-1.5 text-sm font-medium text-forest outline-none focus:border-gold focus:ring-2 focus:ring-gold/40"
        title="Choose currency for prices"
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
