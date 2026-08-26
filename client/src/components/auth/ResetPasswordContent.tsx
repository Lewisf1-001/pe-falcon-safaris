"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import PasswordInput from "@/components/auth/PasswordInput";
import { updatePassword } from "@/lib/auth";

const REDIRECT_DELAY_MS = 2000;

type FormState = {
  password: string;
  confirmPassword: string;
};

const initialState: FormState = {
  password: "",
  confirmPassword: "",
};

export default function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const errorParam = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  const [form, setForm] = useState<FormState>(initialState);
  const [error, setError] = useState(errorParam ? (errorDescription || "Invalid reset link.") : "");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      await updatePassword(form.password);
      setSuccess("Password updated successfully. Redirecting to sign in...");
      setForm(initialState);

      window.setTimeout(() => {
        router.push("/login");
      }, REDIRECT_DELAY_MS);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Password update failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (errorParam) {
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
        className="w-full nav-cta rounded-none border-0 px-5 py-3 text-sm font-semibold text-forest transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isSubmitting ? "Updating..." : "Update password"}
      </button>
    </form>
  );
}
