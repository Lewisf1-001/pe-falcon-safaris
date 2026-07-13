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
import { API_URL } from "@/lib/api";
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

    async function loadRates() {
      try {
        const response = await fetch(`${API_URL}/api/currency`);
        const data = await response.json();

        if (response.ok && data.rates) {
          setRates({
            USD: Number(data.rates.USD) || 1,
            KES: Number(data.rates.KES) || DEFAULT_RATES.KES,
            EUR: Number(data.rates.EUR) || DEFAULT_RATES.EUR,
            GBP: Number(data.rates.GBP) || DEFAULT_RATES.GBP,
          });
        }
      } catch {
        // Keep default rates when the API is offline.
      } finally {
        setIsReady(true);
      }
    }

    loadRates();
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
