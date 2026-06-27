import AdminForgotPasswordForm from "@/components/auth/AdminForgotPasswordForm";
import LoginRedirectGuard from "@/components/auth/LoginRedirectGuard";
import Link from "next/link";

export default function ForgotPasswordPage() {
  return (
    <LoginRedirectGuard>
      <main className="flex min-h-screen items-center justify-center bg-cream px-6 py-12">
        <div className="w-full max-w-md rounded-xl border border-gray-100 bg-white p-8 shadow-sm sm:p-10">
          <div className="mb-8 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">
              PE Falcon Admin
            </p>
            <h1 className="mt-2 text-3xl font-bold text-forest">Forgot your password?</h1>
            <p className="mt-2 text-sm text-gray-500">
              Enter your admin email and we&apos;ll send you a reset link.
            </p>
          </div>

          <AdminForgotPasswordForm />

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
