import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const DEFAULT_RATES: Record<string, number> = {
  USD: 1,
  KES: 129,
  EUR: 0.92,
  GBP: 0.79,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const baseCurrency = url.searchParams.get("base")?.toUpperCase() || "USD";

    // Return exchange rates relative to the base currency
    const usdRate = DEFAULT_RATES[baseCurrency] || 1;
    const rates: Record<string, number> = {};

    for (const [currency, rate] of Object.entries(DEFAULT_RATES)) {
      rates[currency] = rate / usdRate;
    }

    return new Response(
      JSON.stringify({
        base: baseCurrency,
        rates,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
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
