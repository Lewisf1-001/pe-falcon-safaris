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
const VALID_CONSERVATION = [
  "least_concern", "near_threatened", "vulnerable",
  "endangered", "critically_endangered", "data_deficient", "not_evaluated",
];

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

    // GET /wildlife - List published species
    if (req.method === "GET" && pathParts.length === 1 && pathParts[0] === "wildlife") {
      const search = url.searchParams.get("search");
      const conservation = url.searchParams.get("conservation_status");
      const featured = url.searchParams.get("featured");

      let query = supabase
        .from("wildlife_species")
        .select("id, name, slug, scientific_name, common_name, short_description, conservation_status, featured, hero_image, sort_order, created_at")
        .eq("status", "published")
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });

      if (search && typeof search === "string" && search.trim()) {
        const term = search.trim();
        query = query.or(`name.ilike.%${term}%,scientific_name.ilike.%${term}%,common_name.ilike.%${term}%,habitat.ilike.%${term}%`);
      }

      if (conservation && VALID_CONSERVATION.includes(conservation)) {
        query = query.eq("conservation_status", conservation);
      }

      if (featured === "true") {
        query = query.eq("featured", true);
      }

      const { data, error } = await query;
      if (error) throw error;

      return new Response(JSON.stringify({ species: data || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET /wildlife/featured - List featured published species
    if (req.method === "GET" && pathParts.length === 2 && pathParts[1] === "featured") {
      const { data, error } = await supabase
        .from("wildlife_species")
        .select("id, name, slug, scientific_name, common_name, short_description, conservation_status, hero_image, sort_order")
        .eq("status", "published")
        .eq("featured", true)
        .order("sort_order", { ascending: true });

      if (error) throw error;

      return new Response(JSON.stringify({ species: data || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET /wildlife/:slug - Get single published species with destinations
    if (req.method === "GET" && pathParts.length === 2 && pathParts[0] === "wildlife" && pathParts[1] !== "admin" && pathParts[1] !== "featured") {
      const slug = pathParts[1];

      const { data: species, error } = await supabase
        .from("wildlife_species")
        .select("*")
        .eq("slug", slug)
        .eq("status", "published")
        .single();

      if (error || !species) {
        return new Response(
          JSON.stringify({ error: "Species not found" }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Fetch related destinations
      const { data: destLinks } = await supabase
        .from("destination_wildlife")
        .select("destination_id")
        .eq("species_id", species.id);

      let destinations: unknown[] = [];
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

      return new Response(
        JSON.stringify({
          species: {
            ...species,
            destinations,
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

    // GET /wildlife/admin - List all species (admin)
    if (req.method === "GET" && pathParts.length === 2 && pathParts[1] === "admin") {
      const statusFilter = url.searchParams.get("status");
      const search = url.searchParams.get("search");

      let query = supabase
        .from("wildlife_species")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });

      if (statusFilter && VALID_STATUSES.includes(statusFilter)) {
        query = query.eq("status", statusFilter);
      }

      if (search && typeof search === "string" && search.trim()) {
        const term = search.trim();
        query = query.or(`name.ilike.%${term}%,scientific_name.ilike.%${term}%,common_name.ilike.%${term}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      return new Response(JSON.stringify({ species: data || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST /wildlife/admin - Create species (admin)
    if (req.method === "POST" && pathParts.length === 2 && pathParts[1] === "admin") {
      const body = await req.json();
      const {
        name, slug: rawSlug, scientificName, commonName, shortDescription, description,
        habitat, behavior, diet, conservationStatus, safariViewing,
        status, featured, heroImage, galleryImages, seoTitle, seoDescription, sortOrder,
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

      if (conservationStatus && !VALID_CONSERVATION.includes(conservationStatus)) {
        return new Response(
          JSON.stringify({ error: "Invalid conservation status" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: existing } = await supabase
        .from("wildlife_species")
        .select("id")
        .eq("slug", finalSlug)
        .maybeSingle();

      if (existing) {
        return new Response(
          JSON.stringify({ error: "A species with this slug already exists" }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const row = {
        name: name.trim(),
        slug: finalSlug,
        scientific_name: scientificName?.trim() || null,
        common_name: commonName?.trim() || null,
        short_description: shortDescription?.trim() || null,
        description: description?.trim() || null,
        habitat: habitat?.trim() || null,
        behavior: behavior?.trim() || null,
        diet: diet?.trim() || null,
        conservation_status: conservationStatus || null,
        safari_viewing: safariViewing?.trim() || null,
        status: status || "draft",
        featured: Boolean(featured),
        hero_image: heroImage?.trim() || null,
        gallery_images: Array.isArray(galleryImages) ? galleryImages : [],
        seo_title: seoTitle?.trim() || null,
        seo_description: seoDescription?.trim() || null,
        sort_order: typeof sortOrder === "number" ? sortOrder : 0,
      };

      const { data: created, error: insertError } = await supabase
        .from("wildlife_species")
        .insert(row)
        .select()
        .single();

      if (insertError) {
        if (insertError.code === "23505") {
          return new Response(
            JSON.stringify({ error: "A species with this slug already exists" }),
            { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        throw insertError;
      }

      return new Response(JSON.stringify({ species: created }), {
        status: 201,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // PATCH /wildlife/admin/:id - Update species (admin)
    if (req.method === "PATCH" && pathParts.length === 3 && pathParts[1] === "admin") {
      const speciesId = parseInt(pathParts[2]);

      if (isNaN(speciesId)) {
        return new Response(
          JSON.stringify({ error: "Invalid species ID" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: existing } = await supabase
        .from("wildlife_species")
        .select("id")
        .eq("id", speciesId)
        .single();

      if (!existing) {
        return new Response(
          JSON.stringify({ error: "Species not found" }),
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
        const { data: slugConflict } = await supabase
          .from("wildlife_species")
          .select("id")
          .eq("slug", newSlug)
          .neq("id", speciesId)
          .maybeSingle();
        if (slugConflict) {
          return new Response(
            JSON.stringify({ error: "A species with this slug already exists" }),
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

      if (body.conservationStatus !== undefined) {
        if (body.conservationStatus !== null && !VALID_CONSERVATION.includes(body.conservationStatus)) {
          return new Response(
            JSON.stringify({ error: "Invalid conservation status" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        updates.conservation_status = body.conservationStatus;
      }

      if (body.scientificName !== undefined) updates.scientific_name = body.scientificName?.trim() || null;
      if (body.commonName !== undefined) updates.common_name = body.commonName?.trim() || null;
      if (body.shortDescription !== undefined) updates.short_description = body.shortDescription?.trim() || null;
      if (body.description !== undefined) updates.description = body.description?.trim() || null;
      if (body.habitat !== undefined) updates.habitat = body.habitat?.trim() || null;
      if (body.behavior !== undefined) updates.behavior = body.behavior?.trim() || null;
      if (body.diet !== undefined) updates.diet = body.diet?.trim() || null;
      if (body.safariViewing !== undefined) updates.safari_viewing = body.safariViewing?.trim() || null;
      if (body.featured !== undefined) updates.featured = Boolean(body.featured);
      if (body.heroImage !== undefined) updates.hero_image = body.heroImage?.trim() || null;
      if (body.galleryImages !== undefined) updates.gallery_images = Array.isArray(body.galleryImages) ? body.galleryImages : [];
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
        .from("wildlife_species")
        .update(updates)
        .eq("id", speciesId)
        .select()
        .single();

      if (updateError) {
        if (updateError.code === "23505") {
          return new Response(
            JSON.stringify({ error: "A species with this slug already exists" }),
            { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        throw updateError;
      }

      return new Response(JSON.stringify({ species: updated }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // DELETE /wildlife/admin/:id - Delete species (admin)
    if (req.method === "DELETE" && pathParts.length === 3 && pathParts[1] === "admin") {
      const speciesId = parseInt(pathParts[2]);

      if (isNaN(speciesId)) {
        return new Response(
          JSON.stringify({ error: "Invalid species ID" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { count: linkedDests } = await supabase
        .from("destination_wildlife")
        .select("destination_id", { count: "exact", head: true })
        .eq("species_id", speciesId);

      if (linkedDests && linkedDests > 0) {
        return new Response(
          JSON.stringify({
            error: `Cannot delete species: ${linkedDests} destination(s) are linked to it. Unlink destinations first or archive the species.`,
          }),
          {
            status: 409,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const { error: deleteError } = await supabase
        .from("wildlife_species")
        .delete()
        .eq("id", speciesId);

      if (deleteError) throw deleteError;

      return new Response(
        JSON.stringify({ message: "Species deleted" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // GET /wildlife/admin/:id/destinations - Get destinations for a species (admin)
    if (req.method === "GET" && pathParts.length === 4 && pathParts[1] === "admin" && pathParts[3] === "destinations") {
      const speciesId = parseInt(pathParts[2]);

      if (isNaN(speciesId)) {
        return new Response(
          JSON.stringify({ error: "Invalid species ID" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: links } = await supabase
        .from("destination_wildlife")
        .select("destination_id")
        .eq("species_id", speciesId);

      if (!links || links.length === 0) {
        return new Response(JSON.stringify({ destinations: [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const destIds = links.map((l) => l.destination_id);
      const { data: dests } = await supabase
        .from("destinations")
        .select("id, name, slug, status")
        .in("id", destIds)
        .order("name", { ascending: true });

      return new Response(JSON.stringify({ destinations: dests || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST /wildlife/admin/:id/destinations - Link destinations to species (admin)
    if (req.method === "POST" && pathParts.length === 4 && pathParts[1] === "admin" && pathParts[3] === "destinations") {
      const speciesId = parseInt(pathParts[2]);
      const body = await req.json();
      const { destinationIds } = body;

      if (isNaN(speciesId)) {
        return new Response(
          JSON.stringify({ error: "Invalid species ID" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!Array.isArray(destinationIds) || destinationIds.length === 0) {
        return new Response(
          JSON.stringify({ error: "destinationIds array is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: species } = await supabase
        .from("wildlife_species")
        .select("id")
        .eq("id", speciesId)
        .single();

      if (!species) {
        return new Response(
          JSON.stringify({ error: "Species not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const links = destinationIds.map((did: number) => ({
        destination_id: did,
        species_id: speciesId,
      }));

      const { error: insertError } = await supabase
        .from("destination_wildlife")
        .upsert(links, { onConflict: "destination_id,species_id" });

      if (insertError) throw insertError;

      return new Response(
        JSON.stringify({ message: "Destinations linked", count: links.length }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // DELETE /wildlife/admin/:id/destinations/:destId - Unlink destination (admin)
    if (req.method === "DELETE" && pathParts.length === 5 && pathParts[1] === "admin" && pathParts[3] === "destinations") {
      const speciesId = parseInt(pathParts[2]);
      const destId = parseInt(pathParts[4]);

      if (isNaN(speciesId) || isNaN(destId)) {
        return new Response(
          JSON.stringify({ error: "Invalid IDs" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error: deleteError } = await supabase
        .from("destination_wildlife")
        .delete()
        .eq("destination_id", destId)
        .eq("species_id", speciesId);

      if (deleteError) throw deleteError;

      return new Response(
        JSON.stringify({ message: "Destination unlinked" }),
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
