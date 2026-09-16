import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = Deno.env.get("ALLOWED_ORIGINS") || "*";
const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGINS,
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

/**
 * Fire-and-forget payment confirmation email via the email Edge Function.
 * Called with the service role so it works outside any user session.
 */
async function sendPaymentConfirmationEmail(
  payment: {
    booking_id: number;
    user_id: number;
    amount_usd: number | string;
    method: string;
    external_ref: string | null;
  }
) {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const [{ data: user }, { data: booking }] = await Promise.all([
      adminClient
        .from("users")
        .select("first_name, last_name, email")
        .eq("id", payment.user_id)
        .single(),
      adminClient
        .from("bookings")
        .select("packages!bookings_package_id_fkey (name)")
        .eq("id", payment.booking_id)
        .single(),
    ]);

    if (!user?.email) {
      console.error("No email found for payment user:", payment.user_id);
      return;
    }

    await fetch(`${supabaseUrl}/functions/v1/email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({
        action: "payment-confirmation",
        clientEmail: user.email,
        clientName: `${user.first_name || ""} ${user.last_name || ""}`.trim() || "Customer",
        amount: Number(payment.amount_usd),
        method: payment.method === "mobile_money" ? "M-Pesa" : "Card",
        reference: payment.external_ref,
        packageName: (booking as { packages?: { name?: string } } | null)?.packages?.name || "Safari package",
      }),
    });
  } catch (error) {
    // Email is non-critical; never fail the payment flow over it.
    console.error("Failed to send payment confirmation email:", error);
  }
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

    // GET /payments - List user's payments
    if (req.method === "GET" && pathParts.length === 1) {
      const { data, error } = await supabase
        .from("payments")
        .select(`
          *,
          bookings!payments_booking_id_fkey (
            travel_date,
            packages!bookings_package_id_fkey (name, slug)
          )
        `)
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const payments = data.map((p) => ({
        id: p.id,
        bookingId: Number(p.booking_id),
        userId: Number(p.user_id),
        amountUsd: Number(p.amount_usd),
        method: p.method,
        provider: p.provider,
        phone: p.phone,
        cardLast4: p.card_last4,
        cardBrand: p.card_brand,
        cardholderName: p.cardholder_name,
        externalRef: p.external_ref,
        mpesaCheckoutRequestId: p.mpesa_checkout_request_id,
        mpesaReceiptNumber: p.mpesa_receipt_number,
        status: p.status,
        packageName: p.bookings?.packages?.name,
        packageSlug: p.bookings?.packages?.slug,
        travelDate: p.bookings?.travel_date?.slice(0, 10),
        createdAt: p.created_at,
        updatedAt: p.updated_at,
      }));

      return new Response(JSON.stringify({ payments }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET /payments/by-booking/:bookingId - Get payment by booking
    if (req.method === "GET" && pathParts.length === 3 && pathParts[1] === "by-booking") {
      const bookingId = parseInt(pathParts[2]);

      const { data, error } = await supabase
        .from("payments")
        .select(`
          *,
          bookings!payments_booking_id_fkey (
            travel_date,
            packages!bookings_package_id_fkey (name, slug)
          )
        `)
        .eq("booking_id", bookingId)
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (error || !data) {
        return new Response(
          JSON.stringify({ error: "No payment found for this booking" }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const payment = {
        id: data.id,
        bookingId: Number(data.booking_id),
        userId: Number(data.user_id),
        amountUsd: Number(data.amount_usd),
        method: data.method,
        provider: data.provider,
        phone: data.phone,
        cardLast4: data.card_last4,
        cardBrand: data.card_brand,
        cardholderName: data.cardholder_name,
        externalRef: data.external_ref,
        mpesaCheckoutRequestId: data.mpesa_checkout_request_id,
        mpesaReceiptNumber: data.mpesa_receipt_number,
        status: data.status,
        packageName: data.bookings?.packages?.name,
        packageSlug: data.bookings?.packages?.slug,
        travelDate: data.bookings?.travel_date?.slice(0, 10),
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };

      return new Response(JSON.stringify({ payment }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST /payments - Create payment
    if (req.method === "POST" && pathParts.length === 1) {
      const body = await req.json();
      const { bookingId, method, provider, phone } = body;

      // Validate input
      if (!bookingId || !method) {
        return new Response(
          JSON.stringify({ error: "Missing required fields" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Only M-Pesa mobile money is supported. Card payments require a
      // PCI-compliant payment processor (e.g. Stripe) which is not yet
      // integrated. Reject card payments rather than marking them as
      // completed without actual processing.
      if (method !== "mobile_money") {
        return new Response(
          JSON.stringify({
            error: "Card payments are not yet supported. Please use M-Pesa.",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Get booking
      const { data: booking, error: bookingError } = await supabase
        .from("bookings")
        .select("id, user_id, status, total_price_usd")
        .eq("id", bookingId)
        .eq("user_id", profile.id)
        .single();

      if (bookingError || !booking) {
        return new Response(
          JSON.stringify({ error: "Booking not found" }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      if (booking.status === "cancelled") {
        return new Response(
          JSON.stringify({ error: "This booking has been cancelled" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      if (booking.status === "confirmed") {
        return new Response(
          JSON.stringify({ error: "This booking is already paid" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Cancel any stale pending payments for this booking using a
      // service-role client. The user's RLS does not allow UPDATE on
      // payments, so we use the admin client for this targeted cleanup.
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      await supabaseAdmin
        .from("payments")
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("booking_id", bookingId)
        .eq("status", "pending");

      // Create payment — mobile money only
      const externalRef = `PF-${Date.now().toString(36).toUpperCase()}-${Math.random()
        .toString(36)
        .slice(2, 8)
        .toUpperCase()}`;

      const { data: payment, error: paymentError } = await supabase
        .from("payments")
        .insert({
          booking_id: bookingId,
          user_id: profile.id,
          amount_usd: booking.total_price_usd,
          method: "mobile_money",
          provider: provider || "mpesa",
          phone,
          external_ref: externalRef,
          status: "pending",
        })
        .select()
        .single();

      if (paymentError) throw paymentError;

      return new Response(
        JSON.stringify({
          message: "Payment initiated",
          awaitingConfirmation: true,
          payment: {
            id: payment.id,
            bookingId: Number(payment.booking_id),
            userId: Number(payment.user_id),
            amountUsd: Number(payment.amount_usd),
            method: payment.method,
            provider: payment.provider,
            phone: payment.phone,
            externalRef: payment.external_ref,
            status: payment.status,
            createdAt: payment.created_at,
            updatedAt: payment.updated_at,
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
