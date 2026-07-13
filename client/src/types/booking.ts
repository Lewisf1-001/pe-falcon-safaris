export type BookingStatus = "pending" | "confirmed" | "cancelled";

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
