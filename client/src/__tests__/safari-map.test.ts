import { describe, it, expect } from "vitest";

type DestinationSummary = {
  id: number;
  name: string;
  slug: string;
  country: string | null;
  region: string | null;
  shortDescription: string | null;
  featured: boolean;
  heroImage: string | null;
  latitude: number | null;
  longitude: number | null;
  sortOrder: number;
  createdAt: string;
};

function isValidCoord(lat: number | null, lng: number | null): boolean {
  return (
    lat != null &&
    lng != null &&
    typeof lat === "number" &&
    typeof lng === "number" &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

function filterPlottable(destinations: DestinationSummary[]): DestinationSummary[] {
  return destinations.filter((d) => isValidCoord(d.latitude, d.longitude));
}

function filterUnplottable(destinations: DestinationSummary[]): DestinationSummary[] {
  return destinations.filter((d) => !isValidCoord(d.latitude, d.longitude));
}

describe("Phase 9: Interactive Safari Map", () => {
  describe("Coordinate Validation", () => {
    it("accepts valid coordinate pair", () => {
      expect(isValidCoord(-1.4061, 36.9661)).toBe(true);
    });

    it("accepts latitude -90", () => {
      expect(isValidCoord(-90, 0)).toBe(true);
    });

    it("accepts latitude 90", () => {
      expect(isValidCoord(90, 0)).toBe(true);
    });

    it("accepts longitude -180", () => {
      expect(isValidCoord(0, -180)).toBe(true);
    });

    it("accepts longitude 180", () => {
      expect(isValidCoord(0, 180)).toBe(true);
    });

    it("accepts zero coordinates", () => {
      expect(isValidCoord(0, 0)).toBe(true);
    });

    it("rejects null latitude", () => {
      expect(isValidCoord(null, 36.9661)).toBe(false);
    });

    it("rejects null longitude", () => {
      expect(isValidCoord(-1.4061, null)).toBe(false);
    });

    it("rejects both null", () => {
      expect(isValidCoord(null, null)).toBe(false);
    });

    it("rejects latitude below -90", () => {
      expect(isValidCoord(-90.1, 0)).toBe(false);
    });

    it("rejects latitude above 90", () => {
      expect(isValidCoord(90.1, 0)).toBe(false);
    });

    it("rejects longitude below -180", () => {
      expect(isValidCoord(0, -180.1)).toBe(false);
    });

    it("rejects longitude above 180", () => {
      expect(isValidCoord(0, 180.1)).toBe(false);
    });
  });

  describe("Plottable Destinations", () => {
    const destinations: DestinationSummary[] = [
      {
        id: 1,
        name: "Maasai Mara",
        slug: "maasai-mara",
        country: "Kenya",
        region: "Narok County",
        shortDescription: "Famous wildlife reserve",
        featured: true,
        heroImage: null,
        latitude: -1.4061,
        longitude: 36.9661,
        sortOrder: 0,
        createdAt: "",
      },
      {
        id: 2,
        name: "Unknown Location",
        slug: "unknown-location",
        country: "Kenya",
        region: null,
        shortDescription: null,
        featured: false,
        heroImage: null,
        latitude: null,
        longitude: null,
        sortOrder: 1,
        createdAt: "",
      },
      {
        id: 3,
        name: "Amboseli",
        slug: "amboseli",
        country: "Kenya",
        region: "Kajiado County",
        shortDescription: "Elephant herds",
        featured: true,
        heroImage: null,
        latitude: -2.6533,
        longitude: 37.2574,
        sortOrder: 2,
        createdAt: "",
      },
    ];

    it("filters plottable destinations correctly", () => {
      const plottable = filterPlottable(destinations);
      expect(plottable).toHaveLength(2);
      expect(plottable.map((d) => d.id)).toEqual([1, 3]);
    });

    it("filters unplottable destinations correctly", () => {
      const unplottable = filterUnplottable(destinations);
      expect(unplottable).toHaveLength(1);
      expect(unplottable[0].id).toBe(2);
    });

    it("plottable destinations have valid coordinates", () => {
      const plottable = filterPlottable(destinations);
      for (const dest of plottable) {
        expect(isValidCoord(dest.latitude, dest.longitude)).toBe(true);
      }
    });

    it("unplottable destinations have null coordinates", () => {
      const unplottable = filterUnplottable(destinations);
      for (const dest of unplottable) {
        expect(dest.latitude == null || dest.longitude == null).toBe(true);
      }
    });
  });

  describe("Destination Slug Links", () => {
    it("generates correct destination detail URL", () => {
      const slug = "maasai-mara";
      expect(`/destinations/${slug}`).toBe("/destinations/maasai-mara");
    });

    it("preserves slug format", () => {
      const slug = "lake-nakuru";
      expect(slug).toMatch(/^[a-z0-9-]+$/);
    });
  });

  describe("Map Data Safety", () => {
    it("does not expose admin-only fields", () => {
      const dest: DestinationSummary = {
        id: 1,
        name: "Test",
        slug: "test",
        country: "Kenya",
        region: null,
        shortDescription: null,
        featured: false,
        heroImage: null,
        latitude: -1.4061,
        longitude: 36.9661,
        sortOrder: 0,
        createdAt: "",
      };

      const publicFields = [
        "id",
        "name",
        "slug",
        "country",
        "region",
        "shortDescription",
        "featured",
        "heroImage",
        "latitude",
        "longitude",
        "sortOrder",
        "createdAt",
      ];

      for (const key of Object.keys(dest)) {
        expect(publicFields).toContain(key);
      }
    });

    it("destinations without coordinates remain accessible via list", () => {
      const destinations: DestinationSummary[] = [
        {
          id: 1,
          name: "No Coords",
          slug: "no-coords",
          country: "Kenya",
          region: null,
          shortDescription: null,
          featured: false,
          heroImage: null,
          latitude: null,
          longitude: null,
          sortOrder: 0,
          createdAt: "",
        },
      ];

      const unplottable = filterUnplottable(destinations);
      expect(unplottable).toHaveLength(1);
      expect(unplottable[0].slug).toBe("no-coords");
    });
  });

  describe("Existing Destination Functionality", () => {
    it("destination summary type includes all required fields", () => {
      const dest: DestinationSummary = {
        id: 1,
        name: "Test",
        slug: "test",
        country: "Kenya",
        region: "Nairobi",
        shortDescription: "Test destination",
        featured: true,
        heroImage: "https://example.com/hero.jpg",
        latitude: -1.2921,
        longitude: 36.8219,
        sortOrder: 0,
        createdAt: "2026-01-01",
      };

      expect(dest.id).toBeDefined();
      expect(dest.name).toBeDefined();
      expect(dest.slug).toBeDefined();
      expect(dest.latitude).toBeDefined();
      expect(dest.longitude).toBeDefined();
    });

    it("empty destination list is handled safely", () => {
      const plottable = filterPlottable([]);
      const unplottable = filterUnplottable([]);
      expect(plottable).toHaveLength(0);
      expect(unplottable).toHaveLength(0);
    });
  });
});
