import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = Deno.env.get("ALLOWED_ORIGINS") || "*";
const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGINS,
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
};

const VALID_STATUSES = ["draft", "published", "archived"];

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: { Authorization: req.headers.get("Authorization")! },
      },
    });

    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);

    // ================================================================
    // PUBLIC ENDPOINTS (no auth required)
    // ================================================================

    // GET /destinations - List published destinations
    if (req.method === "GET" && pathParts.length === 1 && pathParts[0] === "destinations") {
      const { data, error } = await supabase
        .from("destinations")
        .select("id, name, slug, country, region, short_description, featured, hero_image, latitude, longitude, sort_order, created_at")
        .eq("status", "published")
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });

      if (error) throw error;

      return new Response(JSON.stringify({ destinations: data || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET /destinations/featured - List featured published destinations
    if (req.method === "GET" && pathParts.length === 2 && pathParts[1] === "featured") {
      const { data, error } = await supabase
        .from("destinations")
        .select("id, name, slug, country, region, short_description, featured, hero_image, latitude, longitude, sort_order")
        .eq("status", "published")
        .eq("featured", true)
        .order("sort_order", { ascending: true });

      if (error) throw error;

      return new Response(JSON.stringify({ destinations: data || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET /destinations/:slug - Get single published destination with packages
    if (req.method === "GET" && pathParts.length === 2 && pathParts[0] === "destinations" && pathParts[1] !== "admin" && pathParts[1] !== "featured") {
      const slug = pathParts[1];

      const { data: destination, error } = await supabase
        .from("destinations")
        .select("*")
        .eq("slug", slug)
        .eq("status", "published")
        .single();

      if (error || !destination) {
        return new Response(
          JSON.stringify({ error: "Destination not found" }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Fetch related packages (active packages linked to this destination)
      const { data: packageLinks } = await supabase
        .from("package_destinations")
        .select("package_id")
        .eq("destination_id", destination.id);

      let packages: unknown[] = [];
      if (packageLinks && packageLinks.length > 0) {
        const packageIds = packageLinks.map((l) => l.package_id);
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

      return new Response(
        JSON.stringify({
          destination: {
            ...destination,
            packages,
          },
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ================================================================
    // ADMIN ENDPOINTS (auth required)
    // ================================================================

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user is admin
    const { data: admin } = await supabase
      .from("admins")
      .select("id, username")
      .eq("auth_id", user.id)
      .eq("status", "active")
      .single();

    if (!admin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET /destinations/admin - List all destinations (admin)
    if (req.method === "GET" && pathParts.length === 2 && pathParts[1] === "admin") {
      const statusFilter = url.searchParams.get("status");

      let query = supabase
        .from("destinations")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });

      if (statusFilter && VALID_STATUSES.includes(statusFilter)) {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Get package counts for each destination
      const destinations = await Promise.all(
        (data || []).map(async (dest) => {
          const { count } = await supabase
            .from("package_destinations")
            .select("package_id", { count: "exact", head: true })
            .eq("destination_id", dest.id);

          return {
            ...dest,
            packageCount: count || 0,
          };
        })
      );

      return new Response(JSON.stringify({ destinations }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST /destinations/admin - Create destination (admin)
    if (req.method === "POST" && pathParts.length === 2 && pathParts[1] === "admin") {
      const body = await req.json();
      const {
        name, slug: rawSlug, country, region, shortDescription, description,
        status, featured, heroImage, galleryImages, latitude, longitude,
        seoTitle, seoDescription, sortOrder,
      } = body;

      if (!name || typeof name !== "string" || name.trim().length === 0) {
        return new Response(
          JSON.stringify({ error: "Name is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (name.trim().length > 255) {
        return new Response(
          JSON.stringify({ error: "Name must be 255 characters or less" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const finalSlug = rawSlug && typeof rawSlug === "string" && rawSlug.trim()
        ? slugify(rawSlug)
        : slugify(name);

      if (!finalSlug) {
        return new Response(
          JSON.stringify({ error: "Invalid slug" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (status && !VALID_STATUSES.includes(status)) {
        return new Response(
          JSON.stringify({ error: "Invalid status" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (latitude !== undefined && latitude !== null) {
        if (typeof latitude !== "number" || latitude < -90 || latitude > 90) {
          return new Response(
            JSON.stringify({ error: "Latitude must be a number between -90 and 90" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      if (longitude !== undefined && longitude !== null) {
        if (typeof longitude !== "number" || longitude < -180 || longitude > 180) {
          return new Response(
            JSON.stringify({ error: "Longitude must be a number between -180 and 180" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      // Check slug uniqueness
      const { data: existing } = await supabase
        .from("destinations")
        .select("id")
        .eq("slug", finalSlug)
        .maybeSingle();

      if (existing) {
        return new Response(
          JSON.stringify({ error: "A destination with this slug already exists" }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const row = {
        name: name.trim(),
        slug: finalSlug,
        country: country?.trim() || null,
        region: region?.trim() || null,
        short_description: shortDescription?.trim() || null,
        description: description?.trim() || null,
        status: status || "draft",
        featured: Boolean(featured),
        hero_image: heroImage?.trim() || null,
        gallery_images: Array.isArray(galleryImages) ? galleryImages : [],
        latitude: typeof latitude === "number" ? latitude : null,
        longitude: typeof longitude === "number" ? longitude : null,
        seo_title: seoTitle?.trim() || null,
        seo_description: seoDescription?.trim() || null,
        sort_order: typeof sortOrder === "number" ? sortOrder : 0,
      };

      const { data: created, error: insertError } = await supabase
        .from("destinations")
        .insert(row)
        .select()
        .single();

      if (insertError) {
        if (insertError.code === "23505") {
          return new Response(
            JSON.stringify({ error: "A destination with this slug already exists" }),
            { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        throw insertError;
      }

      return new Response(JSON.stringify({ destination: created }), {
        status: 201,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // PATCH /destinations/admin/:id - Update destination (admin)
    if (req.method === "PATCH" && pathParts.length === 3 && pathParts[1] === "admin") {
      const destinationId = parseInt(pathParts[2]);

      if (isNaN(destinationId)) {
        return new Response(
          JSON.stringify({ error: "Invalid destination ID" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Verify destination exists
      const { data: existing } = await supabase
        .from("destinations")
        .select("id")
        .eq("id", destinationId)
        .single();

      if (!existing) {
        return new Response(
          JSON.stringify({ error: "Destination not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const body = await req.json();
      const updates: Record<string, unknown> = {};

      if (body.name !== undefined) {
        if (typeof body.name !== "string" || body.name.trim().length === 0) {
          return new Response(
            JSON.stringify({ error: "Name cannot be empty" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        if (body.name.trim().length > 255) {
          return new Response(
            JSON.stringify({ error: "Name must be 255 characters or less" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        updates.name = body.name.trim();
      }

      if (body.slug !== undefined) {
        const newSlug = slugify(body.slug);
        if (!newSlug) {
          return new Response(
            JSON.stringify({ error: "Invalid slug" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        // Check slug uniqueness (excluding current destination)
        const { data: slugConflict } = await supabase
          .from("destinations")
          .select("id")
          .eq("slug", newSlug)
          .neq("id", destinationId)
          .maybeSingle();
        if (slugConflict) {
          return new Response(
            JSON.stringify({ error: "A destination with this slug already exists" }),
            { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        updates.slug = newSlug;
      }

      if (body.status !== undefined) {
        if (!VALID_STATUSES.includes(body.status)) {
          return new Response(
            JSON.stringify({ error: "Invalid status" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        updates.status = body.status;
      }

      if (body.country !== undefined) updates.country = body.country?.trim() || null;
      if (body.region !== undefined) updates.region = body.region?.trim() || null;
      if (body.shortDescription !== undefined) updates.short_description = body.shortDescription?.trim() || null;
      if (body.description !== undefined) updates.description = body.description?.trim() || null;
      if (body.featured !== undefined) updates.featured = Boolean(body.featured);
      if (body.heroImage !== undefined) updates.hero_image = body.heroImage?.trim() || null;
      if (body.galleryImages !== undefined) updates.gallery_images = Array.isArray(body.galleryImages) ? body.galleryImages : [];
      if (body.latitude !== undefined) {
        if (body.latitude !== null && (typeof body.latitude !== "number" || body.latitude < -90 || body.latitude > 90)) {
          return new Response(
            JSON.stringify({ error: "Latitude must be a number between -90 and 90" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        updates.latitude = body.latitude;
      }
      if (body.longitude !== undefined) {
        if (body.longitude !== null && (typeof body.longitude !== "number" || body.longitude < -180 || body.longitude > 180)) {
          return new Response(
            JSON.stringify({ error: "Longitude must be a number between -180 and 180" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        updates.longitude = body.longitude;
      }
      if (body.seoTitle !== undefined) updates.seo_title = body.seoTitle?.trim() || null;
      if (body.seoDescription !== undefined) updates.seo_description = body.seoDescription?.trim() || null;
      if (body.sortOrder !== undefined) updates.sort_order = typeof body.sortOrder === "number" ? body.sortOrder : 0;

      if (Object.keys(updates).length === 0) {
        return new Response(
          JSON.stringify({ error: "No fields to update" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: updated, error: updateError } = await supabase
        .from("destinations")
        .update(updates)
        .eq("id", destinationId)
        .select()
        .single();

      if (updateError) {
        if (updateError.code === "23505") {
          return new Response(
            JSON.stringify({ error: "A destination with this slug already exists" }),
            { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        throw updateError;
      }

      return new Response(JSON.stringify({ destination: updated }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // DELETE /destinations/admin/:id - Delete destination (admin)
    if (req.method === "DELETE" && pathParts.length === 3 && pathParts[1] === "admin") {
      const destinationId = parseInt(pathParts[2]);

      if (isNaN(destinationId)) {
        return new Response(
          JSON.stringify({ error: "Invalid destination ID" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check if any packages reference this destination
      const { count: linkedPackages } = await supabase
        .from("package_destinations")
        .select("package_id", { count: "exact", head: true })
        .eq("destination_id", destinationId);

      if (linkedPackages && linkedPackages > 0) {
        return new Response(
          JSON.stringify({
            error: `Cannot delete destination: ${linkedPackages} package(s) are linked to it. Unlink packages first or archive the destination.`,
          }),
          {
            status: 409,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const { error: deleteError } = await supabase
        .from("destinations")
        .delete()
        .eq("id", destinationId);

      if (deleteError) throw deleteError;

      return new Response(
        JSON.stringify({ message: "Destination deleted" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // GET /destinations/admin/:id/packages - Get packages for a destination (admin)
    if (req.method === "GET" && pathParts.length === 4 && pathParts[1] === "admin" && pathParts[3] === "packages") {
      const destinationId = parseInt(pathParts[2]);

      if (isNaN(destinationId)) {
        return new Response(
          JSON.stringify({ error: "Invalid destination ID" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: links } = await supabase
        .from("package_destinations")
        .select("package_id")
        .eq("destination_id", destinationId);

      if (!links || links.length === 0) {
        return new Response(JSON.stringify({ packages: [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const packageIds = links.map((l) => l.package_id);
      const { data: packages } = await supabase
        .from("packages")
        .select("id, slug, name, duration, starting_price_usd, is_active")
        .in("id", packageIds)
        .order("sort_order", { ascending: true });

      return new Response(JSON.stringify({ packages: packages || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST /destinations/admin/:id/packages - Link packages to destination (admin)
    if (req.method === "POST" && pathParts.length === 4 && pathParts[1] === "admin" && pathParts[3] === "packages") {
      const destinationId = parseInt(pathParts[2]);
      const body = await req.json();
      const { packageIds } = body;

      if (isNaN(destinationId)) {
        return new Response(
          JSON.stringify({ error: "Invalid destination ID" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!Array.isArray(packageIds) || packageIds.length === 0) {
        return new Response(
          JSON.stringify({ error: "packageIds array is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Verify destination exists
      const { data: dest } = await supabase
        .from("destinations")
        .select("id")
        .eq("id", destinationId)
        .single();

      if (!dest) {
        return new Response(
          JSON.stringify({ error: "Destination not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Insert links (ignore duplicates via ON CONFLICT)
      const links = packageIds.map((pid: number) => ({
        package_id: pid,
        destination_id: destinationId,
      }));

      const { error: insertError } = await supabase
        .from("package_destinations")
        .upsert(links, { onConflict: "package_id,destination_id" });

      if (insertError) throw insertError;

      return new Response(
        JSON.stringify({ message: "Packages linked", count: links.length }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // DELETE /destinations/admin/:id/packages/:packageId - Unlink package (admin)
    if (req.method === "DELETE" && pathParts.length === 5 && pathParts[1] === "admin" && pathParts[3] === "packages") {
      const destinationId = parseInt(pathParts[2]);
      const packageId = parseInt(pathParts[4]);

      if (isNaN(destinationId) || isNaN(packageId)) {
        return new Response(
          JSON.stringify({ error: "Invalid IDs" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error: deleteError } = await supabase
        .from("package_destinations")
        .delete()
        .eq("destination_id", destinationId)
        .eq("package_id", packageId);

      if (deleteError) throw deleteError;

      return new Response(
        JSON.stringify({ message: "Package unlinked" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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
