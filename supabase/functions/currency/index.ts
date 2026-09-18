import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

// Fallback rates used when the live provider is unreachable.
// Keep in sync with client/src/lib/currency.ts and admin/src/lib/currency.ts.
const DEFAULT_RATES: Record<string, number> = {
  USD: 1,
  KES: 129,
  EUR: 0.92,
  GBP: 0.79,
};

const RATES_API_URL = "https://open.er-api.com/v6/latest/USD";

// Free API updates daily; cache for an hour to stay well within limits.
const CACHE_TTL_MS = 60 * 60 * 1000;

const ratesCache: { rates: Record<string, number> | null; fetchedAt: number } = {
  rates: null,
  fetchedAt: 0,
};

async function fetchLiveUsdRates(): Promise<Record<string, number> | null> {
  const now = Date.now();
  if (ratesCache.rates && now - ratesCache.fetchedAt < CACHE_TTL_MS) {
    return ratesCache.rates;
  }

  try {
    const res = await fetch(RATES_API_URL, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`Rates API responded ${res.status}`);

    const data = await res.json();
    if (data?.result !== "success" || typeof data.rates !== "object") {
      throw new Error("Unexpected rates API response");
    }

    const live: Record<string, number> = {};
    for (const currency of Object.keys(DEFAULT_RATES)) {
      const rate = Number(data.rates[currency]);
      if (!Number.isFinite(rate) || rate <= 0) {
        throw new Error(`Missing rate for ${currency}`);
      }
      live[currency] = rate;
    }

    ratesCache.rates = live;
    ratesCache.fetchedAt = now;
    return live;
  } catch (error) {
    console.error("Live rates fetch failed, using fallback:", error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const baseCurrency = url.searchParams.get("base")?.toUpperCase() || "USD";

    const liveRates = await fetchLiveUsdRates();
    const usdRates = liveRates || DEFAULT_RATES;
    const source = liveRates ? "live" : "fallback";

    const usdRate = usdRates[baseCurrency] || usdRates.USD || 1;
    const rates: Record<string, number> = {};

    for (const [currency, rate] of Object.entries(usdRates)) {
      rates[currency] = rate / usdRate;
    }

    return new Response(
      JSON.stringify({
        base: baseCurrency,
        rates,
        source,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          // Rates change at most daily; let edge/browser caches hold them briefly.
          "Cache-Control": "public, max-age=900",
        },
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
