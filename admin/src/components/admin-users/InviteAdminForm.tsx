"use client";

import { FormEvent, useState } from "react";
import { callEdgeFunction } from "@/lib/api";

type InviteAdminFormProps = {
  onInvited: () => void;
};

export default function InviteAdminForm({ onInvited }: InviteAdminFormProps) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setIsSubmitting(true);

    try {
      const data = await callEdgeFunction<{ message?: string }>("admin-users", {
        method: "POST",
        body: { action: "invite", username, email },
      });

      setSuccess(data.message || "Admin invite sent successfully.");
      setUsername("");
      setEmail("");
      onInvited();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to send invite. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-forest">Invite admin user</h2>
      <p className="mt-1 text-sm text-gray-500">
        An email invite will be sent so they can set their password and sign in.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="username" className="mb-1.5 block text-sm font-medium text-forest">
              Username
            </label>
            <input
              id="username"
              type="text"
              required
              minLength={3}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-4 py-2.5 text-forest outline-none focus:border-forest focus:ring-2 focus:ring-forest/20"
            />
          </div>

          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-forest">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-4 py-2.5 text-forest outline-none focus:border-forest focus:ring-2 focus:ring-forest/20"
            />
          </div>
        </div>

        {error && (
          <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}

        {success && (
          <p className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {success}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="nav-cta rounded-md border-0 px-5 py-2.5 text-sm font-semibold text-forest transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? "Sending invite..." : "Send invite"}
        </button>
      </form>
    </section>
  );
}
