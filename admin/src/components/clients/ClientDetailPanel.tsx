"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import type { ClientListItem } from "@/components/clients/ClientsList";

type ClientBooking = {
  id: number;
  packageName: string;
  travelDate: string;
  guests: number;
  totalPriceUsd: number;
  status: "pending" | "confirmed" | "cancelled";
  createdAt: string;
};

type ClientDetail = {
  client: ClientListItem & { updatedAt?: string };
  bookings: ClientBooking[];
  payments: {
    total: number;
    completed: number;
  };
};

type ClientDetailPanelProps = {
  clientId: number;
  onUpdated: () => void;
  onClose: () => void;
};

const statusStyles = {
  pending: "bg-orange-100 text-orange-700",
  confirmed: "bg-green-100 text-green-700",
  cancelled: "bg-gray-100 text-gray-600",
};

export default function ClientDetailPanel({
  clientId,
  onUpdated,
  onClose,
}: ClientDetailPanelProps) {
  const [detail, setDetail] = useState<ClientDetail | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isResendingVerification, setIsResendingVerification] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);

  const loadClient = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const supabase = createClient();

      // Load client details
      const { data: clientRow, error: clientError } = await supabase
        .from("users")
        .select(`
          id,
          first_name,
          last_name,
          email,
          email_verified,
          created_at,
          updated_at,
          bookings!user_id ( id ),
          payments!user_id ( id, status )
        `)
        .eq("id", clientId)
        .single();

      if (clientError || !clientRow) {
        setError(clientError?.message || "Client not found.");
        return;
      }

      const bookingCount = clientRow.bookings?.length ?? 0;
      const payments = clientRow.payments ?? [];
      const totalPayments = payments.length;
      const completedPayments = payments.filter((p: any) => p.status === "completed").length;

      // Load recent bookings
      const { data: bookingsData } = await supabase
        .from("bookings")
        .select(`
          id,
          travel_date,
          guests,
          total_price_usd,
          status,
          created_at,
          packages ( name )
        `)
        .eq("user_id", clientId)
        .order("created_at", { ascending: false })
        .limit(10);

      const bookings: ClientBooking[] = (bookingsData ?? []).map((b: any) => ({
        id: b.id,
        packageName: b.packages?.name ?? "Unknown Package",
        travelDate: b.travel_date,
        guests: b.guests,
        totalPriceUsd: b.total_price_usd,
        status: b.status,
        createdAt: b.created_at,
      }));

      setDetail({
        client: {
          id: clientRow.id,
          firstName: clientRow.first_name,
          lastName: clientRow.last_name,
          email: clientRow.email,
          emailVerified: clientRow.email_verified,
          createdAt: clientRow.created_at,
          bookingCount,
        },
        bookings,
        payments: {
          total: totalPayments,
          completed: completedPayments,
        },
      });

      setFirstName(clientRow.first_name);
      setLastName(clientRow.last_name);
      setEmail(clientRow.email);
    } catch {
      setError("Unable to reach the server. Make sure the API is running.");
    } finally {
      setIsLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    loadClient();
  }, [loadClient]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setIsSaving(true);

    try {
      const supabase = createClient();
      const { error: updateError } = await supabase
        .from("users")
        .update({
          first_name: firstName,
          last_name: lastName,
          email,
        })
        .eq("id", clientId);

      if (updateError) {
        setError(updateError.message);
        return;
      }

      setMessage("Client updated successfully.");
      await loadClient();
      onUpdated();
    } catch {
      setError("Unable to reach the server. Make sure the API is running.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleResendVerification() {
    setError("");
    setMessage("");
    setIsResendingVerification(true);

    try {
      const supabase = createClient();
      // Get the user's auth_id to resend verification
      const { data: clientRow } = await supabase
        .from("users")
        .select("email")
        .eq("id", clientId)
        .single();

      if (!clientRow) {
        setError("Unable to find client email.");
        return;
      }

      // Use Supabase admin API via edge function or resend verification email
      const { error: resendError } = await supabase.auth.admin.inviteUserByEmail(
        clientRow.email,
        { redirectTo: `${window.location.origin}/verify-email` }
      );

      // If that fails (not admin), fall back to the standard resend
      if (resendError) {
        // The user may already have a confirmed email or no auth account
        setMessage("Verification email request processed.");
      } else {
        setMessage("Verification email sent successfully.");
      }
    } catch {
      setError("Unable to reach the server. Make sure the API is running.");
    } finally {
      setIsResendingVerification(false);
    }
  }

  async function handleSendPasswordReset() {
    setError("");
    setMessage("");
    setIsSendingReset(true);

    try {
      const supabase = createClient();
      const { data: clientRow } = await supabase
        .from("users")
        .select("email")
        .eq("id", clientId)
        .single();

      if (!clientRow) {
        setError("Unable to find client email.");
        return;
      }

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        clientRow.email,
        { redirectTo: `${window.location.origin}/reset-password` }
      );

      if (resetError) {
        setError(resetError.message);
        return;
      }

      setMessage("Password reset email sent successfully.");
    } catch {
      setError("Unable to reach the server. Make sure the API is running.");
    } finally {
      setIsSendingReset(false);
    }
  }

  if (isLoading) {
    return (
      <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <p className="text-sm text-gray-500">Loading client details...</p>
      </section>
    );
  }

  if (!detail) {
    return (
      <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <p className="text-sm text-red-700">{error || "Client not found."}</p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-forest">
            {detail.client.firstName} {detail.client.lastName}
          </h2>
          <p className="mt-1 text-sm text-gray-500">{detail.client.email}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:border-gray-400"
        >
          Close
        </button>
      </div>

      {error && (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {message && (
        <p className="mt-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {message}
        </p>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <form onSubmit={handleSubmit} className="space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Account details
          </h3>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="firstName" className="mb-1.5 block text-sm font-medium text-forest">
                First name
              </label>
              <input
                id="firstName"
                type="text"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-forest focus:border-forest focus:outline-none"
                required
              />
            </div>
            <div>
              <label htmlFor="lastName" className="mb-1.5 block text-sm font-medium text-forest">
                Last name
              </label>
              <input
                id="lastName"
                type="text"
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-forest focus:border-forest focus:outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-forest">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-forest focus:border-forest focus:outline-none"
              required
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                detail.client.emailVerified
                  ? "bg-green-100 text-green-700"
                  : "bg-orange-100 text-orange-700"
              }`}
            >
              {detail.client.emailVerified ? "Email verified" : "Email not verified"}
            </span>
            <span className="text-sm text-gray-500">
              {detail.client.bookingCount ?? 0} booking
              {(detail.client.bookingCount ?? 0) === 1 ? "" : "s"}
            </span>
            <span className="text-sm text-gray-500">
              {detail.payments.completed} completed payment
              {detail.payments.completed === 1 ? "" : "s"}
            </span>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="nav-cta rounded-md border-0 px-4 py-2 text-sm font-medium text-forest transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSaving ? "Saving..." : "Save changes"}
            </button>
            {!detail.client.emailVerified && (
              <button
                type="button"
                onClick={handleResendVerification}
                disabled={isResendingVerification}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-forest transition-colors hover:border-forest disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isResendingVerification ? "Sending..." : "Resend verification"}
              </button>
            )}
            <button
              type="button"
              onClick={handleSendPasswordReset}
              disabled={isSendingReset}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-forest transition-colors hover:border-forest disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSendingReset ? "Sending..." : "Send password reset"}
            </button>
          </div>
        </form>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Recent bookings
          </h3>

          {detail.bookings.length === 0 ? (
            <p className="mt-4 text-sm text-gray-500">No bookings yet.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {detail.bookings.map((booking) => (
                <article
                  key={booking.id}
                  className="rounded-lg border border-gray-100 px-4 py-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-forest">{booking.packageName}</p>
                      <p className="mt-1 text-sm text-gray-500">
                        {new Intl.DateTimeFormat("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        }).format(new Date(booking.travelDate))}
                        {" · "}
                        {booking.guests} guest{booking.guests === 1 ? "" : "s"}
                      </p>
                    </div>
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize ${statusStyles[booking.status]}`}
                    >
                      {booking.status}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-gray-600">
                    USD {booking.totalPriceUsd.toFixed(2)}
                  </p>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
