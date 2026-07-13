import Link from "next/link";
import PaymentForm from "@/components/payment/PaymentForm";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

type PayBookingPageProps = {
  params: Promise<{ id: string }>;
};

export default async function PayBookingPage({ params }: PayBookingPageProps) {
  const { id } = await params;
  const bookingId = Number(id);

  return (
    <>
      <Navbar />
      <main className="hero-stripes min-h-[calc(100vh-64px)] py-12 sm:py-16">
        <div className="mx-auto w-full max-w-lg px-6">
          <div className="rounded-xl bg-white p-8 shadow-lg sm:p-10">
            <div className="mb-8 text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">Payment</p>
              <h1 className="mt-2 text-3xl font-bold text-forest">Pay for your safari</h1>
              <p className="mt-2 text-sm text-gray-500">
                Choose mobile money or card to complete your reservation.
              </p>
            </div>

            {Number.isInteger(bookingId) && bookingId > 0 ? (
              <PaymentForm bookingId={bookingId} />
            ) : (
              <p className="text-center text-sm text-red-700">Invalid booking id.</p>
            )}
          </div>

          <p className="mt-6 text-center text-sm text-gray-500">
            <Link href="/bookings" className="font-medium text-forest hover:underline">
              Back to my bookings
            </Link>
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
