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

export type PackageFormState = {
  slug: string;
  name: string;
  duration: string;
  idealFor: string;
  destinations: string;
  highlights: string;
  includes: string;
  startingPriceUsd: string;
  priceNote: string;
  isActive: boolean;
  sortOrder: string;
};

export function packageToFormState(pkg: SafariPackage): PackageFormState {
  return {
    slug: pkg.slug,
    name: pkg.name,
    duration: pkg.duration,
    idealFor: pkg.idealFor ?? "",
    destinations: pkg.destinations.join("\n"),
    highlights: pkg.highlights.join("\n"),
    includes: pkg.includes.join("\n"),
    startingPriceUsd: String(pkg.startingPriceUsd),
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
  startingPriceUsd: "",
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

export function formStateToPayload(form: PackageFormState) {
  return {
    slug: form.slug.trim(),
    name: form.name.trim(),
    duration: form.duration.trim(),
    idealFor: form.idealFor.trim() || null,
    destinations: linesToArray(form.destinations),
    highlights: linesToArray(form.highlights),
    includes: linesToArray(form.includes),
    startingPriceUsd: Number(form.startingPriceUsd),
    priceNote: form.priceNote.trim() || null,
    isActive: form.isActive,
    sortOrder: Number(form.sortOrder) || 0,
  };
}
