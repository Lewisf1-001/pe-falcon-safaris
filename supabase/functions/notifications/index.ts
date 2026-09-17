import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = Deno.env.get("ALLOWED_ORIGINS") || "*";
const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGINS,
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
};

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

    const { data: profile } = await supabase
      .from("users")
      .select("id")
      .eq("auth_id", user.id)
      .single();

    if (!profile) {
      return jsonError("User profile not found", 404);
    }

    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);

    // GET /notifications - Get user's notifications
    if (req.method === "GET" && pathParts.length === 1) {
      const limit = Math.min(Number(url.searchParams.get("limit")) || 50, 100);
      const unreadOnly = url.searchParams.get("unread") === "true";

      let query = supabase
        .from("notifications")
        .select("*")
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (unreadOnly) {
        query = query.eq("is_read", false);
      }

      const { data, error } = await query;
      if (error) throw error;

      return new Response(
        JSON.stringify({ notifications: data || [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // GET /notifications/unread-count - Get unread count
    if (req.method === "GET" && pathParts.length === 2 && pathParts[1] === "unread-count") {
      const { count, error } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", profile.id)
        .eq("is_read", false);

      if (error) throw error;

      return new Response(
        JSON.stringify({ count: count || 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // PATCH /notifications/:id/read - Mark notification as read
    if (req.method === "PATCH" && pathParts.length === 3 && pathParts[2] === "read") {
      const notificationId = Number(pathParts[1]);
      if (!Number.isInteger(notificationId) || notificationId <= 0) {
        return jsonError("Invalid notification ID.", 400);
      }

      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq("id", notificationId)
        .eq("user_id", profile.id);

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // PATCH /notifications/read-all - Mark all as read
    if (req.method === "PATCH" && pathParts.length === 2 && pathParts[1] === "read-all") {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true, read_at: now })
        .eq("user_id", profile.id)
        .eq("is_read", false);

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // POST /notifications - Create notification (service role or admin only)
    if (req.method === "POST" && pathParts.length === 1) {
      const body = await req.json();

      // Verify caller is service role or admin
      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const authHeader = req.headers.get("Authorization")!;
      const isServiceRole = authHeader === `Bearer ${serviceRoleKey}`;

      if (!isServiceRole) {
        // Check if caller is admin
        const { data: admin } = await supabase
          .from("admins")
          .select("id")
          .eq("auth_id", user.id)
          .eq("status", "active")
          .single();

        if (!admin) {
          return jsonError("Forbidden", 403);
        }
      }

      const { userId, type, title, message, referenceType, referenceId } = body;

      if (!userId || !type || !title || !message) {
        return jsonError("Missing required fields: userId, type, title, message", 400);
      }

      // Idempotency check: if reference provided, check for existing
      if (referenceType && referenceId) {
        const { data: existing } = await supabase
          .from("notifications")
          .select("id")
          .eq("user_id", userId)
          .eq("type", type)
          .eq("reference_type", referenceType)
          .eq("reference_id", referenceId)
          .maybeSingle();

        if (existing) {
          return new Response(
            JSON.stringify({ notification: existing, duplicated: true }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      const { data: notification, error } = await supabase
        .from("notifications")
        .insert({
          user_id: userId,
          type,
          title,
          message,
          reference_type: referenceType || null,
          reference_id: referenceId || null,
        })
        .select()
        .single();

      if (error) {
        // Handle unique constraint violation (race condition idempotency)
        if (error.code === "23505") {
          return new Response(
            JSON.stringify({ duplicated: true }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        throw error;
      }

      return new Response(
        JSON.stringify({ notification }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return jsonError("Not found", 404);
  } catch (error) {
    return jsonError(error.message || "Internal server error", 500);
  }
});
