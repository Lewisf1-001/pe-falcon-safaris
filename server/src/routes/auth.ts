import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { pool } from "../db/pool";
import { requireAuth, AuthenticatedRequest } from "../middleware/requireAuth";
import {
  createVerificationToken,
  getVerificationExpiry,
  getPasswordResetExpiry,
  sendVerificationEmail,
  sendPasswordResetEmail,
} from "../services/email";
import { signAuthToken } from "../services/jwt";

const router = Router();

const registerSchema = z
  .object({
    firstName: z.string().trim().min(1, "First name is required").max(100),
    lastName: z.string().trim().min(1, "Last name is required").max(100),
    email: z.string().trim().email("Invalid email address").max(255),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

const loginSchema = z.object({
  email: z.string().trim().email("Invalid email address"),
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

const PASSWORD_RESET_SENT_MESSAGE =
  "If an account exists for that email, a password reset link has been sent.";

const updateProfileSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(100),
  lastName: z.string().trim().min(1, "Last name is required").max(100),
  email: z.string().trim().email("Invalid email address").max(255),
});

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

function formatUser(user: {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  email_verified: boolean;
}) {
  return {
    id: user.id,
    firstName: user.first_name,
    lastName: user.last_name,
    email: user.email,
    emailVerified: user.email_verified,
  };
}

router.post("/login", async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body);

    if (!parsed.success) {
      const message = parsed.error.errors[0]?.message ?? "Invalid input";
      return res.status(400).json({ error: message });
    }

    const { email, password } = parsed.data;

    const result = await pool.query(
      `SELECT id, first_name, last_name, email, password_hash, email_verified
       FROM users
       WHERE email = $1`,
      [email.toLowerCase()]
    );

    if (result.rowCount === 0) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const user = result.rows[0];
    const passwordMatches = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatches) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    if (!user.email_verified) {
      return res.status(403).json({
        error: "Please verify your email before signing in.",
        requiresEmailVerification: true,
      });
    }

    const token = signAuthToken({
      userId: user.id,
      email: user.email,
    });

    return res.json({
      message: "Signed in successfully.",
      token,
      user: {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        emailVerified: user.email_verified,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get("/me", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id, first_name, last_name, email, email_verified
       FROM users
       WHERE id = $1`,
      [req.user!.userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "User not found." });
    }

    const user = result.rows[0];

    return res.json({
      user: formatUser(user),
    });
  } catch (error) {
    next(error);
  }
});

router.patch("/profile", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const parsed = updateProfileSchema.safeParse(req.body);

    if (!parsed.success) {
      const message = parsed.error.errors[0]?.message ?? "Invalid input";
      return res.status(400).json({ error: message });
    }

    const { firstName, lastName, email } = parsed.data;
    const normalizedEmail = email.toLowerCase();

    const currentResult = await pool.query(
      `SELECT id, email, email_verified
       FROM users
       WHERE id = $1`,
      [req.user!.userId]
    );

    if (currentResult.rowCount === 0) {
      return res.status(404).json({ error: "User not found." });
    }

    const currentUser = currentResult.rows[0];
    const emailChanged = currentUser.email !== normalizedEmail;

    if (emailChanged) {
      const existingEmail = await pool.query(
        `SELECT id FROM users WHERE email = $1 AND id <> $2`,
        [normalizedEmail, currentUser.id]
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
         RETURNING id, first_name, last_name, email, email_verified`,
        [
          firstName,
          lastName,
          normalizedEmail,
          verificationToken,
          verificationExpiresAt,
          currentUser.id,
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
          [currentUser.email, currentUser.email_verified, currentUser.id]
        );

        return res.status(503).json({
          error: "Profile could not be updated because the verification email failed to send.",
        });
      }

      return res.json({
        message: "Profile updated. Please verify your new email address.",
        requiresEmailVerification: true,
        user: formatUser(updatedResult.rows[0]),
      });
    }

    const updatedResult = await pool.query(
      `UPDATE users
       SET first_name = $1,
           last_name = $2,
           updated_at = NOW()
       WHERE id = $3
       RETURNING id, first_name, last_name, email, email_verified`,
      [firstName, lastName, currentUser.id]
    );

    return res.json({
      message: "Profile updated successfully.",
      user: formatUser(updatedResult.rows[0]),
    });
  } catch (error) {
    next(error);
  }
});

