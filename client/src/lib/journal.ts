import { createClient } from "@supabase/supabase-js";
import type { JournalCategory, JournalDetail, JournalSummary } from "@/types/journal";

function getPublicClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

function pickStr(val: unknown, key: string): string | null {
  if (val && typeof val === "object" && !Array.isArray(val)) {
    const obj = val as Record<string, unknown>;
    return typeof obj[key] === "string" ? (obj[key] as string) : null;
  }
  return null;
}

function rowToSummary(row: Record<string, unknown>): JournalSummary {
  return {
    id: Number(row.id),
    title: row.title as string,
    slug: row.slug as string,
    excerpt: (row.excerpt as string) || null,
    featuredImage: (row.featured_image as string) || null,
    category: row.category as JournalCategory,
    author: (row.author as string) || null,
    featured: row.featured as boolean,
    publishedAt: (row.published_at as string) || null,
    createdAt: row.created_at as string,
  };
}

export async function fetchPublishedArticles(
  category?: string
): Promise<JournalSummary[]> {
  try {
    const supabase = getPublicClient();
    let query = supabase
      .from("journal_articles")
      .select("id, title, slug, excerpt, featured_image, category, author, featured, published_at, created_at")
      .eq("status", "published")
      .order("published_at", { ascending: false });

    if (category && category.trim()) {
      query = query.eq("category", category.trim());
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map((row) => rowToSummary(row as Record<string, unknown>));
  } catch {
    return [];
  }
}

export async function fetchFeaturedArticle(): Promise<JournalSummary | null> {
  try {
    const supabase = getPublicClient();
    const { data, error } = await supabase
      .from("journal_articles")
      .select("id, title, slug, excerpt, featured_image, category, author, featured, published_at, created_at")
      .eq("status", "published")
      .eq("featured", true)
      .order("published_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;

    return rowToSummary(data as Record<string, unknown>);
  } catch {
    return null;
  }
}

export async function fetchArticleBySlug(slug: string): Promise<JournalDetail | null> {
  try {
    const supabase = getPublicClient();
    const { data, error } = await supabase
      .from("journal_articles")
      .select("*")
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle();

    if (error || !data) return null;

    const row = data as Record<string, unknown>;
    const summary = rowToSummary(row);

    return {
      ...summary,
      content: row.content as string,
      seoTitle: pickStr(row, "seo_title"),
      seoDescription: pickStr(row, "seo_description"),
      updatedAt: row.updated_at as string,
    };
  } catch {
    return null;
  }
}

export async function fetchRelatedArticles(
  articleId: number,
  category: JournalCategory,
  limit = 3
): Promise<JournalSummary[]> {
  try {
    const supabase = getPublicClient();
    const { data, error } = await supabase
      .from("journal_articles")
      .select("id, title, slug, excerpt, featured_image, category, author, featured, published_at, created_at")
      .eq("status", "published")
      .neq("id", articleId)
      .eq("category", category)
      .order("published_at", { ascending: false })
      .limit(limit);

    if (error) throw error;

    const results = (data || []).map((row) => rowToSummary(row as Record<string, unknown>));

    if (results.length < limit) {
      const { data: moreData } = await supabase
        .from("journal_articles")
        .select("id, title, slug, excerpt, featured_image, category, author, featured, published_at, created_at")
        .eq("status", "published")
        .neq("id", articleId)
        .neq("category", category)
        .order("published_at", { ascending: false })
        .limit(limit - results.length);

      if (moreData) {
        results.push(
          ...moreData.map((row) => rowToSummary(row as Record<string, unknown>))
        );
      }
    }

    return results.slice(0, limit);
  } catch {
    return [];
  }
}
