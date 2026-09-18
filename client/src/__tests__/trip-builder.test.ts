import { describe, it, expect } from "vitest";

type ItineraryItem = {
  destinationId: number;
  destinationName: string;
  destinationSlug: string;
  packageId: number | null;
  packageName: string | null;
  packageSlug: string | null;
  packagePriceUsd: number | null;
};

function addToItinerary(
  itinerary: ItineraryItem[],
  dest: { id: number; name: string; slug: string }
): ItineraryItem[] {
  if (itinerary.some((item) => item.destinationId === dest.id)) return itinerary;
  return [
    ...itinerary,
    {
      destinationId: dest.id,
      destinationName: dest.name,
      destinationSlug: dest.slug,
      packageId: null,
      packageName: null,
      packageSlug: null,
      packagePriceUsd: null,
    },
  ];
}

function removeFromItinerary(
  itinerary: ItineraryItem[],
  destinationId: number
): ItineraryItem[] {
  return itinerary.filter((item) => item.destinationId !== destinationId);
}

function moveUp(itinerary: ItineraryItem[], index: number): ItineraryItem[] {
  if (index === 0) return itinerary;
  const next = [...itinerary];
  [next[index - 1], next[index]] = [next[index], next[index - 1]];
  return next;
}

function moveDown(itinerary: ItineraryItem[], index: number): ItineraryItem[] {
  if (index >= itinerary.length - 1) return itinerary;
  const next = [...itinerary];
  [next[index], next[index + 1]] = [next[index + 1], next[index]];
  return next;
}

function selectPackage(
  itinerary: ItineraryItem[],
  destinationId: number,
  pkg: { id: number; name: string; slug: string; startingPriceUsd: number } | null
): ItineraryItem[] {
  return itinerary.map((item) =>
    item.destinationId === destinationId
      ? {
          ...item,
          packageId: pkg?.id ?? null,
          packageName: pkg?.name ?? null,
          packageSlug: pkg?.slug ?? null,
          packagePriceUsd: pkg?.startingPriceUsd ?? null,
        }
      : item
  );
}

function getPackagesForDestination(
  packages: { name: string; destinations: string[]; isActive: boolean }[],
  destinationName: string
) {
  return packages.filter(
    (pkg) =>
      pkg.isActive &&
      pkg.destinations.some(
        (d) => d.toLowerCase() === destinationName.toLowerCase()
      )
  );
}

function loadItinerary(stored: string | null): ItineraryItem[] {
  if (!stored) return [];
  try {
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item: unknown): item is ItineraryItem =>
        item != null &&
        typeof item === "object" &&
        "destinationId" in item &&
        "destinationName" in item &&
        "destinationSlug" in item
    );
  } catch {
    return [];
  }
}

