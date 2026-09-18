export type ReviewStatus = "pending" | "approved" | "rejected" | "hidden";

export type Review = {
  id: number;
  userId: number;
  bookingId: number;
  packageId: number | null;
  packageName: string | null;
  packageSlug: string | null;
  rating: number;
  title: string;
  body: string;
  status: ReviewStatus;
  adminResponse: string | null;
  adminResponseAt: string | null;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
};

export type PublicReview = {
  id: number;
  rating: number;
  title: string;
  body: string;
  reviewerName: string;
  packageName: string | null;
  createdAt: string;
};

export type ReviewFormData = {
  bookingId: number;
  rating: number;
  title: string;
  body: string;
};
