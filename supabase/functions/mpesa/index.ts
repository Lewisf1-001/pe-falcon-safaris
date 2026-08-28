import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

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

async function initiateSTKPush(phone: string, amount: number, accountRef: string): Promise<Response> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const shortcode = Deno.env.get("MPESA_SHORTCODE")!;
  const passkey = Deno.env.get("MPESA_PASSKEY")!;
  const baseUrl = getBaseUrl();

  const normalizedPhone = normalizePhone(phone);
  const timestamp = getTimestamp();
  const password = generatePassword(shortcode, passkey, timestamp);

  const token = await getOAuthToken();

  const callbackUrl = `${supabaseUrl}/functions/v1/mpesa/callback`;

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
      Amount: amount,
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
    return new Response(JSON.stringify({ error: `STK push failed: ${errText}` }), {
      status: stkRes.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const stkData = await stkRes.json();

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { error: dbError } = await supabase.from("payments").insert({
    checkout_request_id: stkData.CheckoutRequestID,
    merchant_request_id: stkData.MerchantRequestID,
    phone_number: normalizedPhone,
    amount: amount,
    account_reference: accountRef,
    status: "pending",
    raw_response: stkData,
  });

  if (dbError) {
    console.error("Failed to store payment record:", dbError);
  }

  return new Response(
    JSON.stringify({
      success: true,
      CheckoutRequestID: stkData.CheckoutRequestID,
      MerchantRequestID: stkData.MerchantRequestID,
      ResponseCode: stkData.ResponseCode,
      ResponseDescription: stkData.ResponseDescription,
      CustomerMessage: stkData.CustomerMessage,
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}

async function handleCallback(request: Request): Promise<Response> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const passkey = Deno.env.get("MPESA_PASSKEY")!;
  const shortcode = Deno.env.get("MPESA_SHORTCODE")!;

  const body = await request.json();

  const stkCallback = body.Body?.stkCallback;
  if (!stkCallback) {
    return new Response(JSON.stringify({ ResultCode: 0, ResultDesc: "Invalid callback" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const merchantRequestId = stkCallback.MerchantRequestID;
  const checkoutRequestId = stkCallback.CheckoutRequestID;
  const resultCode = stkCallback.ResultCode;
  const resultDesc = stkCallback.ResultDesc;

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { data: payment, error: fetchError } = await supabase
    .from("payments")
    .select("*")
    .eq("checkout_request_id", checkoutRequestId)
    .single();

  if (fetchError || !payment) {
    console.error("Payment record not found:", fetchError);
    return new Response(
      JSON.stringify({ ResultCode: 0, ResultDesc: "Payment record not found" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  let status = "failed";
  let mpesaReceipt = null;
  let transactionDate = null;

  if (resultCode === 0) {
    status = "completed";
    const callbackMetadata = stkCallback.CallbackMetadata?.Item || [];
    for (const item of callbackMetadata) {
      if (item.Name === "MpesaReceiptNumber") {
        mpesaReceipt = item.Value;
      }
      if (item.Name === "TransactionDate") {
        transactionDate = item.Value;
      }
    }
  } else if (resultCode === 1032) {
    status = "cancelled";
  } else if (resultCode === 1) {
    status = "failed";
  }

  const { error: updateError } = await supabase
    .from("payments")
    .update({
      status: status,
      result_code: resultCode,
      result_desc: resultDesc,
      mpesa_receipt_number: mpesaReceipt,
      transaction_date: transactionDate,
      callback_raw: body,
      updated_at: new Date().toISOString(),
    })
    .eq("checkout_request_id", checkoutRequestId);

  if (updateError) {
    console.error("Failed to update payment:", updateError);
  }

  if (status === "completed" && payment.account_reference) {
    const { error: bookingError } = await supabase
      .from("bookings")
      .update({
        status: "confirmed",
        payment_id: payment.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", payment.account_reference)
      .eq("status", "pending");

    if (bookingError) {
      console.error("Failed to update booking:", bookingError);
    }
  }

  return new Response(
    JSON.stringify({ ResultCode: 0, ResultDesc: "Callback processed successfully" }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}

async function checkStatus(checkoutRequestId: string, authHeader: string | null): Promise<Response> {
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Authentication required" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Invalid authentication" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: payment, error: fetchError } = await supabase
    .from("payments")
    .select("*")
    .eq("checkout_request_id", checkoutRequestId)
    .single();

  if (fetchError || !payment) {
    return new Response(JSON.stringify({ error: "Payment not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (payment.status === "pending") {
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

      let newStatus = payment.status;
      if (queryData.ResponseCode === "0") {
        newStatus = "completed";
      } else if (queryData.ResponseCode === "1032") {
        newStatus = "cancelled";
      } else if (queryData.ResultCode && queryData.ResultCode !== "") {
        newStatus = "failed";
      }

      if (newStatus !== payment.status) {
        const { error: updateError } = await supabase
          .from("payments")
          .update({
            status: newStatus,
            result_code: parseInt(queryData.ResponseCode) || null,
            result_desc: queryData.ResponseDescription || null,
            updated_at: new Date().toISOString(),
          })
          .eq("checkout_request_id", checkoutRequestId);

        if (updateError) {
          console.error("Failed to update payment status:", updateError);
        }

        if (newStatus === "completed" && payment.account_reference) {
          await supabase
            .from("bookings")
            .update({
              status: "confirmed",
              payment_id: payment.id,
              updated_at: new Date().toISOString(),
            })
            .eq("id", payment.account_reference)
            .eq("status", "pending");
        }

        payment.status = newStatus;
      }
    }
  }

  return new Response(
    JSON.stringify({
      checkout_request_id: payment.checkout_request_id,
      status: payment.status,
      amount: payment.amount,
      phone_number: payment.phone_number,
      mpesa_receipt_number: payment.mpesa_receipt_number,
      result_code: payment.result_code,
      result_desc: payment.result_desc,
      created_at: payment.created_at,
      updated_at: payment.updated_at,
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname;

    if (path === "/mpesa/stk-push" && req.method === "POST") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Authentication required" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, serviceRoleKey);

      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);

      if (authError || !user) {
        return new Response(JSON.stringify({ error: "Invalid authentication" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const body = await req.json();
      const { phone, amount, accountReference } = body;

      if (!phone || !amount) {
        return new Response(
          JSON.stringify({ error: "Phone number and amount are required" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const phoneRegex = /^(?:254|\+?254|0)?[17]\d{8}$/;
      const normalizedPhone = normalizePhone(phone);
      if (!phoneRegex.test(normalizedPhone)) {
        return new Response(
          JSON.stringify({ error: "Invalid phone number format" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const numAmount = Number(amount);
      if (isNaN(numAmount) || numAmount < 1 || numAmount > 150000) {
        return new Response(
          JSON.stringify({ error: "Amount must be between 1 and 150,000" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      return await initiateSTKPush(normalizedPhone, numAmount, accountReference || user.id);
    }

    if (path === "/mpesa/callback" && req.method === "POST") {
      return await handleCallback(req);
    }

    if (path.startsWith("/mpesa/status/") && req.method === "GET") {
      const checkoutRequestId = path.split("/mpesa/status/")[1];
      if (!checkoutRequestId) {
        return new Response(
          JSON.stringify({ error: "Checkout request ID is required" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const authHeader = req.headers.get("Authorization");
      return await checkStatus(checkoutRequestId, authHeader);
    }

    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("M-Pesa function error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
