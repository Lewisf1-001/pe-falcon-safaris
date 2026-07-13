"use client";

import { useEffect, useState } from "react";
import { useCurrency } from "@/components/currency/CurrencyProvider";
import type { CurrencyCode } from "@/lib/currency";

type FormattedPriceProps = {
  amountUsd?: number;
  amount?: number;
  fromCurrency?: CurrencyCode;
  className?: string;
};

export default function FormattedPrice({
  amountUsd,
  amount,
  fromCurrency = "USD",
  className,
}: FormattedPriceProps) {
  const { format, formatFrom } = useCurrency();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Avoid SSR/client locale and localStorage currency mismatches.
  if (!mounted) {
    return <span className={className}>&nbsp;</span>;
  }

  const label =
    amount != null ? formatFrom(amount, fromCurrency) : format(amountUsd ?? 0);

  return <span className={className}>{label}</span>;
}
