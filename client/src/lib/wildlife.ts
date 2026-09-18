import { createClient } from "@supabase/supabase-js";

export type WildlifeGalleryImage = {
  url: string;
  alt: string;
};

export type WildlifeSummary = {
  id: number;
  name: string;
  slug: string;
  scientificName: string | null;
  commonName: string | null;
  shortDescription: string | null;
  conservationStatus: string | null;
  featured: boolean;
  heroImage: string | null;
  sortOrder: number;
  createdAt: string;
};

export type WildlifeDetail = WildlifeSummary & {
  description: string | null;
  habitat: string | null;
  behavior: string | null;
  diet: string | null;
  safariViewing: string | null;
  galleryImages: WildlifeGalleryImage[];
  seoTitle: string | null;
  seoDescription: string | null;
  destinations: WildlifeDestination[];
};

export type WildlifeDestination = {
  id: number;
  name: string;
  slug: string;
  heroImage: string | null;
};

function getPublicClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function fetchPublishedWildlife(
  search?: string,
  conservationStatus?: string
): Promise<WildlifeSummary[]> {
  try {
    const supabase = getPublicClient();
    let query = supabase
      .from("wildlife_species")
      .select("id, name, slug, scientific_name, common_name, short_description, conservation_status, featured, hero_image, sort_order, created_at")
      .eq("status", "published")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (search && search.trim()) {
      const term = search.trim();
      query = query.or(`name.ilike.%${term}%,scientific_name.ilike.%${term}%,common_name.ilike.%${term}%,habitat.ilike.%${term}%`);
    }

    if (conservationStatus) {
      query = query.eq("conservation_status", conservationStatus);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map((s) => ({
      id: Number(s.id),
      name: s.name,
      slug: s.slug,
      scientificName: s.scientific_name,
      commonName: s.common_name,
      shortDescription: s.short_description,
      conservationStatus: s.conservation_status,
      featured: s.featured,
      heroImage: s.hero_image,
      sortOrder: s.sort_order,
      createdAt: s.created_at,
    }));
  } catch {
    return [];
  }
}

export async function fetchFeaturedWildlife(): Promise<WildlifeSummary[]> {
  try {
    const supabase = getPublicClient();
    const { data, error } = await supabase
      .from("wildlife_species")
      .select("id, name, slug, scientific_name, common_name, short_description, conservation_status, hero_image, sort_order")
      .eq("status", "published")
      .eq("featured", true)
      .order("sort_order", { ascending: true });

    if (error) throw error;

    return (data || []).map((s) => ({
      id: Number(s.id),
      name: s.name,
      slug: s.slug,
      scientificName: s.scientific_name,
      commonName: s.common_name,
      shortDescription: s.short_description,
      conservationStatus: s.conservation_status,
      featured: true,
      heroImage: s.hero_image,
      sortOrder: s.sort_order,
      createdAt: "",
    }));
  } catch {
    return [];
  }
}

export async function fetchWildlifeBySlug(slug: string): Promise<WildlifeDetail | null> {
  try {
    const supabase = getPublicClient();

    const { data: species, error } = await supabase
      .from("wildlife_species")
      .select("*")
      .eq("slug", slug)
      .eq("status", "published")
      .single();

    if (error || !species) return null;

    // Fetch related destinations
    const { data: destLinks } = await supabase
      .from("destination_wildlife")
      .select("destination_id")
      .eq("species_id", species.id);

    let destinations: WildlifeDestination[] = [];
    if (destLinks && destLinks.length > 0) {
      const destIds = destLinks.map((l) => l.destination_id);
      const { data: destData } = await supabase
        .from("destinations")
        .select("id, name, slug, hero_image")
        .in("id", destIds)
        .eq("status", "published");

      destinations = (destData || []).map((d) => ({
        id: Number(d.id),
        name: d.name,
        slug: d.slug,
        heroImage: d.hero_image,
      }));
    }

    return {
      id: Number(species.id),
      name: species.name,
      slug: species.slug,
      scientificName: species.scientific_name,
      commonName: species.common_name,
      shortDescription: species.short_description,
      description: species.description,
      habitat: species.habitat,
      behavior: species.behavior,
      diet: species.diet,
      conservationStatus: species.conservation_status,
      safariViewing: species.safari_viewing,
      featured: species.featured,
      heroImage: species.hero_image,
      galleryImages: species.gallery_images || [],
      seoTitle: species.seo_title,
      seoDescription: species.seo_description,
      sortOrder: species.sort_order,
      destinations,
      createdAt: species.created_at,
    };
  } catch {
    return null;
  }
}
