"use client";

import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { useEffect, useState } from "react";

type BookSafariButtonProps = {
  slug: string;
};

export default function BookSafariButton({ slug }: BookSafariButtonProps) {
  const [href, setHref] = useState(`/login?next=${encodeURIComponent(`/packages/${slug}/book`)}`);

  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setHref(`/packages/${slug}/book`);
      }
    }
    checkAuth();
  }, [slug]);

  return (
    <Link
      href={href}
      className="nav-cta inline-flex items-center justify-center rounded-none border-0 px-6 py-3 text-sm font-semibold tracking-[0.12em] uppercase text-forest transition-opacity hover:opacity-90"
    >
      Book this safari
    </Link>
  );
}
