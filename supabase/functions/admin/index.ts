import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = Deno.env.get("ALLOWED_ORIGINS") || "*";
const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGINS,
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
};

const BOOKING_STATUSES = [
  "inquiry", "quote", "pending", "deposit_required", "partially_paid",
  "confirmed", "upcoming", "in_progress", "completed",
  "cancelled", "expired", "refunded",
];

const QUOTATION_STATUSES = [
  "draft", "sent", "viewed", "accepted", "declined", "expired", "cancelled",
];

const PAYMENT_STATUSES = ["pending", "completed", "failed", "cancelled"];

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

    // GET /admin/stats - Get comprehensive dashboard stats
    if (req.method === "GET" && pathParts.length === 2 && pathParts[1] === "stats") {
      // Booking counts by status
      const bookingCountPromises = BOOKING_STATUSES.map((status) =>
        supabase.from("bookings").select("*", { count: "exact", head: true }).eq("status", status)
      );
      const { count: totalBookings } = await supabase
        .from("bookings").select("*", { count: "exact", head: true });
      const bookingStatusResults = await Promise.all(bookingCountPromises);

      const bookingsByStatus: Record<string, number> = {};
      BOOKING_STATUSES.forEach((status, i) => {
        bookingsByStatus[status] = bookingStatusResults[i].count || 0;
      });

      // Quotation counts by status
      const quotationCountPromises = QUOTATION_STATUSES.map((status) =>
        supabase.from("quotations").select("*", { count: "exact", head: true }).eq("status", status)
      );
      const { count: totalQuotations } = await supabase
        .from("quotations").select("*", { count: "exact", head: true });
      const quotationStatusResults = await Promise.all(quotationCountPromises);

      const quotationsByStatus: Record<string, number> = {};
      QUOTATION_STATUSES.forEach((status, i) => {
        quotationsByStatus[status] = quotationStatusResults[i].count || 0;
      });

      // Payment counts by status
      const paymentCountPromises = PAYMENT_STATUSES.map((status) =>
        supabase.from("payments").select("*", { count: "exact", head: true }).eq("status", status)
      );
      const paymentStatusResults = await Promise.all(paymentCountPromises);

      const paymentsByStatus: Record<string, number> = {};
      PAYMENT_STATUSES.forEach((status, i) => {
        paymentsByStatus[status] = paymentStatusResults[i].count || 0;
      });

      // Total revenue from completed payments
      const { data: revenueData } = await supabase
        .from("payments")
        .select("amount_usd")
        .eq("status", "completed");
      const totalRevenue = revenueData?.reduce((sum, p) => sum + Number(p.amount_usd), 0) || 0;

      // Quoted value from non-terminal quotations
      const { data: quotedData } = await supabase
        .from("quotations")
        .select("total_usd")
        .not("status", "in", "(accepted,declined,expired,cancelled)");
      const totalQuotedValue = quotedData?.reduce((sum, q) => sum + Number(q.total_usd), 0) || 0;

      // User and package counts
      const [{ count: totalUsers }, { count: totalPackages }] = await Promise.all([
        supabase.from("users").select("*", { count: "exact", head: true }),
        supabase.from("packages").select("*", { count: "exact", head: true }),
      ]);

      return new Response(
        JSON.stringify({
          stats: {
            totalBookings: totalBookings || 0,
            bookingsByStatus,
            totalQuotations: totalQuotations || 0,
            quotationsByStatus,
            totalPayments: (paymentsByStatus.pending || 0) + (paymentsByStatus.completed || 0) + (paymentsByStatus.failed || 0) + (paymentsByStatus.cancelled || 0),
            paymentsByStatus,
            totalUsers: totalUsers || 0,
            totalPackages: totalPackages || 0,
            totalRevenue,
            totalQuotedValue,
          },
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // GET /admin/activity - Recent activity across bookings, payments, quotations
    if (req.method === "GET" && pathParts.length === 2 && pathParts[1] === "activity") {
      const limit = parseInt(url.searchParams.get("limit") || "10");
      const safeLimit = Math.min(Math.max(limit, 1), 50);

      const [
        { data: recentBookings },
        { data: recentPayments },
        { data: recentQuotations },
      ] = await Promise.all([
        supabase
          .from("bookings")
          .select("id, status, total_price_usd, created_at, updated_at, user_id, package_id")
          .order("created_at", { ascending: false })
          .limit(safeLimit),
        supabase
          .from("payments")
          .select("id, status, amount_usd, method, created_at, booking_id, user_id")
          .order("created_at", { ascending: false })
          .limit(safeLimit),
        supabase
          .from("quotations")
          .select("id, title, status, total_usd, created_at, user_id, package_id")
          .order("created_at", { ascending: false })
          .limit(safeLimit),
      ]);

      // Fetch package names for all referenced packages
      const packageIds = new Set<number>();
      [...(recentBookings || []), ...(recentQuotations || [])].forEach((item) => {
        if (item.package_id) packageIds.add(item.package_id);
      });

      let packagesByName: Record<number, string> = {};
      if (packageIds.size > 0) {
        const { data: packages } = await supabase
          .from("packages")
          .select("id, name")
          .in("id", Array.from(packageIds));
        packages?.forEach((p) => { packagesByName[p.id] = p.name; });
      }

      // Fetch user names for all referenced users
      const userIds = new Set<number>();
      [...(recentBookings || []), ...(recentPayments || []), ...(recentQuotations || [])].forEach((item) => {
        if (item.user_id) userIds.add(item.user_id);
      });

      let usersById: Record<number, { name: string; email: string }> = {};
      if (userIds.size > 0) {
        const { data: users } = await supabase
          .from("users")
          .select("id, first_name, last_name, email")
          .in("id", Array.from(userIds));
        users?.forEach((u) => {
          usersById[u.id] = {
            name: `${u.first_name} ${u.last_name}`.trim(),
            email: u.email,
          };
        });
      }

      // Combine into unified activity feed
      type ActivityItem = {
        type: "booking" | "payment" | "quotation";
        id: number;
        title: string;
        description: string;
        status: string;
        amountUsd: number | null;
        timestamp: string;
      };

      const activities: ActivityItem[] = [];

      (recentBookings || []).forEach((b) => {
        const user = usersById[b.user_id];
        const pkg = b.package_id ? packagesByName[b.package_id] : null;
        activities.push({
          type: "booking",
          id: b.id,
          title: pkg || `Booking #${b.id}`,
          description: user ? `${user.name} — ${b.guests || "?"} guests` : `Booking #${b.id}`,
          status: b.status,
          amountUsd: Number(b.total_price_usd),
          timestamp: b.created_at,
        });
      });

      (recentPayments || []).forEach((p) => {
        const user = usersById[p.user_id];
        activities.push({
          type: "payment",
          id: p.id as unknown as number,
          title: `Payment ${p.method === "mobile_money" ? "(M-Pesa)" : ""}`,
          description: user ? `${user.name}` : `Payment`,
          status: p.status,
          amountUsd: Number(p.amount_usd),
          timestamp: p.created_at,
        });
      });

      (recentQuotations || []).forEach((q) => {
        const user = usersById[q.user_id];
        const pkg = q.package_id ? packagesByName[q.package_id] : null;
        activities.push({
          type: "quotation",
          id: q.id,
          title: q.title || pkg || `Quotation #${q.id}`,
          description: user ? `${user.name}` : `Quotation #${q.id}`,
          status: q.status,
          amountUsd: Number(q.total_usd),
          timestamp: q.created_at,
        });
      });

      // Sort by timestamp descending and limit
      activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      const limited = activities.slice(0, safeLimit);

      return new Response(JSON.stringify({ activity: limited }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET /admin/alerts - Operational alerts requiring admin attention
    if (req.method === "GET" && pathParts.length === 2 && pathParts[1] === "alerts") {
      // Bookings needing attention: inquiry, quote, pending, deposit_required
      const alertBookingStatuses = ["inquiry", "quote", "pending", "deposit_required"];
      const alertBookingPromises = alertBookingStatuses.map((status) =>
        supabase.from("bookings").select("id", { count: "exact", head: true }).eq("status", status)
      );
      const alertBookingResults = await Promise.all(alertBookingPromises);

      // Quotations awaiting response: sent, viewed
      const alertQuotationStatuses = ["sent", "viewed"];
      const alertQuotationPromises = alertQuotationStatuses.map((status) =>
        supabase.from("quotations").select("id", { count: "exact", head: true }).eq("status", status)
      );
      const alertQuotationResults = await Promise.all(alertQuotationPromises);

      // Pending payments
      const { count: pendingPayments } = await supabase
        .from("payments").select("id", { count: "exact", head: true }).eq("status", "pending");

      // Expired quotations (status not terminal but valid_until passed)
      const { count: expiredQuotations } = await supabase
        .from("quotations")
        .select("id", { count: "exact", head: true })
        .in("status", ["draft", "sent", "viewed"])
        .lt("valid_until", new Date().toISOString().split("T")[0]);

      const alerts = [];

      const totalPendingBookings = alertBookingResults.reduce((sum, r) => sum + (r.count || 0), 0);
      if (totalPendingBookings > 0) {
        alerts.push({
          type: "bookings_pending_action",
          label: "Bookings awaiting action",
          count: totalPendingBookings,
          breakdown: Object.fromEntries(
            alertBookingStatuses.map((status, i) => [status, alertBookingResults[i].count || 0])
          ),
          href: "/bookings",
        });
      }

      const totalAwaitingQuotations = alertQuotationResults.reduce((sum, r) => sum + (r.count || 0), 0);
      if (totalAwaitingQuotations > 0) {
        alerts.push({
          type: "quotations_awaiting_response",
          label: "Quotations awaiting customer response",
          count: totalAwaitingQuotations,
          breakdown: Object.fromEntries(
            alertQuotationStatuses.map((status, i) => [status, alertQuotationResults[i].count || 0])
          ),
          href: "/quotations",
        });
      }

      if ((pendingPayments || 0) > 0) {
        alerts.push({
          type: "payments_pending",
          label: "Payments pending verification",
          count: pendingPayments,
          href: "/payments",
        });
      }

      if ((expiredQuotations || 0) > 0) {
        alerts.push({
          type: "quotations_expired",
          label: "Quotations expired without response",
          count: expiredQuotations,
          href: "/quotations",
        });
      }

      return new Response(JSON.stringify({ alerts }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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

    // GET /admin/reviews - List all reviews (admin)
    if (req.method === "GET" && pathParts.length === 2 && pathParts[1] === "reviews") {
      const statusFilter = url.searchParams.get("status");

      let query = supabase
        .from("reviews")
        .select(`
          *,
          users!reviews_user_id_fkey (first_name, last_name, email),
          packages!reviews_package_id_fkey (name, slug),
          bookings!reviews_booking_id_fkey (travel_date, guests)
        `)
        .order("created_at", { ascending: false });

      if (statusFilter && ["pending", "approved", "rejected", "hidden"].includes(statusFilter)) {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      const reviews = data.map((r) => ({
        id: Number(r.id),
        userId: Number(r.user_id),
        bookingId: Number(r.booking_id),
        packageId: r.package_id ? Number(r.package_id) : null,
        packageName: r.packages?.name || null,
        packageSlug: r.packages?.slug || null,
        reviewerName: `${r.users?.first_name || ""} ${r.users?.last_name || ""}`.trim() || "Anonymous",
        reviewerEmail: r.users?.email || null,
        travelDate: r.bookings?.travel_date?.slice(0, 10) || null,
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

    // GET /admin/reviews/stats - Review statistics
    if (req.method === "GET" && pathParts.length === 3 && pathParts[1] === "reviews" && pathParts[2] === "stats") {
      const { count: totalReviews } = await supabase
        .from("reviews").select("*", { count: "exact", head: true });

      const { count: pendingReviews } = await supabase
        .from("reviews").select("*", { count: "exact", head: true }).eq("status", "pending");

      const { count: approvedReviews } = await supabase
        .from("reviews").select("*", { count: "exact", head: true }).eq("status", "approved");

      const { count: rejectedReviews } = await supabase
        .from("reviews").select("*", { count: "exact", head: true }).eq("status", "rejected");

      // Average rating of approved reviews
      const { data: avgData } = await supabase
        .from("reviews")
        .select("rating")
        .eq("status", "approved");

      const avgRating = avgData && avgData.length > 0
        ? avgData.reduce((sum, r) => sum + r.rating, 0) / avgData.length
        : 0;

      return new Response(JSON.stringify({
        stats: {
          totalReviews: totalReviews || 0,
          pendingReviews: pendingReviews || 0,
          approvedReviews: approvedReviews || 0,
          rejectedReviews: rejectedReviews || 0,
          averageRating: Math.round(avgRating * 10) / 10,
        },
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // PATCH /admin/reviews/:id - Update review status or admin response
    if (req.method === "PATCH" && pathParts.length === 3 && pathParts[1] === "reviews") {
      const reviewId = parseInt(pathParts[2]);
      if (isNaN(reviewId)) {
        return new Response(JSON.stringify({ error: "Invalid review ID" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const MAX_PAYLOAD = 8192;
      const rawBody = await req.text();
      if (rawBody.length > MAX_PAYLOAD) {
        return new Response(JSON.stringify({ error: "Payload too large" }), {
          status: 413,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let body: Record<string, unknown>;
      try {
        body = JSON.parse(rawBody);
      } catch {
        return new Response(JSON.stringify({ error: "Invalid JSON" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { status, adminResponse } = body;
      const updateData: Record<string, unknown> = {};

      if (status !== undefined) {
        if (!["pending", "approved", "rejected", "hidden"].includes(status as string)) {
          return new Response(JSON.stringify({ error: "Invalid status" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        updateData.status = status;
        if (status === "approved") {
          updateData.published_at = new Date().toISOString();
        }
      }

      if (adminResponse !== undefined) {
        if (typeof adminResponse !== "string" || adminResponse.length > 2000) {
          return new Response(JSON.stringify({ error: "Admin response must be under 2000 characters" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        updateData.admin_response = adminResponse.trim() || null;
        updateData.admin_response_at = new Date().toISOString();
      }

      if (Object.keys(updateData).length === 0) {
        return new Response(JSON.stringify({ error: "No valid fields to update" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: review, error } = await supabase
        .from("reviews")
        .update(updateData)
        .eq("id", reviewId)
        .select("id, status")
        .single();

      if (error) throw error;

      return new Response(JSON.stringify({ review }), {
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
