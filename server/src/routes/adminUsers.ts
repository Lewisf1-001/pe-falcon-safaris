import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/pool";
import {
  AdminAuthenticatedRequest,
  requireAdminAuth,
} from "../middleware/requireAdminAuth";
import {
  createVerificationToken,
  getInviteExpiry,
  sendAdminInviteEmail,
} from "../services/email";

const router = Router();

const createAdminSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters")
    .max(50)
    .regex(/^[a-zA-Z0-9._-]+$/, "Username can only contain letters, numbers, dots, dashes, and underscores"),
  email: z.string().trim().email("Invalid email address").max(255),
});

router.use(requireAdminAuth);

router.get("/", async (_req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id, username, email, status, created_at
       FROM admins
       ORDER BY created_at DESC`
    );

    return res.json({
      admins: result.rows.map((admin) => ({
        id: admin.id,
        username: admin.username,
        email: admin.email,
        status: admin.status,
        createdAt: admin.created_at,
      })),
    });
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req: AdminAuthenticatedRequest, res, next) => {
  try {
    const parsed = createAdminSchema.safeParse(req.body);

    if (!parsed.success) {
      const message = parsed.error.errors[0]?.message ?? "Invalid input";
      return res.status(400).json({ error: message });
    }

    const { username, email } = parsed.data;
    const normalizedUsername = username.toLowerCase();
    const normalizedEmail = email.toLowerCase();

    const existing = await pool.query(
      `SELECT id, status
       FROM admins
       WHERE username = $1 OR email = $2`,
      [normalizedUsername, normalizedEmail]
    );

    if (existing.rowCount && existing.rowCount > 0) {
      const row = existing.rows[0];
      if (row.status === "invited") {
        return res.status(409).json({
          error: "An invite already exists for this username or email. Resend the invite instead.",
        });
      }

      return res.status(409).json({ error: "An admin with this username or email already exists." });
    }

    const inviteToken = createVerificationToken();
    const inviteExpiresAt = getInviteExpiry();

    const result = await pool.query(
      `INSERT INTO admins (
         username,
         email,
         status,
         invite_token,
         invite_token_expires_at
       )
       VALUES ($1, $2, 'invited', $3, $4)
       RETURNING id, username, email, status, created_at`,
      [normalizedUsername, normalizedEmail, inviteToken, inviteExpiresAt]
    );

    const admin = result.rows[0];

    try {
      await sendAdminInviteEmail(admin.email, admin.username, inviteToken);
    } catch {
      await pool.query("DELETE FROM admins WHERE id = $1", [admin.id]);
      return res.status(503).json({
        error: "Invite could not be sent. Check SMTP settings and try again.",
      });
    }

    return res.status(201).json({
      message: "Admin invite sent successfully.",
      admin: {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        status: admin.status,
        createdAt: admin.created_at,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post("/:id/resend-invite", async (req: AdminAuthenticatedRequest, res, next) => {
  try {
    const adminId = z.string().uuid().parse(req.params.id);

    const result = await pool.query(
      `SELECT id, username, email, status
       FROM admins
       WHERE id = $1`,
      [adminId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Admin user not found." });
    }

    const admin = result.rows[0];

    if (admin.status !== "invited") {
      return res.status(400).json({ error: "Only invited admins can receive a new invite." });
    }

    const inviteToken = createVerificationToken();
    const inviteExpiresAt = getInviteExpiry();

    await pool.query(
      `UPDATE admins
       SET invite_token = $1,
           invite_token_expires_at = $2,
           updated_at = NOW()
       WHERE id = $3`,
      [inviteToken, inviteExpiresAt, admin.id]
    );

    try {
      await sendAdminInviteEmail(admin.email, admin.username, inviteToken);
    } catch {
      return res.status(503).json({
        error: "Invite email could not be sent. Please try again later.",
      });
    }

    return res.json({ message: "Invite resent successfully." });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid admin id." });
    }

    next(error);
  }
});

export default router;
