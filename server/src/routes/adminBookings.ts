import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/pool";
import { requireAdminAuth } from "../middleware/requireAdminAuth";
import { formatBooking } from "./bookings";

const router = Router();

const statusSchema = z.object({
  status: z.enum(["pending", "confirmed", "cancelled"]),
});

router.use(requireAdminAuth);

router.get("/", async (_req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT b.id, b.user_id, b.package_id, p.name AS package_name, p.slug AS package_slug,
              b.travel_date, b.guests, b.total_price_usd, b.status, b.notes,
              b.created_at, b.updated_at,
              u.first_name, u.last_name, u.email
       FROM bookings b
       INNER JOIN packages p ON p.id = b.package_id
       INNER JOIN users u ON u.id = b.user_id
       ORDER BY b.created_at DESC`
    );

    return res.json({
      bookings: result.rows.map((row) => ({
        ...formatBooking(row),
        clientName: `${row.first_name} ${row.last_name}`.trim(),
        clientEmail: row.email,
      })),
    });
  } catch (error) {
    next(error);
  }
});

router.patch("/:id", async (req, res, next) => {
  try {
    const bookingId = z.coerce.number().int().positive().parse(req.params.id);
    const parsed = statusSchema.safeParse(req.body);

    if (!parsed.success) {
      const message = parsed.error.errors[0]?.message ?? "Invalid input";
      return res.status(400).json({ error: message });
    }

    const result = await pool.query(
      `UPDATE bookings
       SET status = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, user_id, package_id, travel_date, guests, total_price_usd, status, notes,
                 created_at, updated_at`,
      [parsed.data.status, bookingId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Booking not found." });
    }

    const packageResult = await pool.query(
      `SELECT name, slug FROM packages WHERE id = $1`,
      [result.rows[0].package_id]
    );

    const clientResult = await pool.query(
      `SELECT first_name, last_name, email FROM users WHERE id = $1`,
      [result.rows[0].user_id]
    );

    const booking = formatBooking({
      ...result.rows[0],
      package_name: packageResult.rows[0]?.name ?? "Unknown package",
      package_slug: packageResult.rows[0]?.slug ?? "",
    });

    return res.json({
      message: "Booking status updated.",
      booking: {
        ...booking,
        clientName: clientResult.rows[0]
          ? `${clientResult.rows[0].first_name} ${clientResult.rows[0].last_name}`.trim()
          : "Unknown client",
        clientEmail: clientResult.rows[0]?.email ?? "",
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid booking id." });
    }

    next(error);
  }
});

export default router;
