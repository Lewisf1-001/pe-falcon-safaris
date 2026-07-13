import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/pool";
import {
  AdminAuthenticatedRequest,
  requireAdminAuth,
} from "../middleware/requireAdminAuth";
import { SUPPORTED_CURRENCIES, toUsdExact } from "../services/currency";
import { formatPackage } from "./packages";

const router = Router();

const PACKAGE_RETURNING = `id, slug, name, duration, ideal_for, destinations, highlights, includes,
                 starting_price, price_currency, starting_price_usd, price_note, is_active, sort_order,
                 created_at, updated_at`;

const packageBodySchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1, "Slug is required")
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase with hyphens only"),
  name: z.string().trim().min(1, "Name is required").max(255),
  duration: z.string().trim().min(1, "Duration is required").max(100),
  idealFor: z.string().trim().max(255).optional().nullable(),
  destinations: z.array(z.string().trim().min(1)).min(1, "Add at least one destination"),
  highlights: z.array(z.string().trim().min(1)).min(1, "Add at least one highlight"),
  includes: z.array(z.string().trim().min(1)).min(1, "Add at least one included item"),
  startingPrice: z.number().positive("Price must be greater than zero"),
  priceCurrency: z.enum(SUPPORTED_CURRENCIES),
  priceNote: z.string().trim().max(255).optional().nullable(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

router.use(requireAdminAuth);

router.get("/", async (_req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id, slug, name, duration, ideal_for, destinations, highlights, includes,
              starting_price, price_currency, starting_price_usd, price_note, is_active, sort_order,
              created_at, updated_at
       FROM packages
       ORDER BY sort_order ASC, name ASC`
    );

    return res.json({
      packages: result.rows.map(formatPackage),
    });
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req: AdminAuthenticatedRequest, res, next) => {
  try {
    const parsed = packageBodySchema.safeParse(req.body);

    if (!parsed.success) {
      const message = parsed.error.errors[0]?.message ?? "Invalid input";
      return res.status(400).json({ error: message });
    }

    const data = parsed.data;
    const startingPriceUsd = toUsdExact(data.startingPrice, data.priceCurrency);

    const result = await pool.query(
      `INSERT INTO packages (
         slug, name, duration, ideal_for, destinations, highlights, includes,
         starting_price, price_currency, starting_price_usd, price_note, is_active, sort_order
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING ${PACKAGE_RETURNING}`,
      [
        data.slug,
        data.name,
        data.duration,
        data.idealFor ?? null,
        JSON.stringify(data.destinations),
        JSON.stringify(data.highlights),
        JSON.stringify(data.includes),
        data.startingPrice,
        data.priceCurrency,
        startingPriceUsd,
        data.priceNote ?? null,
        data.isActive ?? true,
        data.sortOrder ?? 0,
      ]
    );

    return res.status(201).json({
      message: "Package created successfully.",
      package: formatPackage(result.rows[0]),
    });
  } catch (error) {
    next(error);
  }
});

router.patch("/:id", async (req: AdminAuthenticatedRequest, res, next) => {
  try {
    const packageId = z.coerce.number().int().positive().parse(req.params.id);
    const parsed = packageBodySchema.safeParse(req.body);

    if (!parsed.success) {
      const message = parsed.error.errors[0]?.message ?? "Invalid input";
      return res.status(400).json({ error: message });
    }

    const data = parsed.data;
    const startingPriceUsd = toUsdExact(data.startingPrice, data.priceCurrency);

    const result = await pool.query(
      `UPDATE packages
       SET slug = $1,
           name = $2,
           duration = $3,
           ideal_for = $4,
           destinations = $5,
           highlights = $6,
           includes = $7,
           starting_price = $8,
           price_currency = $9,
           starting_price_usd = $10,
           price_note = $11,
           is_active = $12,
           sort_order = $13,
           updated_at = NOW()
       WHERE id = $14
       RETURNING ${PACKAGE_RETURNING}`,
      [
        data.slug,
        data.name,
        data.duration,
        data.idealFor ?? null,
        JSON.stringify(data.destinations),
        JSON.stringify(data.highlights),
        JSON.stringify(data.includes),
        data.startingPrice,
        data.priceCurrency,
        startingPriceUsd,
        data.priceNote ?? null,
        data.isActive ?? true,
        data.sortOrder ?? 0,
        packageId,
      ]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Package not found." });
    }

    return res.json({
      message: "Package updated successfully.",
      package: formatPackage(result.rows[0]),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid package id." });
    }

    next(error);
  }
});

router.delete("/:id", async (req: AdminAuthenticatedRequest, res, next) => {
  try {
    const packageId = z.coerce.number().int().positive().parse(req.params.id);

    const result = await pool.query("DELETE FROM packages WHERE id = $1 RETURNING id", [
      packageId,
    ]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Package not found." });
    }

    return res.json({ message: "Package deleted successfully." });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid package id." });
    }

    next(error);
  }
});

export default router;
