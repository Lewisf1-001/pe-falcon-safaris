export type CurrencyCode = "USD" | "KES" | "EUR" | "GBP";

export type PackageGalleryImage = {
  url: string;
  alt: string;
};

export type SafariPackage = {
  id: number;
  slug: string;
  name: string;
  duration: string;
  idealFor: string | null;
  destinations: string[];
  highlights: string[];
  includes: string[];
  galleryImages: PackageGalleryImage[];
  startingPrice: number;
  priceCurrency: CurrencyCode;
  startingPriceUsd: number;
  priceNote: string | null;
  isActive: boolean;
  sortOrder: number;
};