router.post("/change-password", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const parsed = changePasswordSchema.safeParse(req.body);

    if (!parsed.success) {
      const message = parsed.error.errors[0]?.message ?? "Invalid input";
      return res.status(400).json({ error: message });
    }

    const { currentPassword, newPassword } = parsed.data;

    const result = await pool.query(
      `SELECT password_hash FROM users WHERE id = $1`,
      [req.user!.userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "User not found." });
    }

    const user = result.rows[0];
    const passwordMatches = await bcrypt.compare(currentPassword, user.password_hash);

    if (!passwordMatches) {
      return res.status(401).json({ error: "Current password is incorrect." });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await pool.query(
      `UPDATE users
       SET password_hash = $1,
           updated_at = NOW()
       WHERE id = $2`,
      [passwordHash, req.user!.userId]
    );

    return res.json({ message: "Password changed successfully." });
  } catch (error) {
    next(error);
  }
});

router.post("/register", async (req, res, next) => {
  try {
    const parsed = registerSchema.safeParse(req.body);

    if (!parsed.success) {
      const message = parsed.error.errors[0]?.message ?? "Invalid input";
      return res.status(400).json({ error: message });
    }

    const { firstName, lastName, email, password } = parsed.data;
    const passwordHash = await bcrypt.hash(password, 12);
    const verificationToken = createVerificationToken();
    const verificationExpiresAt = getVerificationExpiry();

    const result = await pool.query(
      `INSERT INTO users (
         first_name,
         last_name,
         email,
         password_hash,
         email_verified,
         verification_token,
         verification_token_expires_at
       )
       VALUES ($1, $2, $3, $4, FALSE, $5, $6)
       RETURNING id, first_name, last_name, email, email_verified, created_at`,
      [
        firstName,
        lastName,
        email.toLowerCase(),
        passwordHash,
        verificationToken,
        verificationExpiresAt,
      ]
    );

    const user = result.rows[0];

    try {
      await sendVerificationEmail(user.email, user.first_name, verificationToken);
    } catch (emailError) {
      await pool.query("DELETE FROM users WHERE id = $1", [user.id]);
      return res.status(503).json({
        error:
          "Account could not be created because the verification email failed to send. Check SMTP settings and try again.",
      });
    }

    return res.status(201).json({
      message:
        "Account created. Please check your email to verify your account before signing in.",
      requiresEmailVerification: true,
      user: {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        emailVerified: user.email_verified,
        createdAt: user.created_at,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get("/verify-email", async (req, res, next) => {
  try {
    const token = z.string().min(1, "Verification token is required").parse(req.query.token);

    const result = await pool.query(
      `SELECT id, email_verified, verification_token_expires_at
       FROM users
       WHERE verification_token = $1`,
      [token]
    );

    if (result.rowCount === 0) {
      return res.status(400).json({ error: "Invalid or expired verification link." });
    }

    const user = result.rows[0];

    if (user.email_verified) {
      return res.json({
        message: "Your email is already verified. You can sign in.",
        alreadyVerified: true,
      });
    }

    if (
      !user.verification_token_expires_at ||
      new Date(user.verification_token_expires_at) < new Date()
    ) {
      return res.status(400).json({ error: "Verification link has expired." });
    }

    await pool.query(
      `UPDATE users
       SET email_verified = TRUE,
           verification_token = NULL,
           verification_token_expires_at = NULL,
           updated_at = NOW()
       WHERE id = $1`,
      [user.id]
    );

    return res.json({
      message: "Email verified successfully. You can now sign in.",
      verified: true,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Verification token is required." });
    }

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
      `SELECT id, first_name, email
       FROM users
       WHERE email = $1`,
      [email.toLowerCase()]
    );

    if (result.rowCount === 0) {
      return res.json({ message: PASSWORD_RESET_SENT_MESSAGE });
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
      [resetToken, resetExpiresAt, user.id]
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
        [user.id]
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
       FROM users
       WHERE password_reset_token = $1`,
      [token]
    );

    if (result.rowCount === 0) {
      return res.status(400).json({ error: "Invalid or expired reset link." });
    }

    const user = result.rows[0];

    if (
      !user.password_reset_token_expires_at ||
      new Date(user.password_reset_token_expires_at) < new Date()
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
       FROM users
       WHERE password_reset_token = $1`,
      [token]
    );

    if (result.rowCount === 0) {
      return res.status(400).json({ error: "Invalid or expired reset link." });
    }

    const user = result.rows[0];

    if (
      !user.password_reset_token_expires_at ||
      new Date(user.password_reset_token_expires_at) < new Date()
    ) {
      return res.status(400).json({ error: "Reset link has expired." });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await pool.query(
      `UPDATE users
       SET password_hash = $1,
           password_reset_token = NULL,
           password_reset_token_expires_at = NULL,
           updated_at = NOW()
       WHERE id = $2`,
      [passwordHash, user.id]
    );

    return res.json({
      message: "Password reset successfully. You can now sign in.",
      reset: true,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
