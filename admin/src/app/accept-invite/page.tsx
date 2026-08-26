import { Suspense } from "react";
import AcceptInviteContent from "@/components/auth/AcceptInviteContent";
import Link from "next/link";

export default function AcceptInvitePage() {
  return (
    <main className="brand-dark-bg flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-md rounded-xl border border-champagne/20 bg-white p-8 shadow-sm sm:p-10">
        <div className="mb-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-champagne-deep">
            PE Falcon Admin
          </p>
          <h1 className="mt-2 text-3xl font-bold text-forest">Accept your invite</h1>
          <p className="mt-2 text-sm text-gray-500">
            Set your password to activate your admin account.
          </p>
        </div>

        <Suspense
          fallback={<p className="text-center text-sm text-gray-500">Checking invite link...</p>}
        >
          <AcceptInviteContent />
        </Suspense>

        <p className="mt-6 text-center text-sm text-gray-500">
          <Link href="/login" className="font-medium text-forest hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
