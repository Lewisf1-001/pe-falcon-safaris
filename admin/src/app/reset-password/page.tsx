import { Suspense } from "react";
import AdminResetPasswordContent from "@/components/auth/AdminResetPasswordContent";
import LoginRedirectGuard from "@/components/auth/LoginRedirectGuard";
import Link from "next/link";

export default function ResetPasswordPage() {
  return (
    <LoginRedirectGuard>
      <main className="brand-dark-bg flex min-h-screen items-center justify-center px-6 py-12">
        <div className="w-full max-w-md rounded-xl border border-champagne/20 bg-white p-8 shadow-sm sm:p-10">
          <div className="mb-8 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-champagne-deep">
              PE Falcon Admin
            </p>
            <h1 className="mt-2 text-3xl font-bold text-forest">Choose a new password</h1>
            <p className="mt-2 text-sm text-gray-500">
              Enter your new admin password below.
            </p>
          </div>

          <Suspense
            fallback={
              <p className="text-center text-sm text-gray-500">Checking reset link...</p>
            }
          >
            <AdminResetPasswordContent />
          </Suspense>

          <p className="mt-6 text-center text-sm text-gray-500">
            <Link href="/login" className="font-medium text-forest hover:underline">
              Back to sign in
            </Link>
          </p>
        </div>
      </main>
    </LoginRedirectGuard>
  );
}
