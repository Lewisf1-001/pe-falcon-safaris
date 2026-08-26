"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PasswordInput from "@/components/auth/PasswordInput";
import { callEdgeFunction } from "@/lib/api";
const REDIRECT_DELAY_MS = 2000;

type FormState = {
  password: string;
  confirmPassword: string;
};

const initialState: FormState = {
  password: "",
  confirmPassword: "",
};

export default function AcceptInviteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [inviteUsername, setInviteUsername] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [form, setForm] = useState<FormState>(initialState);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [isTokenValid, setIsTokenValid] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("Invite link is invalid or missing a token.");
      setIsValidating(false);
      return;
    }

    async function validateToken() {
      if (!token) {
        return;
      }

      try {
        const data = await callEdgeFunction<{ username: string; email: string }>(
          "admin-users",
          {
            method: "POST",
            body: { action: "validate-invite", token },
          }
        );

        setInviteUsername(data.username);
        setInviteEmail(data.email);
        setIsTokenValid(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Invite link is invalid or has expired.");
        setIsTokenValid(false);
      } finally {
        setIsValidating(false);
      }
    }

    validateToken();
  }, [token]);

  function handleChange(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setIsSubmitting(true);

    try {
      const data = await callEdgeFunction<{ message?: string }>("admin-users", {
        method: "POST",
        body: {
          action: "accept-invite",
          token,
          password: form.password,
          confirmPassword: form.confirmPassword,
        },
      });

      setSuccess(data.message || "Account activated. Redirecting to sign in...");
      setForm(initialState);

      window.setTimeout(() => {
        router.push("/login");
      }, REDIRECT_DELAY_MS);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to activate account. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isValidating) {
    return <p className="text-center text-sm text-gray-500">Checking invite link...</p>;
  }

  if (!isTokenValid) {
    return (
      <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-red-700">
        {error || "Invite link is invalid or has expired."}
      </p>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-md border border-gray-100 bg-cream px-4 py-3 text-sm text-gray-600">
        <p>
          <span className="font-medium text-forest">Username:</span> {inviteUsername}
        </p>
        <p className="mt-1">
          <span className="font-medium text-forest">Email:</span> {inviteEmail}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <PasswordInput
          id="password"
          label="Password"
          required
          minLength={8}
          autoComplete="new-password"
          value={form.password}
          onChange={(value) => handleChange("password", value)}
        />

        <PasswordInput
          id="confirmPassword"
          label="Confirm password"
          required
          minLength={8}
          autoComplete="new-password"
          value={form.confirmPassword}
          onChange={(value) => handleChange("confirmPassword", value)}
        />

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
          className="nav-cta w-full rounded-md border-0 px-5 py-3 text-sm font-semibold text-forest transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? "Activating..." : "Set password and activate"}
        </button>
      </form>
    </div>
  );
}
