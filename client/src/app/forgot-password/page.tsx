import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";
import Navbar from "@/components/layout/Navbar";
import Link from "next/link";

export default function ForgotPasswordPage() {
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
              <h1 className="mt-2 text-3xl font-bold text-forest">Forgot your password?</h1>
              <p className="mt-2 text-sm text-gray-500">
                Enter your email and we&apos;ll send you a link to reset your password.
              </p>
            </div>

            <ForgotPasswordForm />

            <p className="mt-6 text-center text-sm text-gray-500">
              <Link href="/" className="font-medium text-forest hover:underline">
                Back to home
              </Link>
            </p>
          </div>
        </div>
      </main>
    </>
  );
}
