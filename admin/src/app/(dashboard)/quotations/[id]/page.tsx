"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";

type QuotationItem = {
  id: number;
  description: string;
  quantity: number;
  unitPriceUsd: number;
  amountUsd: number;
  category: string;
  sortOrder: number;
};

type Quotation = {
  id: number;
  userId: number;
  bookingId: number | null;
  packageId: number | null;
  packageName: string | null;
  clientName: string | null;
  clientEmail: string | null;
  title: string;
  description: string | null;
  travelDate: string;
  guests: number;
  currency: string;
  subtotalUsd: number;
  discountUsd: number;
  taxUsd: number;
  totalUsd: number;
  validUntil: string;
  status: string;
  notesCustomer: string | null;
  notesAdmin: string | null;
  sentAt: string | null;
  viewedAt: string | null;
  acceptedAt: string | null;
  declinedAt: string | null;
  createdAt: string;
  items: QuotationItem[];
};

const statusStyles: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  sent: "bg-blue-100 text-blue-700",
  viewed: "bg-purple-100 text-purple-700",
  accepted: "bg-green-100 text-green-700",
  declined: "bg-red-100 text-red-700",
  expired: "bg-orange-100 text-orange-700",
  cancelled: "bg-gray-100 text-gray-500",
};

export default function AdminQuotationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const quotationId = params.id;

  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
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
  }, [quotationId]);

  async function handleSend() {
    setIsProcessing(true);
    setActionError("");
    setActionMessage("");
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

      const res = await fetch(`${supabaseUrl}/functions/v1/quotations/admin/${quotationId}/send`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token || ""}`,
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setActionMessage("Quotation sent successfully.");
      setQuotation((prev) => prev ? { ...prev, status: "sent" } : null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to send.");
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleCancel() {
    if (!confirm("Cancel this quotation?")) return;
    setIsProcessing(true);
    setActionError("");
    setActionMessage("");
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

      const res = await fetch(`${supabaseUrl}/functions/v1/quotations/admin/${quotationId}/cancel`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token || ""}`,
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setActionMessage("Quotation cancelled.");
      setQuotation((prev) => prev ? { ...prev, status: "cancelled" } : null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to cancel.");
    } finally {
      setIsProcessing(false);
    }
  }

  if (isLoading) {
    return <p className="text-sm text-gray-500">Loading quotation...</p>;
  }

  if (!quotation) {
    return (
      <div className="space-y-4">
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error || "Quotation not found."}
        </p>
        <Link href="/quotations" className="text-sm font-medium text-forest hover:underline">
          Back to quotations
        </Link>
      </div>
    );
  }

  const isDraft = quotation.status === "draft";
  const isSent = ["sent", "viewed"].includes(quotation.status);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/quotations" className="text-sm text-gray-500 hover:underline">
            Quotations
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-forest">{quotation.title}</h1>
          <p className="mt-1 text-sm text-gray-500">
            Reference: #{quotation.id}
          </p>
        </div>
        <span
          className={`inline-flex rounded-full px-3 py-1 text-xs font-medium capitalize ${statusStyles[quotation.status] || "bg-gray-100 text-gray-600"}`}
        >
          {quotation.status}
        </span>
      </div>

      {actionMessage && (
        <p className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {actionMessage}
        </p>
      )}

      {actionError && (
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {actionError}
        </p>
      )}

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-forest">Details</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-4 border-b border-gray-50 pb-3">
              <dt className="text-gray-500">Client</dt>
              <dd className="text-right font-medium text-forest">
                {quotation.clientName || "—"}
                <br />
                <span className="text-xs text-gray-500">{quotation.clientEmail || "—"}</span>
              </dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-gray-50 pb-3">
              <dt className="text-gray-500">Package</dt>
              <dd className="font-medium text-forest">{quotation.packageName || "—"}</dd>
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

        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-forest">Pricing</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-4 border-b border-gray-50 pb-3">
              <dt className="text-gray-500">Subtotal</dt>
              <dd className="font-medium text-forest">USD {quotation.subtotalUsd.toFixed(2)}</dd>
            </div>
            {quotation.discountUsd > 0 && (
              <div className="flex justify-between gap-4 border-b border-gray-50 pb-3">
                <dt className="text-gray-500">Discount</dt>
                <dd className="font-medium text-green-700">-USD {quotation.discountUsd.toFixed(2)}</dd>
              </div>
            )}
            {quotation.taxUsd > 0 && (
              <div className="flex justify-between gap-4 border-b border-gray-50 pb-3">
                <dt className="text-gray-500">Tax</dt>
                <dd className="font-medium text-forest">USD {quotation.taxUsd.toFixed(2)}</dd>
              </div>
            )}
            <div className="flex justify-between gap-4 border-b border-gray-50 pb-3">
              <dt className="text-base font-semibold text-forest">Total</dt>
              <dd className="text-base font-bold text-forest">USD {quotation.totalUsd.toFixed(2)}</dd>
            </div>
          </dl>
        </div>
      </div>

      {quotation.items.length > 0 && (
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-forest">Line Items</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-gray-500">
                  <th className="px-2 py-3 font-medium">Description</th>
                  <th className="px-2 py-3 font-medium">Category</th>
                  <th className="px-2 py-3 font-medium text-right">Qty</th>
                  <th className="px-2 py-3 font-medium text-right">Unit Price</th>
                  <th className="px-2 py-3 font-medium text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {quotation.items.map((item) => (
                  <tr key={item.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-2 py-3 text-forest">{item.description}</td>
                    <td className="px-2 py-3 capitalize text-gray-600">{item.category.replace(/_/g, " ")}</td>
                    <td className="px-2 py-3 text-right text-gray-600">{item.quantity}</td>
                    <td className="px-2 py-3 text-right text-gray-600">USD {item.unitPriceUsd.toFixed(2)}</td>
                    <td className="px-2 py-3 text-right font-medium text-forest">USD {item.amountUsd.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {(quotation.notesCustomer || quotation.notesAdmin) && (
        <div className="grid gap-6 sm:grid-cols-2">
          {quotation.notesCustomer && (
            <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-forest">Customer Notes</h2>
              <p className="mt-3 text-sm text-gray-600">{quotation.notesCustomer}</p>
            </div>
          )}
          {quotation.notesAdmin && (
            <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-forest">Admin Notes</h2>
              <p className="mt-3 text-sm text-gray-600">{quotation.notesAdmin}</p>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        {isDraft && (
          <button
            type="button"
            disabled={isProcessing}
            onClick={handleSend}
            className="rounded-md bg-forest px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-forest/90 disabled:opacity-70"
          >
            {isProcessing ? "Sending..." : "Send to customer"}
          </button>
        )}
        {isDraft && (
          <Link
            href={`/quotations/${quotation.id}/edit`}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-forest transition-colors hover:border-forest"
          >
            Edit
          </Link>
        )}
        {(isDraft || isSent) && (
          <button
            type="button"
            disabled={isProcessing}
            onClick={handleCancel}
            className="rounded-md border border-red-200 px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 disabled:opacity-70"
          >
            Cancel
          </button>
        )}
        <Link href="/quotations" className="px-4 py-2 text-sm font-medium text-forest hover:underline">
          All quotations
        </Link>
      </div>
    </div>
  );
}
