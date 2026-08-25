import { Router } from "express";
import { pool } from "../db/pool";
import type { CurrencyCode } from "../services/currency";
import { normalizePackageImageUrl } from "../services/uploads";

const router = Router();

export type PackageGalleryImage = {
  url: string;
  alt: string;
};

export type PackageRow = {
  id: number;
  slug: string;
  name: string;
  duration: string;
  ideal_for: string | null;
  destinations: string[];
  highlights: string[];
  includes: string[];
  gallery_images: PackageGalleryImage[] | null;
  starting_price: number | string;
  price_currency: string;
  starting_price_usd: number | string;
  price_note: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

const PACKAGE_COLUMNS = `id, slug, name, duration, ideal_for, destinations, highlights, includes, gallery_images,
              starting_price, price_currency, starting_price_usd, price_note, is_active, sort_order,
              created_at, updated_at`;

function parseGalleryImages(value: unknown): PackageGalleryImage[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const image = item as { url?: unknown; alt?: unknown };
      if (typeof image.url !== "string" || typeof image.alt !== "string") {
        return null;
      }

      const url = image.url.trim();
      const alt = image.alt.trim();
      if (!url || !alt) {
        return null;
      }

      return { url: normalizePackageImageUrl(url), alt };
    })
    .filter((item): item is PackageGalleryImage => item != null);
}

export function formatPackage(row: PackageRow) {
  return {
    id: Number(row.id),
    slug: row.slug,
    name: row.name,
    duration: row.duration,
    idealFor: row.ideal_for,
    destinations: row.destinations,
    highlights: row.highlights,
    includes: row.includes,
    galleryImages: parseGalleryImages(row.gallery_images),
    startingPrice: Number(row.starting_price),
    priceCurrency: (row.price_currency || "USD") as CurrencyCode,
    startingPriceUsd: Number(row.starting_price_usd),
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
      `SELECT ${PACKAGE_COLUMNS}
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
      `SELECT ${PACKAGE_COLUMNS}
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
