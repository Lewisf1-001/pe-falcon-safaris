import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { fetchArticleBySlug, fetchRelatedArticles } from "@/lib/journal";
import { CATEGORY_LABELS } from "@/types/journal";
import ArticleCard from "@/components/journal/ArticleCard";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = await fetchArticleBySlug(slug);

  if (!article) {
    return { title: "Article Not Found" };
  }

  const title = article.seoTitle || `${article.title} | Safari Journal`;
  const description =
    article.seoDescription ||
    article.excerpt ||
    `Read about ${article.title} on the PE Falcon Safaris Safari Journal.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      ...(article.featuredImage && { images: [article.featuredImage] }),
    },
  };
}

export default async function JournalArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = await fetchArticleBySlug(slug);

  if (!article) {
    notFound();
  }

  const related = await fetchRelatedArticles(article.id, article.category);

  const dateStr = article.publishedAt
    ? new Date(article.publishedAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <div className="mx-auto max-w-4xl px-6 py-16 lg:px-8">
      {/* Breadcrumb */}
      <nav className="mb-8 text-sm text-gray-500">
        <Link href="/" className="hover:text-forest">
          Home
        </Link>
        <span className="mx-2">/</span>
        <Link href="/journal" className="hover:text-forest">
          Journal
        </Link>
        <span className="mx-2">/</span>
        <span className="text-forest">{article.title}</span>
      </nav>

      {/* Hero Image */}
      {article.featuredImage ? (
        <div className="relative mb-8 h-72 overflow-hidden rounded-xl bg-olive sm:h-96">
          <Image
            src={article.featuredImage}
            alt={article.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 896px"
            className="object-cover"
            priority
            unoptimized
          />
        </div>
      ) : (
        <div className="mb-8 flex h-72 items-center justify-center rounded-xl bg-olive sm:h-96">
          <span className="text-6xl text-white/30">📖</span>
        </div>
      )}

      {/* Article Header */}
      <header className="mb-8">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-champagne/20 px-3 py-1 text-sm font-medium text-champagne-dark">
            {CATEGORY_LABELS[article.category]}
          </span>
          {dateStr && (
            <span className="text-sm text-gray-400">{dateStr}</span>
          )}
        </div>

        <h1 className="mt-4 text-4xl font-bold text-forest sm:text-5xl">
          {article.title}
        </h1>

        {article.author && (
          <p className="mt-3 text-sm text-gray-500">By {article.author}</p>
        )}
      </header>

      {/* Article Content */}
      <article className="prose max-w-none text-gray-700">
        {article.content.split("\n").map((paragraph, i) => (
          <p key={i} className="mb-4">
            {paragraph}
          </p>
        ))}
      </article>

      {/* Back to Journal */}
      <div className="mt-12 border-t border-gray-100 pt-8">
        <Link
          href="/journal"
          className="text-sm font-medium text-forest hover:text-champagne-dark"
        >
          ← Back to Safari Journal
        </Link>
      </div>

      {/* Related Articles */}
      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-8 text-2xl font-bold text-forest">
            Related Articles
          </h2>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((a) => (
              <ArticleCard key={a.id} article={a} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