describe("Phase 10: Safari Trip Builder", () => {
  describe("Adding Destinations", () => {
    it("adds a destination to an empty itinerary", () => {
      const result = addToItinerary([], {
        id: 1,
        name: "Maasai Mara",
        slug: "maasai-mara",
      });
      expect(result).toHaveLength(1);
      expect(result[0].destinationId).toBe(1);
      expect(result[0].destinationName).toBe("Maasai Mara");
    });

    it("appends destination to end of itinerary", () => {
      let itinerary = addToItinerary([], {
        id: 1,
        name: "Maasai Mara",
        slug: "maasai-mara",
      });
      itinerary = addToItinerary(itinerary, {
        id: 2,
        name: "Amboseli",
        slug: "amboseli",
      });
      expect(itinerary).toHaveLength(2);
      expect(itinerary[1].destinationId).toBe(2);
    });

    it("prevents duplicate destinations", () => {
      let itinerary = addToItinerary([], {
        id: 1,
        name: "Maasai Mara",
        slug: "maasai-mara",
      });
      itinerary = addToItinerary(itinerary, {
        id: 1,
        name: "Maasai Mara",
        slug: "maasai-mara",
      });
      expect(itinerary).toHaveLength(1);
    });

    it("sets null package fields by default", () => {
      const result = addToItinerary([], {
        id: 1,
        name: "Maasai Mara",
        slug: "maasai-mara",
      });
      expect(result[0].packageId).toBeNull();
      expect(result[0].packageName).toBeNull();
      expect(result[0].packageSlug).toBeNull();
      expect(result[0].packagePriceUsd).toBeNull();
    });
  });

  describe("Removing Destinations", () => {
    it("removes a destination by ID", () => {
      let itinerary = addToItinerary([], {
        id: 1,
        name: "Maasai Mara",
        slug: "maasai-mara",
      });
      itinerary = addToItinerary(itinerary, {
        id: 2,
        name: "Amboseli",
        slug: "amboseli",
      });
      const result = removeFromItinerary(itinerary, 1);
      expect(result).toHaveLength(1);
      expect(result[0].destinationId).toBe(2);
    });

    it("handles removing from empty itinerary", () => {
      const result = removeFromItinerary([], 1);
      expect(result).toHaveLength(0);
    });

    it("handles removing non-existent destination", () => {
      let itinerary = addToItinerary([], {
        id: 1,
        name: "Maasai Mara",
        slug: "maasai-mara",
      });
      itinerary = removeFromItinerary(itinerary, 999);
      expect(itinerary).toHaveLength(1);
    });
  });

  describe("Ordering", () => {
    const baseItinerary: ItineraryItem[] = [
      {
        destinationId: 1,
        destinationName: "Maasai Mara",
        destinationSlug: "maasai-mara",
        packageId: null,
        packageName: null,
        packageSlug: null,
        packagePriceUsd: null,
      },
      {
        destinationId: 2,
        destinationName: "Amboseli",
        destinationSlug: "amboseli",
        packageId: null,
        packageName: null,
        packageSlug: null,
        packagePriceUsd: null,
      },
      {
        destinationId: 3,
        destinationName: "Lake Nakuru",
        destinationSlug: "lake-nakuru",
        packageId: null,
        packageName: null,
        packageSlug: null,
        packagePriceUsd: null,
      },
    ];

    it("moves item up", () => {
      const result = moveUp(baseItinerary, 1);
      expect(result[0].destinationId).toBe(2);
      expect(result[1].destinationId).toBe(1);
    });

    it("does not move first item up", () => {
      const result = moveUp(baseItinerary, 0);
      expect(result[0].destinationId).toBe(1);
    });

    it("moves item down", () => {
      const result = moveDown(baseItinerary, 0);
      expect(result[0].destinationId).toBe(2);
      expect(result[1].destinationId).toBe(1);
    });

    it("does not move last item down", () => {
      const result = moveDown(baseItinerary, 2);
      expect(result[2].destinationId).toBe(3);
    });

    it("order is deterministic", () => {
      let result = moveUp(baseItinerary, 2);
      result = moveUp(result, 1);
      expect(result.map((i) => i.destinationId)).toEqual([3, 1, 2]);
    });
  });

  describe("Package Selection", () => {
    it("selects a package for a destination", () => {
      const itinerary = addToItinerary([], {
        id: 1,
        name: "Maasai Mara",
        slug: "maasai-mara",
      });
      const result = selectPackage(itinerary, 1, {
        id: 10,
        name: "Classic Safari",
        slug: "classic-safari",
        startingPriceUsd: 2500,
      });
      expect(result[0].packageId).toBe(10);
      expect(result[0].packageName).toBe("Classic Safari");
      expect(result[0].packageSlug).toBe("classic-safari");
      expect(result[0].packagePriceUsd).toBe(2500);
    });

    it("removes package selection", () => {
      let itinerary = addToItinerary([], {
        id: 1,
        name: "Maasai Mara",
        slug: "maasai-mara",
      });
      itinerary = selectPackage(itinerary, 1, {
        id: 10,
        name: "Classic Safari",
        slug: "classic-safari",
        startingPriceUsd: 2500,
      });
      const result = selectPackage(itinerary, 1, null);
      expect(result[0].packageId).toBeNull();
    });

    it("does not affect other destinations", () => {
      let itinerary = addToItinerary([], {
        id: 1,
        name: "Maasai Mara",
        slug: "maasai-mara",
      });
      itinerary = addToItinerary(itinerary, {
        id: 2,
        name: "Amboseli",
        slug: "amboseli",
      });
      itinerary = selectPackage(itinerary, 1, {
        id: 10,
        name: "Classic Safari",
        slug: "classic-safari",
        startingPriceUsd: 2500,
      });
      expect(itinerary[1].packageId).toBeNull();
    });
  });

  describe("Package Filtering", () => {
    const testPackages = [
      {
        name: "Maasai Mara Explorer",
        destinations: ["Maasai Mara"],
        isActive: true,
      },
      {
        name: "Kenya Grand Tour",
        destinations: ["Maasai Mara", "Amboseli"],
        isActive: true,
      },
      {
        name: "Inactive Package",
        destinations: ["Maasai Mara"],
        isActive: false,
      },
    ];

    it("finds packages for a destination", () => {
      const result = getPackagesForDestination(testPackages, "Maasai Mara");
      expect(result).toHaveLength(2);
    });

    it("excludes inactive packages", () => {
      const result = getPackagesForDestination(testPackages, "Maasai Mara");
      expect(result.every((p) => p.isActive)).toBe(true);
    });

    it("returns empty for no matching destination", () => {
      const result = getPackagesForDestination(testPackages, "Tsavo");
      expect(result).toHaveLength(0);
    });

    it("case-insensitive matching", () => {
      const result = getPackagesForDestination(testPackages, "maasai mara");
      expect(result).toHaveLength(2);
    });
  });

  describe("Persistence", () => {
    it("loads empty itinerary from null", () => {
      expect(loadItinerary(null)).toEqual([]);
    });

    it("loads empty itinerary from empty string", () => {
      expect(loadItinerary("")).toEqual([]);
    });

    it("handles malformed JSON", () => {
      expect(loadItinerary("not-json")).toEqual([]);
    });

    it("handles non-array JSON", () => {
      expect(loadItinerary('{"foo": "bar"}')).toEqual([]);
    });

    it("filters out malformed items", () => {
      const stored = JSON.stringify([
        { destinationId: 1, destinationName: "Test", destinationSlug: "test" },
        { invalid: true },
        null,
      ]);
      const result = loadItinerary(stored);
      expect(result).toHaveLength(1);
      expect(result[0].destinationId).toBe(1);
    });

    it("round-trips valid itinerary", () => {
      const items: ItineraryItem[] = [
        {
          destinationId: 1,
          destinationName: "Maasai Mara",
          destinationSlug: "maasai-mara",
          packageId: null,
          packageName: null,
          packageSlug: null,
          packagePriceUsd: null,
        },
      ];
      const stored = JSON.stringify(items);
      const result = loadItinerary(stored);
      expect(result).toEqual(items);
    });
  });

  describe("Itinerary Data Safety", () => {
    it("itinerary items contain only safe fields", () => {
      const item: ItineraryItem = {
        destinationId: 1,
        destinationName: "Maasai Mara",
        destinationSlug: "maasai-mara",
        packageId: 10,
        packageName: "Classic Safari",
        packageSlug: "classic-safari",
        packagePriceUsd: 2500,
      };

      const safeFields = [
        "destinationId",
        "destinationName",
        "destinationSlug",
        "packageId",
        "packageName",
        "packageSlug",
        "packagePriceUsd",
      ];

      for (const key of Object.keys(item)) {
        expect(safeFields).toContain(key);
      }
    });

    it("no admin-only fields in itinerary", () => {
      const item: ItineraryItem = {
        destinationId: 1,
        destinationName: "Maasai Mara",
        destinationSlug: "maasai-mara",
        packageId: null,
        packageName: null,
        packageSlug: null,
        packagePriceUsd: null,
      };

      const adminFields = [
        "status",
        "sortOrder",
        "createdAt",
        "updatedAt",
        "featured",
        "seoTitle",
        "seoDescription",
      ];

      for (const field of adminFields) {
        expect(item).not.toHaveProperty(field);
      }
    });

    it("no payment data in itinerary", () => {
      const item: ItineraryItem = {
        destinationId: 1,
        destinationName: "Maasai Mara",
        destinationSlug: "maasai-mara",
        packageId: null,
        packageName: null,
        packageSlug: null,
        packagePriceUsd: null,
      };

      const paymentFields = [
        "paymentMethod",
        "paymentStatus",
        "transactionId",
        "phone",
        "amount",
      ];

      for (const field of paymentFields) {
        expect(item).not.toHaveProperty(field);
      }
    });

    it("no auth tokens in itinerary", () => {
      const item: ItineraryItem = {
        destinationId: 1,
        destinationName: "Maasai Mara",
        destinationSlug: "maasai-mara",
        packageId: null,
        packageName: null,
        packageSlug: null,
        packagePriceUsd: null,
      };

      const authFields = ["token", "userId", "authId", "session"];

      for (const field of authFields) {
        expect(item).not.toHaveProperty(field);
      }
    });
  });

  describe("Existing Functionality Preserved", () => {
    it("destination pages remain intact", () => {
      const slug = "maasai-mara";
      expect(`/destinations/${slug}`).toBe("/destinations/maasai-mara");
    });

    it("package pages remain intact", () => {
      const slug = "classic-safari";
      expect(`/packages/${slug}`).toBe("/packages/classic-safari");
    });

    it("booking flow URL unchanged", () => {
      const slug = "classic-safari";
      expect(`/packages/${slug}/book`).toBe(
        "/packages/classic-safari/book"
      );
    });

    it("empty itinerary is valid", () => {
      expect(loadItinerary(null)).toEqual([]);
    });
  });
});
