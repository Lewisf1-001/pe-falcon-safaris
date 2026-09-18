import type { Metadata } from "next";
import { Suspense } from "react";
import { fetchPublishedArticles, fetchFeaturedArticle } from "@/lib/journal";
import ArticleCard from "@/components/journal/ArticleCard";
import FeaturedArticle from "@/components/journal/FeaturedArticle";
import CategoryFilter from "@/components/journal/CategoryFilter";

export const metadata: Metadata = {
  title: "Safari Journal | PE Falcon Safaris",
  description:
    "Stories, guides, and insights from the wild. Discover safari tips, destination guides, wildlife encounters, and conservation news from Kenya.",
};

type Props = {
  searchParams: Promise<{ category?: string }>;
};

export default async function JournalPage({ searchParams }: Props) {
  const { category } = await searchParams;
  const [articles, featured] = await Promise.all([
    fetchPublishedArticles(category),
    category ? Promise.resolve(null) : fetchFeaturedArticle(),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-16 lg:px-8">
      <header className="mb-12 text-center">
        <h1 className="text-4xl font-bold text-forest sm:text-5xl">
          Safari Journal
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-600">
          Stories, guides, and insights from the wild. Discover safari tips,
          destination guides, wildlife encounters, and conservation news.
        </p>
      </header>

      {featured && (
        <section className="mb-12">
          <FeaturedArticle article={featured} />
        </section>
      )}

      <section className="mb-8">
        <Suspense fallback={null}>
          <CategoryFilter />
        </Suspense>
      </section>

      {articles.length === 0 ? (
        <div className="rounded-xl border border-gray-100 bg-white p-12 text-center shadow-sm">
          <p className="text-gray-500">
            {category
              ? "No articles found in this category. Try a different filter or check back soon."
              : "No articles published yet. Check back soon for safari stories and guides."}
          </p>
        </div>
      ) : (
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {articles.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      )}
    </div>
  );
}
