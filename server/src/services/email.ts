import crypto from "crypto";
import nodemailer from "nodemailer";

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS?.replace(/\s+/g, "");
const SMTP_FROM = process.env.SMTP_FROM || SMTP_USER || "noreply@pefalconsafaris.com";
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";
const ADMIN_URL = process.env.ADMIN_URL || "http://localhost:3001";

function isSmtpConfigured() {
  return Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS);
}

function createTransporter() {
  if (!isSmtpConfigured()) {
    return null;
  }

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
    family: 4,
    tls: {
      minVersion: "TLSv1.2",
    },
  });
}

export function createVerificationToken() {
  return crypto.randomBytes(32).toString("hex");
}

export function getVerificationExpiry() {
  return new Date(Date.now() + 24 * 60 * 60 * 1000);
}

export function getPasswordResetExpiry() {
  return new Date(Date.now() + 60 * 60 * 1000);
}

export function getInviteExpiry() {
  return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
}

export function buildVerificationUrl(token: string) {
  return `${CLIENT_URL}/verify-email?token=${token}`;
}

export function buildPasswordResetUrl(token: string) {
  return `${CLIENT_URL}/reset-password?token=${token}`;
}

export function buildAdminPasswordResetUrl(token: string) {
  return `${ADMIN_URL}/reset-password?token=${token}`;
}

export function buildAdminInviteUrl(token: string) {
  return `${ADMIN_URL}/accept-invite?token=${token}`;
}

export async function sendVerificationEmail(
  email: string,
  firstName: string,
  token: string
) {
  const verificationUrl = buildVerificationUrl(token);
  const subject = "Verify your PE Falcon Safaris account";
  const text = [
    `Hi ${firstName},`,
    "",
    "Thanks for registering with PE Falcon Safaris.",
    "Please verify your email address by opening this link:",
    verificationUrl,
    "",
    "This link expires in 24 hours.",
    "",
    "If you did not create an account, you can ignore this email.",
  ].join("\n");

  const html = `
    <p>Hi ${firstName},</p>
    <p>Thanks for registering with <strong>PE Falcon Safaris</strong>.</p>
    <p>Please verify your email address to activate your account:</p>
    <p><a href="${verificationUrl}">Verify my email</a></p>
    <p>This link expires in 24 hours.</p>
    <p>If you did not create an account, you can ignore this email.</p>
  `;

  const transporter = createTransporter();

  if (!transporter) {
    console.log("SMTP not configured. Email verification link:");
    console.log(verificationUrl);
    return;
  }

  try {
    await transporter.sendMail({
      from: SMTP_FROM,
      to: email,
      subject,
      text,
      html,
    });
    console.log(`Verification email sent to ${email}`);
  } catch (error) {
    console.error("Failed to send verification email:", error);
    console.log("Fallback verification link:");
    console.log(verificationUrl);
    throw new Error("Unable to send verification email. Please try again later.");
  }
}

export async function sendPasswordResetEmail(
  email: string,
  firstName: string,
  token: string
) {
  const resetUrl = buildPasswordResetUrl(token);
  const subject = "Reset your PE Falcon Safaris password";
  const text = [
    `Hi ${firstName},`,
    "",
    "We received a request to reset your PE Falcon Safaris password.",
    "Open this link to choose a new password:",
    resetUrl,
    "",
    "This link expires in 1 hour.",
    "",
    "If you did not request a password reset, you can ignore this email.",
  ].join("\n");

  const html = `
    <p>Hi ${firstName},</p>
    <p>We received a request to reset your <strong>PE Falcon Safaris</strong> password.</p>
    <p><a href="${resetUrl}">Reset my password</a></p>
    <p>This link expires in 1 hour.</p>
    <p>If you did not request a password reset, you can ignore this email.</p>
  `;

  const transporter = createTransporter();

  if (!transporter) {
    console.log("SMTP not configured. Password reset link:");
    console.log(resetUrl);
    return;
  }

  try {
    await transporter.sendMail({
      from: SMTP_FROM,
      to: email,
      subject,
      text,
      html,
    });
    console.log(`Password reset email sent to ${email}`);
  } catch (error) {
    console.error("Failed to send password reset email:", error);
    console.log("Fallback password reset link:");
    console.log(resetUrl);
    throw new Error("Unable to send password reset email. Please try again later.");
  }
}

export async function sendAdminPasswordResetEmail(
  email: string,
  username: string,
  token: string
) {
  const resetUrl = buildAdminPasswordResetUrl(token);
  const subject = "Reset your PE Falcon Admin password";
  const text = [
    `Hi ${username},`,
    "",
    "We received a request to reset your PE Falcon Admin password.",
    "Open this link to choose a new password:",
    resetUrl,
    "",
    "This link expires in 1 hour.",
    "",
    "If you did not request a password reset, you can ignore this email.",
  ].join("\n");

  const html = `
    <p>Hi ${username},</p>
    <p>We received a request to reset your <strong>PE Falcon Admin</strong> password.</p>
    <p><a href="${resetUrl}">Reset my password</a></p>
    <p>This link expires in 1 hour.</p>
    <p>If you did not request a password reset, you can ignore this email.</p>
  `;

  const transporter = createTransporter();

  if (!transporter) {
    console.log("SMTP not configured. Admin password reset link:");
    console.log(resetUrl);
    return;
  }

  try {
    await transporter.sendMail({
      from: SMTP_FROM,
      to: email,
      subject,
      text,
      html,
    });
    console.log(`Admin password reset email sent to ${email}`);
  } catch (error) {
    console.error("Failed to send admin password reset email:", error);
    console.log("Fallback admin password reset link:");
    console.log(resetUrl);
    throw new Error("Unable to send password reset email. Please try again later.");
  }
}

export async function sendAdminInviteEmail(
  email: string,
  username: string,
  token: string
) {
  const inviteUrl = buildAdminInviteUrl(token);
  const subject = "You're invited to PE Falcon Admin";
  const text = [
    `Hi ${username},`,
    "",
    "You've been invited to join the PE Falcon Safaris admin team.",
    "Open this link to set your password and sign in:",
    inviteUrl,
    "",
    "This invite expires in 7 days.",
    "",
    "If you were not expecting this invite, you can ignore this email.",
  ].join("\n");

  const html = `
    <p>Hi ${username},</p>
    <p>You've been invited to join the <strong>PE Falcon Safaris</strong> admin team.</p>
    <p><a href="${inviteUrl}">Set your password and sign in</a></p>
    <p>This invite expires in 7 days.</p>
    <p>If you were not expecting this invite, you can ignore this email.</p>
  `;

  const transporter = createTransporter();

  if (!transporter) {
    console.log("SMTP not configured. Admin invite link:");
    console.log(inviteUrl);
    return;
  }

  try {
    await transporter.sendMail({
      from: SMTP_FROM,
      to: email,
      subject,
      text,
      html,
    });
    console.log(`Admin invite email sent to ${email}`);
  } catch (error) {
    console.error("Failed to send admin invite email:", error);
    console.log("Fallback admin invite link:");
    console.log(inviteUrl);
    throw new Error("Unable to send invite email. Please try again later.");
  }
}
