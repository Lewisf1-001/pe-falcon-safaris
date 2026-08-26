"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signInAdmin } from "@/lib/auth";
import PasswordInput from "@/components/auth/PasswordInput";

type FormState = {
  email: string;
  password: string;
};

const initialState: FormState = {
  email: "",
  password: "",
};

export default function AdminLoginForm() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initialState);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleChange(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await signInAdmin(form.email, form.password);
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-forest">
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={form.email}
          onChange={(e) => handleChange("email", e.target.value)}
          className="w-full rounded-md border border-gray-300 px-4 py-2.5 text-forest outline-none focus:border-forest focus:ring-2 focus:ring-forest/20"
        />
      </div>

      <PasswordInput
        id="password"
        label="Password"
        required
        autoComplete="current-password"
        value={form.password}
        onChange={(value) => handleChange("password", value)}
      />

      <p className="text-right text-sm">
        <Link href="/forgot-password" className="font-medium text-forest hover:underline">
          Forgot password?
        </Link>
      </p>

      {error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="nav-cta w-full rounded-md border-0 px-5 py-3 text-sm font-semibold text-forest transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isSubmitting ? "Signing in..." : "Sign In"}
      </button>
    </form>
  );
}
