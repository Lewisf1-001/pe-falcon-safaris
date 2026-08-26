"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";

type AdminPayment = {
  id: string;
  amountUsd: number;
  method: "mobile_money" | "card";
  provider: string | null;
  phone: string | null;
  cardLast4: string | null;
  cardBrand: string | null;
  externalRef: string | null;
  status: string;
  packageName: string | null;
  travelDate: string | null;
  clientName: string;
  clientEmail: string;
  createdAt: string;
};

const statusStyles: Record<string, string> = {
  completed: "bg-green-100 text-green-700",
  pending: "bg-orange-100 text-orange-700",
  failed: "bg-red-100 text-red-700",
  cancelled: "bg-gray-100 text-gray-600",
};

function methodLabel(payment: AdminPayment) {
  if (payment.method === "mobile_money") {
    return payment.provider === "airtel" ? "Airtel Money" : "M-Pesa";
  }

  return payment.cardBrand ? `${payment.cardBrand} •••• ${payment.cardLast4}` : "Card";
}

export default function AdminPaymentsList() {
  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const loadPayments = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const supabase = createClient();
      const { data, error: queryError } = await supabase
        .from("payments")
        .select(`
          id,
          amount_usd,
          method,
          provider,
          phone,
          card_last4,
          card_brand,
          cardholder_name,
          external_ref,
          status,
          created_at,
          bookings (
            travel_date,
            packages ( name ),
            users ( first_name, last_name, email )
          )
        `)
        .order("created_at", { ascending: false });

      if (queryError) {
        setError(queryError.message);
        return;
      }

      const mapped: AdminPayment[] = (data ?? []).map((row: any) => ({
        id: row.id,
        amountUsd: row.amount_usd,
        method: row.method,
        provider: row.provider,
        phone: row.phone,
        cardLast4: row.card_last4,
        cardBrand: row.card_brand,
        externalRef: row.external_ref,
        status: row.status,
        packageName: row.bookings?.packages?.name ?? null,
        travelDate: row.bookings?.travel_date ?? null,
        clientName: row.bookings?.users
          ? `${row.bookings.users.first_name} ${row.bookings.users.last_name}`
          : "Unknown",
        clientEmail: row.bookings?.users?.email ?? "",
        createdAt: row.created_at,
      }));

      setPayments(mapped);
    } catch {
      setError("Unable to reach the server. Make sure the API is running.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  if (isLoading) {
    return <p className="text-sm text-gray-500">Loading payments...</p>;
  }

  return (
    <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      {error && (
        <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {payments.length === 0 ? (
        <p className="text-sm text-gray-500">No payments yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-gray-500">
                <th className="px-2 py-3 font-medium">Client</th>
                <th className="px-2 py-3 font-medium">Package</th>
                <th className="px-2 py-3 font-medium">Method</th>
                <th className="px-2 py-3 font-medium">Amount</th>
                <th className="px-2 py-3 font-medium">Reference</th>
                <th className="px-2 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-2 py-4">
                    <p className="font-medium text-forest">{payment.clientName}</p>
                    <p className="text-xs text-gray-500">{payment.clientEmail}</p>
                  </td>
                  <td className="px-2 py-4 text-gray-600">
                    <p>{payment.packageName}</p>
                    {payment.travelDate && (
                      <p className="text-xs text-gray-500">{payment.travelDate}</p>
                    )}
                  </td>
                  <td className="px-2 py-4 text-gray-600">
                    <p>{methodLabel(payment)}</p>
                    {payment.phone && <p className="text-xs text-gray-500">{payment.phone}</p>}
                  </td>
                  <td className="px-2 py-4 text-gray-600">USD {payment.amountUsd}</td>
                  <td className="px-2 py-4 font-mono text-xs text-gray-600">
                    {payment.externalRef}
                  </td>
                  <td className="px-2 py-4">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium capitalize ${
                        statusStyles[payment.status] || statusStyles.pending
                      }`}
                    >
                      {payment.status}
                    </span>
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
