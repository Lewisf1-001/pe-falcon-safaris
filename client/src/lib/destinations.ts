import { createClient } from "@supabase/supabase-js";

export type DestinationGalleryImage = {
  url: string;
  alt: string;
};

export type DestinationSummary = {
  id: number;
  name: string;
  slug: string;
  country: string | null;
  region: string | null;
  shortDescription: string | null;
  featured: boolean;
  heroImage: string | null;
  sortOrder: number;
  createdAt: string;
};

export type DestinationDetail = DestinationSummary & {
  description: string | null;
  galleryImages: DestinationGalleryImage[];
  seoTitle: string | null;
  seoDescription: string | null;
  packages: DestinationPackage[];
};

export type DestinationPackage = {
  id: number;
  slug: string;
  name: string;
  duration: string;
  startingPriceUsd: number;
  priceCurrency: string;
  galleryImages: DestinationGalleryImage[];
  idealFor: string | null;
};

function getPublicClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function fetchPublishedDestinations(): Promise<DestinationSummary[]> {
  try {
    const supabase = getPublicClient();
    const { data, error } = await supabase
      .from("destinations")
      .select("id, name, slug, country, region, short_description, featured, hero_image, sort_order, created_at")
      .eq("status", "published")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (error) throw error;

    return (data || []).map((d) => ({
      id: Number(d.id),
      name: d.name,
      slug: d.slug,
      country: d.country,
      region: d.region,
      shortDescription: d.short_description,
      featured: d.featured,
      heroImage: d.hero_image,
      sortOrder: d.sort_order,
      createdAt: d.created_at,
    }));
  } catch {
    return [];
  }
}

export async function fetchFeaturedDestinations(): Promise<DestinationSummary[]> {
  try {
    const supabase = getPublicClient();
    const { data, error } = await supabase
      .from("destinations")
      .select("id, name, slug, country, region, short_description, featured, hero_image, sort_order")
      .eq("status", "published")
      .eq("featured", true)
      .order("sort_order", { ascending: true });

    if (error) throw error;

    return (data || []).map((d) => ({
      id: Number(d.id),
      name: d.name,
      slug: d.slug,
      country: d.country,
      region: d.region,
      shortDescription: d.short_description,
      featured: d.featured,
      heroImage: d.hero_image,
      sortOrder: d.sort_order,
      createdAt: "",
    }));
  } catch {
    return [];
  }
}

export async function fetchDestinationBySlug(slug: string): Promise<DestinationDetail | null> {
  try {
    const supabase = getPublicClient();

    const { data: destination, error } = await supabase
      .from("destinations")
      .select("*")
      .eq("slug", slug)
      .eq("status", "published")
      .single();

    if (error || !destination) return null;

    // Fetch related packages via junction table
    const { data: links } = await supabase
      .from("package_destinations")
      .select("package_id")
      .eq("destination_id", destination.id);

    let packages: DestinationPackage[] = [];
    if (links && links.length > 0) {
      const packageIds = links.map((l) => l.package_id);
      const { data: pkgData } = await supabase
        .from("packages")
        .select("id, slug, name, duration, starting_price_usd, price_currency, gallery_images, ideal_for")
        .in("id", packageIds)
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      packages = (pkgData || []).map((p) => ({
        id: Number(p.id),
        slug: p.slug,
        name: p.name,
        duration: p.duration,
        startingPriceUsd: Number(p.starting_price_usd),
        priceCurrency: p.price_currency,
        galleryImages: p.gallery_images || [],
        idealFor: p.ideal_for,
      }));
    }

    return {
      id: Number(destination.id),
      name: destination.name,
      slug: destination.slug,
      country: destination.country,
      region: destination.region,
      shortDescription: destination.short_description,
      description: destination.description,
      featured: destination.featured,
      heroImage: destination.hero_image,
      galleryImages: destination.gallery_images || [],
      seoTitle: destination.seo_title,
      seoDescription: destination.seo_description,
      sortOrder: destination.sort_order,
      packages,
      createdAt: destination.created_at,
    };
  } catch {
    return null;
  }
}
