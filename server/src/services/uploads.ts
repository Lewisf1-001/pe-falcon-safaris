import fs from "fs";
import path from "path";

const uploadsRoot = path.join(__dirname, "..", "..", "uploads");
export const packageImagesDir = path.join(uploadsRoot, "package-images");

export function ensureUploadDirs() {
  fs.mkdirSync(packageImagesDir, { recursive: true });
}

export function getApiPublicUrl() {
  const configured = process.env.API_PUBLIC_URL?.trim();
  if (configured) {
    return configured.replace(/\/$/, "");
  }

  const port = process.env.PORT || "4000";
  return `http://localhost:${port}`;
}

export function buildPackageImageUrl(filename: string) {
  return `/api/uploads/package-images/${filename}`;
}

export function normalizePackageImageUrl(url: string) {
  const trimmed = url.trim();
  if (!trimmed) {
    return trimmed;
  }

  if (trimmed.startsWith("/")) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed);
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return trimmed;
  }
}

export function resolvePackageImagePath(filename: string) {
  const safeName = path.basename(filename);
  return path.join(packageImagesDir, safeName);
}
