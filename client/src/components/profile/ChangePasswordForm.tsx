"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PasswordInput from "@/components/auth/PasswordInput";
import { getAuthToken, changePassword } from "@/lib/auth";

type FormState = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

const initialState: FormState = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

export default function ChangePasswordForm() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initialState);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isReady, setIsReady] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!getAuthToken()) {
      router.replace("/login");
      return;
    }

    setIsReady(true);
  }, [router]);

  function handleChange(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setIsSubmitting(true);

    try {
      if (form.newPassword !== form.confirmPassword) {
        setError("New passwords do not match.");
        return;
      }

      if (form.newPassword.length < 8) {
        setError("New password must be at least 8 characters.");
        return;
      }

      await changePassword(form.currentPassword, form.newPassword);

      setSuccess("Password changed successfully.");
      setForm(initialState);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to change password. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isReady) {
    return null;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <PasswordInput
        id="currentPassword"
        label="Current password"
        required
        autoComplete="current-password"
        value={form.currentPassword}
        onChange={(value) => handleChange("currentPassword", value)}
      />

      <PasswordInput
        id="newPassword"
        label="New password"
        required
        minLength={8}
        autoComplete="new-password"
        value={form.newPassword}
        onChange={(value) => handleChange("newPassword", value)}
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
        className="w-full rounded-md border border-forest bg-forest px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-forest/90 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isSubmitting ? "Updating..." : "Change password"}
      </button>
    </form>
  );
}
