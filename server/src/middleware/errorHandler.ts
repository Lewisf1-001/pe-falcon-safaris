import { NextFunction, Request, Response } from "express";

type PgError = Error & { code?: string };

export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  console.error(error);

  const pgError = error as PgError;

  if (pgError.code === "23505") {
    return res.status(409).json({ error: "An account with this email already exists." });
  }

  return res.status(500).json({ error: "Internal server error." });
}
