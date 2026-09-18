export type ConservationStatus =
  | "least_concern"
  | "near_threatened"
  | "vulnerable"
  | "endangered"
  | "critically_endangered"
  | "data_deficient"
  | "not_evaluated";

export type WildlifeStatus = "draft" | "published" | "archived";

export type WildlifeGalleryImage = {
  url: string;
  alt: string;
};

export type WildlifeSpecies = {
  id: number;
  name: string;
  slug: string;
  scientificName: string | null;
  commonName: string | null;
  shortDescription: string | null;
  description: string | null;
  habitat: string | null;
  behavior: string | null;
  diet: string | null;
  conservationStatus: ConservationStatus | null;
  safariViewing: string | null;
  status: WildlifeStatus;
  featured: boolean;
  heroImage: string | null;
  galleryImages: WildlifeGalleryImage[];
  seoTitle: string | null;
  seoDescription: string | null;
  sortOrder: number;
  destinationCount?: number;
  createdAt: string;
  updatedAt: string;
};

export type WildlifeFormState = {
  name: string;
  slug: string;
  scientificName: string;
  commonName: string;
  shortDescription: string;
  description: string;
  habitat: string;
  behavior: string;
  diet: string;
  conservationStatus: string;
  safariViewing: string;
  status: WildlifeStatus;
  featured: boolean;
  heroImage: string;
  galleryImages: WildlifeGalleryImage[];
  seoTitle: string;
  seoDescription: string;
  sortOrder: string;
};

export const CONSERVATION_OPTIONS: { value: ConservationStatus; label: string }[] = [
  { value: "least_concern", label: "Least Concern" },
  { value: "near_threatened", label: "Near Threatened" },
  { value: "vulnerable", label: "Vulnerable" },
  { value: "endangered", label: "Endangered" },
  { value: "critically_endangered", label: "Critically Endangered" },
  { value: "data_deficient", label: "Data Deficient" },
  { value: "not_evaluated", label: "Not Evaluated" },
];

export const STATUS_OPTIONS: { value: WildlifeStatus; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
];

export const emptyWildlifeFormState: WildlifeFormState = {
  name: "",
  slug: "",
  scientificName: "",
  commonName: "",
  shortDescription: "",
  description: "",
  habitat: "",
  behavior: "",
  diet: "",
  conservationStatus: "",
  safariViewing: "",
  status: "draft",
  featured: false,
  heroImage: "",
  galleryImages: [],
  seoTitle: "",
  seoDescription: "",
  sortOrder: "0",
};

export function wildlifeToFormState(species: WildlifeSpecies): WildlifeFormState {
  return {
    name: species.name,
    slug: species.slug,
    scientificName: species.scientificName ?? "",
    commonName: species.commonName ?? "",
    shortDescription: species.shortDescription ?? "",
    description: species.description ?? "",
    habitat: species.habitat ?? "",
    behavior: species.behavior ?? "",
    diet: species.diet ?? "",
    conservationStatus: species.conservationStatus ?? "",
    safariViewing: species.safariViewing ?? "",
    status: species.status,
    featured: species.featured,
    heroImage: species.heroImage ?? "",
    galleryImages: species.galleryImages ?? [],
    seoTitle: species.seoTitle ?? "",
    seoDescription: species.seoDescription ?? "",
    sortOrder: String(species.sortOrder),
  };
}

export function slugifyWildlife(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
