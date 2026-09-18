import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildReviewSubmittedNotification } from "../_shared/notification-triggers.ts";

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
      .select("id, first_name, last_name")
      .eq("auth_id", user.id)
      .single();

    if (!profile) {
      return jsonError("User profile not found", 404);
    }

    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);

    // POST /reviews - Submit a new review
    if (req.method === "POST" && pathParts.length === 1) {
      const MAX_PAYLOAD = 8192;
      const rawBody = await req.text();
      if (rawBody.length > MAX_PAYLOAD) {
        return jsonError("Payload too large", 413);
      }

      let body: Record<string, unknown>;
      try {
        body = JSON.parse(rawBody);
      } catch {
        return jsonError("Invalid JSON", 400);
      }

      const { bookingId, rating, title, body: reviewBody } = body;

      // Validate required fields
      const errors: string[] = [];

      if (typeof bookingId !== "number" || !Number.isInteger(bookingId) || bookingId <= 0) {
        errors.push("Valid booking ID is required.");
      }

      if (typeof rating !== "number" || !Number.isInteger(rating) || rating < 1 || rating > 5) {
        errors.push("Rating must be an integer between 1 and 5.");
      }

      if (typeof title !== "string" || title.trim().length === 0) {
        errors.push("Title is required.");
      } else if (title.trim().length > 200) {
        errors.push("Title must be under 200 characters.");
      }

      if (typeof reviewBody !== "string" || reviewBody.trim().length === 0) {
        errors.push("Review body is required.");
      } else if (reviewBody.trim().length > 2000) {
        errors.push("Review body must be under 2000 characters.");
      }

      if (errors.length > 0) {
        return new Response(
          JSON.stringify({ error: "Validation failed", details: errors }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Verify booking ownership and eligibility
      const { data: booking, error: bookingError } = await supabase
        .from("bookings")
        .select("id, user_id, status, package_id")
        .eq("id", bookingId)
        .single();

      if (bookingError || !booking) {
        return jsonError("Booking not found.", 404);
      }

      // Defense-in-depth: verify booking belongs to authenticated user
      if (booking.user_id !== profile.id) {
        return jsonError("You can only review your own bookings.", 403);
      }

      // Verify booking is completed
      if (booking.status !== "completed") {
        return jsonError("You can only review completed bookings.", 400);
      }

      // Check for duplicate review on this booking
      const { data: existingReview } = await supabase
        .from("reviews")
        .select("id")
        .eq("booking_id", bookingId)
        .eq("user_id", profile.id)
        .maybeSingle();

      if (existingReview) {
        return jsonError("You have already reviewed this booking.", 409);
      }

      // Derive package from booking (do not trust client)
      const packageId = booking.package_id;

      // Create the review
      const { data: review, error: insertError } = await supabase
        .from("reviews")
        .insert({
          user_id: profile.id,
          booking_id: bookingId,
          package_id: packageId,
          rating: rating,
          title: title.trim(),
          body: reviewBody.trim(),
          status: "pending",
        })
        .select("id, created_at")
        .single();

      if (insertError) {
        if (insertError.code === "23505") {
          return jsonError("You have already reviewed this booking.", 409);
        }
        throw insertError;
      }

      // Fire-and-forget: notify admins of new review
      try {
        const supabaseService = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
        const { data: admins } = await supabaseService
          .from("admins")
          .select("email")
          .eq("status", "active")
          .not("email", "is", null);

        if (admins && admins.length > 0) {
          const reviewerName = `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || "Customer";
          const emailHtml = reviewNotificationHtml({
            reviewerName,
            rating,
            title: title.trim(),
            body: reviewBody.trim(),
          });

          await Promise.all(
            admins.map((a) =>
              fetch(`${supabaseUrl}/functions/v1/email`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
                  apikey: supabaseKey,
                },
                body: JSON.stringify({
                  action: "admin-notification",
                  clientEmail: a.email,
                  clientName: "Admin",
                  packageName: "New Review",
                  travelDate: "",
                  guests: 0,
                  total: 0,
                }),
              }).catch(() => {})
            )
          );
        }
      } catch {
        // Email notification is non-critical
      }

      // Fire-and-forget: in-app notification confirming review submission (non-blocking)
      try {
        const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const reviewNotif = buildReviewSubmittedNotification({
          userId: profile.id,
          reviewId: review.id,
        });
        fetch(`${supabaseUrl}/functions/v1/notifications`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceRoleKey}`,
            apikey: supabaseKey,
          },
          body: JSON.stringify(reviewNotif),
        }).catch(() => {});
      } catch {
        // Notifications are non-critical
      }

      return new Response(
        JSON.stringify({
          review: {
            id: review.id,
            createdAt: review.created_at,
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // GET /reviews - Get user's own reviews
    if (req.method === "GET" && pathParts.length === 1) {
      const { data, error } = await supabase
        .from("reviews")
        .select(`
          *,
          packages!reviews_package_id_fkey (name, slug)
        `)
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const reviews = data.map((r) => ({
        id: Number(r.id),
        userId: Number(r.user_id),
        bookingId: Number(r.booking_id),
        packageId: r.package_id ? Number(r.package_id) : null,
        packageName: r.packages?.name || null,
        packageSlug: r.packages?.slug || null,
        rating: r.rating,
        title: r.title,
        body: r.body,
        status: r.status,
        adminResponse: r.admin_response,
        adminResponseAt: r.admin_response_at,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        publishedAt: r.published_at,
      }));

      return new Response(JSON.stringify({ reviews }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return jsonError("Not found", 404);
  } catch (error) {
    return jsonError(error.message || "Internal server error", 500);
  }
});

function reviewNotificationHtml(data: {
  reviewerName: string;
  rating: number;
  title: string;
  body: string;
}): string {
  const stars = "★".repeat(data.rating) + "☆".repeat(5 - data.rating);
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background:#f4f4f4;margin:0;padding:0}
.container{max-width:600px;margin:0 auto;background:#fff}
.header{background:#1a3c2a;padding:24px;text-align:center}
.header h1{color:#d4a843;margin:0;font-size:24px}
.content{padding:32px 24px;color:#333}
.highlight{background:#fff7e6;border-left:4px solid #d4a843;padding:16px;margin:16px 0;border-radius:4px}
.footer{background:#1a3c2a;padding:16px;text-align:center;color:#d4a843;font-size:12px}</style></head>
<body><div class="container"><div class="header"><h1>PE Falcon Safaris</h1></div>
<div class="content"><h2>New Review Submitted</h2>
<p>A customer has submitted a new review that requires moderation.</p>
<div class="highlight">
<p><strong>Reviewer:</strong> ${escapeHtml(data.reviewerName)}</p>
<p><strong>Rating:</strong> ${stars} (${data.rating}/5)</p>
<p><strong>Title:</strong> ${escapeHtml(data.title)}</p>
</div>
<blockquote style="border-left:3px solid #1a3c2a;padding-left:16px;margin:16px 0;color:#555;font-style:italic">
${escapeHtml(data.body)}
</blockquote>
<p>Please review and moderate this submission in the admin dashboard.</p>
<div class="footer"><p>&copy; ${new Date().getFullYear()} PE Falcon Safaris. All rights reserved.</p></div>
</div></body></html>`;
}

function escapeHtml(str: unknown): string {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
