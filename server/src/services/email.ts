import crypto from "crypto";
import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";

const SMTP_HOST =
  process.env.SMTP_HOST ||
  (process.env.SMTP_USER?.toLowerCase().includes("@gmail.com") ? "smtp.gmail.com" : undefined);
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS?.replace(/\s+/g, "");
const SMTP_FROM = process.env.SMTP_FROM || SMTP_USER || "noreply@pefalconsafaris.com";
const RESEND_FROM = process.env.RESEND_FROM?.trim() || SMTP_FROM;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";
const ADMIN_URL = process.env.ADMIN_URL || "http://localhost:3001";
const RESEND_API_KEY = process.env.RESEND_API_KEY?.trim();
const EMAIL_DELIVERY = (process.env.EMAIL_DELIVERY || "").toLowerCase();

/** Railway Hobby/Trial blocks outbound SMTP — use Resend HTTPS or EMAIL_DELIVERY=disabled. */
export function isEmailDeliveryDisabled() {
  return EMAIL_DELIVERY === "disabled" || EMAIL_DELIVERY === "off" || EMAIL_DELIVERY === "none";
}

export function shouldSkipEmailVerification() {
  return (
    isEmailDeliveryDisabled() ||
    process.env.EMAIL_SKIP_VERIFICATION === "true" ||
    process.env.EMAIL_SKIP_VERIFICATION === "1"
  );
}

function isSmtpConfigured() {
  return Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS);
}

function createTransporter() {
  if (!isSmtpConfigured()) {
    return null;
  }

  const options: SMTPTransport.Options = {
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
    connectionTimeout: 8_000,
    greetingTimeout: 8_000,
    socketTimeout: 12_000,
    tls: {
      minVersion: "TLSv1.2",
    },
  };

  return nodemailer.createTransport(options);
}

type DeliverEmailInput = {
  to: string | string[];
  subject: string;
  text: string;
  html: string;
  fallbackUrl?: string;
  fallbackLogLabel: string;
  successLog: string;
  failureMessage: string;
};

