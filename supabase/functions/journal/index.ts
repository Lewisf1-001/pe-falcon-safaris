import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = Deno.env.get("ALLOWED_ORIGINS") || "*";
const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGINS,
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
};

const VALID_CATEGORIES = [
  "safari-stories", "destinations", "wildlife",
  "travel-tips", "safari-guides", "conservation",
];

function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
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

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return jsonError("Unauthorized", 401);
    }

    const { data: admin } = await supabase
      .from("admins")
      .select("id, username")
      .eq("auth_id", user.id)
      .eq("status", "active")
      .single();

    if (!admin) {
      return jsonError("Forbidden", 403);
    }

    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);

    // GET /journal/admin - List all articles
    if (req.method === "GET" && pathParts.length === 2 && pathParts[1] === "admin") {
      const status = url.searchParams.get("status");
      const search = url.searchParams.get("search");

      let query = supabase
        .from("journal_articles")
        .select("*")
        .order("created_at", { ascending: false });

      if (status) {
        query = query.eq("status", status);
      }

      if (search && search.trim()) {
        const term = search.trim();
        query = query.or(`title.ilike.%${term}%,author.ilike.%${term}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      return new Response(
        JSON.stringify({ articles: data || [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // POST /journal/admin - Create article
    if (req.method === "POST" && pathParts.length === 2 && pathParts[1] === "admin") {
      const body = await req.json();

      if (!body.title || typeof body.title !== "string" || !body.title.trim()) {
        return jsonError("Title is required.", 400);
      }

      if (!body.content || typeof body.content !== "string" || !body.content.trim()) {
        return jsonError("Content is required.", 400);
      }

      if (!body.category || !VALID_CATEGORIES.includes(body.category)) {
        return jsonError("Valid category is required.", 400);
      }

      const slug = body.slug || body.title
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

      const { data, error } = await supabase
        .from("journal_articles")
        .insert({
          title: body.title.trim(),
          slug,
          excerpt: body.excerpt || null,
          content: body.content.trim(),
          featured_image: body.featuredImage || null,
          category: body.category,
          author: body.author || null,
          status: body.status || "draft",
          featured: body.featured || false,
          seo_title: body.seoTitle || null,
          seo_description: body.seoDescription || null,
          published_at: body.status === "published" ? new Date().toISOString() : null,
        })
        .select()
        .single();

      if (error) {
        if (error.code === "23505") {
          return jsonError("An article with this slug already exists.", 409);
        }
        throw error;
      }

      return new Response(
        JSON.stringify({ article: data }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // PATCH /journal/admin/:id - Update article
    if (req.method === "PATCH" && pathParts.length === 3 && pathParts[1] === "admin") {
      const id = Number(pathParts[2]);
      if (!Number.isInteger(id) || id <= 0) {
        return jsonError("Invalid article ID.", 400);
      }

      const body = await req.json();
      const updates: Record<string, unknown> = {};

      if (body.title !== undefined) updates.title = body.title.trim();
      if (body.slug !== undefined) updates.slug = body.slug;
      if (body.excerpt !== undefined) updates.excerpt = body.excerpt || null;
      if (body.content !== undefined) updates.content = body.content.trim();
      if (body.featuredImage !== undefined) updates.featured_image = body.featuredImage || null;
      if (body.category !== undefined) {
        if (!VALID_CATEGORIES.includes(body.category)) {
          return jsonError("Invalid category.", 400);
        }
        updates.category = body.category;
      }
      if (body.author !== undefined) updates.author = body.author || null;
      if (body.featured !== undefined) updates.featured = body.featured;
      if (body.seoTitle !== undefined) updates.seo_title = body.seoTitle || null;
      if (body.seoDescription !== undefined) updates.seo_description = body.seoDescription || null;

      if (body.status !== undefined) {
        updates.status = body.status;
        if (body.status === "published") {
          const { data: existing } = await supabase
            .from("journal_articles")
            .select("published_at")
            .eq("id", id)
            .single();

          if (existing && !existing.published_at) {
            updates.published_at = new Date().toISOString();
          }
        }
      }

      const { data, error } = await supabase
        .from("journal_articles")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        if (error.code === "23505") {
          return jsonError("An article with this slug already exists.", 409);
        }
        throw error;
      }

      if (!data) {
        return jsonError("Article not found.", 404);
      }

      return new Response(
        JSON.stringify({ article: data }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // DELETE /journal/admin/:id - Delete article
    if (req.method === "DELETE" && pathParts.length === 3 && pathParts[1] === "admin") {
      const id = Number(pathParts[2]);
      if (!Number.isInteger(id) || id <= 0) {
        return jsonError("Invalid article ID.", 400);
      }

      const { error } = await supabase
        .from("journal_articles")
        .delete()
        .eq("id", id);

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return jsonError("Not found", 404);
  } catch (error) {
    return jsonError(error.message || "Internal server error", 500);
  }
});
