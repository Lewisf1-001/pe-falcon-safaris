import Link from "next/link";
import Image from "next/image";
import type { JournalSummary } from "@/types/journal";
import { CATEGORY_LABELS } from "@/types/journal";

type FeaturedArticleProps = {
  article: JournalSummary;
};

export default function FeaturedArticle({ article }: FeaturedArticleProps) {
  const { title, slug, excerpt, featuredImage, category, author, publishedAt } = article;

  const dateStr = publishedAt
    ? new Date(publishedAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <Link
      href={`/journal/${slug}`}
      className="group block overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm transition-shadow hover:shadow-md sm:flex"
    >
      {featuredImage ? (
        <div className="relative h-64 overflow-hidden bg-olive sm:w-1/2">
          <Image
            src={featuredImage}
            alt={title}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            priority
            unoptimized
          />
        </div>
      ) : (
        <div className="flex h-64 items-center justify-center bg-olive sm:w-1/2">
          <span className="text-6xl text-white/30">📖</span>
        </div>
      )}

      <div className="flex flex-col justify-center p-8 sm:w-1/2">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-champagne/20 px-2.5 py-0.5 text-xs font-medium text-champagne-dark">
            {CATEGORY_LABELS[category]}
          </span>
          <span className="text-xs text-gray-400">Featured</span>
        </div>

        <h2 className="mt-4 text-2xl font-bold text-forest group-hover:text-champagne-dark sm:text-3xl">
          {title}
        </h2>

        {excerpt && (
          <p className="mt-3 line-clamp-3 text-gray-600">{excerpt}</p>
        )}

        <div className="mt-6 flex items-center gap-4">
          {author && (
            <span className="text-sm text-gray-500">By {author}</span>
          )}
          {dateStr && (
            <span className="text-sm text-gray-400">{dateStr}</span>
          )}
        </div>

        <span className="mt-4 inline-flex items-center text-sm font-medium text-forest group-hover:text-champagne-dark">
          Read Article →
        </span>
      </div>
    </Link>
  );
}
