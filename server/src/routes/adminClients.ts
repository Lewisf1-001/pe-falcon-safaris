import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/pool";
import { requireAdminAuth } from "../middleware/requireAdminAuth";
import {
  createVerificationToken,
  getVerificationExpiry,
  getPasswordResetExpiry,
  sendVerificationEmail,
  sendPasswordResetEmail,
} from "../services/email";

const router = Router();

const updateClientSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(100),
  lastName: z.string().trim().min(1, "Last name is required").max(100),
  email: z.string().trim().email("Invalid email address").max(255),
});

function formatClient(row: {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  email_verified: boolean;
  created_at: Date | string;
  updated_at?: Date | string;
  booking_count?: string | number;
}) {
  return {
    id: Number(row.id),
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    emailVerified: row.email_verified,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    bookingCount: row.booking_count != null ? Number(row.booking_count) : undefined,
  };
}

router.use(requireAdminAuth);

router.get("/stats", async (_req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE email_verified = TRUE)::int AS verified,
         COUNT(*) FILTER (WHERE email_verified = FALSE)::int AS unverified
       FROM users`
    );

    const stats = result.rows[0];

    return res.json({
      total: stats.total,
      verified: stats.verified,
      unverified: stats.unverified,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/", async (req, res, next) => {
  try {
    const search = z.string().trim().optional().parse(req.query.q);
    const values: string[] = [];
    let whereClause = "";

    if (search) {
      values.push(`%${search.toLowerCase()}%`);
      whereClause = `
        WHERE LOWER(u.first_name) LIKE $1
           OR LOWER(u.last_name) LIKE $1
           OR LOWER(u.email) LIKE $1
           OR LOWER(CONCAT(u.first_name, ' ', u.last_name)) LIKE $1
      `;
    }

    const result = await pool.query(
      `SELECT u.id, u.first_name, u.last_name, u.email, u.email_verified, u.created_at,
              COUNT(b.id)::int AS booking_count
       FROM users u
       LEFT JOIN bookings b ON b.user_id = u.id
       ${whereClause}
       GROUP BY u.id
       ORDER BY u.created_at DESC`,
      values
    );

    return res.json({
      clients: result.rows.map(formatClient),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid search query." });
    }

    next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const clientId = z.coerce.number().int().positive().parse(req.params.id);

    const clientResult = await pool.query(
      `SELECT u.id, u.first_name, u.last_name, u.email, u.email_verified, u.created_at, u.updated_at,
              COUNT(b.id)::int AS booking_count
       FROM users u
       LEFT JOIN bookings b ON b.user_id = u.id
       WHERE u.id = $1
       GROUP BY u.id`,
      [clientId]
    );

    if (clientResult.rowCount === 0) {
      return res.status(404).json({ error: "Client not found." });
    }

    const bookingsResult = await pool.query(
      `SELECT b.id, b.travel_date, b.guests, b.total_price_usd, b.status, b.created_at,
              p.name AS package_name
       FROM bookings b
       INNER JOIN packages p ON p.id = b.package_id
       WHERE b.user_id = $1
       ORDER BY b.created_at DESC
       LIMIT 10`,
      [clientId]
    );

    const paymentsResult = await pool.query(
      `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE status = 'completed')::int AS completed
       FROM payments
       WHERE user_id = $1`,
      [clientId]
    );

    const paymentStats = paymentsResult.rows[0];

    return res.json({
      client: formatClient(clientResult.rows[0]),
      bookings: bookingsResult.rows.map((row) => ({
        id: Number(row.id),
        packageName: row.package_name,
        travelDate: row.travel_date,
        guests: Number(row.guests),
        totalPriceUsd: Number(row.total_price_usd),
        status: row.status,
        createdAt: row.created_at,
      })),
      payments: {
        total: paymentStats.total,
        completed: paymentStats.completed,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid client id." });
    }

    next(error);
  }
});

router.patch("/:id", async (req, res, next) => {
  try {
    const clientId = z.coerce.number().int().positive().parse(req.params.id);
    const parsed = updateClientSchema.safeParse(req.body);

    if (!parsed.success) {
      const message = parsed.error.errors[0]?.message ?? "Invalid input";
      return res.status(400).json({ error: message });
    }

    const { firstName, lastName, email } = parsed.data;
    const normalizedEmail = email.toLowerCase();

    const currentResult = await pool.query(
      `SELECT id, email, email_verified, first_name
       FROM users
       WHERE id = $1`,
      [clientId]
    );

    if (currentResult.rowCount === 0) {
      return res.status(404).json({ error: "Client not found." });
    }

    const currentUser = currentResult.rows[0];
    const emailChanged = currentUser.email !== normalizedEmail;

    if (emailChanged) {
      const existingEmail = await pool.query(
        `SELECT id FROM users WHERE email = $1 AND id <> $2`,
        [normalizedEmail, clientId]
      );

      if (existingEmail.rowCount && existingEmail.rowCount > 0) {
        return res.status(409).json({ error: "An account with this email already exists." });
      }
    }

    if (emailChanged) {
      const verificationToken = createVerificationToken();
      const verificationExpiresAt = getVerificationExpiry();

      const updatedResult = await pool.query(
        `UPDATE users
         SET first_name = $1,
             last_name = $2,
             email = $3,
             email_verified = FALSE,
             verification_token = $4,
             verification_token_expires_at = $5,
             updated_at = NOW()
         WHERE id = $6
         RETURNING id, first_name, last_name, email, email_verified, created_at, updated_at`,
        [
          firstName,
          lastName,
          normalizedEmail,
          verificationToken,
          verificationExpiresAt,
          clientId,
        ]
      );

      try {
        await sendVerificationEmail(normalizedEmail, firstName, verificationToken);
      } catch {
        await pool.query(
          `UPDATE users
           SET email = $1,
               email_verified = $2,
               verification_token = NULL,
               verification_token_expires_at = NULL,
               updated_at = NOW()
           WHERE id = $3`,
          [currentUser.email, currentUser.email_verified, clientId]
        );

        return res.status(503).json({
          error: "Client could not be updated because the verification email failed to send.",
        });
      }

      return res.json({
        message: "Client updated. A verification email was sent to the new address.",
        requiresEmailVerification: true,
        client: formatClient(updatedResult.rows[0]),
      });
    }

    const updatedResult = await pool.query(
      `UPDATE users
       SET first_name = $1,
           last_name = $2,
           updated_at = NOW()
       WHERE id = $3
       RETURNING id, first_name, last_name, email, email_verified, created_at, updated_at`,
      [firstName, lastName, clientId]
    );

    return res.json({
      message: "Client updated successfully.",
      client: formatClient(updatedResult.rows[0]),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid client id." });
    }

    next(error);
  }
});

router.post("/:id/resend-verification", async (req, res, next) => {
  try {
    const clientId = z.coerce.number().int().positive().parse(req.params.id);

    const result = await pool.query(
      `SELECT id, first_name, email, email_verified
       FROM users
       WHERE id = $1`,
      [clientId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Client not found." });
    }

    const user = result.rows[0];

    if (user.email_verified) {
      return res.status(400).json({ error: "This client's email is already verified." });
    }

    const verificationToken = createVerificationToken();
    const verificationExpiresAt = getVerificationExpiry();

    await pool.query(
      `UPDATE users
       SET verification_token = $1,
           verification_token_expires_at = $2,
           updated_at = NOW()
       WHERE id = $3`,
      [verificationToken, verificationExpiresAt, clientId]
    );

    try {
      await sendVerificationEmail(user.email, user.first_name, verificationToken);
    } catch {
      return res.status(503).json({
        error: "Verification email could not be sent. Please try again later.",
      });
    }

    return res.json({ message: "Verification email sent successfully." });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid client id." });
    }

    next(error);
  }
});

router.post("/:id/send-password-reset", async (req, res, next) => {
  try {
    const clientId = z.coerce.number().int().positive().parse(req.params.id);

    const result = await pool.query(
      `SELECT id, first_name, email
       FROM users
       WHERE id = $1`,
      [clientId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Client not found." });
    }

    const user = result.rows[0];
    const resetToken = createVerificationToken();
    const resetExpiresAt = getPasswordResetExpiry();

    await pool.query(
      `UPDATE users
       SET password_reset_token = $1,
           password_reset_token_expires_at = $2,
           updated_at = NOW()
       WHERE id = $3`,
      [resetToken, resetExpiresAt, clientId]
    );

    try {
      await sendPasswordResetEmail(user.email, user.first_name, resetToken);
    } catch {
      await pool.query(
        `UPDATE users
         SET password_reset_token = NULL,
             password_reset_token_expires_at = NULL,
             updated_at = NOW()
         WHERE id = $1`,
        [clientId]
      );

      return res.status(503).json({
        error: "Password reset email could not be sent. Please try again later.",
      });
    }

    return res.json({ message: "Password reset email sent successfully." });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid client id." });
    }

    next(error);
  }
});

export default router;