async function sendWithResend(input: DeliverEmailInput) {
  const to = Array.isArray(input.to) ? input.to : [input.to];
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: RESEND_FROM,
      to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Resend API ${response.status}: ${body}`);
  }
}

async function deliverEmail(input: DeliverEmailInput) {
  if (isEmailDeliveryDisabled()) {
    console.log(`Email delivery disabled. ${input.fallbackLogLabel}`);
    if (input.fallbackUrl) {
      console.log(input.fallbackUrl);
    }
    return;
  }

  if (RESEND_API_KEY) {
    try {
      await sendWithResend(input);
      console.log(input.successLog);
      return;
    } catch (error) {
      console.error(`Failed to send email via Resend:`, error);
      if (input.fallbackUrl) {
        console.log(`Fallback link:`);
        console.log(input.fallbackUrl);
      }
      throw new Error(input.failureMessage);
    }
  }

  const transporter = createTransporter();

  if (!transporter) {
    console.log(`No email provider configured. ${input.fallbackLogLabel}`);
    if (input.fallbackUrl) {
      console.log(input.fallbackUrl);
    }
    return;
  }

  try {
    await transporter.sendMail({
      from: SMTP_FROM,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    });
    console.log(input.successLog);
  } catch (error) {
    console.error(`Failed to send email via SMTP:`, error);
    if (input.fallbackUrl) {
      console.log(`Fallback link:`);
      console.log(input.fallbackUrl);
    }
    throw new Error(
      `${input.failureMessage} If this API runs on Railway Hobby/Trial, outbound SMTP is blocked — use Resend (RESEND_API_KEY) or set EMAIL_DELIVERY=disabled.`
    );
  }
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

  await deliverEmail({
    to: email,
    subject,
    text,
    html,
    fallbackUrl: verificationUrl,
    fallbackLogLabel: "Email verification link:",
    successLog: `Verification email sent to ${email}`,
    failureMessage: "Unable to send verification email. Please try again later.",
  });
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

  await deliverEmail({
    to: email,
    subject,
    text,
    html,
    fallbackUrl: resetUrl,
    fallbackLogLabel: "Password reset link:",
    successLog: `Password reset email sent to ${email}`,
    failureMessage: "Unable to send password reset email. Please try again later.",
  });
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

  await deliverEmail({
    to: email,
    subject,
    text,
    html,
    fallbackUrl: resetUrl,
    fallbackLogLabel: "Admin password reset link:",
    successLog: `Admin password reset email sent to ${email}`,
    failureMessage: "Unable to send password reset email. Please try again later.",
  });
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

  await deliverEmail({
    to: email,
    subject,
    text,
    html,
    fallbackUrl: inviteUrl,
    fallbackLogLabel: "Admin invite link:",
    successLog: `Admin invite email sent to ${email}`,
    failureMessage: "Unable to send invite email. Please try again later.",
  });
}

export type BookingEmailDetails = {
  packageName: string;
  travelDate: string;
  guests: number;
  totalPriceUsd: number;
  status: string;
  notes?: string | null;
};

export type AdminBookingNotificationDetails = BookingEmailDetails & {
  clientName: string;
  clientEmail: string;
};

export async function sendBookingConfirmationEmail(
  email: string,
  firstName: string,
  booking: BookingEmailDetails
) {
  const bookingsUrl = `${CLIENT_URL}/bookings`;
  const subject = "Your PE Falcon Safaris booking request";
  const text = [
    `Hi ${firstName},`,
    "",
    "Thank you for booking with PE Falcon Safaris.",
    "We have received your reservation request:",
    "",
    `Package: ${booking.packageName}`,
    `Travel date: ${booking.travelDate}`,
    `Guests: ${booking.guests}`,
    `Estimated total: USD ${booking.totalPriceUsd}`,
    `Status: ${booking.status}`,
    booking.notes ? `Notes: ${booking.notes}` : "",
    "",
    "Our team will review your request and follow up shortly.",
    `You can view your bookings here: ${bookingsUrl}`,
    "",
    "If you did not make this booking, please contact us.",
  ]
    .filter((line) => line !== undefined)
    .join("\n");

  const html = `
    <p>Hi ${firstName},</p>
    <p>Thank you for booking with <strong>PE Falcon Safaris</strong>.</p>
    <p>We have received your reservation request:</p>
    <ul>
      <li><strong>Package:</strong> ${booking.packageName}</li>
      <li><strong>Travel date:</strong> ${booking.travelDate}</li>
      <li><strong>Guests:</strong> ${booking.guests}</li>
      <li><strong>Estimated total:</strong> USD ${booking.totalPriceUsd}</li>
      <li><strong>Status:</strong> ${booking.status}</li>
      ${booking.notes ? `<li><strong>Notes:</strong> ${booking.notes}</li>` : ""}
    </ul>
    <p>Our team will review your request and follow up shortly.</p>
    <p><a href="${bookingsUrl}">View my bookings</a></p>
    <p>If you did not make this booking, please contact us.</p>
  `;

  await deliverEmail({
    to: email,
    subject,
    text,
    html,
    fallbackLogLabel: "Booking confirmation details:",
    successLog: `Booking confirmation email sent to ${email}`,
    failureMessage: "Unable to send booking confirmation email. Please try again later.",
  });
}

export async function sendAdminBookingNotificationEmail(
  adminEmails: string[],
  booking: AdminBookingNotificationDetails
) {
  const recipients = [...new Set(adminEmails.map((email) => email.trim().toLowerCase()).filter(Boolean))];

  if (recipients.length === 0) {
    console.log("No admin email recipients configured for booking notifications.");
    return;
  }

  const bookingsUrl = `${ADMIN_URL}/bookings`;
  const subject = `New safari booking: ${booking.packageName}`;
  const text = [
    "A new safari booking request has been submitted.",
    "",
    `Client: ${booking.clientName}`,
    `Email: ${booking.clientEmail}`,
    `Package: ${booking.packageName}`,
    `Travel date: ${booking.travelDate}`,
    `Guests: ${booking.guests}`,
    `Estimated total: USD ${booking.totalPriceUsd}`,
    `Status: ${booking.status}`,
    booking.notes ? `Notes: ${booking.notes}` : "",
    "",
    `Review bookings in the admin dashboard: ${bookingsUrl}`,
  ]
    .filter((line) => line !== undefined)
    .join("\n");

  const html = `
    <p>A new safari booking request has been submitted.</p>
    <ul>
      <li><strong>Client:</strong> ${booking.clientName}</li>
      <li><strong>Email:</strong> ${booking.clientEmail}</li>
      <li><strong>Package:</strong> ${booking.packageName}</li>
      <li><strong>Travel date:</strong> ${booking.travelDate}</li>
      <li><strong>Guests:</strong> ${booking.guests}</li>
      <li><strong>Estimated total:</strong> USD ${booking.totalPriceUsd}</li>
      <li><strong>Status:</strong> ${booking.status}</li>
      ${booking.notes ? `<li><strong>Notes:</strong> ${booking.notes}</li>` : ""}
    </ul>
    <p><a href="${bookingsUrl}">Review bookings in the admin dashboard</a></p>
  `;

  await deliverEmail({
    to: recipients,
    subject,
    text,
    html,
    fallbackLogLabel: `Admin booking notification details (recipients: ${recipients.join(", ")}):`,
    successLog: `Admin booking notification sent to ${recipients.join(", ")}`,
    failureMessage: "Unable to send admin booking notification email.",
  });
}

export type PaymentEmailDetails = {
  packageName: string;
  travelDate: string;
  guests?: number;
  amountUsd: number;
  method: string;
  methodLabel: string;
  provider?: string | null;
  phone?: string | null;
  cardLast4?: string | null;
  cardBrand?: string | null;
  reference: string;
  bookingId?: number;
};

export type AdminPaymentNotificationDetails = PaymentEmailDetails & {
  clientName: string;
  clientEmail: string;
};

export async function sendPaymentReceiptEmail(
  email: string,
  firstName: string,
  payment: PaymentEmailDetails
) {
  const bookingUrl = payment.bookingId
    ? `${CLIENT_URL}/bookings/${payment.bookingId}`
    : `${CLIENT_URL}/bookings`;
  const subject = "Payment confirmed — your safari reservation is complete";
  const text = [
    `Hi ${firstName},`,
    "",
    "Your payment was received successfully. Your safari reservation is now complete and confirmed.",
    "",
    `Package: ${payment.packageName}`,
    `Travel date: ${payment.travelDate}`,
    payment.guests != null ? `Guests: ${payment.guests}` : "",
    `Amount paid: USD ${payment.amountUsd}`,
    `Payment method: ${payment.methodLabel}`,
    payment.provider ? `Provider: ${payment.provider}` : "",
    payment.phone ? `Mobile number: ${payment.phone}` : "",
    payment.cardLast4
      ? `Card: ${payment.cardBrand || "Card"} ending in ${payment.cardLast4}`
      : "",
    `Payment reference: ${payment.reference}`,
    "",
    "Keep this email as your payment confirmation.",
    `View your booking: ${bookingUrl}`,
    "",
    "We look forward to hosting you on safari.",
    "— PE Falcon Safaris",
  ]
    .filter(Boolean)
    .join("\n");

  const html = `
    <p>Hi ${firstName},</p>
    <p><strong>Your payment was received successfully.</strong> Your safari reservation is now complete and confirmed.</p>
    <ul>
      <li><strong>Package:</strong> ${payment.packageName}</li>
      <li><strong>Travel date:</strong> ${payment.travelDate}</li>
      ${payment.guests != null ? `<li><strong>Guests:</strong> ${payment.guests}</li>` : ""}
      <li><strong>Amount paid:</strong> USD ${payment.amountUsd}</li>
      <li><strong>Payment method:</strong> ${payment.methodLabel}</li>
      ${payment.provider ? `<li><strong>Provider:</strong> ${payment.provider}</li>` : ""}
      ${payment.phone ? `<li><strong>Mobile number:</strong> ${payment.phone}</li>` : ""}
      ${
        payment.cardLast4
          ? `<li><strong>Card:</strong> ${payment.cardBrand || "Card"} ending in ${payment.cardLast4}</li>`
          : ""
      }
      <li><strong>Payment reference:</strong> ${payment.reference}</li>
    </ul>
    <p>Keep this email as your payment confirmation.</p>
    <p><a href="${bookingUrl}">View your booking</a></p>
    <p>We look forward to hosting you on safari.<br/>— PE Falcon Safaris</p>
  `;

  await deliverEmail({
    to: email,
    subject,
    text,
    html,
    fallbackLogLabel: "Payment receipt details:",
    successLog: `Payment receipt email sent to ${email}`,
    failureMessage: "Unable to send payment receipt email. Please try again later.",
  });
  return true;
}

export async function sendAdminPaymentNotificationEmail(
  adminEmails: string[],
  payment: AdminPaymentNotificationDetails
) {
  const recipients = [
    ...new Set(adminEmails.map((email) => email.trim().toLowerCase()).filter(Boolean)),
  ];

  if (recipients.length === 0) {
    console.log("No admin email recipients configured for payment notifications.");
    return;
  }

  const paymentsUrl = `${ADMIN_URL}/payments`;
  const subject = `Payment received: ${payment.packageName}`;
  const text = [
    "A client has paid for a safari booking.",
    "",
    `Client: ${payment.clientName}`,
    `Email: ${payment.clientEmail}`,
    `Package: ${payment.packageName}`,
    `Travel date: ${payment.travelDate}`,
    `Amount: USD ${payment.amountUsd}`,
    `Payment method: ${payment.methodLabel}`,
    payment.provider ? `Provider: ${payment.provider}` : "",
    payment.phone ? `Mobile number: ${payment.phone}` : "",
    payment.cardLast4
      ? `Card: ${payment.cardBrand || "Card"} ending in ${payment.cardLast4}`
      : "",
    `Reference: ${payment.reference}`,
    "",
    `Review payments in the admin dashboard: ${paymentsUrl}`,
  ]
    .filter(Boolean)
    .join("\n");

  const html = `
    <p>A client has paid for a safari booking.</p>
    <ul>
      <li><strong>Client:</strong> ${payment.clientName}</li>
      <li><strong>Email:</strong> ${payment.clientEmail}</li>
      <li><strong>Package:</strong> ${payment.packageName}</li>
      <li><strong>Travel date:</strong> ${payment.travelDate}</li>
      <li><strong>Amount:</strong> USD ${payment.amountUsd}</li>
      <li><strong>Payment method:</strong> ${payment.methodLabel}</li>
      ${payment.provider ? `<li><strong>Provider:</strong> ${payment.provider}</li>` : ""}
      ${payment.phone ? `<li><strong>Mobile number:</strong> ${payment.phone}</li>` : ""}
      ${
        payment.cardLast4
          ? `<li><strong>Card:</strong> ${payment.cardBrand || "Card"} ending in ${payment.cardLast4}</li>`
          : ""
      }
      <li><strong>Reference:</strong> ${payment.reference}</li>
    </ul>
    <p><a href="${paymentsUrl}">Review payments in the admin dashboard</a></p>
  `;

  await deliverEmail({
    to: recipients,
    subject,
    text,
    html,
    fallbackLogLabel: `Admin payment notification details (recipients: ${recipients.join(", ")}):`,
    successLog: `Admin payment notification sent to ${recipients.join(", ")}`,
    failureMessage: "Unable to send admin payment notification email.",
  });
}
