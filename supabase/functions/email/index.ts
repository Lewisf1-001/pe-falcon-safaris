import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  paymentFailedHtml as sharedPaymentFailedHtml,
  resolveNotificationEmailBranch,
} from "../_shared/notification-triggers.ts";

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

function quotationSentHtml(data: {
  clientName: string;
  title: string;
  totalUsd: number;
  validUntil: string;
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
<div class="content"><h2>Your Safari Quotation is Ready</h2>
<p>Dear ${escapeHtml(data.clientName)},</p>
<p>We have prepared a customized safari quotation for you.</p>
<div class="highlight">
<p><strong>Quotation:</strong> ${escapeHtml(data.title)}</p>
<p><strong>Total:</strong> USD ${Number(data.totalUsd).toFixed(2)}</p>
<p><strong>Valid until:</strong> ${escapeHtml(data.validUntil)}</p>
</div>
<p>Please log in to your dashboard to view the full details and respond to this quotation.</p>
<p>Warm regards,<br><strong>PE Falcon Safaris Team</strong></p></div>
<div class="footer"><p>&copy; ${new Date().getFullYear()} PE Falcon Safaris. All rights reserved.</p></div>
</div></body></html>`;
}

function inquiryReceivedHtml(data: {
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
  packageName?: string;
  destinationName?: string;
  travelDate?: string;
  guests?: number;
}) {
  const details: string[] = [];
  if (data.subject) details.push(`<p><strong>Subject:</strong> ${escapeHtml(data.subject)}</p>`);
  if (data.packageName) details.push(`<p><strong>Package:</strong> ${escapeHtml(data.packageName)}</p>`);
  if (data.destinationName) details.push(`<p><strong>Destination:</strong> ${escapeHtml(data.destinationName)}</p>`);
  if (data.travelDate) details.push(`<p><strong>Travel Date:</strong> ${escapeHtml(data.travelDate)}</p>`);
  if (data.guests) details.push(`<p><strong>Guests:</strong> ${data.guests}</p>`);
  if (data.phone) details.push(`<p><strong>Phone:</strong> ${escapeHtml(data.phone)}</p>`);

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background:#f4f4f4;margin:0;padding:0}
.container{max-width:600px;margin:0 auto;background:#fff}
.header{background:#1a3c2a;padding:24px;text-align:center}
.header h1{color:#d4a843;margin:0;font-size:24px}
.content{padding:32px 24px;color:#333}
.highlight{background:#fff7e6;border-left:4px solid #d4a843;padding:16px;margin:16px 0;border-radius:4px}
.message-box{background:#f0f7f0;border-left:4px solid #1a3c2a;padding:16px;margin:16px 0;border-radius:4px;white-space:pre-wrap}
.footer{background:#1a3c2a;padding:16px;text-align:center;color:#d4a843;font-size:12px}</style></head>
<body><div class="container"><div class="header"><h1>PE Falcon Safaris</h1></div>
<div class="content"><h2>New Website Inquiry</h2>
<p>A new inquiry has been submitted through the website contact form.</p>
<div class="highlight">
<p><strong>Name:</strong> ${escapeHtml(data.name)}</p>
<p><strong>Email:</strong> ${escapeHtml(data.email)}</p>
${details.join("\n")}
</div>
<div class="message-box"><strong>Message:</strong>\n${escapeHtml(data.message)}</div>
<p>Please respond to this inquiry within 24 hours.</p>
<div class="footer"><p>&copy; ${new Date().getFullYear()} PE Falcon Safaris. All rights reserved.</p></div>
</div></body></html>`;
}

function quotationAcceptedHtml(data: {
  clientName: string;
  title: string;
  totalUsd: number;
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
<div class="content"><h2>Quotation Accepted!</h2>
<p>A customer has accepted a quotation.</p>
<div class="highlight">
<p><strong>Client:</strong> ${escapeHtml(data.clientName)}</p>
<p><strong>Quotation:</strong> ${escapeHtml(data.title)}</p>
<p><strong>Total:</strong> USD ${Number(data.totalUsd).toFixed(2)}</p>
</div>
<p>Please follow up to arrange payment and confirm the booking.</p>
<p>Warm regards,<br><strong>PE Falcon Safaris System</strong></p></div>
<div class="footer"><p>&copy; ${new Date().getFullYear()} PE Falcon Safaris. All rights reserved.</p></div>
</div></body></html>`;
}

function paymentFailedHtml(data: {
  clientName: string;
  amount: number;
  packageName: string;
}) {
  return sharedPaymentFailedHtml(data);
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

    const MAX_PAYLOAD_BYTES = 10240;
    const rawBody = await req.text();
    if (rawBody.length > MAX_PAYLOAD_BYTES) {
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

      case "inquiry-received": {
        // --- Server-side validation of untrusted input ---
        const validationErrors: string[] = [];
        const {
          name,
          email,
          phone,
          subject,
          message,
          packageName,
          destinationName,
          travelDate,
          guests,
        } = body;

        // name: required, string, max 100 chars
        if (typeof name !== "string" || name.trim().length === 0) {
          validationErrors.push("Name is required.");
        } else if (name.trim().length > 100) {
          validationErrors.push("Name must be under 100 characters.");
        }

        // email: required, valid format, max 254 chars
        if (typeof email !== "string" || email.trim().length === 0) {
          validationErrors.push("Email is required.");
        } else if (email.trim().length > 254) {
          validationErrors.push("Email must be under 254 characters.");
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
          validationErrors.push("Invalid email format.");
        }

        // phone: optional, string, max 20 chars, digits-only check
        if (phone !== undefined && phone !== null && phone !== "") {
          if (typeof phone !== "string") {
            validationErrors.push("Phone must be a string.");
          } else if (phone.length > 20) {
            validationErrors.push("Phone must be under 20 characters.");
          }
        }

        // subject: optional, string, max 200 chars
        if (subject !== undefined && subject !== null && subject !== "") {
          if (typeof subject !== "string") {
            validationErrors.push("Subject must be a string.");
          } else if (subject.length > 200) {
            validationErrors.push("Subject must be under 200 characters.");
          }
        }

        // message: required, string, max 2000 chars
        if (typeof message !== "string" || message.trim().length === 0) {
          validationErrors.push("Message is required.");
        } else if (message.trim().length > 2000) {
          validationErrors.push("Message must be under 2000 characters.");
        }

        // packageName: optional, string, max 200 chars
        if (packageName !== undefined && packageName !== null && packageName !== "") {
          if (typeof packageName !== "string") {
            validationErrors.push("Package must be a string.");
          } else if (packageName.length > 200) {
            validationErrors.push("Package must be under 200 characters.");
          }
        }

        // destinationName: optional, string, max 200 chars
        if (destinationName !== undefined && destinationName !== null && destinationName !== "") {
          if (typeof destinationName !== "string") {
            validationErrors.push("Destination must be a string.");
          } else if (destinationName.length > 200) {
            validationErrors.push("Destination must be under 200 characters.");
          }
        }

        // travelDate: optional, valid ISO date string
        if (travelDate !== undefined && travelDate !== null && travelDate !== "") {
          if (typeof travelDate !== "string") {
            validationErrors.push("Travel date must be a string.");
          } else {
            const d = new Date(travelDate);
            if (isNaN(d.getTime())) {
              validationErrors.push("Invalid travel date.");
            }
          }
        }

        // guests: optional, integer, 1-50
        if (guests !== undefined && guests !== null) {
          const guestNum = Number(guests);
          if (!Number.isInteger(guestNum) || guestNum < 1 || guestNum > 50) {
            validationErrors.push("Guests must be an integer between 1 and 50.");
          }
        }

        if (validationErrors.length > 0) {
          return new Response(
            JSON.stringify({ error: "Validation failed", details: validationErrors }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }

        // Notify all active admins
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

        const html = inquiryReceivedHtml({
          name: String(name).trim(),
          email: String(email).trim(),
          phone: typeof phone === "string" ? phone.trim() : undefined,
          subject: typeof subject === "string" ? subject.trim() : undefined,
          message: String(message).trim(),
          packageName: typeof packageName === "string" ? packageName.trim() : undefined,
          destinationName: typeof destinationName === "string" ? destinationName.trim() : undefined,
          travelDate: typeof travelDate === "string" ? travelDate.trim() : undefined,
          guests: typeof guests === "number" ? guests : undefined,
        });

        const inquiryResults = await Promise.all(
          admins.map((admin) => sendEmail(admin.email, `New Website Inquiry - PE Falcon Safaris`, html))
        );

        result = { success: inquiryResults.every((r) => r.success), sent: inquiryResults.length };
        break;
      }

      case "quotation-sent": {
        const { quotationId } = body;
        if (!quotationId) {
          return new Response(JSON.stringify({ error: "Missing quotationId" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Fetch quotation with user info
        const { data: quotation } = await supabase
          .from("quotations")
          .select("title, total_usd, valid_until, user_id")
          .eq("id", quotationId)
          .single();

        if (!quotation) {
          return new Response(JSON.stringify({ error: "Quotation not found" }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { data: user } = await supabase
          .from("users")
          .select("first_name, last_name, email")
          .eq("id", quotation.user_id)
          .single();

        if (!user?.email) {
          return new Response(JSON.stringify({ message: "No customer email" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const clientName = `${user.first_name || ""} ${user.last_name || ""}`.trim() || "Customer";
        const html = quotationSentHtml({
          clientName,
          title: quotation.title,
          totalUsd: Number(quotation.total_usd),
          validUntil: quotation.valid_until?.slice(0, 10) || "N/A",
        });

        result = await sendEmail(user.email, `Your Safari Quotation - ${quotation.title}`, html);
        break;
      }

      case "quotation-accepted": {
        const { quotationId: qId } = body;
        if (!qId) {
          return new Response(JSON.stringify({ error: "Missing quotationId" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { data: q } = await supabase
          .from("quotations")
          .select("title, total_usd, user_id")
          .eq("id", qId)
          .single();

        if (!q) {
          return new Response(JSON.stringify({ error: "Quotation not found" }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { data: qUser } = await supabase
          .from("users")
          .select("first_name, last_name")
          .eq("id", q.user_id)
          .single();

        const clientName = qUser ? `${qUser.first_name || ""} ${qUser.last_name || ""}`.trim() || "Customer" : "Customer";

        // Notify all active admins
        const { data: adminList } = await supabase
          .from("admins")
          .select("email")
          .eq("status", "active")
          .not("email", "is", null);

        if (adminList && adminList.length > 0) {
          const html = quotationAcceptedHtml({
            clientName,
            title: q.title,
            totalUsd: Number(q.total_usd),
          });

          const results = await Promise.all(
            adminList.map((a) => sendEmail(a.email, `Quotation Accepted - ${q.title}`, html))
          );

          result = { success: results.every((r) => r.success), sent: results.length };
        } else {
          result = { success: true, sent: 0 };
        }
        break;
      }

      case "notification-email": {
        // Internal action: send an email for a notification event.
        // Called by the notifications Edge Function. Requires service-role auth.
        if (!isInternalCall) {
          return new Response(JSON.stringify({ error: "Forbidden" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { notificationType, userEmail, userName, referenceType, referenceId } = body;

        if (!notificationType || !userEmail) {
          return new Response(
            JSON.stringify({ error: "Missing required fields: notificationType, userEmail" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        let emailSubject = "";
        let html = "";

        const emailBranch = resolveNotificationEmailBranch(String(notificationType));
        if (emailBranch === "skip") {
          result = { success: true, sent: 0, skipped: true };
          break;
        }

        switch (emailBranch) {
          case "booking_received": {
            // Fetch booking + package details
            const { data: bookingData } = await supabase
              .from("bookings")
              .select("travel_date, guests, total_price_usd, package_id, packages!bookings_package_id_fkey (name)")
              .eq("id", referenceId)
              .single();

            if (!bookingData) {
              result = { success: false, error: "Booking not found" };
              break;
            }

            const pkgName = (bookingData as { packages?: { name?: string } }).packages?.name || "Safari Package";
            emailSubject = `Booking Confirmed - ${pkgName}`;
            html = bookingConfirmationHtml({
              clientName: userName || "Customer",
              packageName: pkgName,
              travelDate: bookingData.travel_date?.slice(0, 10) || "N/A",
              guests: bookingData.guests || 0,
              total: Number(bookingData.total_price_usd) || 0,
            });
            break;
          }

          case "payment_received": {
            // Fetch payment + booking + package details
            const { data: paymentData } = await supabase
              .from("payments")
              .select("amount_usd, external_ref, booking_id")
              .eq("booking_id", referenceId)
              .eq("status", "completed")
              .order("created_at", { ascending: false })
              .limit(1)
              .single();

            if (!paymentData) {
              result = { success: false, error: "Payment not found" };
              break;
            }

            const { data: payBooking } = await supabase
              .from("bookings")
              .select("packages!bookings_package_id_fkey (name)")
              .eq("id", paymentData.booking_id)
              .single();

            const payPkgName = (payBooking as { packages?: { name?: string } } | null)?.packages?.name || "Safari Package";
            emailSubject = "Payment Received - PE Falcon Safaris";
            html = paymentConfirmationHtml({
              clientName: userName || "Customer",
              amount: Number(paymentData.amount_usd),
              method: "M-Pesa",
              reference: paymentData.external_ref || "N/A",
              packageName: payPkgName,
            });
            break;
          }

          case "payment_failed": {
            // Fetch booking + package details
            const { data: failBooking } = await supabase
              .from("bookings")
              .select("packages!bookings_package_id_fkey (name)")
              .eq("id", referenceId)
              .single();

            const failPkgName = (failBooking as { packages?: { name?: string } } | null)?.packages?.name || "Safari Package";

            // Fetch the latest failed payment for this booking
            const { data: failPayment } = await supabase
              .from("payments")
              .select("amount_usd")
              .eq("booking_id", referenceId)
              .eq("status", "failed")
              .order("created_at", { ascending: false })
              .limit(1)
              .single();

            const failAmount = failPayment ? Number(failPayment.amount_usd) : 0;

            emailSubject = "Payment Not Processed - PE Falcon Safaris";
            html = paymentFailedHtml({
              clientName: userName || "Customer",
              amount: failAmount,
              packageName: failPkgName,
            });
            break;
          }
        }

        if (html && emailSubject) {
          const emailResult = await sendEmail(userEmail, emailSubject, html);
          result = { success: emailResult.success, sent: emailResult.success ? 1 : 0, error: emailResult.error };
        } else if (!result) {
          result = { success: true, sent: 0, skipped: true };
        }
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
