import Link from "next/link";
import LoginForm from "@/components/auth/LoginForm";
import Navbar from "@/components/layout/Navbar";

export default function LoginPage() {
  return (
    <>
      <Navbar />
      <main className="hero-stripes min-h-[calc(100vh-64px)] py-12 sm:py-16">
        <div className="mx-auto w-full max-w-lg px-6">
          <div className="rounded-xl bg-white p-8 shadow-lg sm:p-10">
            <div className="mb-8 text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">
                Welcome Back
              </p>
              <h1 className="mt-2 text-3xl font-bold text-forest">Sign in to your account</h1>
              <p className="mt-2 text-sm text-gray-500">
                Access your safari bookings and account details.
              </p>
            </div>

            <LoginForm />

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
