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

export type PackageFormState = {
  slug: string;
  name: string;
  duration: string;
  idealFor: string;
  destinations: string;
  highlights: string;
  includes: string;
  startingPrice: string;
  priceNote: string;
  isActive: boolean;
  sortOrder: string;
};

export function packageToFormState(
  pkg: SafariPackage,
  startingPriceDisplay: string | number = pkg.startingPrice
): PackageFormState {
  return {
    slug: pkg.slug,
    name: pkg.name,
    duration: pkg.duration,
    idealFor: pkg.idealFor ?? "",
    destinations: pkg.destinations.join("\n"),
    highlights: pkg.highlights.join("\n"),
    includes: pkg.includes.join("\n"),
    startingPrice: String(startingPriceDisplay),
    priceNote: pkg.priceNote ?? "",
    isActive: pkg.isActive,
    sortOrder: String(pkg.sortOrder),
  };
}

export const emptyPackageFormState: PackageFormState = {
  slug: "",
  name: "",
  duration: "",
  idealFor: "",
  destinations: "",
  highlights: "",
  includes: "",
  startingPrice: "",
  priceNote: "",
  isActive: true,
  sortOrder: "0",
};

export function linesToArray(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function slugifyName(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function formStateToPayload(
  form: PackageFormState,
  startingPrice: number,
  priceCurrency: CurrencyCode
) {
  return {
    slug: form.slug.trim(),
    name: form.name.trim(),
    duration: form.duration.trim(),
    idealFor: form.idealFor.trim() || null,
    destinations: linesToArray(form.destinations),
    highlights: linesToArray(form.highlights),
    includes: linesToArray(form.includes),
    startingPrice,
    priceCurrency,
    priceNote: form.priceNote.trim() || null,
    isActive: form.isActive,
    sortOrder: Number(form.sortOrder) || 0,
  };
}
