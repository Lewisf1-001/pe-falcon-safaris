export type JournalCategory =
  | "safari-stories"
  | "destinations"
  | "wildlife"
  | "travel-tips"
  | "safari-guides"
  | "conservation";

export type JournalStatus = "draft" | "published";

export type JournalArticle = {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  featured_image: string | null;
  category: JournalCategory;
  author: string | null;
  status: JournalStatus;
  featured: boolean;
  seo_title: string | null;
  seo_description: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type JournalFormState = {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  featuredImage: string;
  category: JournalCategory;
  author: string;
  status: JournalStatus;
  featured: boolean;
  seoTitle: string;
  seoDescription: string;
};

export const CATEGORY_OPTIONS: { value: JournalCategory; label: string }[] = [
  { value: "safari-stories", label: "Safari Stories" },
  { value: "destinations", label: "Destinations" },
  { value: "wildlife", label: "Wildlife" },
  { value: "travel-tips", label: "Travel Tips" },
  { value: "safari-guides", label: "Safari Guides" },
  { value: "conservation", label: "Conservation" },
];

export const STATUS_OPTIONS: { value: JournalStatus; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
];

export const emptyJournalFormState: JournalFormState = {
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  featuredImage: "",
  category: "safari-stories",
  author: "",
  status: "draft",
  featured: false,
  seoTitle: "",
  seoDescription: "",
};

export function journalToFormState(article: JournalArticle): JournalFormState {
  return {
    title: article.title,
    slug: article.slug,
    excerpt: article.excerpt ?? "",
    content: article.content,
    featuredImage: article.featured_image ?? "",
    category: article.category,
    author: article.author ?? "",
    status: article.status,
    featured: article.featured,
    seoTitle: article.seo_title ?? "",
    seoDescription: article.seo_description ?? "",
  };
}

export function slugifyJournal(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
