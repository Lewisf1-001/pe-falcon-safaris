import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);

    // GET /packages - List active packages
    if (req.method === "GET" && pathParts.length === 1) {
      const { data, error } = await supabase
        .from("packages")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });

      if (error) throw error;

      const packages = data.map((pkg) => ({
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

      return new Response(JSON.stringify({ packages }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET /packages/:slug - Get single package
    if (req.method === "GET" && pathParts.length === 2) {
      const slug = pathParts[1];

      const { data, error } = await supabase
        .from("packages")
        .select("*")
        .eq("slug", slug)
        .eq("is_active", true)
        .single();

      if (error || !data) {
        return new Response(JSON.stringify({ error: "Package not found." }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const pkg = {
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

      return new Response(JSON.stringify({ package: pkg }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
