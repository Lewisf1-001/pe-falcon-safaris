import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/pool";
import { AuthenticatedRequest, requireAuth } from "../middleware/requireAuth";
import {
  sendAdminBookingNotificationEmail,
  sendBookingConfirmationEmail,
} from "../services/email";
import {
  isCurrencyCode,
  toUsdExact,
  type CurrencyCode,
} from "../services/currency";

const router = Router();

type BookingRow = {
  id: number;
  user_id: number;
  package_id: number;
  package_name: string;
  package_slug: string;
  travel_date: string;
  guests: number;
  total_price_usd: number;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

function formatTravelDate(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
      return value.slice(0, 10);
    }

    return String(value);
  }

  return date.toISOString().slice(0, 10);
}

export function formatBooking(row: BookingRow) {
  return {
    id: Number(row.id),
    userId: Number(row.user_id),
    packageId: Number(row.package_id),
    packageName: row.package_name,
    packageSlug: row.package_slug,
    travelDate: formatTravelDate(row.travel_date),
    guests: row.guests,
    totalPriceUsd: Number(row.total_price_usd),
    status: row.status,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const createBookingSchema = z.object({
  packageSlug: z.string().trim().min(1, "Package is required"),
  travelDate: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Travel date must be YYYY-MM-DD"),
  guests: z.coerce.number().int().min(1, "At least 1 guest is required").max(20),
  notes: z.string().trim().max(1000).optional().nullable(),
});

router.use(requireAuth);

router.get("/", async (req: AuthenticatedRequest, res, next) => {
  try {
    const result = await pool.query<BookingRow>(
      `SELECT b.id, b.user_id, b.package_id, p.name AS package_name, p.slug AS package_slug,
              b.travel_date, b.guests, b.total_price_usd, b.status, b.notes,
              b.created_at, b.updated_at
       FROM bookings b
       INNER JOIN packages p ON p.id = b.package_id
       WHERE b.user_id = $1
       ORDER BY b.created_at DESC`,
      [req.user!.userId]
    );

    return res.json({
      bookings: result.rows.map(formatBooking),
    });
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req: AuthenticatedRequest, res, next) => {
  try {
    const bookingId = z.coerce.number().int().positive().parse(req.params.id);

    const result = await pool.query<BookingRow>(
      `SELECT b.id, b.user_id, b.package_id, p.name AS package_name, p.slug AS package_slug,
              b.travel_date, b.guests, b.total_price_usd, b.status, b.notes,
              b.created_at, b.updated_at
       FROM bookings b
       INNER JOIN packages p ON p.id = b.package_id
       WHERE b.id = $1 AND b.user_id = $2`,
      [bookingId, req.user!.userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Booking not found." });
    }

    return res.json({ booking: formatBooking(result.rows[0]) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid booking id." });
    }

    next(error);
  }
});

router.post("/", async (req: AuthenticatedRequest, res, next) => {
  try {
    const parsed = createBookingSchema.safeParse(req.body);

    if (!parsed.success) {
      const message = parsed.error.errors[0]?.message ?? "Invalid input";
      return res.status(400).json({ error: message });
    }

    const { packageSlug, travelDate, guests, notes } = parsed.data;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(`${travelDate}T00:00:00`);

    if (Number.isNaN(selectedDate.getTime()) || selectedDate < today) {
      return res.status(400).json({ error: "Travel date must be today or in the future." });
    }

    const packageResult = await pool.query(
      `SELECT id, name, slug, starting_price, price_currency, starting_price_usd, is_active
       FROM packages
       WHERE slug = $1`,
      [packageSlug]
    );

    if (packageResult.rowCount === 0 || !packageResult.rows[0].is_active) {
      return res.status(404).json({ error: "Safari package not found." });
    }

    const safariPackage = packageResult.rows[0];
    const priceCurrency = isCurrencyCode(String(safariPackage.price_currency))
      ? (safariPackage.price_currency as CurrencyCode)
      : "USD";
    const unitPrice = Number(safariPackage.starting_price);
    // Multiply in the package currency first (e.g. 10 KES × 2 = 20), then convert to USD.
    // Using rounded USD (0.08) × guests causes off-by-one KES totals.
    const totalInPackageCurrency = unitPrice * guests;
    const totalPriceUsd = toUsdExact(totalInPackageCurrency, priceCurrency);

    const userResult = await pool.query(
      `SELECT id, first_name, last_name, email, email_verified
       FROM users
       WHERE id = $1`,
      [req.user!.userId]
    );

    if (userResult.rowCount === 0) {
      return res.status(404).json({ error: "User not found." });
    }

    const user = userResult.rows[0];

    if (!user.email_verified) {
      return res.status(403).json({
        error: "Please verify your email before making a booking.",
      });
    }

    const insertResult = await pool.query<BookingRow>(
      `INSERT INTO bookings (
         user_id, package_id, travel_date, guests, total_price_usd, status, notes
       )
       VALUES ($1, $2, $3, $4, $5, 'pending', $6)
       RETURNING id, user_id, package_id, travel_date, guests, total_price_usd, status, notes,
                 created_at, updated_at`,
      [user.id, safariPackage.id, travelDate, guests, totalPriceUsd, notes?.trim() || null]
    );

    const bookingRow = {
      ...insertResult.rows[0],
      package_name: safariPackage.name,
      package_slug: safariPackage.slug,
    };

    const bookingDetails = {
      packageName: safariPackage.name as string,
      travelDate,
      guests,
      totalPriceUsd,
      status: "pending",
      notes: notes?.trim() || null,
    };

    try {
      await sendBookingConfirmationEmail(user.email, user.first_name, bookingDetails);
    } catch {
      await pool.query("DELETE FROM bookings WHERE id = $1", [bookingRow.id]);
      return res.status(503).json({
        error:
          "Booking could not be completed because the confirmation email failed to send. Please try again.",
      });
    }

    try {
      const adminResult = await pool.query(
        `SELECT email
         FROM admins
         WHERE status = 'active' AND email IS NOT NULL AND email <> ''`
      );

      const adminEmails = adminResult.rows
        .map((row) => row.email as string)
        .filter(Boolean);

      const notifyEmail = process.env.ADMIN_NOTIFY_EMAIL?.trim();
      if (notifyEmail) {
        adminEmails.push(notifyEmail);
      }

      await sendAdminBookingNotificationEmail(adminEmails, {
        ...bookingDetails,
        clientName: `${user.first_name} ${user.last_name ?? ""}`.trim() || user.first_name,
        clientEmail: user.email,
      });
    } catch (error) {
      console.error("Booking saved, but admin notification failed:", error);
    }

    return res.status(201).json({
      message: "Booking request submitted. A confirmation email has been sent.",
      booking: formatBooking(bookingRow),
    });
  } catch (error) {
    next(error);
  }
});

export default router;
