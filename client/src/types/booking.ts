export type BookingStatus =
  | "inquiry"
  | "quote"
  | "pending"
  | "deposit_required"
  | "partially_paid"
  | "confirmed"
  | "upcoming"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "expired"
  | "refunded";

export type Booking = {
  id: number;
  userId: number;
  packageId: number;
  packageName: string;
  packageSlug: string;
  travelDate: string;
  guests: number;
  totalPriceUsd: number;
  status: BookingStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};
