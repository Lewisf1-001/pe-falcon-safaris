import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev-only-change-me";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

export type AuthTokenPayload = {
  userId: string;
  email: string;
};

export type AdminTokenPayload = {
  type: "admin";
  adminId: string;
  username: string;
};

export function signAuthToken(payload: AuthTokenPayload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyAuthToken(token: string) {
  return jwt.verify(token, JWT_SECRET) as AuthTokenPayload;
}

export function signAdminToken(payload: Omit<AdminTokenPayload, "type">) {
  return jwt.sign({ ...payload, type: "admin" as const }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
}

export function verifyAdminToken(token: string) {
  const payload = jwt.verify(token, JWT_SECRET) as AdminTokenPayload;

  if (payload.type !== "admin") {
    throw new Error("Invalid admin token.");
  }

  return payload;
}
