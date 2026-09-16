"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import AdminQuotationForm from "@/components/quotations/AdminQuotationForm";

type QuotationData = {
  id: number;
  userId: number;
  bookingId: number | null;
  packageId: number | null;
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
  items: {
    id: number;
    description: string;
    quantity: number;
    unitPriceUsd: number;
    amountUsd: number;
    category: string;
    sortOrder: number;
  }[];
};

export default function EditQuotationPage() {
  const params = useParams();
  const router = useRouter();
  const quotationId = params.id;

  const [quotation, setQuotation] = useState<QuotationData | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const loadQuotation = useCallback(async () => {
    setIsLoading(true);
    setError("");

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
  }, [quotationId]);

  useEffect(() => {
    loadQuotation();
  }, [loadQuotation]);

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

  if (quotation.status !== "draft") {
    return (
      <div className="space-y-4">
        <p className="rounded-md border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-700">
          Only draft quotations can be edited. This quotation is currently &ldquo;{quotation.status}&rdquo;.
        </p>
        <Link
          href={`/quotations/${quotation.id}`}
          className="text-sm font-medium text-forest hover:underline"
        >
          View quotation
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-8">
        <Link href={`/quotations/${quotation.id}`} className="text-sm text-gray-500 hover:underline">
          Quotation #{quotation.id}
        </Link>
        <h1 className="mt-2 text-3xl font-bold text-forest">Edit Quotation</h1>
        <p className="mt-2 text-sm text-gray-500">
          Update the draft quotation before sending.
        </p>
      </header>
      <AdminQuotationForm
        editingQuotation={quotation}
        onSaved={() => router.push(`/quotations/${quotation.id}`)}
        onCancelEdit={() => router.push(`/quotations/${quotation.id}`)}
      />
    </div>
  );
}
