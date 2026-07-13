export type PaymentMethod = "mobile_money" | "card";
export type PaymentStatus = "pending" | "completed" | "failed" | "cancelled";

export type Payment = {
  id: string;
  bookingId: number;
  userId: number;
  amountUsd: number;
  method: PaymentMethod;
  provider: string | null;
  phone: string | null;
  cardLast4: string | null;
  cardBrand: string | null;
  cardholderName: string | null;
  externalRef: string | null;
  status: PaymentStatus;
  packageName: string | null;
  packageSlug: string | null;
  travelDate: string | null;
  createdAt: string;
  updatedAt: string;
};
