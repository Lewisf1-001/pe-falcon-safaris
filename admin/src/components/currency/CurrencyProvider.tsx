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
  convertBetween: (amount: number, from: CurrencyCode, to?: CurrencyCode) => number;
  format: (amountUsd: number) => string;
  formatInCurrency: (amount: number, currency?: CurrencyCode) => string;
  isReady: boolean;
};

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencyCode>("USD");
  const [rates] = useState<CurrencyRates>(DEFAULT_RATES);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setCurrencyState(getStoredCurrency());
    setIsReady(true);
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
      convertBetween: (amount: number, from: CurrencyCode, to: CurrencyCode = currency) =>
        convertAmount(amount, from, to, rates),
      format: (amountUsd: number) => formatMoney(amountUsd, currency, rates),
      formatInCurrency: (amount: number, code: CurrencyCode = currency) => formatAmount(amount, code),
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
