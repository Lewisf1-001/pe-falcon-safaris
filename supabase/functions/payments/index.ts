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
      const { bookingId, method, provider, phone, cardholderName, cardNumber, expiryMonth, expiryYear, cvv } = body;

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

      // Get booking
      const { data: booking, error: bookingError } = await supabase
        .from("bookings")
        .select("*")
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

      // Cancel any pending payments
      await supabase
        .from("payments")
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("booking_id", bookingId)
        .eq("status", "pending");

      // Create payment
      const externalRef = `PF-${Date.now().toString(36).toUpperCase()}-${Math.random()
        .toString(36)
        .slice(2, 8)
        .toUpperCase()}`;

      let cardLast4 = null;
      let cardBrand = null;
      let paymentStatus = "completed";

      if (method === "card" && cardNumber) {
        cardLast4 = cardNumber.slice(-4);
        if (/^4/.test(cardNumber)) cardBrand = "Visa";
        else if (/^5[1-5]/.test(cardNumber) || /^2[2-7]/.test(cardNumber)) cardBrand = "Mastercard";
        else if (/^3[47]/.test(cardNumber)) cardBrand = "Amex";
      }

      if (method === "mobile_money") {
        paymentStatus = "pending";
      }

      const { data: payment, error: paymentError } = await supabase
        .from("payments")
        .insert({
          booking_id: bookingId,
          user_id: profile.id,
          amount_usd: booking.total_price_usd,
          method,
          provider,
          phone,
          card_last4: cardLast4,
          card_brand: cardBrand,
          cardholder_name: cardholderName,
          external_ref: externalRef,
          status: paymentStatus,
        })
        .select()
        .single();

      if (paymentError) throw paymentError;

      // Update booking status if completed
      if (paymentStatus === "completed") {
        await supabase
          .from("bookings")
          .update({ status: "confirmed", updated_at: new Date().toISOString() })
          .eq("id", bookingId);
      }

      return new Response(
        JSON.stringify({
          message: paymentStatus === "completed" ? "Payment successful" : "Payment initiated",
          awaitingConfirmation: paymentStatus === "pending",
          payment: {
            id: payment.id,
            bookingId: Number(payment.booking_id),
            userId: Number(payment.user_id),
            amountUsd: Number(payment.amount_usd),
            method: payment.method,
            provider: payment.provider,
            phone: payment.phone,
            cardLast4: payment.card_last4,
            cardBrand: payment.card_brand,
            cardholderName: payment.cardholder_name,
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
