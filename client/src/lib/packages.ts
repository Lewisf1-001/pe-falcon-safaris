import { createClient } from "@/lib/supabase-server";
import type { SafariPackage } from "@/types/package";

export async function fetchPackages(): Promise<SafariPackage[]> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("packages")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (error) throw error;

    return (data || []).map((pkg) => ({
      id: Number(pkg.id),
      slug: pkg.slug,
      name: pkg.name,
      duration: pkg.duration,
      idealFor: pkg.ideal_for,
      destinations: pkg.destinations,
      highlights: pkg.highlights,
      includes: pkg.includes,
      galleryImages: pkg.gallery_images || [],
      startingPrice: Number(pkg.starting_price),
      priceCurrency: pkg.price_currency || "USD",
      startingPriceUsd: Number(pkg.starting_price_usd),
      priceNote: pkg.price_note,
      isActive: pkg.is_active,
      sortOrder: pkg.sort_order,
      createdAt: pkg.created_at,
      updatedAt: pkg.updated_at,
    }));
  } catch {
    return [];
  }
}

export async function fetchPackageBySlug(slug: string): Promise<SafariPackage | null> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("packages")
      .select("*")
      .eq("slug", slug)
      .eq("is_active", true)
      .single();

    if (error || !data) return null;

    return {
      id: Number(data.id),
      slug: data.slug,
      name: data.name,
      duration: data.duration,
      idealFor: data.ideal_for,
      destinations: data.destinations,
      highlights: data.highlights,
      includes: data.includes,
      galleryImages: data.gallery_images || [],
      startingPrice: Number(data.starting_price),
      priceCurrency: data.price_currency || "USD",
      startingPriceUsd: Number(data.starting_price_usd),
      priceNote: data.price_note,
      isActive: data.is_active,
      sortOrder: data.sort_order,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  } catch {
    return null;
  }
}
