"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";

type QuotationStatus =
  | "draft"
  | "sent"
  | "viewed"
  | "accepted"
  | "declined"
  | "expired"
  | "cancelled";

type AdminQuotation = {
  id: number;
  clientName: string;
  clientEmail: string;
  packageName: string | null;
  title: string;
  travelDate: string;
  guests: number;
  totalUsd: number;
  validUntil: string;
  status: QuotationStatus;
  createdAt: string;
};

const statusStyles: Record<QuotationStatus, string> = {
  draft: "bg-gray-100 text-gray-600",
  sent: "bg-blue-100 text-blue-700",
  viewed: "bg-purple-100 text-purple-700",
  accepted: "bg-green-100 text-green-700",
  declined: "bg-red-100 text-red-700",
  expired: "bg-orange-100 text-orange-700",
  cancelled: "bg-gray-100 text-gray-500",
};

const TERMINAL_STATUSES: QuotationStatus[] = ["accepted", "declined", "expired", "cancelled"];

export default function AdminQuotationsList() {
  const [quotations, setQuotations] = useState<AdminQuotation[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const loadQuotations = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const response = await fetch(`${supabaseUrl}/functions/v1/quotations/admin`, {
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
  }, []);

  useEffect(() => {
    loadQuotations();
  }, [loadQuotations]);

  const filtered = filterStatus === "all"
    ? quotations
    : quotations.filter((q) => q.status === filterStatus);

  const statusCounts = quotations.reduce((acc, q) => {
    acc[q.status] = (acc[q.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (isLoading) {
    return <p className="text-sm text-gray-500">Loading quotations...</p>;
  }

  return (
    <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      {error && (
        <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setFilterStatus("all")}
          className={`rounded-md px-3 py-1.5 text-xs font-medium ${filterStatus === "all" ? "bg-forest text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
        >
          All ({quotations.length})
        </button>
        {Object.entries(statusCounts).map(([status, count]) => (
          <button
            key={status}
            type="button"
            onClick={() => setFilterStatus(status)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize ${filterStatus === status ? "bg-forest text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
          >
            {status} ({count})
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-gray-500">No quotations found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-gray-500">
                <th className="px-2 py-3 font-medium">Client</th>
                <th className="px-2 py-3 font-medium">Title</th>
                <th className="px-2 py-3 font-medium">Package</th>
                <th className="px-2 py-3 font-medium">Travel</th>
                <th className="px-2 py-3 font-medium">Total</th>
                <th className="px-2 py-3 font-medium">Valid Until</th>
                <th className="px-2 py-3 font-medium">Status</th>
                <th className="px-2 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((q) => (
                <tr key={q.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-2 py-4">
                    <p className="font-medium text-forest">{q.clientName}</p>
                    <p className="text-xs text-gray-500">{q.clientEmail}</p>
                  </td>
                  <td className="px-2 py-4 text-gray-600">{q.title}</td>
                  <td className="px-2 py-4 text-gray-600">{q.packageName || "—"}</td>
                  <td className="px-2 py-4 text-gray-600">{q.travelDate}</td>
                  <td className="px-2 py-4 text-gray-600">USD {q.totalUsd}</td>
                  <td className="px-2 py-4 text-gray-600">{q.validUntil}</td>
                  <td className="px-2 py-4">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium capitalize ${statusStyles[q.status]}`}
                    >
                      {q.status}
                    </span>
                  </td>
                  <td className="px-2 py-4 text-right">
                    <Link
                      href={`/quotations/${q.id}`}
                      className="text-sm font-medium text-forest hover:underline"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
