"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { API_URL, getAuthHeaders } from "@/lib/api";
import { AuthUser, getAuthToken, updateAuthUser } from "@/lib/auth";

type FormState = {
  firstName: string;
  lastName: string;
  email: string;
};

export default function ProfileForm() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({
    firstName: "",
    lastName: "",
    email: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const token = getAuthToken();

    if (!token) {
      router.replace("/login");
      return;
    }

    async function loadProfile() {
      try {
        const response = await fetch(`${API_URL}/api/auth/me`, {
          headers: getAuthHeaders(),
        });
        const data = await response.json();

        if (!response.ok) {
          router.replace("/login");
          return;
        }

        const user = data.user as AuthUser;
        setForm({
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
        });
      } catch {
        setError("Unable to load your profile. Make sure the API is running.");
      } finally {
        setIsLoading(false);
      }
    }

    loadProfile();
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
      const response = await fetch(`${API_URL}/api/auth/profile`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Unable to update profile. Please try again.");
        return;
      }

      updateAuthUser(data.user);
      setSuccess(
        data.requiresEmailVerification
          ? "Profile updated. Please check your email to verify your new address."
          : data.message || "Profile updated successfully."
      );
      router.refresh();
    } catch {
      setError("Unable to reach the server. Make sure the API is running.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return <p className="text-sm text-gray-500">Loading your profile...</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="firstName" className="mb-1.5 block text-sm font-medium text-forest">
            First name
          </label>
          <input
            id="firstName"
            type="text"
            required
            value={form.firstName}
            onChange={(e) => handleChange("firstName", e.target.value)}
            className="w-full rounded-md border border-gray-300 px-4 py-2.5 text-forest outline-none focus:border-forest focus:ring-2 focus:ring-forest/20"
          />
        </div>

        <div>
          <label htmlFor="lastName" className="mb-1.5 block text-sm font-medium text-forest">
            Last name
          </label>
          <input
            id="lastName"
            type="text"
            required
            value={form.lastName}
            onChange={(e) => handleChange("lastName", e.target.value)}
            className="w-full rounded-md border border-gray-300 px-4 py-2.5 text-forest outline-none focus:border-forest focus:ring-2 focus:ring-forest/20"
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
          required
          value={form.email}
          onChange={(e) => handleChange("email", e.target.value)}
          className="w-full rounded-md border border-gray-300 px-4 py-2.5 text-forest outline-none focus:border-forest focus:ring-2 focus:ring-forest/20"
        />
        <p className="mt-1.5 text-xs text-gray-500">
          Changing your email will require verification before you can sign in with the new address.
        </p>
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
        className="w-full rounded-none border border-gold bg-gold px-5 py-3 text-sm font-semibold text-forest transition-colors hover:bg-gold-hover disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isSubmitting ? "Saving..." : "Save changes"}
      </button>
    </form>
  );
}
