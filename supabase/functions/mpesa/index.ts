import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

// Fallback KES per USD when the currency service is unreachable.
// Keep in sync with client/src/lib/currency.ts and supabase/functions/currency/index.ts.
const FALLBACK_KES_PER_USD = 129;

const ratesCache: { kesPerUsd: number; fetchedAt: number } = {
  kesPerUsd: FALLBACK_KES_PER_USD,
  fetchedAt: 0,
};

// Short cache: STK pushes in quick succession shouldn't each hit the API.
const RATES_TTL_MS = 10 * 60 * 1000;

/** Live KES-per-USD rate for charging M-Pesa amounts; falls back to the fixed rate. */
async function getKesPerUsd(): Promise<number> {
  const now = Date.now();
  if (ratesCache.fetchedAt && now - ratesCache.fetchedAt < RATES_TTL_MS) {
    return ratesCache.kesPerUsd;
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const res = await fetch(`${supabaseUrl}/functions/v1/currency?base=USD`, {
      headers: { Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")!}` },
      signal: AbortSignal.timeout(5000),
    });

    if (res.ok) {
      const data = await res.json();
      const rate = Number(data?.rates?.KES);
      if (Number.isFinite(rate) && rate > 0) {
        ratesCache.kesPerUsd = rate;
        ratesCache.fetchedAt = now;
        return rate;
      }
    }
  } catch (error) {
    console.error("Failed to fetch live KES rate, using fallback:", error);
  }

  ratesCache.fetchedAt = now;
  return ratesCache.kesPerUsd;
}

const tokenCache: { token: string; expiresAt: number } = { token: "", expiresAt: 0 };

function getBaseUrl(): string {
  const env = Deno.env.get("MPESA_ENVIRONMENT") || "sandbox";
  return env === "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";
}

function normalizePhone(phone: string): string {
  let cleaned = phone.replace(/[^0-9]/g, "");
  if (cleaned.startsWith("0")) {
    cleaned = "254" + cleaned.slice(1);
  }
  if (!cleaned.startsWith("254")) {
    cleaned = "254" + cleaned;
  }
  return cleaned;
}

async function getOAuthToken(): Promise<string> {
  const now = Date.now();
  if (tokenCache.token && tokenCache.expiresAt > now) {
    return tokenCache.token;
  }

  const consumerKey = Deno.env.get("MPESA_CONSUMER_KEY")!;
  const consumerSecret = Deno.env.get("MPESA_CONSUMER_SECRET")!;
  const baseUrl = getBaseUrl();

  const credentials = btoa(`${consumerKey}:${consumerSecret}`);

  const res = await fetch(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
    method: "GET",
    headers: {
      Authorization: `Basic ${credentials}`,
    },
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OAuth token generation failed: ${res.status} - ${errText}`);
  }

  const data = await res.json();
  tokenCache.token = data.access_token;
  tokenCache.expiresAt = now + (data.expires_in - 300) * 1000;

  return tokenCache.token;
}

function generatePassword(shortcode: string, passkey: string, timestamp: string): string {
  const dataToEncode = `${shortcode}${passkey}${timestamp}`;
  return btoa(dataToEncode);
}

function getTimestamp(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");
  return `${year}${month}${day}${hours}${minutes}${seconds}`;
}

/** Convert a USD amount to whole KES for M-Pesa (M-Pesa only accepts integer KES). */
async function usdToKes(amountUsd: number): Promise<number> {
  const rate = await getKesPerUsd();
  return Math.max(1, Math.round(amountUsd * rate));
}

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

type AuthedClient = ReturnType<typeof createClient>;

/** Create a service-role client and authenticate the caller's JWT. Throws HttpError on failure. */
async function authenticate(req: Request): Promise<{ supabase: AuthedClient; userId: string }> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    throw new HttpError(401, "Authentication required");
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);

  if (authError || !user) {
    throw new HttpError(401, "Invalid authentication");
  }

  return { supabase, userId: user.id };
}

type PaymentRow = {
  id: string;
  booking_id: number;
  user_id: number;
  amount_usd: number | string;
  method: string;
  provider: string | null;
  phone: string | null;
  external_ref: string | null;
  mpesa_checkout_request_id: string | null;
  mpesa_merchant_request_id: string | null;
  mpesa_receipt_number: string | null;
  status: string;
};

type StkPushBody = {
  phone?: string;
  amount?: number | string;
  accountReference?: string;
  paymentId?: string;
};

async function handleStkPush(req: Request, body: StkPushBody): Promise<Response> {
  const { supabase, userId } = await authenticate(req);
  const { phone, amount, paymentId } = body;

  if (!phone || !amount || !paymentId) {
    return json({ error: "Phone number, amount, and paymentId are required" }, 400);
  }

  const numAmountUsd = Number(amount);
  if (isNaN(numAmountUsd) || numAmountUsd <= 0) {
    return json({ error: "Invalid amount" }, 400);
  }

  const normalizedPhone = normalizePhone(phone);
  const phoneRegex = /^(?:254|\+?254|0)?[17]\d{8}$/;
  if (!phoneRegex.test(normalizedPhone)) {
    return json({ error: "Invalid phone number format" }, 400);
  }

  // Load the payment row the client just created, so M-Pesa IDs can be attached
  // to the correct record and matched again in the callback.
  const { data: payment, error: paymentError } = await supabase
    .from("payments")
    .select("id, booking_id, user_id, amount_usd, external_ref, status")
    .eq("id", paymentId)
    .single();

  if (paymentError || !payment) {
    return json({ error: "Payment record not found" }, 404);
  }

  const typedPayment = payment as PaymentRow;

  if (typedPayment.status !== "pending") {
    return json({ error: "Payment is not pending" }, 400);
  }

  // Verify the caller owns this payment via their profile
  const { data: profile } = await supabase
    .from("users")
    .select("id")
    .eq("auth_id", userId)
    .single();

  if (!profile || Number(profile.id) !== Number(typedPayment.user_id)) {
    return json({ error: "Payment does not belong to the authenticated user" }, 403);
  }

  const amountKes = await usdToKes(numAmountUsd);
  const shortcode = Deno.env.get("MPESA_SHORTCODE")!;
  const passkey = Deno.env.get("MPESA_PASSKEY")!;
  const baseUrl = getBaseUrl();

  const timestamp = getTimestamp();
  const password = generatePassword(shortcode, passkey, timestamp);
  const token = await getOAuthToken();

  const callbackUrl = `${Deno.env.get("SUPABASE_URL")!}/functions/v1/mpesa/callback`;
  const accountRef = typedPayment.external_ref || `PAY-${typedPayment.id}`;

  const stkRes = await fetch(`${baseUrl}/mpesa/stkpush/v1/processrequest`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: amountKes,
      PartyA: normalizedPhone,
      PartyB: shortcode,
      PhoneNumber: normalizedPhone,
      CallBackURL: callbackUrl,
      AccountReference: accountRef,
      TransactionDesc: `Payment for ${accountRef}`,
    }),
  });

  if (!stkRes.ok) {
    const errText = await stkRes.text();
    // Mark the payment failed so the user can retry cleanly
    await supabase
      .from("payments")
      .update({ status: "failed", updated_at: new Date().toISOString() })
      .eq("id", typedPayment.id);
    return json({ error: `STK push failed: ${errText}` }, 502);
  }

  const stkData = await stkRes.json();

  if (stkData.ResponseCode !== "0") {
    // Safaricom accepted the request shape but rejected the push (e.g. bad phone)
    await supabase
      .from("payments")
      .update({ status: "failed", updated_at: new Date().toISOString() })
      .eq("id", typedPayment.id);
    return json(
      { error: stkData.ResponseDescription || "STK push rejected", ResponseCode: stkData.ResponseCode },
      502
    );
  }

  // Attach the M-Pesa request IDs to the existing payment record
  const { error: dbError } = await supabase
    .from("payments")
    .update({
      mpesa_checkout_request_id: stkData.CheckoutRequestID,
      mpesa_merchant_request_id: stkData.MerchantRequestID,
      provider: "mpesa",
      phone: normalizedPhone,
      updated_at: new Date().toISOString(),
    })
    .eq("id", typedPayment.id);

  if (dbError) {
    console.error("Failed to attach M-Pesa request IDs to payment:", dbError);
  }

  return json({
    success: true,
    paymentId: typedPayment.id,
    bookingId: typedPayment.booking_id,
    amountKes,
    CheckoutRequestID: stkData.CheckoutRequestID,
    MerchantRequestID: stkData.MerchantRequestID,
    ResponseCode: stkData.ResponseCode,
    ResponseDescription: stkData.ResponseDescription,
    CustomerMessage: stkData.CustomerMessage,
  });
}

/** Fire-and-forget payment confirmation email via the email Edge Function. */
async function sendPaymentConfirmationEmail(supabase: AuthedClient, payment: PaymentRow): Promise<void> {
  try {
    const [{ data: user }, { data: booking }] = await Promise.all([
      supabase
        .from("users")
        .select("first_name, last_name, email")
        .eq("id", payment.user_id)
        .single(),
      supabase
        .from("bookings")
        .select("packages!bookings_package_id_fkey (name)")
        .eq("id", payment.booking_id)
        .single(),
    ]);

    if (!user?.email) {
      console.error("No email found for payment user:", payment.user_id);
      return;
    }

    await fetch(`${Deno.env.get("SUPABASE_URL")!}/functions/v1/email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!}`,
      },
      body: JSON.stringify({
        action: "payment-confirmation",
        clientEmail: user.email,
        clientName: `${user.first_name || ""} ${user.last_name || ""}`.trim() || "Customer",
        amount: Number(payment.amount_usd),
        method: "M-Pesa",
        reference: payment.external_ref,
        packageName: (booking as { packages?: { name?: string } } | null)?.packages?.name || "Safari package",
      }),
    });
  } catch (error) {
    // Email is non-critical; never fail the payment flow over it.
    console.error("Failed to send payment confirmation email:", error);
  }
}

/** Confirm the booking linked to a completed payment and email the client. */
async function confirmBookingForPayment(
  supabase: AuthedClient,
  payment: PaymentRow
): Promise<void> {
  const { error } = await supabase
    .from("bookings")
    .update({ status: "confirmed", updated_at: new Date().toISOString() })
    .eq("id", payment.booking_id)
    .eq("status", "pending");

  if (error) {
    console.error("Failed to confirm booking:", error);
  }

  await sendPaymentConfirmationEmail(supabase, payment);
}

async function handleCallback(req: Request): Promise<Response> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ ResultCode: 0, ResultDesc: "Invalid JSON body" }, 400);
  }

  const stkCallback = (body as { Body?: { stkCallback?: unknown } })?.Body?.stkCallback;
  if (!stkCallback) {
    return json({ ResultCode: 0, ResultDesc: "Invalid callback" }, 400);
  }

  const callback = stkCallback as {
    MerchantRequestID: string;
    CheckoutRequestID: string;
    ResultCode: number;
    ResultDesc: string;
    CallbackMetadata?: { Item?: Array<{ Name: string; Value?: unknown }> };
  };

  const checkoutRequestId = callback.CheckoutRequestID;
  const resultCode = callback.ResultCode;

  // Look up the payment by the checkout request ID stored during STK push
  const { data: payment, error: fetchError } = await supabase
    .from("payments")
    .select("*")
    .eq("mpesa_checkout_request_id", checkoutRequestId)
    .single();

  if (fetchError || !payment) {
    console.error("Payment record not found for checkout request:", checkoutRequestId, fetchError);
    return json({ ResultCode: 0, ResultDesc: "Payment record not found" }, 404);
  }

  const typedPayment = payment as PaymentRow;

  let status = "failed";
  let mpesaReceipt: string | null = null;

  if (resultCode === 0) {
    status = "completed";
    const callbackMetadata = callback.CallbackMetadata?.Item || [];
    for (const item of callbackMetadata) {
      if (item.Name === "MpesaReceiptNumber") {
        mpesaReceipt = String(item.Value ?? "");
      }
    }
  } else if (resultCode === 1032) {
    // User cancelled / dismissed the STK prompt
    status = "cancelled";
  }

  const { error: updateError } = await supabase
    .from("payments")
    .update({
      status,
      mpesa_receipt_number: mpesaReceipt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", typedPayment.id);

  if (updateError) {
    console.error("Failed to update payment:", updateError);
  }

  if (status === "completed") {
    await confirmBookingForPayment(supabase, typedPayment);
  }

  return json({ ResultCode: 0, ResultDesc: "Callback processed successfully" });
}

async function handleStatus(checkoutRequestId: string, req: Request): Promise<Response> {
  const { supabase } = await authenticate(req);

  const { data: payment, error: fetchError } = await supabase
    .from("payments")
    .select("*")
    .eq("mpesa_checkout_request_id", checkoutRequestId)
    .single();

  if (fetchError || !payment) {
    return json({ error: "Payment not found" }, 404);
  }

  const typedPayment = payment as PaymentRow;

  if (typedPayment.status === "pending") {
    const mpesaToken = await getOAuthToken();
    const baseUrl = getBaseUrl();
    const shortcode = Deno.env.get("MPESA_SHORTCODE")!;
    const passkey = Deno.env.get("MPESA_PASSKEY")!;
    const timestamp = getTimestamp();
    const password = generatePassword(shortcode, passkey, timestamp);

    const queryRes = await fetch(`${baseUrl}/mpesa/stkpushquery/v1/query`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${mpesaToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        BusinessShortCode: shortcode,
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: checkoutRequestId,
      }),
    });

    if (queryRes.ok) {
      const queryData = await queryRes.json();

      let newStatus = typedPayment.status;
      if (queryData.ResultCode === "0" || queryData.ResultCode === 0) {
        newStatus = "completed";
      } else if (queryData.ResultCode === "1032" || queryData.ResultCode === 1032) {
        newStatus = "cancelled";
      } else if (queryData.ResultCode !== undefined && queryData.ResultCode !== null && queryData.ResultCode !== "") {
        newStatus = "failed";
      }

      if (newStatus !== typedPayment.status) {
        const { error: updateError } = await supabase
          .from("payments")
          .update({
            status: newStatus,
            mpesa_receipt_number: queryData.MpesaReceiptNumber || typedPayment.mpesa_receipt_number,
            updated_at: new Date().toISOString(),
          })
          .eq("id", typedPayment.id);

        if (updateError) {
          console.error("Failed to update payment status:", updateError);
        } else {
          typedPayment.status = newStatus;
        }

        if (newStatus === "completed") {
          await confirmBookingForPayment(supabase, typedPayment);
        }
      }
    }
  }

  return json({
    paymentId: typedPayment.id,
    bookingId: typedPayment.booking_id,
    checkoutRequestId,
    status: typedPayment.status,
    amountUsd: Number(typedPayment.amount_usd),
    phone: typedPayment.phone,
    mpesaReceiptNumber: typedPayment.mpesa_receipt_number,
  });
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname;

    // POST /mpesa — action-based routing (matches the client's PaymentForm)
    if (path === "/mpesa" && req.method === "POST") {
      let body: StkPushBody & { action?: string };
      try {
        body = await req.json();
      } catch {
        return json({ error: "Invalid JSON body" }, 400);
      }

      if (body?.action === "stk-push") {
        return await handleStkPush(req, body);
      }

      return json({ error: `Unknown action: ${body?.action || "(none)"}` }, 400);
    }

    if (path === "/mpesa/callback" && req.method === "POST") {
      return await handleCallback(req);
    }

    if (path.startsWith("/mpesa/status/") && req.method === "GET") {
      const checkoutRequestId = path.split("/mpesa/status/")[1];
      if (!checkoutRequestId) {
        return json({ error: "Checkout request ID is required" }, 400);
      }
      return await handleStatus(checkoutRequestId, req);
    }

    return json({ error: "Not found" }, 404);
  } catch (error) {
    if (error instanceof HttpError) {
      return json({ error: error.message }, error.status);
    }
    console.error("M-Pesa function error:", error);
    return json({ error: (error as Error)?.message || "Internal server error" }, 500);
  }
});
