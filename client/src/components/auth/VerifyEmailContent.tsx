"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";

const REDIRECT_DELAY_MS = 2000;

export default function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get("code");

  const [message, setMessage] = useState("Verifying your email...");
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!code) {
      setMessage("Verification link is invalid or missing a code.");
      setIsError(true);
      setIsLoading(false);
      return;
    }

    async function verifyEmail() {
      const supabase = createClient();

      const { error } = await supabase.auth.exchangeCodeForSession(code!);

      if (error) {
        setMessage(error.message || "Verification failed. Please try again.");
        setIsError(true);
      } else {
        setMessage("Email verified successfully. Redirecting to home...");
        setIsError(false);

        window.setTimeout(() => {
          router.push("/");
        }, REDIRECT_DELAY_MS);
      }

      setIsLoading(false);
    }

    verifyEmail();
  }, [code, router]);

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
