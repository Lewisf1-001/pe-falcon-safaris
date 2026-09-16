import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = Deno.env.get("ALLOWED_ORIGINS") || "*";
const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGINS,
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
};

const VALID_BOOKING_STATUSES = [
  "inquiry", "quote", "pending", "deposit_required", "partially_paid",
  "confirmed", "upcoming", "in_progress", "completed",
  "cancelled", "expired", "refunded",
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

    // GET /bookings - List user's bookings
    if (req.method === "GET" && pathParts.length === 1) {
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          *,
          packages!bookings_package_id_fkey (name, slug)
        `)
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const bookings = data.map((b) => ({
        id: Number(b.id),
        userId: Number(b.user_id),
        packageId: Number(b.package_id),
        packageName: b.packages?.name,
        packageSlug: b.packages?.slug,
        travelDate: b.travel_date?.slice(0, 10),
        guests: b.guests,
        totalPriceUsd: Number(b.total_price_usd),
        status: b.status,
        notes: b.notes,
        createdAt: b.created_at,
        updatedAt: b.updated_at,
      }));

      return new Response(JSON.stringify({ bookings }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET /bookings/:id - Get single booking
    if (req.method === "GET" && pathParts.length === 2) {
      const bookingId = parseInt(pathParts[1]);
      if (isNaN(bookingId)) {
        return jsonError("Invalid booking ID", 400);
      }

      const { data, error } = await supabase
        .from("bookings")
        .select(`
          *,
          packages!bookings_package_id_fkey (name, slug)
        `)
        .eq("id", bookingId)
        .eq("user_id", profile.id)
        .single();

      if (error || !data) {
        return jsonError("Booking not found", 404);
      }

      return new Response(
        JSON.stringify({
          booking: {
            id: Number(data.id),
            userId: Number(data.user_id),
            packageId: Number(data.package_id),
            packageName: data.packages?.name,
            packageSlug: data.packages?.slug,
            travelDate: data.travel_date?.slice(0, 10),
            guests: data.guests,
            totalPriceUsd: Number(data.total_price_usd),
            status: data.status,
            notes: data.notes,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
          },
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // POST /bookings - Create booking
    if (req.method === "POST" && pathParts.length === 1) {
      const body = await req.json();
      const { packageSlug, travelDate, guests, notes } = body;

      // Validate required fields
      if (!packageSlug || !travelDate || !guests) {
        return jsonError("Missing required fields: packageSlug, travelDate, guests", 400);
      }

      // Validate guests
      const guestCount = Number(guests);
      if (!Number.isInteger(guestCount) || guestCount < 1 || guestCount > 20) {
        return jsonError("Guests must be an integer between 1 and 20", 400);
      }

      // Validate travel date is in the future
      const travelDateObj = new Date(travelDate);
      if (isNaN(travelDateObj.getTime())) {
        return jsonError("Invalid travel date format", 400);
      }
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (travelDateObj < today) {
        return jsonError("Travel date must be in the future", 400);
      }

      // Validate notes length
      if (notes && notes.length > 1000) {
        return jsonError("Notes must be 1000 characters or fewer", 400);
      }

      // Get package (must be active)
      const { data: pkg, error: pkgError } = await supabase
        .from("packages")
        .select("id, name, slug, starting_price_usd")
        .eq("slug", packageSlug)
        .eq("is_active", true)
        .single();

      if (pkgError || !pkg) {
        return jsonError("Package not found or inactive", 404);
      }

      // Server-authoritative price calculation
      const unitPriceUsd = Number(pkg.starting_price_usd);
      if (unitPriceUsd <= 0) {
        return jsonError("Package has invalid pricing", 500);
      }
      const totalPriceUsd = unitPriceUsd * guestCount;

      // Duplicate detection: same user + same package + same date
      const { data: existing } = await supabase
        .from("bookings")
        .select("id")
        .eq("user_id", profile.id)
        .eq("package_id", pkg.id)
        .eq("travel_date", travelDate)
        .not("status", "eq", "cancelled")
        .not("status", "eq", "expired")
        .not("status", "eq", "refunded")
        .limit(1);

      if (existing && existing.length > 0) {
        return jsonError(
          "You already have an active booking for this package on this date",
          409
        );
      }

      // Create booking
      const { data: booking, error: bookingError } = await supabase
        .from("bookings")
        .insert({
          user_id: profile.id,
          package_id: pkg.id,
          travel_date: travelDate,
          guests: guestCount,
          total_price_usd: totalPriceUsd,
          status: "pending",
          notes: notes?.trim() || null,
        })
        .select()
        .single();

      if (bookingError) throw bookingError;

      // Fire-and-forget emails (non-blocking)
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const emailServiceUrl = `${supabaseUrl}/functions/v1/email`;
        const emailHeaders = {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token || ""}`,
          apikey: supabaseKey,
        };

        const emailBody = JSON.stringify({
          action: "booking-confirmation",
          clientEmail: user.email,
          clientName: "Customer",
          packageName: pkg.name,
          travelDate,
          guests: guestCount,
          total: totalPriceUsd,
        });

        fetch(emailServiceUrl, {
          method: "POST",
          headers: emailHeaders,
          body: emailBody,
        }).catch(() => {});

        fetch(emailServiceUrl, {
          method: "POST",
          headers: emailHeaders,
          body: JSON.stringify({
            ...JSON.parse(emailBody),
            action: "admin-notification",
          }),
        }).catch(() => {});
      } catch {
        // Email is non-critical
      }

      return new Response(
        JSON.stringify({
          message: "Booking created successfully",
          booking: {
            id: Number(booking.id),
            userId: Number(booking.user_id),
            packageId: Number(booking.package_id),
            packageName: pkg.name,
            packageSlug: pkg.slug,
            travelDate: booking.travel_date?.slice(0, 10),
            guests: booking.guests,
            totalPriceUsd: Number(booking.total_price_usd),
            status: booking.status,
            notes: booking.notes,
            createdAt: booking.created_at,
            updatedAt: booking.updated_at,
          },
        }),
        {
          status: 201,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // PATCH /bookings/:id/cancel - Customer cancellation
    if (req.method === "PATCH" && pathParts.length === 3 && pathParts[2] === "cancel") {
      const bookingId = parseInt(pathParts[1]);
      if (isNaN(bookingId)) {
        return jsonError("Invalid booking ID", 400);
      }

      // Fetch the booking and verify ownership
      const { data: booking, error: fetchError } = await supabase
        .from("bookings")
        .select("id, status, user_id")
        .eq("id", bookingId)
        .eq("user_id", profile.id)
        .single();

      if (fetchError || !booking) {
        return jsonError("Booking not found", 404);
      }

      // Only allow cancellation from non-terminal states
      const TERMINAL = ["completed", "cancelled", "refunded"];
      if (TERMINAL.includes(booking.status)) {
        return jsonError(
          `Cannot cancel a booking in '${booking.status}' status`,
          400
        );
      }

      // Only allow cancellation from specific pre-payment states
      const CANCELLABLE = ["inquiry", "quote", "pending", "deposit_required"];
      if (!CANCELLABLE.includes(booking.status)) {
        return jsonError(
          "Bookings with confirmed payments cannot be cancelled online. Please contact us.",
          400
        );
      }

      const { error: updateError } = await supabase
        .from("bookings")
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("id", bookingId);

      if (updateError) throw updateError;

      return new Response(
        JSON.stringify({ message: "Booking cancelled successfully" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return jsonError("Not found", 404);
  } catch (error) {
    return jsonError(error.message || "Internal server error", 500);
  }
});
