import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { EMAIL_ELIGIBLE_TYPES } from "../_shared/notification-triggers.ts";

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
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Client with user's JWT for reads (RLS-scoped to their data)
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: { Authorization: req.headers.get("Authorization")! },
      },
    });

    // Service-role client for inserts and internal lookups
    const serviceClient = createClient(supabaseUrl, serviceRoleKey);

    // Determine if caller is service-role (for POST endpoint)
    const isServiceRole = req.headers.get("Authorization") === `Bearer ${serviceRoleKey}`;

    // For non-POST endpoints (GET, PATCH), require authenticated user with profile
    // For POST, require either service-role or admin
    let profile: { id: number } | null = null;

    if (!isServiceRole) {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        return jsonError("Unauthorized", 401);
      }

      const { data: profileData } = await supabase
        .from("users")
        .select("id")
        .eq("auth_id", user.id)
        .single();

      profile = profileData;

      if (!profile) {
        return jsonError("User profile not found", 404);
      }
    }

    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);

    // GET/PATCH endpoints require an authenticated user profile.
    // Service-role callers can only use POST.
    if (req.method !== "POST" && !profile) {
      return jsonError("Unauthorized", 401);
    }

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
      if (!isServiceRole) {
        // Check if caller is admin (user already authenticated above)
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();

        if (authUser) {
          const { data: admin } = await supabase
            .from("admins")
            .select("id")
            .eq("auth_id", authUser.id)
            .eq("status", "active")
            .single();

          if (!admin) {
            return jsonError("Forbidden", 403);
          }
        } else {
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

      // Insert using service-role client (required by tightened RLS)
      const { data: notification, error } = await serviceClient
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

      // --- Email delivery (fire-and-forget, non-blocking) ---
      // If the notification type is email-eligible, attempt to send an email.
      // Failures are recorded in notification_deliveries but do not block
      // the response or affect the in-app notification.
      if (EMAIL_ELIGIBLE_TYPES.has(type) && notification) {
        try {
          // Look up the user's email
          const { data: notifUser } = await serviceClient
            .from("users")
            .select("email, first_name, last_name")
            .eq("id", userId)
            .single();

          if (notifUser?.email) {
            const userName = `${notifUser.first_name || ""} ${notifUser.last_name || ""}`.trim() || "Customer";

            // Create a pending delivery record
            const { data: delivery } = await serviceClient
              .from("notification_deliveries")
              .insert({
                notification_id: notification.id,
                channel: "email",
                status: "pending",
              })
              .select()
              .single();

            if (delivery) {
              // Attempt to send the email via the email Edge Function
              const emailResponse = await fetch(`${supabaseUrl}/functions/v1/email`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${serviceRoleKey}`,
                  apikey: supabaseKey,
                },
                body: JSON.stringify({
                  action: "notification-email",
                  notificationType: type,
                  userEmail: notifUser.email,
                  userName,
                  referenceType: referenceType || null,
                  referenceId: referenceId || null,
                }),
              });

              const emailResult = await emailResponse.json();

              // Update delivery record based on result
              if (emailResult.success) {
                await serviceClient
                  .from("notification_deliveries")
                  .update({ status: "sent", delivered_at: new Date().toISOString() })
                  .eq("id", delivery.id);
              } else {
                await serviceClient
                  .from("notification_deliveries")
                  .update({
                    status: "failed",
                    error_message: emailResult.error || "Email send failed",
                  })
                  .eq("id", delivery.id);
              }
            }
          }
        } catch (emailError) {
          // Email delivery is non-critical; log but do not fail
          console.error("Notification email delivery error:", emailError);
        }
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
