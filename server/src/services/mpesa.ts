import { convertFromUsd } from "./currency";

type MpesaTokenCache = {
  accessToken: string;
  expiresAt: number;
};

let tokenCache: MpesaTokenCache | null = null;

function getMpesaBaseUrl() {
  const environment = (process.env.MPESA_ENVIRONMENT || "sandbox").toLowerCase();
  return environment === "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";
}

export function isMpesaConfigured() {
  return Boolean(
    process.env.MPESA_CONSUMER_KEY &&
      process.env.MPESA_CONSUMER_SECRET &&
      process.env.MPESA_SHORTCODE &&
      process.env.MPESA_PASSKEY &&
      process.env.MPESA_CALLBACK_URL
  );
}

export function normalizeMpesaPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");

  if (digits.startsWith("254") && digits.length === 12) {
    return digits;
  }

  if (digits.startsWith("0") && digits.length === 10) {
    return `254${digits.slice(1)}`;
  }

  if (digits.length === 9 && digits.startsWith("7")) {
    return `254${digits}`;
  }

  throw new Error("Enter a valid Kenyan mobile number (e.g. 07XXXXXXXX or 2547XXXXXXXX).");
}

export function usdToKes(amountUsd: number) {
  return Math.max(1, convertFromUsd(amountUsd, "KES"));
}

function getTimestamp() {
  const now = new Date();
  const yyyy = now.getFullYear().toString();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  return `${yyyy}${mm}${dd}${hh}${min}${ss}`;
}

function getPassword(timestamp: string) {
  const shortcode = process.env.MPESA_SHORTCODE!;
  const passkey = process.env.MPESA_PASSKEY!;
  return Buffer.from(`${shortcode}${passkey}${timestamp}`).toString("base64");
}

async function getAccessToken() {
  if (tokenCache && tokenCache.expiresAt > Date.now() + 30_000) {
    return tokenCache.accessToken;
  }

  const key = process.env.MPESA_CONSUMER_KEY!;
  const secret = process.env.MPESA_CONSUMER_SECRET!;
  const credentials = Buffer.from(`${key}:${secret}`).toString("base64");

  const response = await fetch(
    `${getMpesaBaseUrl()}/oauth/v1/generate?grant_type=client_credentials`,
    {
      headers: {
        Authorization: `Basic ${credentials}`,
      },
    }
  );

  if (!response.ok) {
    const body = await response.text();
    console.error("M-Pesa OAuth failed:", body);
    throw new Error("Unable to authenticate with M-Pesa. Check your credentials.");
  }

  const data = (await response.json()) as {
    access_token: string;
    expires_in: string;
  };

  tokenCache = {
    accessToken: data.access_token,
    expiresAt: Date.now() + Number(data.expires_in || 3599) * 1000,
  };

  return data.access_token;
}

export type StkPushResult = {
  merchantRequestId: string;
  checkoutRequestId: string;
  responseCode: string;
  customerMessage: string;
  amountKes: number;
};

export async function initiateStkPush(options: {
  phone: string;
  amountUsd: number;
  accountReference: string;
  transactionDesc: string;
}): Promise<StkPushResult> {
  if (!isMpesaConfigured()) {
    throw new Error("M-Pesa is not configured. Add MPESA_* variables to server/.env.");
  }

  const phone = normalizeMpesaPhone(options.phone);
  const amountKes = usdToKes(options.amountUsd);
  const timestamp = getTimestamp();
  const password = getPassword(timestamp);
  const accessToken = await getAccessToken();

  const response = await fetch(
    `${getMpesaBaseUrl()}/mpesa/stkpush/v1/processrequest`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        BusinessShortCode: process.env.MPESA_SHORTCODE,
        Password: password,
        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline",
        Amount: amountKes,
        PartyA: phone,
        PartyB: process.env.MPESA_SHORTCODE,
        PhoneNumber: phone,
        CallBackURL: process.env.MPESA_CALLBACK_URL,
        AccountReference: options.accountReference.slice(0, 12),
        TransactionDesc: options.transactionDesc.slice(0, 13),
      }),
    }
  );

  const data = (await response.json()) as {
    MerchantRequestID?: string;
    CheckoutRequestID?: string;
    ResponseCode?: string;
    ResponseDescription?: string;
    CustomerMessage?: string;
    errorCode?: string;
    errorMessage?: string;
  };

  if (!response.ok || data.ResponseCode !== "0" || !data.CheckoutRequestID) {
    console.error("M-Pesa STK Push failed:", data);
    throw new Error(
      data.errorMessage ||
        data.ResponseDescription ||
        "Unable to start M-Pesa payment. Please try again."
    );
  }

  return {
    merchantRequestId: data.MerchantRequestID || "",
    checkoutRequestId: data.CheckoutRequestID,
    responseCode: data.ResponseCode,
    customerMessage:
      data.CustomerMessage || "Check your phone and enter your M-Pesa PIN to complete payment.",
    amountKes,
  };
}

export type StkQueryResult = {
  resultCode: number;
  resultDesc: string;
};

/** Poll Safaricom for STK result when the callback was missed (e.g. ngrok down). */
export async function queryStkPush(checkoutRequestId: string): Promise<StkQueryResult> {
  if (!isMpesaConfigured()) {
    throw new Error("M-Pesa is not configured.");
  }

  const timestamp = getTimestamp();
  const password = getPassword(timestamp);
  const accessToken = await getAccessToken();

  const response = await fetch(`${getMpesaBaseUrl()}/mpesa/stkpushquery/v1/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      BusinessShortCode: process.env.MPESA_SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      CheckoutRequestID: checkoutRequestId,
    }),
  });

  const data = (await response.json()) as {
    ResultCode?: string | number;
    ResultDesc?: string;
    errorCode?: string;
    errorMessage?: string;
  };

  // 500.001.1001 = "The transaction is being processed" — treat as still pending.
  if (data.errorCode === "500.001.1001") {
    return { resultCode: 1, resultDesc: data.errorMessage || "Transaction is being processed" };
  }

  if (!response.ok && data.ResultCode === undefined) {
    console.error("M-Pesa STK query failed:", data);
    return {
      resultCode: -1,
      resultDesc: data.errorMessage || "Unable to query M-Pesa payment status.",
    };
  }

  return {
    resultCode: Number(data.ResultCode),
    resultDesc: data.ResultDesc || "Unknown result",
  };
}

