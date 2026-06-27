import Link from "next/link";
import ProfileForm from "@/components/profile/ProfileForm";
import ChangePasswordForm from "@/components/profile/ChangePasswordForm";
import Navbar from "@/components/layout/Navbar";

export default function ProfilePage() {
  return (
    <>
      <Navbar />
      <main className="hero-stripes min-h-[calc(100vh-64px)] py-12 sm:py-16">
        <div className="mx-auto w-full max-w-lg px-6">
          <div className="mb-8 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">
              My Account
            </p>
            <h1 className="mt-2 text-3xl font-bold text-forest">Profile settings</h1>
            <p className="mt-2 text-sm text-gray-500">
              Update your personal details and keep your account secure.
            </p>
          </div>

          <div className="space-y-6">
            <section className="rounded-xl bg-white p-8 shadow-lg sm:p-10">
              <h2 className="text-lg font-semibold text-forest">Personal information</h2>
              <p className="mt-1 text-sm text-gray-500">
                Keep your details up to date so your booking information stays accurate.
              </p>
              <div className="mt-6">
                <ProfileForm />
              </div>
            </section>

            <section className="rounded-xl bg-white p-8 shadow-lg sm:p-10">
              <h2 className="text-lg font-semibold text-forest">Change password</h2>
              <p className="mt-1 text-sm text-gray-500">
                Enter your current password, then choose a new one.
              </p>
              <div className="mt-6">
                <ChangePasswordForm />
              </div>
            </section>
          </div>

          <p className="mt-6 text-center text-sm text-gray-500">
            <Link href="/" className="font-medium text-forest hover:underline">
              Back to home
            </Link>
          </p>
        </div>
      </main>
    </>
  );
}
