import Link from "next/link";
import BookingDetail from "@/components/booking/BookingDetail";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

type BookingPageProps = {
  params: Promise<{ id: string }>;
};

export default async function BookingPage({ params }: BookingPageProps) {
  const { id } = await params;
  const bookingId = Number(id);

  return (
    <>
      <Navbar />
      <main className="bg-cream py-12 sm:py-16">
        <div className="mx-auto max-w-3xl px-6">
          <Link href="/bookings" className="text-sm font-medium text-forest hover:underline">
            ← Back to my bookings
          </Link>
          <div className="mt-6">
            {Number.isInteger(bookingId) && bookingId > 0 ? (
              <BookingDetail bookingId={bookingId} />
            ) : (
              <p className="text-sm text-red-700">Invalid booking id.</p>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
