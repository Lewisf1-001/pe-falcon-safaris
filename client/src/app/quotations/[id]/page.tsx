"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useCurrency } from "@/components/currency/CurrencyProvider";
import { createClient } from "@/lib/supabase";
import { getAuthToken } from "@/lib/auth";
import Navbar from "@/components/layout/Navbar";
import type { Quotation, QuotationItem } from "@/types/quotation";

const statusStyles: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  sent: "bg-blue-100 text-blue-700",
  viewed: "bg-purple-100 text-purple-700",
  accepted: "bg-green-100 text-green-700",
  declined: "bg-red-100 text-red-700",
  expired: "bg-orange-100 text-orange-700",
  cancelled: "bg-gray-100 text-gray-500",
};

export default function QuotationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { format } = useCurrency();
  const quotationId = params.id;

  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!getAuthToken()) {
      router.replace(`/login?next=${encodeURIComponent(`/quotations/${quotationId}`)}`);
      return;
    }

    async function load() {
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

        const res = await fetch(`${supabaseUrl}/functions/v1/quotations/${quotationId}`, {
          headers: {
            Authorization: `Bearer ${session?.access_token || ""}`,
            apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          },
        });

        if (!res.ok) throw new Error("Quotation not found");
        const data = await res.json();
        setQuotation(data.quotation);
      } catch {
        setError("Unable to load quotation.");
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [quotationId, router]);

  async function handleAccept() {
    if (!confirm("Accept this quotation? This will proceed to booking.")) return;
    setIsProcessing(true);
    setActionError("");
    setActionMessage("");
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

      const res = await fetch(`${supabaseUrl}/functions/v1/quotations/${quotationId}/accept`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token || ""}`,
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setActionMessage("Quotation accepted! Redirecting to your bookings...");
      setQuotation((prev) => prev ? { ...prev, status: "accepted" } : null);

      setTimeout(() => router.push("/bookings"), 2000);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to accept.");
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleDecline() {
    if (!confirm("Decline this quotation?")) return;
    setIsProcessing(true);
    setActionError("");
    setActionMessage("");
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

      const res = await fetch(`${supabaseUrl}/functions/v1/quotations/${quotationId}/decline`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token || ""}`,
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setActionMessage("Quotation declined.");
      setQuotation((prev) => prev ? { ...prev, status: "declined" } : null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to decline.");
    } finally {
      setIsProcessing(false);
    }
  }

  if (isLoading) {
    return (
      <>
        <Navbar />
        <main className="hero-stripes min-h-[calc(100vh-64px)] py-12 sm:py-16">
          <div className="mx-auto w-full max-w-3xl px-6">
            <p className="text-sm text-white/70">Loading quotation...</p>
          </div>
        </main>
      </>
    );
  }

  if (!quotation) {
    return (
      <>
        <Navbar />
        <main className="hero-stripes min-h-[calc(100vh-64px)] py-12 sm:py-16">
          <div className="mx-auto w-full max-w-3xl px-6 space-y-4 text-center">
            <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error || "Quotation not found."}
            </p>
            <Link href="/dashboard" className="text-sm font-medium text-champagne hover:underline">
              Back to dashboard
            </Link>
          </div>
        </main>
      </>
    );
  }

  const isActionable = ["sent", "viewed"].includes(quotation.status);

  return (
    <>
      <Navbar />
      <main className="hero-stripes min-h-[calc(100vh-64px)] py-12 sm:py-16">
        <div className="mx-auto w-full max-w-3xl px-6">
          <Link href="/dashboard" className="text-sm text-white/60 hover:text-white/90 hover:underline">
            Dashboard
          </Link>

          <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-white">{quotation.title}</h1>
              <p className="mt-1 text-sm text-white/60">Reference: #{quotation.id}</p>
            </div>
            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-medium capitalize ${statusStyles[quotation.status] || "bg-gray-100 text-gray-600"}`}
            >
              {quotation.status}
            </span>
          </div>

          {actionMessage && (
            <p className="mt-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              {actionMessage}
            </p>
          )}

          {actionError && (
            <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {actionError}
            </p>
          )}

          <div className="mt-6 rounded-xl bg-white p-6 shadow-lg sm:p-8">
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-4 border-b border-gray-50 pb-3">
                <dt className="text-gray-500">Package</dt>
                <dd className="font-medium text-forest">{quotation.packageName || "Custom"}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-gray-50 pb-3">
                <dt className="text-gray-500">Travel date</dt>
                <dd className="font-medium text-forest">{quotation.travelDate}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-gray-50 pb-3">
                <dt className="text-gray-500">Guests</dt>
                <dd className="font-medium text-forest">{quotation.guests}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-gray-50 pb-3">
                <dt className="text-gray-500">Valid until</dt>
                <dd className="font-medium text-forest">{quotation.validUntil}</dd>
              </div>
              {quotation.description && (
                <div className="pt-1">
                  <dt className="text-gray-500">Description</dt>
                  <dd className="mt-1 text-forest">{quotation.description}</dd>
                </div>
              )}
            </dl>
          </div>

          {quotation.items && quotation.items.length > 0 && (
            <div className="mt-6 rounded-xl bg-white p-6 shadow-lg sm:p-8">
              <h2 className="text-lg font-semibold text-forest">Quotation Items</h2>
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-gray-500">
                      <th className="px-2 py-3 font-medium">Description</th>
                      <th className="px-2 py-3 font-medium">Qty</th>
                      <th className="px-2 py-3 font-medium text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quotation.items.map((item) => (
                      <tr key={item.id} className="border-b border-gray-50 last:border-0">
                        <td className="px-2 py-3 text-forest">{item.description}</td>
                        <td className="px-2 py-3 text-gray-600">{item.quantity}</td>
                        <td className="px-2 py-3 text-right font-medium text-forest">
                          {format(item.amountUsd)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 border-t border-gray-100 pt-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="font-medium text-forest">{format(quotation.subtotalUsd)}</span>
                </div>
                {quotation.discountUsd > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Discount</span>
                    <span className="font-medium text-green-700">-{format(quotation.discountUsd)}</span>
                  </div>
                )}
                {quotation.taxUsd > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Tax</span>
                    <span className="font-medium text-forest">{format(quotation.taxUsd)}</span>
                  </div>
                )}
                <div className="mt-2 flex justify-between border-t border-gray-100 pt-2">
                  <span className="text-base font-semibold text-forest">Total</span>
                  <span className="text-base font-bold text-forest">{format(quotation.totalUsd)}</span>
                </div>
              </div>
            </div>
          )}

          {quotation.notesCustomer && (
            <div className="mt-6 rounded-xl bg-white p-6 shadow-lg sm:p-8">
              <h2 className="text-lg font-semibold text-forest">Notes</h2>
              <p className="mt-3 text-sm text-gray-600">{quotation.notesCustomer}</p>
            </div>
          )}

          {isActionable && (
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleAccept}
                className="nav-cta rounded-none border-0 px-6 py-3 text-sm font-semibold text-forest transition-opacity hover:opacity-90 disabled:opacity-70"
              >
                {isProcessing ? "Processing..." : "Accept quotation"}
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleDecline}
                className="rounded-md border border-red-200 px-6 py-3 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 disabled:opacity-70"
              >
                Decline
              </button>
            </div>
          )}

          <p className="mt-6 text-center text-sm text-white/65">
            <Link href="/dashboard" className="font-medium text-champagne hover:text-champagne-deep hover:underline">
              Back to dashboard
            </Link>
          </p>
        </div>
      </main>
    </>
  );
}
