export type CurrencyCode = "USD" | "KES" | "EUR" | "GBP";

export type SafariPackage = {
  id: number;
  slug: string;
  name: string;
  duration: string;
  idealFor: string | null;
  destinations: string[];
  highlights: string[];
  includes: string[];
  startingPrice: number;
  priceCurrency: CurrencyCode;
  startingPriceUsd: number;
  priceNote: string | null;
  isActive: boolean;
  sortOrder: number;
};
