import { Router } from "express";
import { pool } from "../db/pool";

const router = Router();

type PackageRow = {
  id: string;
  slug: string;
  name: string;
  duration: string;
  ideal_for: string | null;
  destinations: string[];
  highlights: string[];
  includes: string[];
  starting_price_usd: number;
  price_note: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export function formatPackage(row: PackageRow) {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    duration: row.duration,
    idealFor: row.ideal_for,
    destinations: row.destinations,
    highlights: row.highlights,
    includes: row.includes,
    startingPriceUsd: row.starting_price_usd,
    priceNote: row.price_note,
    isActive: row.is_active,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

router.get("/", async (_req, res, next) => {
  try {
    const result = await pool.query<PackageRow>(
      `SELECT id, slug, name, duration, ideal_for, destinations, highlights, includes,
              starting_price_usd, price_note, is_active, sort_order, created_at, updated_at
       FROM packages
       WHERE is_active = TRUE
       ORDER BY sort_order ASC, name ASC`
    );

    return res.json({
      packages: result.rows.map(formatPackage),
    });
  } catch (error) {
    next(error);
  }
});

router.get("/:slug", async (req, res, next) => {
  try {
    const result = await pool.query<PackageRow>(
      `SELECT id, slug, name, duration, ideal_for, destinations, highlights, includes,
              starting_price_usd, price_note, is_active, sort_order, created_at, updated_at
       FROM packages
       WHERE slug = $1 AND is_active = TRUE`,
      [req.params.slug]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Package not found." });
    }

    return res.json({ package: formatPackage(result.rows[0]) });
  } catch (error) {
    next(error);
  }
});

export default router;
