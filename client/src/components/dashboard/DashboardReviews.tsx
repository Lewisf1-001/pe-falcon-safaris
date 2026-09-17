"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUser, getAuthToken } from "@/lib/auth";
import { fetchUserReviews, fetchCompletedBookings } from "@/lib/reviews";
import ReviewForm from "@/components/reviews/ReviewForm";
import type { Review } from "@/types/review";

type BookingOption = {
  id: number;
  packageName: string;
  packageSlug: string;
  travelDate: string;
};

function StarDisplay({ rating }: { rating: number }) {
  return (
    <span className="text-yellow-400" aria-label={`${rating} stars`}>
      {"★".repeat(rating)}{"☆".repeat(5 - rating)}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    approved: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
    hidden: "bg-gray-100 text-gray-600",
  };

  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
        styles[status] || "bg-gray-100 text-gray-600"
      }`}
    >
      {status}
    </span>
  );
}

export default function DashboardReviews() {
  const router = useRouter();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [bookings, setBookings] = useState<BookingOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [activeTab, setActiveTab] = useState<"reviews" | "submit">("reviews");

  useEffect(() => {
    async function loadData() {
      const user = await getUser();
      if (!user) {
        router.replace("/login?next=/dashboard");
        return;
      }

      const token = await getAuthToken();
      if (!token) return;

      const errors: string[] = [];

      try {
        const userReviews = await fetchUserReviews(token);
        setReviews(userReviews);
      } catch {
        errors.push("reviews");
      }

      try {
        const completedBookings = await fetchCompletedBookings(token);
        setBookings(completedBookings);
      } catch {
        errors.push("bookings");
      }

      if (errors.length > 0) {
        setFetchError(
          `Unable to load ${errors.join(" and ")}. Please try refreshing the page.`
        );
      }

      setIsLoading(false);
    }

    loadData();
  }, [router]);

  function handleReviewSubmitted() {
    setActiveTab("reviews");
    getAuthToken().then((token) => {
      if (token) {
        fetchUserReviews(token)
          .then(setReviews)
          .catch(() => {});
      }
    });
  }

  if (isLoading) {
    return (
      <section className="rounded-xl bg-white p-6 shadow-lg sm:p-8">
        <p className="text-sm text-gray-500">Loading reviews...</p>
      </section>
    );
  }

  return (
    <section className="rounded-xl bg-white p-6 shadow-lg sm:p-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-forest">My Reviews</h2>
          <p className="mt-1 text-sm text-gray-500">
            Share your safari experiences and track review status.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("reviews")}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              activeTab === "reviews"
                ? "bg-forest text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            My Reviews ({reviews.length})
          </button>
          <button
            onClick={() => setActiveTab("submit")}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              activeTab === "submit"
                ? "bg-forest text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            Leave a Review
          </button>
        </div>
      </div>

      {fetchError && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {fetchError}
        </div>
      )}

      <div className="mt-6">
        {activeTab === "submit" ? (
          <ReviewForm
            bookings={bookings}
            onSuccess={handleReviewSubmitted}
            error={fetchError || undefined}
          />
        ) : reviews.length === 0 ? (
          <div className="rounded-lg border border-gray-100 bg-gray-50 p-8 text-center">
            <p className="text-gray-500">You haven&apos;t submitted any reviews yet.</p>
            {bookings.length > 0 && (
              <button
                onClick={() => setActiveTab("submit")}
                className="mt-3 text-sm font-medium text-forest underline hover:text-champagne-deep"
              >
                Leave a review for your completed safari
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <div
                key={review.id}
                className="rounded-lg border border-gray-100 p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <StarDisplay rating={review.rating} />
                      <StatusBadge status={review.status} />
                    </div>
                    <h3 className="mt-1 font-medium text-forest">
                      {review.title}
                    </h3>
                    <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                      {review.body}
                    </p>
                    {review.packageName && (
                      <p className="mt-1 text-xs text-gray-500">
                        Package: {review.packageName}
                      </p>
                    )}
                    {review.adminResponse && (
                      <div className="mt-3 rounded-md bg-blue-50 p-3">
                        <p className="text-xs font-medium text-blue-800">
                          Admin Response:
                        </p>
                        <p className="mt-1 text-sm text-blue-700">
                          {review.adminResponse}
                        </p>
                      </div>
                    )}
                  </div>
                  <span className="shrink-0 text-xs text-gray-400">
                    {new Date(review.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
