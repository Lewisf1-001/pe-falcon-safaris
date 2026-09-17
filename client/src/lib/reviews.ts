import { createClient } from "@supabase/supabase-js";
import type { PublicReview, Review } from "@/types/review";

function getPublicClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

function formatReviewerName(
  firstName: string | null,
  lastName: string | null
): string {
  const first = firstName?.trim() || "";
  const last = lastName?.trim() || "";
  if (!first && !last) return "Anonymous Safari Guest";
  if (!last) return first;
  return `${first} ${last.charAt(0)}.`;
}

function pickName(val: unknown): { first_name: string | null; last_name: string | null } {
  if (val && typeof val === "object" && !Array.isArray(val)) {
    const obj = val as Record<string, unknown>;
    return {
      first_name: typeof obj.first_name === "string" ? obj.first_name : null,
      last_name: typeof obj.last_name === "string" ? obj.last_name : null,
    };
  }
  return { first_name: null, last_name: null };
}

function pickStr(val: unknown, key: string): string | null {
  if (val && typeof val === "object" && !Array.isArray(val)) {
    const obj = val as Record<string, unknown>;
    return typeof obj[key] === "string" ? (obj[key] as string) : null;
  }
  return null;
}

export async function fetchApprovedReviews(limit = 20): Promise<PublicReview[]> {
  try {
    const supabase = getPublicClient();
    const { data, error } = await supabase
      .from("reviews")
      .select(`
        id, rating, title, body, created_at,
        users!reviews_user_id_fkey (first_name, last_name),
        packages!reviews_package_id_fkey (name)
      `)
      .eq("status", "approved")
      .order("published_at", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;

    return (data || []).map((r) => {
      const u = pickName(r.users);
      return {
        id: Number(r.id),
        rating: r.rating,
        title: r.title,
        body: r.body,
        reviewerName: formatReviewerName(u.first_name, u.last_name),
        packageName: pickStr(r.packages, "name"),
        createdAt: r.created_at,
      };
    });
  } catch {
    return [];
  }
}

export async function fetchApprovedReviewsForPackage(
  packageId: number,
  limit = 10
): Promise<PublicReview[]> {
  try {
    const supabase = getPublicClient();
    const { data, error } = await supabase
      .from("reviews")
      .select(`
        id, rating, title, body, created_at,
        users!reviews_user_id_fkey (first_name, last_name)
      `)
      .eq("status", "approved")
      .eq("package_id", packageId)
      .order("published_at", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;

    return (data || []).map((r) => {
      const u = pickName(r.users);
      return {
        id: Number(r.id),
        rating: r.rating,
        title: r.title,
        body: r.body,
        reviewerName: formatReviewerName(u.first_name, u.last_name),
        packageName: null,
        createdAt: r.created_at,
      };
    });
  } catch {
    return [];
  }
}

export async function fetchUserReviews(
  authToken: string
): Promise<Review[]> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: `Bearer ${authToken}` } },
    });

    const { data, error } = await supabase
      .from("reviews")
      .select(`
        *,
        packages!reviews_package_id_fkey (name, slug)
      `)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return (data || []).map((r) => ({
      id: Number(r.id),
      userId: Number(r.user_id),
      bookingId: Number(r.booking_id),
      packageId: r.package_id ? Number(r.package_id) : null,
      packageName: pickStr(r.packages, "name"),
      packageSlug: pickStr(r.packages, "slug"),
      rating: r.rating,
      title: r.title,
      body: r.body,
      status: r.status,
      adminResponse: r.admin_response,
      adminResponseAt: r.admin_response_at,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      publishedAt: r.published_at,
    }));
  } catch {
    return [];
  }
}

export async function fetchCompletedBookings(
  authToken: string
): Promise<Array<{ id: number; packageName: string; packageSlug: string; travelDate: string }>> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: `Bearer ${authToken}` } },
    });

    const { data, error } = await supabase
      .from("bookings")
      .select(`
        id, travel_date,
        packages!bookings_package_id_fkey (name, slug)
      `)
      .eq("status", "completed")
      .order("travel_date", { ascending: false });

    if (error) throw error;

    return (data || [])
      .filter((b) => b.packages != null)
      .map((b) => ({
        id: Number(b.id),
        packageName: pickStr(b.packages, "name") || "",
        packageSlug: pickStr(b.packages, "slug") || "",
        travelDate: b.travel_date?.slice(0, 10) || "",
      }));
  } catch {
    return [];
  }
}
