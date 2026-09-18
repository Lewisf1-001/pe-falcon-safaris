"use client";

import { useEffect, useState } from "react";
import { callEdgeFunction } from "@/lib/api";

type ReviewStats = {
  totalReviews: number;
  pendingReviews: number;
  approvedReviews: number;
  rejectedReviews: number;
  averageRating: number;
};

type Review = {
  id: number;
  userId: number;
  bookingId: number;
  packageId: number | null;
  packageName: string | null;
  packageSlug: string | null;
  reviewerName: string;
  reviewerEmail: string | null;
  travelDate: string | null;
  rating: number;
  title: string;
  body: string;
  status: string;
  adminResponse: string | null;
  adminResponseAt: string | null;
  createdAt: string;
  publishedAt: string | null;
};

type ReviewStatsResponse = { stats: ReviewStats };
type ReviewsListResponse = { reviews: Review[] };

function StarDisplay({ rating }: { rating: number }) {
  return (
    <span className="text-yellow-400">
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

export default function AdminReviewsPage() {
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [filter, setFilter] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  async function loadData(statusFilter?: string) {
    setIsLoading(true);
    try {
      const [statsData, reviewsData] = await Promise.all([
        callEdgeFunction<ReviewStatsResponse>("admin/reviews/stats"),
        callEdgeFunction<ReviewsListResponse>(
          `admin/reviews${statusFilter ? `?status=${statusFilter}` : ""}`
        ),
      ]);
      setStats(statsData.stats);
      setReviews(reviewsData.reviews);
    } catch {
      // Error handling
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadData(filter || undefined);
  }, [filter]);

  async function updateReview(id: number, status: string) {
    setUpdatingId(id);
    try {
      await callEdgeFunction(`admin/reviews/${id}`, {
        method: "PATCH",
        body: { status },
      });
      await loadData(filter || undefined);
    } catch {
      // Error handling
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Reviews</h1>
        <p className="mt-1 text-sm text-gray-500">
          Moderate customer reviews and testimonials.
        </p>
      </div>

      {stats && (
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-sm text-gray-500">Total</p>
            <p className="text-2xl font-bold text-gray-900">{stats.totalReviews}</p>
          </div>
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
            <p className="text-sm text-yellow-700">Pending</p>
            <p className="text-2xl font-bold text-yellow-800">{stats.pendingReviews}</p>
          </div>
          <div className="rounded-lg border border-green-200 bg-green-50 p-4">
            <p className="text-sm text-green-700">Approved</p>
            <p className="text-2xl font-bold text-green-800">{stats.approvedReviews}</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-sm text-gray-500">Avg Rating</p>
            <p className="text-2xl font-bold text-gray-900">
              {stats.averageRating > 0 ? `${stats.averageRating}★` : "N/A"}
            </p>
          </div>
        </div>
      )}

      <div className="mb-4 flex gap-2">
        {["", "pending", "approved", "rejected"].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              filter === s
                ? "bg-forest text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {s || "All"}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-500">Loading reviews...</p>
      ) : reviews.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
          <p className="text-gray-500">No reviews found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div
              key={review.id}
              className="rounded-lg border border-gray-200 bg-white p-6"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <StarDisplay rating={review.rating} />
                    <StatusBadge status={review.status} />
                    <span className="text-xs text-gray-400">
                      #{review.id}
                    </span>
                  </div>
                  <h3 className="mt-1 font-semibold text-gray-900">
                    {review.title}
                  </h3>
                  <p className="mt-1 text-sm text-gray-600">{review.body}</p>
                  <div className="mt-2 flex flex-wrap gap-4 text-xs text-gray-500">
                    <span>By: {review.reviewerName}</span>
                    {review.packageName && (
                      <span>Package: {review.packageName}</span>
                    )}
                    {review.travelDate && (
                      <span>Travel: {review.travelDate}</span>
                    )}
                    <span>
                      Submitted: {new Date(review.createdAt).toLocaleDateString()}
                    </span>
                  </div>
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
                <div className="flex shrink-0 gap-2">
                  {review.status !== "approved" && (
                    <button
                      onClick={() => updateReview(review.id, "approved")}
                      disabled={updatingId === review.id}
                      className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                    >
                      Approve
                    </button>
                  )}
                  {review.status !== "rejected" && (
                    <button
                      onClick={() => updateReview(review.id, "rejected")}
                      disabled={updatingId === review.id}
                      className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      Reject
                    </button>
                  )}
                  {review.status !== "hidden" && review.status === "approved" && (
                    <button
                      onClick={() => updateReview(review.id, "hidden")}
                      disabled={updatingId === review.id}
                      className="rounded-md bg-gray-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-700 disabled:opacity-50"
                    >
                      Hide
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
