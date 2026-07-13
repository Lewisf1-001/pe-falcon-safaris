"use client";

import Link from "next/link";
import { getAuthToken } from "@/lib/auth";
import { useEffect, useState } from "react";

type BookSafariButtonProps = {
  slug: string;
};

export default function BookSafariButton({ slug }: BookSafariButtonProps) {
  const [href, setHref] = useState(`/login?next=${encodeURIComponent(`/packages/${slug}/book`)}`);

  useEffect(() => {
    if (getAuthToken()) {
      setHref(`/packages/${slug}/book`);
    }
  }, [slug]);

  return (
    <Link
      href={href}
      className="inline-flex items-center justify-center rounded-md border border-gold bg-gold px-6 py-3 text-sm font-semibold text-forest transition-colors hover:bg-gold-hover"
    >
      Book this safari
    </Link>
  );
}
