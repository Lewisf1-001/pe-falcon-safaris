"use client";

import type { PublicReview } from "@/types/review";

type ReviewsListProps = {
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

export default function ReviewsList({ reviews }: ReviewsListProps) {
  if (reviews.length === 0) {
    return (
      <div className="rounded-xl border border-gray-100 bg-white p-12 text-center shadow-sm">
        <p className="text-gray-500">
          No reviews yet. Be the first to share your safari experience!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {reviews.map((review) => (
        <div
          key={review.id}
          className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <StarRating rating={review.rating} />
              <h2 className="mt-2 text-xl font-bold text-forest">
                {review.title}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-gray-600">
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
            <span className="shrink-0 text-xs text-gray-400">
              {new Date(review.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
