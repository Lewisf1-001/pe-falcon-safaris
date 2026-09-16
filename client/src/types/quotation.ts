export type QuotationStatus =
  | "draft"
  | "sent"
  | "viewed"
  | "accepted"
  | "declined"
  | "expired"
  | "cancelled";

export type QuotationItemCategory =
  | "accommodation"
  | "transport"
  | "park_fees"
  | "activities"
  | "meals"
  | "guide"
  | "other"
  | "discount";

export type QuotationItem = {
  id: number;
  quotationId: number;
  description: string;
  quantity: number;
  unitPriceUsd: number;
  amountUsd: number;
  category: QuotationItemCategory;
  sortOrder: number;
};

export type Quotation = {
  id: number;
  userId: number;
  bookingId: number | null;
  packageId: number | null;
  packageName: string | null;
  packageSlug: string | null;
  clientName: string;
  clientEmail: string;
  title: string;
  description: string | null;
  travelDate: string;
  guests: number;
  currency: string;
  subtotalUsd: number;
  discountUsd: number;
  taxUsd: number;
  totalUsd: number;
  validUntil: string;
  status: QuotationStatus;
  notesCustomer: string | null;
  notesAdmin: string | null;
  sentAt: string | null;
  viewedAt: string | null;
  acceptedAt: string | null;
  declinedAt: string | null;
  createdAt: string;
  updatedAt: string;
  items?: QuotationItem[];
};
