import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = Deno.env.get("ALLOWED_ORIGINS") || "*";
const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGINS,
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") || "noreply@pefalconsafaris.com";
const CLIENT_URL = Deno.env.get("CLIENT_URL") || "https://pefalconsafaris.com";

// ============================================================
// HTML escaping — prevents injection of user-controlled values
// into email templates.
// ============================================================
function escapeHtml(str: unknown): string {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ============================================================
// Simple in-memory rate limiter.
// Limits each IP to at most `limit` requests within a `windowMs`
// sliding window. Resets on Deno isolate restart (acceptable for
// a single-tenant Edge Function).
// ============================================================
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 10; // max 10 emails per minute per IP

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  entry.count++;
  return entry.count > RATE_LIMIT_MAX;
}

function bookingConfirmationHtml(data: {
  clientName: string;
  packageName: string;
  travelDate: string;
  guests: number;
  total: number;
}) {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background:#f4f4f4;margin:0;padding:0}
.container{max-width:600px;margin:0 auto;background:#fff}
.header{background:#1a3c2a;padding:24px;text-align:center}
.header h1{color:#d4a843;margin:0;font-size:24px}
.content{padding:32px 24px;color:#333}
.highlight{background:#f0f7f0;border-left:4px solid #1a3c2a;padding:16px;margin:16px 0;border-radius:4px}
.footer{background:#1a3c2a;padding:16px;text-align:center;color:#d4a843;font-size:12px}
.btn{display:inline-block;background:#1a3c2a;color:#fff;padding:12px 24px;text-decoration:none;border-radius:4px;font-weight:bold;margin-top:16px}</style></head>
<body><div class="container"><div class="header"><h1>PE Falcon Safaris</h1></div>
<div class="content"><h2>Booking Confirmed!</h2>
<p>Dear ${escapeHtml(data.clientName)},</p>
<p>Your safari booking has been received. Here are your booking details:</p>
<div class="highlight">
<p><strong>Package:</strong> ${escapeHtml(data.packageName)}</p>
<p><strong>Travel Date:</strong> ${escapeHtml(data.travelDate)}</p>
<p><strong>Guests:</strong> ${data.guests}</p>
<p><strong>Total:</strong> USD ${Number(data.total).toFixed(2)}</p>
</div>
<p>Our team will review your booking and send you a confirmation shortly.</p>
<p>If you have any questions, please don't hesitate to contact us.</p>
<p>Warm regards,<br><strong>PE Falcon Safaris Team</strong></p></div>
<div class="footer"><p>&copy; ${new Date().getFullYear()} PE Falcon Safaris. All rights reserved.</p></div>
</div></body></html>`;
}

function paymentConfirmationHtml(data: {
  clientName: string;
  amount: number;
  method: string;
  reference: string;
  packageName: string;
}) {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background:#f4f4f4;margin:0;padding:0}
.container{max-width:600px;margin:0 auto;background:#fff}
.header{background:#1a3c2a;padding:24px;text-align:center}
.header h1{color:#d4a843;margin:0;font-size:24px}
.content{padding:32px 24px;color:#333}
.highlight{background:#f0f7f0;border-left:4px solid #1a3c2a;padding:16px;margin:16px 0;border-radius:4px}
.footer{background:#1a3c2a;padding:16px;text-align:center;color:#d4a843;font-size:12px}</style></head>
<body><div class="container"><div class="header"><h1>PE Falcon Safaris</h1></div>
<div class="content"><h2>Payment Received</h2>
<p>Dear ${escapeHtml(data.clientName)},</p>
<p>We have received your payment for <strong>${escapeHtml(data.packageName)}</strong>.</p>
<div class="highlight">
<p><strong>Amount:</strong> USD ${Number(data.amount).toFixed(2)}</p>
<p><strong>Method:</strong> ${escapeHtml(data.method)}</p>
<p><strong>Reference:</strong> ${escapeHtml(data.reference)}</p>
</div>
<p>Your booking is now confirmed. We look forward to welcoming you on your safari!</p>
<p>Warm regards,<br><strong>PE Falcon Safaris Team</strong></p></div>
<div class="footer"><p>&copy; ${new Date().getFullYear()} PE Falcon Safaris. All rights reserved.</p></div>
</div></body></html>`;
}

function adminNotificationHtml(data: {
  clientName: string;
  clientEmail: string;
  packageName: string;
  travelDate: string;
  guests: number;
  total: number;
}) {
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
<div class="content"><h2>New Booking Alert</h2>
<p>A new booking has been submitted and requires your attention.</p>
<div class="highlight">
<p><strong>Client:</strong> ${escapeHtml(data.clientName)} (${escapeHtml(data.clientEmail)})</p>
<p><strong>Package:</strong> ${escapeHtml(data.packageName)}</p>
<p><strong>Travel Date:</strong> ${escapeHtml(data.travelDate)}</p>
<p><strong>Guests:</strong> ${data.guests}</p>
<p><strong>Total:</strong> USD ${Number(data.total).toFixed(2)}</p>
</div>
<p>Please review this booking in the admin dashboard.</p></div>
<div class="footer"><p>&copy; ${new Date().getFullYear()} PE Falcon Safaris. All rights reserved.</p></div>
</div></body></html>`;
}

async function sendEmail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set. Email not sent.");
    return { success: false, error: "Email service not configured" };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [to],
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Resend API error:", error);
    return { success: false, error };
  }

  return { success: true };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify caller is authenticated: either an end user's JWT, or the
    // service-role key when called internally by another Edge Function.
    const authHeader = req.headers.get("Authorization");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const isInternalCall = authHeader === `Bearer ${serviceRoleKey}`;

    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!isInternalCall) {
      const supabaseAuth = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });

      const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
      if (authError || !user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Rate limit external (user-initiated) requests to prevent abuse.
      // Internal calls from other Edge Functions are exempt.
      const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
      if (isRateLimited(clientIp)) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const body = await req.json();
    const { action } = body;

    let result;

    switch (action) {
      case "booking-confirmation": {
        const { clientEmail, clientName, packageName, travelDate, guests, total } = body;
        if (!clientEmail || !clientName || !packageName) {
          return new Response(JSON.stringify({ error: "Missing required fields" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const html = bookingConfirmationHtml({ clientName, packageName, travelDate, guests, total });
        result = await sendEmail(clientEmail, `Booking Confirmed - ${packageName}`, html);
        break;
      }

      case "payment-confirmation": {
        const { clientEmail, clientName, amount, method, reference, packageName } = body;
        if (!clientEmail || !clientName || !amount) {
          return new Response(JSON.stringify({ error: "Missing required fields" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const html = paymentConfirmationHtml({ clientName, amount, method, reference, packageName });
        result = await sendEmail(clientEmail, `Payment Received - PE Falcon Safaris`, html);
        break;
      }

      case "admin-notification": {
        // Get admin emails
        const { data: admins } = await supabase
          .from("admins")
          .select("email")
          .eq("status", "active")
          .not("email", "is", null);

        if (!admins || admins.length === 0) {
          return new Response(JSON.stringify({ message: "No admin users to notify" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { clientName, clientEmail, packageName, travelDate, guests, total } = body;
        const html = adminNotificationHtml({ clientName, clientEmail, packageName, travelDate, guests, total });

        const results = await Promise.all(
          admins.map((admin) => sendEmail(admin.email, `New Booking Alert - PE Falcon Safaris`, html))
        );

        result = { success: results.every((r) => r.success), sent: results.length };
        break;
      }

      default:
        return new Response(JSON.stringify({ error: "Unknown action" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    return new Response(JSON.stringify(result), {
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
