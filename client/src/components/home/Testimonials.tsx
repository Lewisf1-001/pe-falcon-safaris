import type { PublicReview } from "@/types/review";

type TestimonialsProps = {
  reviews: PublicReview[];
};

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          className={`text-lg ${
            star <= rating ? "text-yellow-400" : "text-gray-300"
          }`}
          aria-hidden="true"
        >
          ★
        </span>
      ))}
      <span className="sr-only">{rating} out of 5 stars</span>
    </div>
  );
}

export default function Testimonials({ reviews }: TestimonialsProps) {
  if (reviews.length === 0) {
    return null;
  }

  return (
    <section className="bg-cream py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">
            Testimonials
          </p>
          <h2 className="mt-3 text-3xl font-bold text-forest sm:text-4xl">
            What Our Guests Say
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-gray-600">
            Real experiences from travelers who have explored Kenya with PE
            Falcon Safaris.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {reviews.map((review) => (
            <div
              key={review.id}
              className="flex flex-col rounded-xl border border-gray-100 bg-white p-6 shadow-sm"
            >
              <StarRating rating={review.rating} />

              <h3 className="mt-3 text-lg font-semibold text-forest">
                {review.title}
              </h3>

              <p className="mt-2 flex-1 text-sm leading-relaxed text-gray-600 line-clamp-4">
                {review.body}
              </p>

              <div className="mt-4 border-t border-gray-100 pt-4">
                <p className="text-sm font-medium text-forest">
                  {review.reviewerName}
                </p>
                {review.packageName && (
                  <p className="mt-0.5 text-xs text-gray-500">
                    {review.packageName}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <a
            href="/reviews"
            className="inline-flex items-center text-sm font-medium text-forest underline underline-offset-4 hover:text-champagne-deep"
          >
            View all reviews →
          </a>
        </div>
      </div>
    </section>
  );
}
