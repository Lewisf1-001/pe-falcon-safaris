"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import PasswordInput from "@/components/auth/PasswordInput";
import { createClient } from "@/lib/supabase";
const REDIRECT_DELAY_MS = 2000;

type FormState = {
  password: string;
  confirmPassword: string;
};

const initialState: FormState = {
  password: "",
  confirmPassword: "",
};

export default function AdminResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [form, setForm] = useState<FormState>(initialState);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [isTokenValid, setIsTokenValid] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("Reset link is invalid or missing a token.");
      setIsValidating(false);
      return;
    }

    async function validateToken() {
      if (!token) {
        return;
      }

      try {
        const supabase = createClient();
        const { error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: token,
          type: "recovery",
        });

        if (verifyError) {
          setError(verifyError.message || "Reset link is invalid or has expired.");
          setIsTokenValid(false);
          return;
        }

        setIsTokenValid(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An unexpected error occurred.");
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

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      setIsSubmitting(false);
      return;
    }

    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({
        password: form.password,
      });

      if (updateError) {
        setError(updateError.message || "Password reset failed. Please try again.");
        return;
      }

      setSuccess("Password reset successfully. Redirecting to sign in...");
      setForm(initialState);

      window.setTimeout(() => {
        router.push("/login");
      }, REDIRECT_DELAY_MS);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isValidating) {
    return <p className="text-center text-sm text-gray-500">Checking reset link...</p>;
  }

  if (!isTokenValid) {
    return (
      <div className="space-y-4 text-center">
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error || "Reset link is invalid or has expired."}
        </p>
        <Link href="/forgot-password" className="text-sm font-medium text-forest hover:underline">
          Request a new reset link
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <PasswordInput
        id="password"
        label="New password"
        required
        minLength={8}
        autoComplete="new-password"
        value={form.password}
        onChange={(value) => handleChange("password", value)}
      />

      <PasswordInput
        id="confirmPassword"
        label="Confirm new password"
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
        {isSubmitting ? "Resetting..." : "Reset password"}
      </button>
    </form>
  );
}
