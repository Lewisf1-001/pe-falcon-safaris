import { describe, it, expect } from "vitest";

// ---- Reimplemented from Safari Journal for unit testing ----

type JournalCategory =
  | "safari-stories"
  | "destinations"
  | "wildlife"
  | "travel-tips"
  | "safari-guides"
  | "conservation";

type JournalStatus = "draft" | "published";

const VALID_CATEGORIES: JournalCategory[] = [
  "safari-stories",
  "destinations",
  "wildlife",
  "travel-tips",
  "safari-guides",
  "conservation",
];

function isValidCategory(category: unknown): category is JournalCategory {
  return typeof category === "string" && (VALID_CATEGORIES as string[]).includes(category);
}

function isValidStatus(status: unknown): status is JournalStatus {
  return typeof status === "string" && ["draft", "published"].includes(status);
}

function isPubliclyVisible(status: JournalStatus): boolean {
  return status === "published";
}

function slugifyJournal(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function validateArticleForm(form: {
  title: unknown;
  content: unknown;
  category: unknown;
}): string[] {
  const errors: string[] = [];

  if (typeof form.title !== "string" || form.title.trim().length === 0) {
    errors.push("Title is required.");
  } else if (form.title.trim().length > 300) {
    errors.push("Title must be 300 characters or less.");
  }

  if (typeof form.content !== "string" || form.content.trim().length === 0) {
    errors.push("Content is required.");
  }

  if (!isValidCategory(form.category)) {
    errors.push("Valid category is required.");
  }

  return errors;
}

function formatDate(dateStr: string | null): string | null {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return null;
  }
}

function truncateExcerpt(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + "…";
}

type ArticleSummary = {
  id: number;
  title: string;
  slug: string;
  category: JournalCategory;
  status: JournalStatus;
  featured: boolean;
};

function findRelatedArticles(
  current: ArticleSummary,
  all: ArticleSummary[],
  limit = 3
): ArticleSummary[] {
  return all
    .filter((a) => a.id !== current.id && a.status === "published")
    .sort((a, b) => {
      if (a.category === current.category && b.category !== current.category) return -1;
      if (a.category !== current.category && b.category === current.category) return 1;
      return 0;
    })
    .slice(0, limit);
}

const VALID_FORM = {
  title: "A Week in the Maasai Mara",
  content: "The Maasai Mara is one of Africa's most iconic safari destinations.",
  category: "safari-stories" as JournalCategory,
};

describe("Phase 14: Safari Journal", () => {
  describe("Category validation", () => {
    it("accepts all valid categories", () => {
      for (const cat of VALID_CATEGORIES) {
        expect(isValidCategory(cat)).toBe(true);
      }
    });

    it("rejects invalid category", () => {
      expect(isValidCategory("invalid")).toBe(false);
      expect(isValidCategory("")).toBe(false);
      expect(isValidCategory(null)).toBe(false);
      expect(isValidCategory(undefined)).toBe(false);
    });
  });

  describe("Status validation", () => {
    it("accepts draft status", () => {
      expect(isValidStatus("draft")).toBe(true);
    });

    it("accepts published status", () => {
      expect(isValidStatus("published")).toBe(true);
    });

    it("rejects invalid status", () => {
      expect(isValidStatus("archived")).toBe(false);
      expect(isValidStatus("")).toBe(false);
      expect(isValidStatus(null)).toBe(false);
    });
  });

  describe("Public visibility", () => {
    it("published articles are publicly visible", () => {
      expect(isPubliclyVisible("published")).toBe(true);
    });

    it("draft articles are not publicly visible", () => {
      expect(isPubliclyVisible("draft")).toBe(false);
    });
  });

  describe("Slug generation", () => {
    it("generates slug from title", () => {
      expect(slugifyJournal("A Week in the Maasai Mara")).toBe("a-week-in-the-maasai-mara");
    });

    it("handles special characters", () => {
      expect(slugifyJournal("Kenya's Best Safari Parks!")).toBe("kenya-s-best-safari-parks");
    });

    it("handles consecutive spaces and hyphens", () => {
      expect(slugifyJournal("Hello   World---Test")).toBe("hello-world-test");
    });

    it("trims leading and trailing hyphens", () => {
      expect(slugifyJournal("  Hello World  ")).toBe("hello-world");
    });

    it("handles empty string", () => {
      expect(slugifyJournal("")).toBe("");
    });
  });

  describe("Article form validation", () => {
    it("passes with valid input", () => {
      expect(validateArticleForm(VALID_FORM)).toHaveLength(0);
    });

    it("requires title", () => {
      const errors = validateArticleForm({ ...VALID_FORM, title: "" });
      expect(errors).toContain("Title is required.");
    });

    it("rejects very long title", () => {
      const errors = validateArticleForm({ ...VALID_FORM, title: "x".repeat(301) });
      expect(errors).toContain("Title must be 300 characters or less.");
    });

    it("requires content", () => {
      const errors = validateArticleForm({ ...VALID_FORM, content: "" });
      expect(errors).toContain("Content is required.");
    });

    it("requires valid category", () => {
      const errors = validateArticleForm({ ...VALID_FORM, category: "invalid" });
      expect(errors).toContain("Valid category is required.");
    });

    it("collects multiple errors", () => {
      const errors = validateArticleForm({ title: "", content: "", category: "bad" });
      expect(errors.length).toBe(3);
    });
  });

  describe("Date formatting", () => {
    it("formats valid date", () => {
      const result = formatDate("2026-03-15T12:00:00Z");
      expect(result).toBeTruthy();
      expect(result).toContain("2026");
    });

    it("returns null for null input", () => {
      expect(formatDate(null)).toBeNull();
    });

    it("handles invalid date string", () => {
      const result = formatDate("not-a-date");
      expect(result).toBeNull();
    });
  });

  describe("Excerpt truncation", () => {
    it("returns original text if within limit", () => {
      expect(truncateExcerpt("Short text", 100)).toBe("Short text");
    });

    it("truncates long text with ellipsis", () => {
      const result = truncateExcerpt("This is a long excerpt that needs truncation", 20);
      expect(result.length).toBeLessThanOrEqual(21);
      expect(result).toContain("…");
    });

    it("trims whitespace before ellipsis", () => {
      const result = truncateExcerpt("Hello World This is long", 11);
      expect(result).toBe("Hello World…");
    });
  });

  describe("Related articles", () => {
    const articles: ArticleSummary[] = [
      { id: 1, title: "Article 1", slug: "a1", category: "safari-stories", status: "published", featured: false },
      { id: 2, title: "Article 2", slug: "a2", category: "safari-stories", status: "published", featured: false },
      { id: 3, title: "Article 3", slug: "a3", category: "wildlife", status: "published", featured: false },
      { id: 4, title: "Article 4", slug: "a4", category: "travel-tips", status: "draft", featured: false },
    ];

    it("excludes the current article", () => {
      const current = articles[0];
      const related = findRelatedArticles(current, articles);
      expect(related.every((a) => a.id !== current.id)).toBe(true);
    });

    it("prefers same category articles", () => {
      const current = articles[0];
      const related = findRelatedArticles(current, articles);
      const sameCat = related.filter((a) => a.category === current.category);
      expect(sameCat.length).toBeGreaterThanOrEqual(1);
    });

    it("excludes draft articles", () => {
      const current = articles[0];
      const related = findRelatedArticles(current, articles);
      expect(related.every((a) => a.status === "published")).toBe(true);
    });

    it("respects limit", () => {
      const current = articles[0];
      const related = findRelatedArticles(current, articles, 1);
      expect(related.length).toBeLessThanOrEqual(1);
    });
  });
});
