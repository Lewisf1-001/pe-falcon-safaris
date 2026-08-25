import type { SafariPackage } from "@/types/package";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export async function fetchPackages(): Promise<SafariPackage[]> {
  try {
    const response = await fetch(`${API_URL}/api/packages`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return data.packages as SafariPackage[];
  } catch {
    return [];
  }
}

export async function fetchPackageBySlug(slug: string): Promise<SafariPackage | null> {
  try {
    const response = await fetch(`${API_URL}/api/packages/${slug}`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.package as SafariPackage;
  } catch {
    return null;
  }
}
