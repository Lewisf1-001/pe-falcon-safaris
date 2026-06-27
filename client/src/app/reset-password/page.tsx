import { Suspense } from "react";
import ResetPasswordContent from "@/components/auth/ResetPasswordContent";
import Navbar from "@/components/layout/Navbar";
import Link from "next/link";

export default function ResetPasswordPage() {
  return (
    <>
      <Navbar />
      <main className="hero-stripes min-h-[calc(100vh-64px)] py-12 sm:py-16">
        <div className="mx-auto w-full max-w-lg px-6">
          <div className="rounded-xl bg-white p-8 shadow-lg sm:p-10">
            <div className="mb-8 text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">
                Password Reset
              </p>
              <h1 className="mt-2 text-3xl font-bold text-forest">Choose a new password</h1>
              <p className="mt-2 text-sm text-gray-500">
                Enter your new password below to complete the reset.
              </p>
            </div>

            <Suspense
              fallback={
                <p className="text-center text-sm text-gray-500">Checking reset link...</p>
              }
            >
              <ResetPasswordContent />
            </Suspense>

            <p className="mt-6 text-center text-sm text-gray-500">
              <Link href="/login" className="font-medium text-forest hover:underline">
                Back to sign in
              </Link>
            </p>
          </div>
        </div>
      </main>
    </>
  );
}
