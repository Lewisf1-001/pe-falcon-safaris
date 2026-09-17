"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { CATEGORY_OPTIONS } from "@/types/journal";

export default function CategoryFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeCategory = searchParams.get("category") || "";

  function handleCategoryClick(category: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (category) {
      params.set("category", category);
    } else {
      params.delete("category");
    }
    router.push(`/journal?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => handleCategoryClick("")}
        className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
          !activeCategory
            ? "bg-forest text-white"
            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
        }`}
      >
        All
      </button>
      {CATEGORY_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => handleCategoryClick(opt.value)}
          className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
            activeCategory === opt.value
              ? "bg-forest text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
