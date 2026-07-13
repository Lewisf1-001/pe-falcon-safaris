import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/pool";
import { AuthenticatedRequest, requireAuth } from "../middleware/requireAuth";
import {
  sendAdminPaymentNotificationEmail,
  sendPaymentReceiptEmail,
} from "../services/email";
import { initiateStkPush, isMpesaConfigured, normalizeMpesaPhone, queryStkPush } from "../services/mpesa";

const router = Router();

type PaymentRow = {
  id: string;
  booking_id: number;
  user_id: number;
  amount_usd: number;
  method: "mobile_money" | "card";
  provider: string | null;
  phone: string | null;
  card_last4: string | null;
  card_brand: string | null;
  cardholder_name: string | null;
  external_ref: string | null;
  mpesa_checkout_request_id?: string | null;
  mpesa_merchant_request_id?: string | null;
  mpesa_receipt_number?: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  package_name?: string;
  package_slug?: string;
  travel_date?: string | Date;
};

function formatTravelDate(value?: string | Date | null) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return date.toISOString().slice(0, 10);
}

export function formatPayment(row: PaymentRow) {
  return {
    id: row.id,
    bookingId: Number(row.booking_id),
    userId: Number(row.user_id),
    amountUsd: Number(row.amount_usd),
    method: row.method,
    provider: row.provider,
    phone: row.phone,
    cardLast4: row.card_last4,
    cardBrand: row.card_brand,
    cardholderName: row.cardholder_name,
    externalRef: row.external_ref,
    mpesaCheckoutRequestId: row.mpesa_checkout_request_id ?? null,
    mpesaReceiptNumber: row.mpesa_receipt_number ?? null,
    status: row.status,
    packageName: row.package_name ?? null,
    packageSlug: row.package_slug ?? null,
    travelDate: formatTravelDate(row.travel_date),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function detectCardBrand(cardNumber: string) {
  if (/^4/.test(cardNumber)) {
    return "Visa";
  }

  if (/^5[1-5]/.test(cardNumber) || /^2[2-7]/.test(cardNumber)) {
    return "Mastercard";
  }

  if (/^3[47]/.test(cardNumber)) {
    return "Amex";
  }

  return "Card";
}

function methodLabel(method: "mobile_money" | "card", provider?: string | null) {
  if (method === "mobile_money") {
    return provider === "airtel" ? "Airtel Money" : "M-Pesa";
  }

  return "Card";
}

const mobileMoneySchema = z.object({
  bookingId: z.coerce.number().int().positive(),
  method: z.literal("mobile_money"),
  provider: z.enum(["mpesa", "airtel"]),
  phone: z.string().trim().min(9, "Enter a valid mobile money phone number"),
});

const cardSchema = z.object({
  bookingId: z.coerce.number().int().positive(),
  method: z.literal("card"),
  cardholderName: z.string().trim().min(2, "Cardholder name is required").max(120),
  cardNumber: z
    .string()
    .trim()
    .transform((value) => value.replace(/\s+/g, ""))
    .refine((value) => /^[0-9]{13,19}$/.test(value), "Enter a valid card number"),
  expiryMonth: z.coerce.number().int().min(1).max(12),
  expiryYear: z.coerce.number().int().min(new Date().getFullYear()).max(2100),
  cvv: z
    .string()
    .trim()
    .regex(/^[0-9]{3,4}$/, "Enter a valid CVV"),
});

const createPaymentSchema = z.discriminatedUnion("method", [mobileMoneySchema, cardSchema]);

export async function getAdminEmails() {
  const adminResult = await pool.query(
    `SELECT email
     FROM admins
     WHERE status = 'active' AND email IS NOT NULL AND email <> ''`
  );

  const emails = adminResult.rows.map((row) => row.email as string).filter(Boolean);
  const notifyEmail = process.env.ADMIN_NOTIFY_EMAIL?.trim();

  if (notifyEmail) {
    emails.push(notifyEmail);
  }

  return emails;
}

export async function sendPaymentSuccessEmails(
  paymentId: string,
  options: { notifyAdmin?: boolean } = {}
) {
  const notifyAdmin = options.notifyAdmin !== false;

  const result = await pool.query(
    `SELECT p.*, pk.name AS package_name, pk.slug AS package_slug, b.travel_date, b.guests,
            u.first_name, u.last_name, u.email
     FROM payments p
     INNER JOIN bookings b ON b.id = p.booking_id
     INNER JOIN packages pk ON pk.id = b.package_id
     INNER JOIN users u ON u.id = p.user_id
     WHERE p.id = $1`,
    [paymentId]
  );

  if (result.rowCount === 0) {
    return;
  }

  const row = result.rows[0];
  const paymentEmail = {
    packageName: row.package_name as string,
    travelDate: formatTravelDate(row.travel_date) || "",
    guests: Number(row.guests),
    amountUsd: Number(row.amount_usd),
    method: row.method as "mobile_money" | "card",
    methodLabel: methodLabel(row.method, row.provider),
    provider: row.provider,
    phone: row.phone,
    cardLast4: row.card_last4,
    cardBrand: row.card_brand,
    reference: (row.mpesa_receipt_number || row.external_ref || row.id) as string,
    bookingId: Number(row.booking_id),
  };

  if (!row.client_receipt_sent_at) {
    try {
      const sent = await sendPaymentReceiptEmail(row.email, row.first_name, paymentEmail);
      if (sent !== false) {
        await pool.query(
          `UPDATE payments
           SET client_receipt_sent_at = NOW(), updated_at = NOW()
           WHERE id = $1 AND client_receipt_sent_at IS NULL`,
          [paymentId]
        );
      }
    } catch {
      console.error("Payment completed but client receipt email failed.");
    }
  }

  if (!notifyAdmin) {
    return;
  }

  try {
    await sendAdminPaymentNotificationEmail(await getAdminEmails(), {
      ...paymentEmail,
      clientName: `${row.first_name} ${row.last_name}`.trim(),
      clientEmail: row.email,
    });
  } catch (error) {
    console.error("Payment completed, but admin notification failed:", error);
  }
}

export async function completeMpesaPayment(options: {
  paymentId: string;
  bookingId: number;
  receiptNumber?: string | null;
}) {
  const client = await pool.connect();
  let newlyCompleted = false;

  try {
    await client.query("BEGIN");

    const current = await client.query(
      `SELECT status FROM payments WHERE id = $1 FOR UPDATE`,
      [options.paymentId]
    );

    if (current.rowCount === 0) {
      await client.query("ROLLBACK");
      return false;
    }

    if (current.rows[0].status === "completed") {
      await client.query("COMMIT");
      await sendPaymentSuccessEmails(options.paymentId, { notifyAdmin: false });
      return true;
    }

    if (current.rows[0].status === "failed" || current.rows[0].status === "cancelled") {
      await client.query("ROLLBACK");
      return false;
    }

    const receipt = options.receiptNumber?.trim() || null;

    await client.query(
      `UPDATE payments
       SET status = 'completed',
           mpesa_receipt_number = COALESCE($1, mpesa_receipt_number),
           external_ref = COALESCE(NULLIF($1, ''), external_ref),
           updated_at = NOW()
       WHERE id = $2`,
      [receipt, options.paymentId]
    );

    await client.query(
      `UPDATE bookings
       SET status = 'confirmed', updated_at = NOW()
       WHERE id = $1`,
      [options.bookingId]
    );

    await client.query("COMMIT");
    newlyCompleted = true;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  if (newlyCompleted) {
    await sendPaymentSuccessEmails(options.paymentId);
  }

  return true;
}

export async function failMpesaPayment(paymentId: string) {
  await pool.query(
    `UPDATE payments
     SET status = 'failed', updated_at = NOW()
     WHERE id = $1 AND status = 'pending'`,
    [paymentId]
  );
}

router.use(requireAuth);

router.get("/", async (req: AuthenticatedRequest, res, next) => {
  try {
    const result = await pool.query<PaymentRow>(
      `SELECT p.*, pk.name AS package_name, pk.slug AS package_slug, b.travel_date
       FROM payments p
       INNER JOIN bookings b ON b.id = p.booking_id
       INNER JOIN packages pk ON pk.id = b.package_id
       WHERE p.user_id = $1
       ORDER BY p.created_at DESC`,
      [req.user!.userId]
    );

    return res.json({
      payments: result.rows.map(formatPayment),
    });
  } catch (error) {
    next(error);
  }
});

router.get("/by-booking/:bookingId", async (req: AuthenticatedRequest, res, next) => {
  try {
    const bookingId = z.coerce.number().int().positive().parse(req.params.bookingId);

    let result = await pool.query<PaymentRow>(
      `SELECT p.*, pk.name AS package_name, pk.slug AS package_slug, b.travel_date
       FROM payments p
       INNER JOIN bookings b ON b.id = p.booking_id
       INNER JOIN packages pk ON pk.id = b.package_id
       WHERE p.booking_id = $1 AND p.user_id = $2
       ORDER BY p.created_at DESC
       LIMIT 1`,
      [bookingId, req.user!.userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "No payment found for this booking." });
    }

    let payment = result.rows[0];

    // If the Safaricom callback never reached us, query STK status while the client polls.
    if (
      payment.status === "pending" &&
      payment.mpesa_checkout_request_id &&
      isMpesaConfigured()
    ) {
      try {
        const query = await queryStkPush(payment.mpesa_checkout_request_id);

        if (query.resultCode === 0) {
          await completeMpesaPayment({
            paymentId: payment.id,
            bookingId: payment.booking_id,
          });
        }
        // Do not mark failed from STK query — ambiguous/in-progress codes are common
        // while the user is still entering their PIN. Failures come from the callback only.
      } catch (error) {
        console.error("STK status query failed:", error);
      }

      result = await pool.query<PaymentRow>(
        `SELECT p.*, pk.name AS package_name, pk.slug AS package_slug, b.travel_date
         FROM payments p
         INNER JOIN bookings b ON b.id = p.booking_id
         INNER JOIN packages pk ON pk.id = b.package_id
         WHERE p.id = $1`,
        [payment.id]
      );
      payment = result.rows[0];
    }

    return res.json({ payment: formatPayment(payment) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid booking id." });
    }

    next(error);
  }
});

router.post("/", async (req: AuthenticatedRequest, res, next) => {
  const client = await pool.connect();

  try {
    const parsed = createPaymentSchema.safeParse(req.body);

    if (!parsed.success) {
      const message = parsed.error.errors[0]?.message ?? "Invalid input";
      return res.status(400).json({ error: message });
    }

    const data = parsed.data;

    await client.query("BEGIN");

    const bookingResult = await client.query(
      `SELECT b.id, b.user_id, b.total_price_usd, b.status, b.travel_date,
              p.name AS package_name, p.slug AS package_slug,
              u.first_name, u.last_name, u.email, u.email_verified
       FROM bookings b
       INNER JOIN packages p ON p.id = b.package_id
       INNER JOIN users u ON u.id = b.user_id
       WHERE b.id = $1
       FOR UPDATE OF b`,
      [data.bookingId]
    );

    if (bookingResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Booking not found." });
    }

    const booking = bookingResult.rows[0];

    if (Number(booking.user_id) !== req.user!.userId) {
      await client.query("ROLLBACK");
      return res.status(403).json({ error: "You can only pay for your own bookings." });
    }

    if (!booking.email_verified) {
      await client.query("ROLLBACK");
      return res.status(403).json({ error: "Please verify your email before making a payment." });
    }

    if (booking.status === "cancelled") {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "This booking has been cancelled." });
    }

    if (booking.status === "confirmed") {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "This booking is already paid and confirmed." });
    }

    const existingPayment = await client.query(
      `SELECT id FROM payments WHERE booking_id = $1 AND status = 'completed'`,
      [booking.id]
    );

    if (existingPayment.rowCount && existingPayment.rowCount > 0) {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "A completed payment already exists for this booking." });
    }

    await client.query(
      `UPDATE payments
       SET status = 'cancelled', updated_at = NOW()
       WHERE booking_id = $1 AND status = 'pending'`,
      [booking.id]
    );

    let provider: string | null = null;
    let phone: string | null = null;
    let cardLast4: string | null = null;
    let cardBrand: string | null = null;
    let cardholderName: string | null = null;
    let paymentStatus: "pending" | "completed" = "completed";
    let externalRef = `PF-${Date.now().toString(36).toUpperCase()}-${Math.random()
      .toString(36)
      .slice(2, 8)
      .toUpperCase()}`;
    let mpesaCheckoutRequestId: string | null = null;
    let mpesaMerchantRequestId: string | null = null;
    let customerMessage = "Payment successful. Your booking is confirmed.";

    if (data.method === "mobile_money") {
      provider = data.provider;

      if (data.provider === "airtel") {
        await client.query("ROLLBACK");
        return res.status(400).json({
          error: "Airtel Money is not connected yet. Please pay with M-Pesa.",
        });
      }

      if (!isMpesaConfigured()) {
        await client.query("ROLLBACK");
        return res.status(503).json({
          error: "M-Pesa is not configured on the server. Contact support.",
        });
      }

      try {
        phone = normalizeMpesaPhone(data.phone);
      } catch (error) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          error: error instanceof Error ? error.message : "Invalid phone number.",
        });
      }

      paymentStatus = "pending";

      const paymentResult = await client.query<PaymentRow>(
        `INSERT INTO payments (
           booking_id, user_id, amount_usd, method, provider, phone,
           card_last4, card_brand, cardholder_name, external_ref, status
         )
         VALUES ($1, $2, $3, $4, $5, $6, NULL, NULL, NULL, $7, 'pending')
         RETURNING *`,
        [
          booking.id,
          req.user!.userId,
          booking.total_price_usd,
          data.method,
          provider,
          phone,
          externalRef,
        ]
      );

      await client.query("COMMIT");

      try {
        const stk = await initiateStkPush({
          phone: phone!,
          amountUsd: booking.total_price_usd,
          accountReference: externalRef,
          transactionDesc: "Safari booking",
        });

        mpesaCheckoutRequestId = stk.checkoutRequestId;
        mpesaMerchantRequestId = stk.merchantRequestId;
        customerMessage = stk.customerMessage;

        await pool.query(
          `UPDATE payments
           SET mpesa_checkout_request_id = $1,
               mpesa_merchant_request_id = $2,
               updated_at = NOW()
           WHERE id = $3`,
          [mpesaCheckoutRequestId, mpesaMerchantRequestId, paymentResult.rows[0].id]
        );

        const updated = await pool.query<PaymentRow>(
          `SELECT p.*, pk.name AS package_name, pk.slug AS package_slug, b.travel_date
           FROM payments p
           INNER JOIN bookings b ON b.id = p.booking_id
           INNER JOIN packages pk ON pk.id = b.package_id
           WHERE p.id = $1`,
          [paymentResult.rows[0].id]
        );

        return res.status(201).json({
          message: customerMessage,
          awaitingConfirmation: true,
          payment: formatPayment(updated.rows[0]),
        });
      } catch (error) {
        await pool.query(
          `UPDATE payments
           SET status = 'failed', updated_at = NOW()
           WHERE id = $1`,
          [paymentResult.rows[0].id]
        );

        return res.status(502).json({
          error:
            error instanceof Error
              ? error.message
              : "Unable to start M-Pesa payment. Please try again.",
        });
      }
    }

    const now = new Date();
    const expiry = new Date(data.expiryYear, data.expiryMonth, 0);

    if (expiry < now) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Card has expired." });
    }

    cardLast4 = data.cardNumber.slice(-4);
    cardBrand = detectCardBrand(data.cardNumber);
    cardholderName = data.cardholderName;

    const paymentResult = await client.query<PaymentRow>(
      `INSERT INTO payments (
         booking_id, user_id, amount_usd, method, provider, phone,
         card_last4, card_brand, cardholder_name, external_ref, status
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        booking.id,
        req.user!.userId,
        booking.total_price_usd,
        data.method,
        provider,
        phone,
        cardLast4,
        cardBrand,
        cardholderName,
        externalRef,
        paymentStatus,
      ]
    );

    await client.query(
      `UPDATE bookings
       SET status = 'confirmed', updated_at = NOW()
       WHERE id = $1`,
      [booking.id]
    );

    await client.query("COMMIT");

    const paymentRow = {
      ...paymentResult.rows[0],
      package_name: booking.package_name,
      package_slug: booking.package_slug,
      travel_date: booking.travel_date,
    };

    await sendPaymentSuccessEmails(paymentResult.rows[0].id);

    return res.status(201).json({
      message: customerMessage,
      awaitingConfirmation: false,
      payment: formatPayment(paymentRow),
    });
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // ignore rollback errors
    }

    next(error);
  } finally {
    client.release();
  }
});

export default router;
