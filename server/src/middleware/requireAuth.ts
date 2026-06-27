import { NextFunction, Request, Response } from "express";
import { verifyAuthToken } from "../services/jwt";

export type AuthenticatedRequest = Request & {
  user?: {
    userId: string;
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
    req.user = payload;
    return next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired session." });
  }
}
