"use client";

import { useCurrency } from "@/components/currency/CurrencyProvider";
import type { CurrencyCode } from "@/lib/currency";

export default function CurrencySwitcher() {
  const { currency, currencies, setCurrency } = useCurrency();

  return (
    <div
      className="hidden items-center gap-2 font-display text-[11px] font-medium uppercase tracking-[0.18em] sm:flex lg:text-xs"
      role="group"
      aria-label="Display currency"
    >
      {currencies.map((code, index) => {
        const active = currency === code;

        return (
          <span key={code} className="flex items-center gap-2">
            {index > 0 && <span className="text-white/25">·</span>}
            <button
              type="button"
              onClick={() => setCurrency(code as CurrencyCode)}
              className={`transition-colors duration-300 ${
                active ? "text-gold-muted" : "text-white/45 hover:text-white/80"
              }`}
            >
              {code}
            </button>
          </span>
        );
      })}
    </div>
  );
}
