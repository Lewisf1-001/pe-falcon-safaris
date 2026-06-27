import { Suspense } from "react";
import VerifyEmailContent from "@/components/auth/VerifyEmailContent";
import Navbar from "@/components/layout/Navbar";

export default function VerifyEmailPage() {
  return (
    <>
      <Navbar />
      <main className="hero-stripes min-h-[calc(100vh-64px)] py-12 sm:py-16">
        <div className="mx-auto w-full max-w-lg px-6">
          <div className="rounded-xl bg-white p-8 shadow-lg sm:p-10">
            <div className="mb-8 text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">
                Email Verification
              </p>
              <h1 className="mt-2 text-3xl font-bold text-forest">Confirm your email</h1>
            </div>

            <Suspense
              fallback={
                <p className="text-center text-sm text-gray-500">Verifying your email...</p>
              }
            >
              <VerifyEmailContent />
            </Suspense>
          </div>
        </div>
      </main>
    </>
  );
}
