import { NextFunction, Request, Response } from "express";
import { verifyAuthToken } from "../services/jwt";

export type AuthenticatedRequest = Request & {
  user?: {
    userId: number;
    email: string;
  };
};

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authentication required." });
  }

  const token = header.slice("Bearer ".length);

  try {
    const payload = verifyAuthToken(token);
    const userId = Number(payload.userId);

    if (!Number.isInteger(userId) || userId < 1) {
      return res.status(401).json({
        error: "Your session is outdated. Please sign in again.",
      });
    }

    req.user = {
      userId,
      email: payload.email,
    };
    return next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired session." });
  }
}
