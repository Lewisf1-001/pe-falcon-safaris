import Link from "next/link";
import Image from "next/image";
import type { JournalSummary } from "@/types/journal";
import { CATEGORY_LABELS } from "@/types/journal";

type ArticleCardProps = {
  article: JournalSummary;
};

export default function ArticleCard({ article }: ArticleCardProps) {
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
      className="group overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm transition-shadow hover:shadow-md"
    >
      {featuredImage ? (
        <div className="relative h-48 overflow-hidden bg-olive">
          <Image
            src={featuredImage}
            alt={title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            unoptimized
          />
        </div>
      ) : (
        <div className="flex h-48 items-center justify-center bg-olive">
          <span className="text-4xl text-white/30">📖</span>
        </div>
      )}

      <div className="p-5">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-champagne/20 px-2.5 py-0.5 text-xs font-medium text-champagne-dark">
            {CATEGORY_LABELS[category]}
          </span>
          {dateStr && (
            <span className="text-xs text-gray-400">{dateStr}</span>
          )}
        </div>

        <h3 className="mt-3 text-lg font-bold text-forest group-hover:text-champagne-dark">
          {title}
        </h3>

        {excerpt && (
          <p className="mt-2 line-clamp-2 text-sm text-gray-600">{excerpt}</p>
        )}

        <div className="mt-4 flex items-center justify-between">
          {author && (
            <span className="text-xs text-gray-500">By {author}</span>
          )}
          <span className="text-sm font-medium text-forest group-hover:text-champagne-dark">
            Read Article →
          </span>
        </div>
      </div>
    </Link>
  );
}
