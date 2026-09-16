"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useCurrency } from "@/components/currency/CurrencyProvider";
import { createClient } from "@/lib/supabase";
import { getAuthToken } from "@/lib/auth";
import type { Quotation, QuotationStatus } from "@/types/quotation";

const statusStyles: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  sent: "bg-blue-100 text-blue-700",
  viewed: "bg-purple-100 text-purple-700",
  accepted: "bg-green-100 text-green-700",
  declined: "bg-red-100 text-red-700",
  expired: "bg-orange-100 text-orange-700",
  cancelled: "bg-gray-100 text-gray-500",
};

const ACTIONABLE_STATUSES: QuotationStatus[] = ["sent", "viewed"];

export default function DashboardQuotations() {
  const { format } = useCurrency();
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!getAuthToken()) return;

    async function loadQuotations() {
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

        const response = await fetch(`${supabaseUrl}/functions/v1/quotations`, {
          headers: {
            Authorization: `Bearer ${session?.access_token || ""}`,
            apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          },
        });

        if (!response.ok) throw new Error("Failed to load quotations");
        const data = await response.json();
        setQuotations(data.quotations || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load quotations.");
      } finally {
        setIsLoading(false);
      }
    }

    loadQuotations();
  }, []);

  if (isLoading) {
    return (
      <section className="rounded-xl bg-white p-6 shadow-lg sm:p-8">
        <h2 className="text-lg font-semibold text-forest">Quotations</h2>
        <p className="mt-4 text-sm text-gray-500">Loading quotations...</p>
      </section>
    );
  }

  if (quotations.length === 0) return null;

  return (
    <section className="rounded-xl bg-white p-6 shadow-lg sm:p-8">
      <h2 className="text-lg font-semibold text-forest">Quotations</h2>
      <p className="mt-1 text-sm text-gray-500">
        {quotations.length} quotation{quotations.length === 1 ? "" : "s"}
      </p>

      {error && (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="mt-4 space-y-3">
        {quotations.map((q) => (
          <Link
            key={q.id}
            href={`/quotations/${q.id}`}
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-100 p-4 transition-colors hover:border-gray-200 hover:bg-gray-50/50"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="truncate font-medium text-forest">{q.title}</h3>
                <span
                  className={`inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusStyles[q.status] || "bg-gray-100 text-gray-600"}`}
                >
                  {q.status}
                </span>
                {ACTIONABLE_STATUSES.includes(q.status) && (
                  <span className="inline-flex shrink-0 rounded-full bg-gold/20 px-2.5 py-0.5 text-xs font-medium text-forest">
                    Action required
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-gray-500">
                {q.packageName ? `${q.packageName} · ` : ""}
                {q.travelDate} · {q.guests} guest{q.guests === 1 ? "" : "s"}
              </p>
              <p className="mt-1 text-xs text-gray-400">
                Valid until {q.validUntil}
              </p>
            </div>
            <p className="shrink-0 text-sm font-medium text-forest">
              {format(q.totalUsd)}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
