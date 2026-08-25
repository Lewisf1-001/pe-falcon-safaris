import jwt, { type SignOptions } from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev-only-change-me";
const JWT_SIGN_OPTIONS: SignOptions = {
  expiresIn: (process.env.JWT_EXPIRES_IN || "7d") as SignOptions["expiresIn"],
};

export type AuthTokenPayload = {
  userId: number;
  email: string;
};

export type AdminTokenPayload = {
  type: "admin";
  adminId: string;
  username: string;
};

export function signAuthToken(payload: AuthTokenPayload) {
  return jwt.sign(payload, JWT_SECRET, JWT_SIGN_OPTIONS);
}

export function verifyAuthToken(token: string): AuthTokenPayload {
  const payload = jwt.verify(token, JWT_SECRET) as AuthTokenPayload & { userId: number | string };
  const userId = Number(payload.userId);

  if (!Number.isInteger(userId) || userId < 1) {
    throw new Error("Invalid auth token user id.");
  }

  return {
    userId,
    email: payload.email,
  };
}

export function signAdminToken(payload: Omit<AdminTokenPayload, "type">) {
  return jwt.sign({ ...payload, type: "admin" as const }, JWT_SECRET, JWT_SIGN_OPTIONS);
}

export function verifyAdminToken(token: string) {
  const payload = jwt.verify(token, JWT_SECRET) as AdminTokenPayload;

  if (payload.type !== "admin") {
    throw new Error("Invalid admin token.");
  }

  return payload;
}
