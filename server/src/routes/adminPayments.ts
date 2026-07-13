import { Router } from "express";
import { pool } from "../db/pool";
import { requireAdminAuth } from "../middleware/requireAdminAuth";
import { formatPayment } from "./payments";

const router = Router();

router.use(requireAdminAuth);

router.get("/", async (_req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT p.*, pk.name AS package_name, pk.slug AS package_slug, b.travel_date,
              u.first_name, u.last_name, u.email
       FROM payments p
       INNER JOIN bookings b ON b.id = p.booking_id
       INNER JOIN packages pk ON pk.id = b.package_id
       INNER JOIN users u ON u.id = p.user_id
       ORDER BY p.created_at DESC`
    );

    return res.json({
      payments: result.rows.map((row) => ({
        ...formatPayment(row),
        clientName: `${row.first_name} ${row.last_name}`.trim(),
        clientEmail: row.email,
      })),
    });
  } catch (error) {
    next(error);
  }
});

export default router;
