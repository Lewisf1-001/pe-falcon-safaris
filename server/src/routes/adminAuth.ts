import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { pool } from "../db/pool";
import {
  AdminAuthenticatedRequest,
  requireAdminAuth,
} from "../middleware/requireAdminAuth";
import { signAdminToken } from "../services/jwt";
import {
  createVerificationToken,
  getPasswordResetExpiry,
  sendAdminPasswordResetEmail,
} from "../services/email";

const router = Router();

const PASSWORD_RESET_SENT_MESSAGE =
  "If an account exists for that email, a password reset link has been sent.";

const loginSchema = z.object({
  username: z.string().trim().min(1, "Username is required").max(50),
  password: z.string().min(1, "Password is required"),
});

const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Invalid email address"),
});

const resetPasswordSchema = z
  .object({
    token: z.string().min(1, "Reset token is required"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

const acceptInviteSchema = z
  .object({
    token: z.string().min(1, "Invite token is required"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

router.post("/login", async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body);

    if (!parsed.success) {
      const message = parsed.error.errors[0]?.message ?? "Invalid input";
      return res.status(400).json({ error: message });
    }

    const { username, password } = parsed.data;

    const result = await pool.query(
      `SELECT id, username, password_hash, status
       FROM admins
       WHERE username = $1`,
      [username.toLowerCase()]
    );

    if (result.rowCount === 0) {
      return res.status(401).json({ error: "Invalid username or password." });
    }

    const admin = result.rows[0];

    if (admin.status === "invited" || !admin.password_hash) {
      return res.status(403).json({
        error: "Please accept your invite and set a password before signing in.",
      });
    }

    const passwordMatches = await bcrypt.compare(password, admin.password_hash);

    if (!passwordMatches) {
      return res.status(401).json({ error: "Invalid username or password." });
    }

    const token = signAdminToken({
      adminId: admin.id,
      username: admin.username,
    });

    return res.json({
      message: "Signed in successfully.",
      token,
      admin: {
        id: admin.id,
        username: admin.username,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get("/me", requireAdminAuth, async (req: AdminAuthenticatedRequest, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id, username
       FROM admins
       WHERE id = $1`,
      [req.admin!.adminId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Admin user not found." });
    }

    const admin = result.rows[0];

    return res.json({
      admin: {
        id: admin.id,
        username: admin.username,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post("/forgot-password", async (req, res, next) => {
  try {
    const parsed = forgotPasswordSchema.safeParse(req.body);

    if (!parsed.success) {
      const message = parsed.error.errors[0]?.message ?? "Invalid input";
      return res.status(400).json({ error: message });
    }

    const { email } = parsed.data;

    const result = await pool.query(
      `SELECT id, username, email
       FROM admins
       WHERE email = $1`,
      [email.toLowerCase()]
    );

    if (result.rowCount === 0) {
      return res.json({ message: PASSWORD_RESET_SENT_MESSAGE });
    }

    const admin = result.rows[0];
    const resetToken = createVerificationToken();
    const resetExpiresAt = getPasswordResetExpiry();

    await pool.query(
      `UPDATE admins
       SET password_reset_token = $1,
           password_reset_token_expires_at = $2,
           updated_at = NOW()
       WHERE id = $3`,
      [resetToken, resetExpiresAt, admin.id]
    );

    try {
      await sendAdminPasswordResetEmail(admin.email, admin.username, resetToken);
    } catch {
      await pool.query(
        `UPDATE admins
         SET password_reset_token = NULL,
             password_reset_token_expires_at = NULL,
             updated_at = NOW()
         WHERE id = $1`,
        [admin.id]
      );

      return res.status(503).json({
        error: "Password reset email could not be sent. Please try again later.",
      });
    }

    return res.json({ message: PASSWORD_RESET_SENT_MESSAGE });
  } catch (error) {
    next(error);
  }
});

router.get("/reset-password", async (req, res, next) => {
  try {
    const token = z.string().min(1, "Reset token is required").parse(req.query.token);

    const result = await pool.query(
      `SELECT password_reset_token_expires_at
       FROM admins
       WHERE password_reset_token = $1`,
      [token]
    );

    if (result.rowCount === 0) {
      return res.status(400).json({ error: "Invalid or expired reset link." });
    }

    const admin = result.rows[0];

    if (
      !admin.password_reset_token_expires_at ||
      new Date(admin.password_reset_token_expires_at) < new Date()
    ) {
      return res.status(400).json({ error: "Reset link has expired." });
    }

    return res.json({ valid: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Reset token is required." });
    }

    next(error);
  }
});

router.post("/reset-password", async (req, res, next) => {
  try {
    const parsed = resetPasswordSchema.safeParse(req.body);

    if (!parsed.success) {
      const message = parsed.error.errors[0]?.message ?? "Invalid input";
      return res.status(400).json({ error: message });
    }

    const { token, password } = parsed.data;

    const result = await pool.query(
      `SELECT id, password_reset_token_expires_at
       FROM admins
       WHERE password_reset_token = $1`,
      [token]
    );

    if (result.rowCount === 0) {
      return res.status(400).json({ error: "Invalid or expired reset link." });
    }

    const admin = result.rows[0];

    if (
      !admin.password_reset_token_expires_at ||
      new Date(admin.password_reset_token_expires_at) < new Date()
    ) {
      return res.status(400).json({ error: "Reset link has expired." });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await pool.query(
      `UPDATE admins
       SET password_hash = $1,
           password_reset_token = NULL,
           password_reset_token_expires_at = NULL,
           updated_at = NOW()
       WHERE id = $2`,
      [passwordHash, admin.id]
    );

    return res.json({
      message: "Password reset successfully. You can now sign in.",
      reset: true,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/accept-invite", async (req, res, next) => {
  try {
    const token = z.string().min(1, "Invite token is required").parse(req.query.token);

    const result = await pool.query(
      `SELECT username, email, status, invite_token_expires_at
       FROM admins
       WHERE invite_token = $1`,
      [token]
    );

    if (result.rowCount === 0) {
      return res.status(400).json({ error: "Invalid or expired invite link." });
    }

    const admin = result.rows[0];

    if (admin.status !== "invited") {
      return res.status(400).json({ error: "This invite has already been accepted." });
    }

    if (
      !admin.invite_token_expires_at ||
      new Date(admin.invite_token_expires_at) < new Date()
    ) {
      return res.status(400).json({ error: "Invite link has expired." });
    }

    return res.json({
      valid: true,
      username: admin.username,
      email: admin.email,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invite token is required." });
    }

    next(error);
  }
});

router.post("/accept-invite", async (req, res, next) => {
  try {
    const parsed = acceptInviteSchema.safeParse(req.body);

    if (!parsed.success) {
      const message = parsed.error.errors[0]?.message ?? "Invalid input";
      return res.status(400).json({ error: message });
    }

    const { token, password } = parsed.data;

    const result = await pool.query(
      `SELECT id, status, invite_token_expires_at
       FROM admins
       WHERE invite_token = $1`,
      [token]
    );

    if (result.rowCount === 0) {
      return res.status(400).json({ error: "Invalid or expired invite link." });
    }

    const admin = result.rows[0];

    if (admin.status !== "invited") {
      return res.status(400).json({ error: "This invite has already been accepted." });
    }

    if (
      !admin.invite_token_expires_at ||
      new Date(admin.invite_token_expires_at) < new Date()
    ) {
      return res.status(400).json({ error: "Invite link has expired." });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await pool.query(
      `UPDATE admins
       SET password_hash = $1,
           status = 'active',
           invite_token = NULL,
           invite_token_expires_at = NULL,
           updated_at = NOW()
       WHERE id = $2`,
      [passwordHash, admin.id]
    );

    return res.json({
      message: "Account activated successfully. You can now sign in.",
      accepted: true,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
