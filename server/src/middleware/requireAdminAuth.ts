import { NextFunction, Request, Response } from "express";
import { verifyAdminToken } from "../services/jwt";

export type AdminAuthenticatedRequest = Request & {
  admin?: {
    adminId: string;
    username: string;
  };
};

export function requireAdminAuth(
  req: AdminAuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authentication required." });
  }

  const token = header.slice("Bearer ".length);

  try {
    const payload = verifyAdminToken(token);
    req.admin = {
      adminId: payload.adminId,
      username: payload.username,
    };
    return next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired session." });
  }
}
