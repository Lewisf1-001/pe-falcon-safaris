import type { Metadata } from "next";
import { fetchApprovedReviews } from "@/lib/reviews";
import ReviewsList from "@/components/reviews/ReviewsList";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "Guest Reviews | PE Falcon Safaris",
  description:
    "Read real reviews and testimonials from guests who have experienced safaris with PE Falcon Safaris in Kenya.",
};

export default async function ReviewsPage() {
  const reviews = await fetchApprovedReviews(50);

  return (
    <>
      <Navbar />
      <main className="bg-cream py-12 sm:py-16">
        <div className="mx-auto max-w-4xl px-6 lg:px-8">
          <header className="mb-10 text-center">
            <h1 className="text-4xl font-bold text-forest sm:text-5xl">
              Guest Reviews
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-600">
              Hear from travelers who have explored Kenya with PE Falcon
              Safaris.
            </p>
          </header>

          <ReviewsList reviews={reviews} />
        </div>
      </main>
      <Footer />
    </>
  );
}
