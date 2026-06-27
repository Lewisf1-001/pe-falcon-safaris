"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { saveAdminSession } from "@/lib/auth";
import PasswordInput from "@/components/auth/PasswordInput";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type FormState = {
  username: string;
  password: string;
};

const initialState: FormState = {
  username: "",
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
      const response = await fetch(`${API_URL}/api/admin/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Sign in failed. Please try again.");
        return;
      }

      saveAdminSession(data.token, data.admin);
      router.push("/");
      router.refresh();
    } catch {
      setError("Unable to reach the server. Make sure the API is running.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label htmlFor="username" className="mb-1.5 block text-sm font-medium text-forest">
          Username
        </label>
        <input
          id="username"
          type="text"
          required
          autoComplete="username"
          value={form.username}
          onChange={(e) => handleChange("username", e.target.value)}
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
        className="w-full rounded-md border border-forest bg-forest px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-forest-light disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isSubmitting ? "Signing in..." : "Sign In"}
      </button>
    </form>
  );
}
