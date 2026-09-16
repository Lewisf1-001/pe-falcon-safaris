"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  convertAmount,
  convertFromUsd,
  DEFAULT_RATES,
  formatAmount,
  formatMoney,
  getStoredCurrency,
  isCurrencyCode,
  storeCurrency,
  SUPPORTED_CURRENCIES,
  type CurrencyCode,
  type CurrencyRates,
} from "@/lib/currency";

type CurrencyContextValue = {
  currency: CurrencyCode;
  currencies: readonly CurrencyCode[];
  rates: CurrencyRates;
  setCurrency: (currency: CurrencyCode) => void;
  convert: (amountUsd: number) => number;
  format: (amountUsd: number) => string;
  formatIn: (amountUsd: number, currency: CurrencyCode) => string;
  formatFrom: (amount: number, fromCurrency: CurrencyCode) => string;
  isReady: boolean;
};

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencyCode>("USD");
  const [rates, setRates] = useState<CurrencyRates>(DEFAULT_RATES);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setCurrencyState(getStoredCurrency());
    setIsReady(true);

    let cancelled = false;

    async function loadRates() {
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        if (!supabaseUrl) return;

        const res = await fetch(`${supabaseUrl}/functions/v1/currency`);
        if (!res.ok) return;

        const data = await res.json();
        if (cancelled || !data?.rates) return;

        const next: Partial<CurrencyRates> = {};
        let complete = true;
        for (const code of SUPPORTED_CURRENCIES) {
          const rate = Number(data.rates[code]);
          if (Number.isFinite(rate) && rate > 0) {
            next[code] = rate;
          } else {
            complete = false;
            break;
          }
        }

        if (complete) {
          setRates(next as CurrencyRates);
        }
      } catch {
        // Keep DEFAULT_RATES on any failure; formatting still works.
      }
    }

    loadRates();

    return () => {
      cancelled = true;
    };
  }, []);

  const setCurrency = useCallback((next: CurrencyCode) => {
    if (!isCurrencyCode(next)) {
      return;
    }

    setCurrencyState(next);
    storeCurrency(next);
  }, []);

  const value = useMemo<CurrencyContextValue>(
    () => ({
      currency,
      currencies: SUPPORTED_CURRENCIES,
      rates,
      setCurrency,
      convert: (amountUsd: number) => convertFromUsd(amountUsd, currency, rates),
      format: (amountUsd: number) => formatMoney(amountUsd, currency, rates),
      formatIn: (amountUsd: number, code: CurrencyCode) => formatMoney(amountUsd, code, rates),
      formatFrom: (amount: number, fromCurrency: CurrencyCode) => {
        if (fromCurrency === currency) {
          return formatAmount(amount, currency);
        }

        const converted = convertAmount(amount, fromCurrency, currency, rates);
        return formatAmount(converted, currency);
      },
      isReady,
    }),
    [currency, rates, setCurrency, isReady]
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency() {
  const context = useContext(CurrencyContext);

  if (!context) {
    throw new Error("useCurrency must be used within CurrencyProvider");
  }

  return context;
}
