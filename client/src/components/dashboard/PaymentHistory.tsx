"use client";

import { useEffect, useState } from "react";
import { useCurrency } from "@/components/currency/CurrencyProvider";
import { createClient } from "@/lib/supabase";
import { getAuthToken } from "@/lib/auth";
import type { Payment } from "@/types/payment";

const methodLabels: Record<string, string> = {
  mobile_money: "M-Pesa",
  card: "Card",
};

const statusLabels: Record<string, string> = {
  pending: "Pending",
  completed: "Completed",
  failed: "Failed",
  cancelled: "Cancelled",
};

const statusStyles: Record<string, string> = {
  pending: "bg-orange-100 text-orange-700",
  completed: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
  cancelled: "bg-gray-100 text-gray-600",
};

export default function PaymentHistory() {
  const { format } = useCurrency();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!getAuthToken()) return;

    async function loadPayments() {
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();

        if (!session?.access_token) {
          setError("You must be logged in.");
          return;
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

        const response = await fetch(`${supabaseUrl}/functions/v1/payments`, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          },
        });

        if (!response.ok) {
          throw new Error("Unable to load payment history.");
        }

        const data = await response.json();
        setPayments(data.payments || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load payment history.");
      } finally {
        setIsLoading(false);
      }
    }

    loadPayments();
  }, []);

  if (isLoading) {
    return (
      <section className="rounded-xl bg-white p-6 shadow-lg sm:p-8">
        <h2 className="text-lg font-semibold text-forest">Payment History</h2>
        <p className="mt-4 text-sm text-gray-500">Loading payments...</p>
      </section>
    );
  }

  return (
    <section className="rounded-xl bg-white p-6 shadow-lg sm:p-8">
      <h2 className="text-lg font-semibold text-forest">Payment History</h2>

      {error && (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {!error && payments.length === 0 && (
        <p className="mt-4 text-sm text-gray-500">No payments found.</p>
      )}

      {payments.length > 0 && (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-gray-500">
                <th className="px-2 py-3 font-medium">Date</th>
                <th className="px-2 py-3 font-medium">Package</th>
                <th className="px-2 py-3 font-medium">Method</th>
                <th className="px-2 py-3 font-medium">Amount</th>
                <th className="px-2 py-3 font-medium">Status</th>
                <th className="px-2 py-3 font-medium">Reference</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-2 py-3 text-gray-600">
                    {new Date(payment.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-2 py-3 text-gray-600">
                    {payment.packageName || "—"}
                  </td>
                  <td className="px-2 py-3 text-gray-600">
                    {methodLabels[payment.method] || payment.method}
                  </td>
                  <td className="px-2 py-3 font-medium text-forest">
                    {format(payment.amountUsd)}
                  </td>
                  <td className="px-2 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyles[payment.status] || "bg-gray-100 text-gray-600"}`}
                    >
                      {statusLabels[payment.status] || payment.status}
                    </span>
                  </td>
                  <td className="px-2 py-3 font-mono text-xs text-gray-500">
                    {payment.externalRef || "—"}
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
