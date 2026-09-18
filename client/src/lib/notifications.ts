import { createClient } from "@supabase/supabase-js";
import type { Notification } from "@/types/notification";

function createAuthedClient(authToken: string) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${authToken}` } },
    }
  );
}

function mapNotificationRow(n: Record<string, unknown>): Notification {
  return {
    id: Number(n.id),
    userId: Number(n.user_id),
    type: String(n.type) as Notification["type"],
    title: String(n.title ?? ""),
    message: String(n.message ?? ""),
    referenceType: (n.reference_type as string) || null,
    referenceId: n.reference_id != null ? Number(n.reference_id) : null,
    isRead: Boolean(n.is_read),
    createdAt: String(n.created_at ?? ""),
    readAt: (n.read_at as string) || null,
  };
}

/**
 * Fetch the authenticated customer's notifications (RLS-scoped).
 * Newest first. Bounded by limit (default 50, max 100).
 */
export async function fetchUserNotifications(
  authToken: string,
  limit = 50
): Promise<Notification[]> {
  const safeLimit = Math.min(Math.max(1, limit), 100);
  const supabase = createAuthedClient(authToken);

  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (error) throw new Error(error.message);

  return (data || []).map((n) => mapNotificationRow(n as Record<string, unknown>));
}

export async function fetchUnreadCount(authToken: string): Promise<number> {
  const supabase = createAuthedClient(authToken);

  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("is_read", false);

  if (error) throw new Error(error.message);
  return count || 0;
}

export async function markNotificationRead(
  authToken: string,
  notificationId: number
): Promise<void> {
  if (!Number.isInteger(notificationId) || notificationId <= 0) {
    throw new Error("Invalid notification id");
  }

  const supabase = createAuthedClient(authToken);

  // RLS ensures only the owner's row can be updated; no userId from client.
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("is_read", false);

  if (error) throw new Error(error.message);
}

export async function markAllNotificationsRead(
  authToken: string
): Promise<void> {
  const supabase = createAuthedClient(authToken);

  const now = new Date().toISOString();
  // RLS scopes update to the authenticated customer's rows only.
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true, read_at: now })
    .eq("is_read", false);

  if (error) throw new Error(error.message);
}
