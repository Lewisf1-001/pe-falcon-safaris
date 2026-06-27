export type SafariPackage = {
  id: string;
  slug: string;
  name: string;
  duration: string;
  idealFor: string | null;
  destinations: string[];
  highlights: string[];
  includes: string[];
  startingPriceUsd: number;
  priceNote: string | null;
  isActive: boolean;
  sortOrder: number;
};
