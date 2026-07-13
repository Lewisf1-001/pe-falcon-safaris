import { Router } from "express";
import { pool } from "../db/pool";
import { completeMpesaPayment, failMpesaPayment } from "./payments";

const router = Router();

type CallbackItem = {
  Name: string;
  Value?: string | number;
};

function getCallbackValue(items: CallbackItem[] | undefined, name: string) {
  const item = items?.find((entry) => entry.Name === name);
  return item?.Value;
}

router.post("/callback", async (req, res) => {
  // Always acknowledge quickly so Safaricom does not retry endlessly.
  res.json({ ResultCode: 0, ResultDesc: "Accepted" });

  try {
    const callback = req.body?.Body?.stkCallback;

    if (!callback) {
      console.error("Invalid M-Pesa callback payload:", req.body);
      return;
    }

    const checkoutRequestId = callback.CheckoutRequestID as string | undefined;
    const resultCode = Number(callback.ResultCode);
    const resultDesc = (callback.ResultDesc as string) || "Unknown result";

    if (!checkoutRequestId) {
      console.error("M-Pesa callback missing CheckoutRequestID:", callback);
      return;
    }

    const paymentResult = await pool.query(
      `SELECT id, booking_id, status
       FROM payments
       WHERE mpesa_checkout_request_id = $1
       LIMIT 1`,
      [checkoutRequestId]
    );

    if (paymentResult.rowCount === 0) {
      console.error("No payment found for CheckoutRequestID:", checkoutRequestId);
      return;
    }

    const payment = paymentResult.rows[0];

    if (payment.status === "completed" || payment.status === "failed") {
      return;
    }

    if (resultCode !== 0) {
      await failMpesaPayment(payment.id);
      console.log(`M-Pesa payment ${payment.id} failed: ${resultDesc}`);
      return;
    }

    const metadataItems = callback.CallbackMetadata?.Item as CallbackItem[] | undefined;
    const receiptNumber = String(getCallbackValue(metadataItems, "MpesaReceiptNumber") || "");

    await completeMpesaPayment({
      paymentId: payment.id,
      bookingId: payment.booking_id,
      receiptNumber,
    });

    console.log(`M-Pesa payment ${payment.id} completed. Receipt: ${receiptNumber || "n/a"}`);
  } catch (error) {
    console.error("Error handling M-Pesa callback:", error);
  }
});

export default router;
