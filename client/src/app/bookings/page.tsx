import Link from "next/link";
import MyBookingsList from "@/components/booking/MyBookingsList";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

export default function BookingsPage() {
  return (
    <>
      <Navbar />
      <main className="bg-cream py-12 sm:py-16">
        <div className="mx-auto max-w-3xl px-6">
          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">My Account</p>
            <h1 className="mt-2 text-3xl font-bold text-forest">My bookings</h1>
            <p className="mt-2 text-sm text-gray-500">
              Track your safari reservations and confirmation status.
            </p>
          </div>

          <MyBookingsList />

          <p className="mt-8 text-center text-sm text-gray-500">
            <Link href="/#packages" className="font-medium text-forest hover:underline">
              Browse more packages
            </Link>
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
