import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

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

    // Get user profile
    const { data: profile } = await supabase
      .from("users")
      .select("id")
      .eq("auth_id", user.id)
      .single();

    if (!profile) {
      return new Response(JSON.stringify({ error: "User profile not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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

    // POST /bookings - Create booking
    if (req.method === "POST" && pathParts.length === 1) {
      const body = await req.json();
      const { packageSlug, travelDate, guests, notes } = body;

      // Validate input
      if (!packageSlug || !travelDate || !guests) {
        return new Response(
          JSON.stringify({ error: "Missing required fields" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Get package
      const { data: pkg, error: pkgError } = await supabase
        .from("packages")
        .select("*")
        .eq("slug", packageSlug)
        .eq("is_active", true)
        .single();

      if (pkgError || !pkg) {
        return new Response(
          JSON.stringify({ error: "Package not found" }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Calculate price
      const unitPrice = Number(pkg.starting_price);
      const totalPriceUsd = unitPrice * guests;

      // Create booking
      const { data: booking, error: bookingError } = await supabase
        .from("bookings")
        .insert({
          user_id: profile.id,
          package_id: pkg.id,
          travel_date: travelDate,
          guests,
          total_price_usd: totalPriceUsd,
          status: "pending",
          notes: notes?.trim() || null,
        })
        .select()
        .single();

      if (bookingError) throw bookingError;

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
