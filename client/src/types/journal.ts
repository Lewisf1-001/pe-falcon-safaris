export type JournalCategory =
  | "safari-stories"
  | "destinations"
  | "wildlife"
  | "travel-tips"
  | "safari-guides"
  | "conservation";

export type JournalStatus = "draft" | "published";

export type JournalSummary = {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  featuredImage: string | null;
  category: JournalCategory;
  author: string | null;
  featured: boolean;
  publishedAt: string | null;
  createdAt: string;
};

export type JournalDetail = JournalSummary & {
  content: string;
  seoTitle: string | null;
  seoDescription: string | null;
  updatedAt: string;
};

export const CATEGORY_LABELS: Record<JournalCategory, string> = {
  "safari-stories": "Safari Stories",
  "destinations": "Destinations",
  "wildlife": "Wildlife",
  "travel-tips": "Travel Tips",
  "safari-guides": "Safari Guides",
  "conservation": "Conservation",
};

export const CATEGORY_OPTIONS: { value: JournalCategory; label: string }[] = [
  { value: "safari-stories", label: "Safari Stories" },
  { value: "destinations", label: "Destinations" },
  { value: "wildlife", label: "Wildlife" },
  { value: "travel-tips", label: "Travel Tips" },
  { value: "safari-guides", label: "Safari Guides" },
  { value: "conservation", label: "Conservation" },
];
