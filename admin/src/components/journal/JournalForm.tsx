"use client";

import { FormEvent, useEffect, useState } from "react";
import Image from "next/image";
import { callEdgeFunction } from "@/lib/api";
import {
  JournalArticle,
  JournalFormState,
  emptyJournalFormState,
  journalToFormState,
  slugifyJournal,
  STATUS_OPTIONS,
  CATEGORY_OPTIONS,
} from "@/types/journal";

type JournalFormProps = {
  editingArticle: JournalArticle | null;
  onSaved: () => void;
  onCancelEdit: () => void;
};

export default function JournalForm({ editingArticle, onSaved, onCancelEdit }: JournalFormProps) {
  const [form, setForm] = useState<JournalFormState>(emptyJournalFormState);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editingArticle) {
      setForm(journalToFormState(editingArticle));
    } else {
      setForm(emptyJournalFormState);
    }
    setError("");
    setSuccess("");
  }, [editingArticle]);

  function handleChange(field: keyof JournalFormState, value: string | boolean) {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "title" && !editingArticle) {
        next.slug = slugifyJournal(String(value));
      }
      return next;
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setIsSubmitting(true);

    if (!form.title.trim()) {
      setError("Title is required.");
      setIsSubmitting(false);
      return;
    }

    if (!form.content.trim()) {
      setError("Content is required.");
      setIsSubmitting(false);
      return;
    }

    if (form.title.trim().length > 300) {
      setError("Title must be 300 characters or less.");
      setIsSubmitting(false);
      return;
    }

    const payload = {
      title: form.title.trim(),
      slug: form.slug || slugifyJournal(form.title),
      excerpt: form.excerpt || undefined,
      content: form.content.trim(),
      featuredImage: form.featuredImage || undefined,
      category: form.category,
      author: form.author || undefined,
      status: form.status,
      featured: form.featured,
      seoTitle: form.seoTitle || undefined,
      seoDescription: form.seoDescription || undefined,
    };

    try {
      if (editingArticle) {
        const { article } = await callEdgeFunction<{ article: JournalArticle }>(
          "journal/admin/" + editingArticle.id,
          { method: "PATCH", body: payload }
        );

        if (!article) throw new Error("Failed to update article.");
        setSuccess("Article updated successfully.");
      } else {
        const { article } = await callEdgeFunction<{ article: JournalArticle }>(
          "journal/admin",
          { method: "POST", body: payload }
        );

        if (!article) throw new Error("Failed to create article.");
        setSuccess("Article created successfully.");
        setForm(emptyJournalFormState);
      }

      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-forest">
            {editingArticle ? "Edit article" : "Add article"}
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            {editingArticle
              ? "Update article details shown on the public website."
              : "Add a new article to the Safari Journal."}
          </p>
        </div>
        {editingArticle && (
          <button
            type="button"
            onClick={onCancelEdit}
            className="text-sm text-gray-500 hover:text-forest"
          >
            Cancel edit
          </button>
        )}
      </div>

      {error && (
        <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}
      {success && (
        <div className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">{success}</div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="title" className="mb-1.5 block text-sm font-medium text-forest">
              Title *
            </label>
            <input
              id="title"
              required
              placeholder="e.g. A Week in the Maasai Mara"
              value={form.title}
              onChange={(e) => handleChange("title", e.target.value)}
              className="w-full rounded-md border border-gray-300 px-4 py-2.5 text-forest outline-none focus:border-forest focus:ring-2 focus:ring-forest/20"
            />
          </div>
          <div>
            <label htmlFor="slug" className="mb-1.5 block text-sm font-medium text-forest">
              Slug
            </label>
            <input
              id="slug"
              placeholder="auto-generated from title"
              value={form.slug}
              onChange={(e) => handleChange("slug", e.target.value)}
              className="w-full rounded-md border border-gray-300 px-4 py-2.5 text-forest outline-none focus:border-forest focus:ring-2 focus:ring-forest/20"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="category" className="mb-1.5 block text-sm font-medium text-forest">
              Category *
            </label>
            <select
              id="category"
              value={form.category}
              onChange={(e) => handleChange("category", e.target.value)}
              className="w-full rounded-md border border-gray-300 px-4 py-2.5 text-forest outline-none focus:border-forest focus:ring-2 focus:ring-forest/20"
            >
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="author" className="mb-1.5 block text-sm font-medium text-forest">
              Author
            </label>
            <input
              id="author"
              placeholder="e.g. PE Falcon Safaris"
              value={form.author}
              onChange={(e) => handleChange("author", e.target.value)}
              className="w-full rounded-md border border-gray-300 px-4 py-2.5 text-forest outline-none focus:border-forest focus:ring-2 focus:ring-forest/20"
            />
          </div>
        </div>

        <div>
          <label htmlFor="excerpt" className="mb-1.5 block text-sm font-medium text-forest">
            Excerpt
          </label>
          <input
            id="excerpt"
            placeholder="Brief summary for article cards"
            value={form.excerpt}
            onChange={(e) => handleChange("excerpt", e.target.value)}
            className="w-full rounded-md border border-gray-300 px-4 py-2.5 text-forest outline-none focus:border-forest focus:ring-2 focus:ring-forest/20"
          />
        </div>

        <div>
          <label htmlFor="content" className="mb-1.5 block text-sm font-medium text-forest">
            Content *
          </label>
          <textarea
            id="content"
            rows={10}
            placeholder="Article content. Use paragraphs separated by blank lines."
            value={form.content}
            onChange={(e) => handleChange("content", e.target.value)}
            className="w-full rounded-md border border-gray-300 px-4 py-2.5 text-forest outline-none focus:border-forest focus:ring-2 focus:ring-forest/20"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="status" className="mb-1.5 block text-sm font-medium text-forest">
              Status
            </label>
            <select
              id="status"
              value={form.status}
              onChange={(e) => handleChange("status", e.target.value)}
              className="w-full rounded-md border border-gray-300 px-4 py-2.5 text-forest outline-none focus:border-forest focus:ring-2 focus:ring-forest/20"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm text-forest">
              <input
                type="checkbox"
                checked={form.featured}
                onChange={(e) => handleChange("featured", e.target.checked)}
                className="rounded border-gray-300 text-forest focus:ring-forest/20"
              />
              Featured article
            </label>
          </div>
        </div>

        <div>
          <label htmlFor="featuredImage" className="mb-1.5 block text-sm font-medium text-forest">
            Featured image URL
          </label>
          <input
            id="featuredImage"
            placeholder="https://..."
            value={form.featuredImage}
            onChange={(e) => handleChange("featuredImage", e.target.value)}
            className="w-full rounded-md border border-gray-300 px-4 py-2.5 text-forest outline-none focus:border-forest focus:ring-2 focus:ring-forest/20"
          />
          {form.featuredImage && (
            <div className="relative mt-2 h-40 overflow-hidden rounded-lg bg-olive">
              <Image
                src={form.featuredImage}
                alt="Featured image preview"
                fill
                sizes="100%"
                className="object-cover"
                unoptimized
              />
            </div>
          )}
        </div>

        <div className="border-t border-gray-100 pt-4">
          <h3 className="mb-3 text-sm font-medium text-forest">SEO</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="seoTitle" className="mb-1.5 block text-sm text-gray-600">
                SEO title
              </label>
              <input
                id="seoTitle"
                placeholder="Defaults to article title"
                value={form.seoTitle}
                onChange={(e) => handleChange("seoTitle", e.target.value)}
                className="w-full rounded-md border border-gray-300 px-4 py-2.5 text-forest outline-none focus:border-forest focus:ring-2 focus:ring-forest/20"
              />
            </div>
            <div>
              <label htmlFor="seoDescription" className="mb-1.5 block text-sm text-gray-600">
                SEO description
              </label>
              <input
                id="seoDescription"
                placeholder="Defaults to excerpt"
                value={form.seoDescription}
                onChange={(e) => handleChange("seoDescription", e.target.value)}
                className="w-full rounded-md border border-gray-300 px-4 py-2.5 text-forest outline-none focus:border-forest focus:ring-2 focus:ring-forest/20"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="nav-cta rounded-sm px-6 py-3 font-display text-xs font-semibold uppercase tracking-[0.18em] text-forest transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {isSubmitting
              ? "Saving..."
              : editingArticle
                ? "Update article"
                : "Create article"}
          </button>
        </div>
      </form>
    </section>
  );
}
