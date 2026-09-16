import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = Deno.env.get("ALLOWED_ORIGINS") || "*";
const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGINS,
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
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

    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);

    // GET /admin/stats - Get dashboard stats
    if (req.method === "GET" && pathParts.length === 2 && pathParts[1] === "stats") {
      const [
        { count: totalBookings },
        { count: pendingBookings },
        { count: confirmedBookings },
        { count: totalPayments },
        { count: totalUsers },
        { count: totalPackages },
      ] = await Promise.all([
        supabase.from("bookings").select("*", { count: "exact", head: true }),
        supabase.from("bookings").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("bookings").select("*", { count: "exact", head: true }).eq("status", "confirmed"),
        supabase.from("payments").select("*", { count: "exact", head: true }).eq("status", "completed"),
        supabase.from("users").select("*", { count: "exact", head: true }),
        supabase.from("packages").select("*", { count: "exact", head: true }),
      ]);

      // Get total revenue
      const { data: revenueData } = await supabase
        .from("payments")
        .select("amount_usd")
        .eq("status", "completed");

      const totalRevenue = revenueData?.reduce((sum, p) => sum + Number(p.amount_usd), 0) || 0;

      return new Response(
        JSON.stringify({
          stats: {
            totalBookings: totalBookings || 0,
            pendingBookings: pendingBookings || 0,
            confirmedBookings: confirmedBookings || 0,
            totalPayments: totalPayments || 0,
            totalUsers: totalUsers || 0,
            totalPackages: totalPackages || 0,
            totalRevenue,
          },
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // GET /admin/bookings - List all bookings
    if (req.method === "GET" && pathParts.length === 2 && pathParts[1] === "bookings") {
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          *,
          packages!bookings_package_id_fkey (name, slug),
          users!bookings_user_id_fkey (first_name, last_name, email)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const bookings = data.map((b) => ({
        id: Number(b.id),
        userId: Number(b.user_id),
        clientName: `${b.users?.first_name} ${b.users?.last_name}`.trim(),
        clientEmail: b.users?.email,
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

    // PATCH /admin/bookings/:id - Update booking status
    if (req.method === "PATCH" && pathParts.length === 3 && pathParts[1] === "bookings") {
      const bookingId = parseInt(pathParts[2]);
      const body = await req.json();
      const { status } = body;

      const VALID_STATUSES = [
        "inquiry", "quote", "pending", "deposit_required", "partially_paid",
        "confirmed", "upcoming", "in_progress", "completed",
        "cancelled", "expired", "refunded",
      ];

      if (!VALID_STATUSES.includes(status)) {
        return new Response(
          JSON.stringify({ error: "Invalid status" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Fetch current booking to validate transition
      const { data: current, error: fetchError } = await supabase
        .from("bookings")
        .select("status")
        .eq("id", bookingId)
        .single();

      if (fetchError || !current) {
        return new Response(
          JSON.stringify({ error: "Booking not found" }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Admin can transition from any non-terminal state to any valid state
      const TERMINAL_STATUSES = ["completed", "cancelled", "refunded"];
      if (TERMINAL_STATUSES.includes(current.status)) {
        return new Response(
          JSON.stringify({ error: `Cannot update booking in '${current.status}' status` }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const { error } = await supabase
        .from("bookings")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", bookingId);

      if (error) throw error;

      return new Response(
        JSON.stringify({ message: "Booking updated", previousStatus: current.status, newStatus: status }),
        {
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
