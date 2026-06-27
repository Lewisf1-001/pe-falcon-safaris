"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const REDIRECT_DELAY_MS = 2000;

export default function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [message, setMessage] = useState("Verifying your email...");
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setMessage("Verification link is invalid or missing a token.");
      setIsError(true);
      setIsLoading(false);
      return;
    }

    async function verifyEmail() {
      const verificationToken = token;

      if (!verificationToken) {
        return;
      }

      try {
        const response = await fetch(
          `${API_URL}/api/auth/verify-email?token=${encodeURIComponent(verificationToken)}`
        );
        const data = await response.json();

        if (!response.ok) {
          setMessage(data.error || "Verification failed. Please try again.");
          setIsError(true);
          return;
        }

        setMessage("Email verified successfully. Redirecting to home...");
        setIsError(false);

        window.setTimeout(() => {
          router.push("/");
        }, REDIRECT_DELAY_MS);
      } catch {
        setMessage("Unable to reach the server. Make sure the API is running.");
        setIsError(true);
      } finally {
        setIsLoading(false);
      }
    }

    verifyEmail();
  }, [token, router]);

  return (
    <div className="text-center">
      <p
        className={`rounded-md px-4 py-3 text-sm ${
          isError
            ? "border border-red-200 bg-red-50 text-red-700"
            : "border border-green-200 bg-green-50 text-green-700"
        }`}
      >
        {isLoading ? "Verifying your email..." : message}
      </p>
    </div>
  );
}
