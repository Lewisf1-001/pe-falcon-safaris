import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = Deno.env.get("ALLOWED_ORIGINS") || "*";
const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGINS,
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
};

const VALID_STATUSES = ["draft", "sent", "viewed", "accepted", "declined", "expired", "cancelled"];
const CUSTOMER_CANCELLABLE = ["draft", "sent", "viewed"];

function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function jsonSuccess(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: { Authorization: req.headers.get("Authorization")! },
      },
    });

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return jsonError("Unauthorized", 401);
    }

    // Determine if user is admin or customer
    const { data: admin } = await supabase
      .from("admins")
      .select("id")
      .eq("auth_id", user.id)
      .eq("status", "active")
      .single();

    const isAdmin = !!admin;

    const { data: profile } = await supabase
      .from("users")
      .select("id")
      .eq("auth_id", user.id)
      .single();

    if (!profile) {
      return jsonError("User profile not found", 404);
    }

    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);

    // ================================================================
    // CUSTOMER ENDPOINTS
    // ================================================================

    // GET /quotations - Customer lists own quotations
    if (req.method === "GET" && pathParts.length === 1 && !isAdmin) {
      const { data, error } = await supabase
        .from("quotations")
        .select(`
          *,
          packages!quotations_package_id_fkey (name, slug)
        `)
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const quotations = data.map((q) => ({
        id: Number(q.id),
        userId: Number(q.user_id),
        bookingId: q.booking_id ? Number(q.booking_id) : null,
        packageId: q.package_id ? Number(q.package_id) : null,
        packageName: q.packages?.name || null,
        packageSlug: q.packages?.slug || null,
        title: q.title,
        description: q.description,
        travelDate: q.travel_date?.slice(0, 10),
        guests: q.guests,
        currency: q.currency,
        subtotalUsd: Number(q.subtotal_usd),
        discountUsd: Number(q.discount_usd),
        taxUsd: Number(q.tax_usd),
        totalUsd: Number(q.total_usd),
        validUntil: q.valid_until?.slice(0, 10),
        status: q.status,
        notesCustomer: q.notes_customer,
        sentAt: q.sent_at,
        viewedAt: q.viewed_at,
        acceptedAt: q.accepted_at,
        declinedAt: q.declined_at,
        createdAt: q.created_at,
        updatedAt: q.updated_at,
      }));

      return jsonSuccess({ quotations });
    }

    // GET /quotations/admin - Admin lists all quotations
    if (req.method === "GET" && pathParts.length === 2 && pathParts[1] === "admin" && isAdmin) {
      const { data, error } = await supabase
        .from("quotations")
        .select(`
          *,
          packages!quotations_package_id_fkey (name, slug),
          users!quotations_user_id_fkey (first_name, last_name, email)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const quotations = data.map((q) => ({
        id: Number(q.id),
        userId: Number(q.user_id),
        bookingId: q.booking_id ? Number(q.booking_id) : null,
        packageId: q.package_id ? Number(q.package_id) : null,
        packageName: q.packages?.name || null,
        packageSlug: q.packages?.slug || null,
        clientName: `${q.users?.first_name || ""} ${q.users?.last_name || ""}`.trim(),
        clientEmail: q.users?.email,
        title: q.title,
        description: q.description,
        travelDate: q.travel_date?.slice(0, 10),
        guests: q.guests,
        currency: q.currency,
        subtotalUsd: Number(q.subtotal_usd),
        discountUsd: Number(q.discount_usd),
        taxUsd: Number(q.tax_usd),
        totalUsd: Number(q.total_usd),
        validUntil: q.valid_until?.slice(0, 10),
        status: q.status,
        notesCustomer: q.notes_customer,
        notesAdmin: q.notes_admin,
        sentAt: q.sent_at,
        viewedAt: q.viewed_at,
        acceptedAt: q.accepted_at,
        declinedAt: q.declined_at,
        createdAt: q.created_at,
        updatedAt: q.updated_at,
      }));

      return jsonSuccess({ quotations });
    }

    // GET /quotations/:id - Get single quotation (customer or admin)
    if (req.method === "GET" && pathParts.length === 2 && pathParts[1] !== "admin") {
      const quotationId = parseInt(pathParts[1]);
      if (isNaN(quotationId)) return jsonError("Invalid quotation ID", 400);

      const { data: quotation, error: fetchError } = await supabase
        .from("quotations")
        .select(`
          *,
          packages!quotations_package_id_fkey (name, slug)
        `)
        .eq("id", quotationId)
        .single();

      if (fetchError || !quotation) {
        return jsonError("Quotation not found", 404);
      }

      // Authorization: customer can only see own, admin can see all
      if (!isAdmin && quotation.user_id !== profile.id) {
        return jsonError("Quotation not found", 404);
      }

      // Load items
      const { data: items } = await supabase
        .from("quotation_items")
        .select("*")
        .eq("quotation_id", quotationId)
        .order("sort_order", { ascending: true });

      // Mark as viewed if customer and status is 'sent'
      if (!isAdmin && quotation.status === "sent") {
        await supabase
          .from("quotations")
          .update({ status: "viewed", viewed_at: new Date().toISOString() })
          .eq("id", quotationId);
        quotation.status = "viewed";
      }

      return jsonSuccess({
        quotation: {
          id: Number(quotation.id),
          userId: Number(quotation.user_id),
          bookingId: quotation.booking_id ? Number(quotation.booking_id) : null,
          packageId: quotation.package_id ? Number(quotation.package_id) : null,
          packageName: quotation.packages?.name || null,
          packageSlug: quotation.packages?.slug || null,
          title: quotation.title,
          description: quotation.description,
          travelDate: quotation.travel_date?.slice(0, 10),
          guests: quotation.guests,
          currency: quotation.currency,
          subtotalUsd: Number(quotation.subtotal_usd),
          discountUsd: Number(quotation.discount_usd),
          taxUsd: Number(quotation.tax_usd),
          totalUsd: Number(quotation.total_usd),
          validUntil: quotation.valid_until?.slice(0, 10),
          status: quotation.status,
          notesCustomer: quotation.notes_customer,
          sentAt: quotation.sent_at,
          viewedAt: quotation.viewed_at,
          acceptedAt: quotation.accepted_at,
          declinedAt: quotation.declined_at,
          createdAt: quotation.created_at,
          updatedAt: quotation.updated_at,
          items: (items || []).map((i) => ({
            id: Number(i.id),
            quotationId: Number(i.quotation_id),
            description: i.description,
            quantity: i.quantity,
            unitPriceUsd: Number(i.unit_price_usd),
            amountUsd: Number(i.amount_usd),
            category: i.category,
            sortOrder: i.sort_order,
          })),
        },
      });
    }

    // ================================================================
    // CUSTOMER ACTION ENDPOINTS
    // ================================================================

    // POST /quotations/:id/accept - Customer accepts quotation
    if (req.method === "POST" && pathParts.length === 3 && pathParts[2] === "accept" && !isAdmin) {
      const quotationId = parseInt(pathParts[1]);
      if (isNaN(quotationId)) return jsonError("Invalid quotation ID", 400);

      const { data: quotation, error: fetchError } = await supabase
        .from("quotations")
        .select("id, user_id, status, valid_until, booking_id, package_id, travel_date, guests, total_usd")
        .eq("id", quotationId)
        .single();

      if (fetchError || !quotation) {
        return jsonError("Quotation not found", 404);
      }

      if (quotation.user_id !== profile.id) {
        return jsonError("Quotation not found", 404);
      }

      // Validate status
      if (!["sent", "viewed"].includes(quotation.status)) {
        return jsonError(
          `Cannot accept a quotation in '${quotation.status}' status`,
          400
        );
      }

      // Validate not expired
      const validUntil = new Date(quotation.valid_until);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (validUntil < today) {
        // Auto-expire
        await supabase
          .from("quotations")
          .update({ status: "expired", updated_at: new Date().toISOString() })
          .eq("id", quotationId);
        return jsonError("This quotation has expired", 400);
      }

      // Accept the quotation
      const now = new Date().toISOString();
      const { error: updateError } = await supabase
        .from("quotations")
        .update({
          status: "accepted",
          accepted_at: now,
          updated_at: now,
        })
        .eq("id", quotationId);

      if (updateError) throw updateError;

      // If linked to a booking, transition it to 'pending' (awaiting payment)
      if (quotation.booking_id) {
        await supabase
          .from("bookings")
          .update({
            status: "pending",
            total_price_usd: quotation.total_usd,
            updated_at: now,
          })
          .eq("id", quotation.booking_id)
          .in("status", ["inquiry", "quote"]);
      }

      // Fire-and-forget email notification
      try {
        const { data: { session } } = await supabase.auth.getSession();
        fetch(`${supabaseUrl}/functions/v1/email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token || ""}`,
            apikey: supabaseKey,
          },
          body: JSON.stringify({
            action: "quotation-accepted",
            quotationId: quotationId,
          }),
        }).catch(() => {});
      } catch {
        // Non-critical
      }

      return jsonSuccess({ message: "Quotation accepted successfully" });
    }

    // POST /quotations/:id/decline - Customer declines quotation
    if (req.method === "POST" && pathParts.length === 3 && pathParts[2] === "decline" && !isAdmin) {
      const quotationId = parseInt(pathParts[1]);
      if (isNaN(quotationId)) return jsonError("Invalid quotation ID", 400);

      const { data: quotation, error: fetchError } = await supabase
        .from("quotations")
        .select("id, user_id, status")
        .eq("id", quotationId)
        .single();

      if (fetchError || !quotation) {
        return jsonError("Quotation not found", 404);
      }

      if (quotation.user_id !== profile.id) {
        return jsonError("Quotation not found", 404);
      }

      if (!["sent", "viewed"].includes(quotation.status)) {
        return jsonError(
          `Cannot decline a quotation in '${quotation.status}' status`,
          400
        );
      }

      const now = new Date().toISOString();
      const { error: updateError } = await supabase
        .from("quotations")
        .update({
          status: "declined",
          declined_at: now,
          updated_at: now,
        })
        .eq("id", quotationId);

      if (updateError) throw updateError;

      return jsonSuccess({ message: "Quotation declined" });
    }

    // ================================================================
    // ADMIN ENDPOINTS
    // ================================================================

    // POST /quotations/admin - Admin creates quotation with items
    if (req.method === "POST" && pathParts.length === 2 && pathParts[1] === "admin" && isAdmin) {
      const body = await req.json();
      const {
        userId, bookingId, packageId, title, description,
        travelDate, guests, currency, taxUsd,
        notesCustomer, notesAdmin, validUntil, items,
      } = body;

      // Validate required fields
      if (!userId || !title || !travelDate || !guests || !validUntil || !items?.length) {
        return jsonError("Missing required fields", 400);
      }

      // Validate customer exists
      const { data: customer } = await supabase
        .from("users")
        .select("id")
        .eq("id", userId)
        .single();

      if (!customer) {
        return jsonError("Customer not found", 404);
      }

      // Validate guests
      const guestCount = Number(guests);
      if (!Number.isInteger(guestCount) || guestCount < 1 || guestCount > 20) {
        return jsonError("Guests must be 1-20", 400);
      }

      // Validate items
      for (const item of items) {
        if (!item.description || !item.quantity || item.unitPriceUsd === undefined) {
          return jsonError("Each item must have description, quantity, and unitPriceUsd", 400);
        }
        if (item.quantity < 1) {
          return jsonError("Item quantity must be at least 1", 400);
        }
        if (item.unitPriceUsd < 0) {
          return jsonError("Item price cannot be negative", 400);
        }
      }

      // Calculate server-authoritative subtotal
      let subtotalUsd = 0;
      for (const item of items) {
        const amount = item.quantity * item.unitPriceUsd;
        if (item.category === "discount") {
          subtotalUsd -= Math.abs(amount);
        } else {
          subtotalUsd += amount;
        }
      }
      subtotalUsd = Math.max(0, subtotalUsd);

      const taxAmount = Number(taxUsd) || 0;
      const totalUsd = subtotalUsd + taxAmount;

      // Create quotation
      const { data: quotation, error: createError } = await supabase
        .from("quotations")
        .insert({
          user_id: userId,
          booking_id: bookingId || null,
          package_id: packageId || null,
          title,
          description: description || null,
          travel_date: travelDate,
          guests: guestCount,
          currency: currency || "USD",
          subtotal_usd: subtotalUsd,
          discount_usd: 0,
          tax_usd: taxAmount,
          total_usd: totalUsd,
          valid_until: validUntil,
          status: "draft",
          notes_customer: notesCustomer || null,
          notes_admin: notesAdmin || null,
        })
        .select()
        .single();

      if (createError) throw createError;

      // Insert items (server calculates amounts via trigger, but we set sort_order)
      const itemInserts = items.map((item: Record<string, unknown>, index: number) => ({
        quotation_id: quotation.id,
        description: item.description,
        quantity: item.quantity,
        unit_price_usd: item.unitPriceUsd,
        amount_usd: item.quantity * Number(item.unitPriceUsd),
        category: item.category || "other",
        sort_order: index,
      }));

      const { error: itemsError } = await supabase
        .from("quotation_items")
        .insert(itemInserts);

      if (itemsError) throw itemsError;

      // Re-fetch to get trigger-calculated totals
      const { data: updated } = await supabase
        .from("quotations")
        .select("*")
        .eq("id", quotation.id)
        .single();

      return jsonSuccess({
        message: "Quotation created",
        quotation: {
          id: Number(updated.id),
          status: updated.status,
          totalUsd: Number(updated.total_usd),
        },
      }, 201);
    }

    // PATCH /quotations/admin/:id - Admin updates quotation
    if (req.method === "PATCH" && pathParts.length === 3 && pathParts[1] === "admin" && isAdmin) {
      const quotationId = parseInt(pathParts[2]);
      if (isNaN(quotationId)) return jsonError("Invalid quotation ID", 400);

      const { data: existing } = await supabase
        .from("quotations")
        .select("id, status")
        .eq("id", quotationId)
        .single();

      if (!existing) return jsonError("Quotation not found", 404);

      // Only allow editing draft quotations
      if (existing.status !== "draft") {
        return jsonError("Only draft quotations can be edited", 400);
      }

      const body = await req.json();
      const updates: Record<string, unknown> = {};

      if (body.title !== undefined) updates.title = body.title;
      if (body.description !== undefined) updates.description = body.description;
      if (body.travelDate !== undefined) updates.travel_date = body.travelDate;
      if (body.guests !== undefined) updates.guests = body.guests;
      if (body.currency !== undefined) updates.currency = body.currency;
      if (body.taxUsd !== undefined) updates.tax_usd = body.taxUsd;
      if (body.validUntil !== undefined) updates.valid_until = body.validUntil;
      if (body.notesCustomer !== undefined) updates.notes_customer = body.notesCustomer;
      if (body.notesAdmin !== undefined) updates.notes_admin = body.notesAdmin;
      if (body.userId !== undefined) updates.user_id = body.userId;
      if (body.bookingId !== undefined) updates.booking_id = body.bookingId;
      if (body.packageId !== undefined) updates.package_id = body.packageId;

      if (Object.keys(updates).length === 0) {
        return jsonError("No fields to update", 400);
      }

      // If items provided, replace them
      if (body.items && Array.isArray(body.items)) {
        // Delete existing items
        await supabase
          .from("quotation_items")
          .delete()
          .eq("quotation_id", quotationId);

        // Insert new items
        const itemInserts = body.items.map((item: Record<string, unknown>, index: number) => ({
          quotation_id: quotationId,
          description: item.description,
          quantity: item.quantity,
          unit_price_usd: item.unitPriceUsd,
          amount_usd: item.quantity * Number(item.unitPriceUsd),
          category: item.category || "other",
          sort_order: index,
        }));

        const { error: itemsError } = await supabase
          .from("quotation_items")
          .insert(itemInserts);

        if (itemsError) throw itemsError;
      }

      const { error: updateError } = await supabase
        .from("quotations")
        .update(updates)
        .eq("id", quotationId);

      if (updateError) throw updateError;

      return jsonSuccess({ message: "Quotation updated" });
    }

    // PATCH /quotations/admin/:id/send - Admin sends quotation
    if (req.method === "PATCH" && pathParts.length === 4 && pathParts[1] === "admin" && pathParts[3] === "send" && isAdmin) {
      const quotationId = parseInt(pathParts[2]);
      if (isNaN(quotationId)) return jsonError("Invalid quotation ID", 400);

      const { data: existing } = await supabase
        .from("quotations")
        .select("id, status")
        .eq("id", quotationId)
        .single();

      if (!existing) return jsonError("Quotation not found", 404);

      if (existing.status !== "draft") {
        return jsonError("Only draft quotations can be sent", 400);
      }

      const now = new Date().toISOString();
      const { error: updateError } = await supabase
        .from("quotations")
        .update({
          status: "sent",
          sent_at: now,
          updated_at: now,
        })
        .eq("id", quotationId);

      if (updateError) throw updateError;

      // Fire-and-forget email
      try {
        const { data: { session } } = await supabase.auth.getSession();
        fetch(`${supabaseUrl}/functions/v1/email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token || ""}`,
            apikey: supabaseKey,
          },
          body: JSON.stringify({
            action: "quotation-sent",
            quotationId: quotationId,
          }),
        }).catch(() => {});
      } catch {
        // Non-critical
      }

      return jsonSuccess({ message: "Quotation sent" });
    }

    // PATCH /quotations/admin/:id/cancel - Admin cancels quotation
    if (req.method === "PATCH" && pathParts.length === 4 && pathParts[1] === "admin" && pathParts[3] === "cancel" && isAdmin) {
      const quotationId = parseInt(pathParts[2]);
      if (isNaN(quotationId)) return jsonError("Invalid quotation ID", 400);

      const { data: existing } = await supabase
        .from("quotations")
        .select("id, status")
        .eq("id", quotationId)
        .single();

      if (!existing) return jsonError("Quotation not found", 404);

      if (["accepted", "cancelled", "expired"].includes(existing.status)) {
        return jsonError(`Cannot cancel a quotation in '${existing.status}' status`, 400);
      }

      const { error: updateError } = await supabase
        .from("quotations")
        .update({
          status: "cancelled",
          updated_at: new Date().toISOString(),
        })
        .eq("id", quotationId);

      if (updateError) throw updateError;

      return jsonSuccess({ message: "Quotation cancelled" });
    }

    return jsonError("Not found", 404);
  } catch (error) {
    return jsonError(error.message || "Internal server error", 500);
  }
});
