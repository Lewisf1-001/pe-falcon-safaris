export type DestinationStatus = "draft" | "published" | "archived";

export type DestinationGalleryImage = {
  url: string;
  alt: string;
};

export type Destination = {
  id: number;
  name: string;
  slug: string;
  country: string | null;
  region: string | null;
  shortDescription: string | null;
  description: string | null;
  status: DestinationStatus;
  featured: boolean;
  heroImage: string | null;
  galleryImages: DestinationGalleryImage[];
  seoTitle: string | null;
  seoDescription: string | null;
  sortOrder: number;
  packageCount?: number;
  createdAt: string;
  updatedAt: string;
};

export type DestinationFormState = {
  name: string;
  slug: string;
  country: string;
  region: string;
  shortDescription: string;
  description: string;
  status: DestinationStatus;
  featured: boolean;
  heroImage: string;
  galleryImages: DestinationGalleryImage[];
  seoTitle: string;
  seoDescription: string;
  sortOrder: string;
};

export const emptyDestinationFormState: DestinationFormState = {
  name: "",
  slug: "",
  country: "",
  region: "",
  shortDescription: "",
  description: "",
  status: "draft",
  featured: false,
  heroImage: "",
  galleryImages: [],
  seoTitle: "",
  seoDescription: "",
  sortOrder: "0",
};

export function destinationToFormState(dest: Destination): DestinationFormState {
  return {
    name: dest.name,
    slug: dest.slug,
    country: dest.country ?? "",
    region: dest.region ?? "",
    shortDescription: dest.shortDescription ?? "",
    description: dest.description ?? "",
    status: dest.status,
    featured: dest.featured,
    heroImage: dest.heroImage ?? "",
    galleryImages: dest.galleryImages ?? [],
    seoTitle: dest.seoTitle ?? "",
    seoDescription: dest.seoDescription ?? "",
    sortOrder: String(dest.sortOrder),
  };
}

export function slugifyDestination(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
