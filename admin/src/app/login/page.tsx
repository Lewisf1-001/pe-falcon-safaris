import AdminLoginForm from "@/components/auth/AdminLoginForm";
import LoginRedirectGuard from "@/components/auth/LoginRedirectGuard";

export default function LoginPage() {
  return (
    <LoginRedirectGuard>
      <main className="brand-dark-bg flex min-h-screen items-center justify-center px-6 py-12">
        <div className="w-full max-w-md rounded-xl border border-champagne/20 bg-white p-8 shadow-sm sm:p-10">
          <div className="mb-8 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-champagne-deep">
              PE Falcon Admin
            </p>
            <h1 className="mt-2 text-3xl font-bold text-forest">Sign in</h1>
            <p className="mt-2 text-sm text-gray-500">
              Enter your admin credentials to access the dashboard.
            </p>
          </div>

          <AdminLoginForm />
        </div>
      </main>
    </LoginRedirectGuard>
  );
}
