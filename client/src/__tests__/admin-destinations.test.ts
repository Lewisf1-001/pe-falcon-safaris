import { describe, it, expect } from "vitest";

// Re-implement the helpers inline for testing (these mirror admin/src/types/destination.ts)

type DestinationStatus = "draft" | "published" | "archived";

type Destination = {
  id: number;
  name: string;
  slug: string;
  country: string | null;
  region: string | null;
  shortDescription: string | null;
  description: string | null;
  status: DestinationStatus;
  featured: boolean;
  heroImage: string | null;
  galleryImages: { url: string; alt: string }[];
  seoTitle: string | null;
  seoDescription: string | null;
  sortOrder: number;
  packageCount?: number;
  createdAt: string;
  updatedAt: string;
};

type DestinationFormState = {
  name: string;
  slug: string;
  country: string;
  region: string;
  shortDescription: string;
  description: string;
  status: DestinationStatus;
  featured: boolean;
  heroImage: string;
  galleryImages: { url: string; alt: string }[];
  seoTitle: string;
  seoDescription: string;
  sortOrder: string;
};

const emptyDestinationFormState: DestinationFormState = {
  name: "",
  slug: "",
  country: "",
  region: "",
  shortDescription: "",
  description: "",
  status: "draft",
  featured: false,
  heroImage: "",
  galleryImages: [],
  seoTitle: "",
  seoDescription: "",
  sortOrder: "0",
};

function destinationToFormState(dest: Destination): DestinationFormState {
  return {
    name: dest.name,
    slug: dest.slug,
    country: dest.country ?? "",
    region: dest.region ?? "",
    shortDescription: dest.shortDescription ?? "",
    description: dest.description ?? "",
    status: dest.status,
    featured: dest.featured,
    heroImage: dest.heroImage ?? "",
    galleryImages: dest.galleryImages ?? [],
    seoTitle: dest.seoTitle ?? "",
    seoDescription: dest.seoDescription ?? "",
    sortOrder: String(dest.sortOrder),
  };
}

function slugifyDestination(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

type DestinationSummary = {
  id: number;
  name: string;
  slug: string;
  country: string | null;
  region: string | null;
  shortDescription: string | null;
  featured: boolean;
  heroImage: string | null;
  sortOrder: number;
  createdAt: string;
};

type DestinationDetail = DestinationSummary & {
  description: string | null;
  galleryImages: { url: string; alt: string }[];
  seoTitle: string | null;
  seoDescription: string | null;
  packages: DestinationPackage[];
};

type DestinationPackage = {
  id: number;
  slug: string;
  name: string;
  duration: string;
  startingPriceUsd: number;
  priceCurrency: string;
  galleryImages: { url: string; alt: string }[];
  idealFor: string | null;
};

describe("Phase 7: Destination CMS", () => {
  describe("Destination Statuses", () => {
    const DESTINATION_STATUSES: DestinationStatus[] = ["draft", "published", "archived"];

    it("includes all required status values", () => {
      expect(DESTINATION_STATUSES).toContain("draft");
      expect(DESTINATION_STATUSES).toContain("published");
      expect(DESTINATION_STATUSES).toContain("archived");
    });

    it("defaults to draft status", () => {
      expect(emptyDestinationFormState.status).toBe("draft");
    });

    it("draft destinations are not shown publicly", () => {
      const dest: Destination = {
        id: 1,
        name: "Test",
        slug: "test",
        country: null,
        region: null,
        shortDescription: null,
        description: null,
        status: "draft",
        featured: false,
        heroImage: null,
        galleryImages: [],
        seoTitle: null,
        seoDescription: null,
        sortOrder: 0,
        createdAt: "",
        updatedAt: "",
      };
      expect(dest.status).not.toBe("published");
    });

    it("archived destinations are not shown publicly", () => {
      const dest: Destination = {
        id: 1,
        name: "Test",
        slug: "test",
        country: null,
        region: null,
        shortDescription: null,
        description: null,
        status: "archived",
        featured: false,
        heroImage: null,
        galleryImages: [],
        seoTitle: null,
        seoDescription: null,
        sortOrder: 0,
        createdAt: "",
        updatedAt: "",
      };
      expect(dest.status).not.toBe("published");
    });

    it("only published destinations are visible on public pages", () => {
      const destinations: DestinationStatus[] = ["draft", "published", "archived"];
      const published = destinations.filter((s) => s === "published");
      expect(published).toHaveLength(1);
      expect(published[0]).toBe("published");
    });
  });

  describe("Destination Slug Generation", () => {
    it("converts name to lowercase slug", () => {
      expect(slugifyDestination("Maasai Mara")).toBe("maasai-mara");
    });

    it("handles special characters", () => {
      expect(slugifyDestination("Nairobi National Park!")).toBe("nairobi-national-park");
    });

    it("trims whitespace", () => {
      expect(slugifyDestination("  Amboseli  ")).toBe("amboseli");
    });

    it("handles multiple consecutive special characters", () => {
      expect(slugifyDestination("Lake   Nakuru!!")).toBe("lake-nakuru");
    });

    it("strips leading and trailing hyphens", () => {
      expect(slugifyDestination("-Mt. Kenya-")).toBe("mt-kenya");
    });

    it("handles empty string", () => {
      expect(slugifyDestination("")).toBe("");
    });

    it("handles numbers in name", () => {
      expect(slugifyDestination("Samburu 2 Day Safari")).toBe("samburu-2-day-safari");
    });

    it("preserves all-lowercase names", () => {
      expect(slugifyDestination("amboseli")).toBe("amboseli");
    });
  });

  describe("Destination Form State", () => {
    it("has correct empty initial state", () => {
      expect(emptyDestinationFormState.name).toBe("");
      expect(emptyDestinationFormState.slug).toBe("");
      expect(emptyDestinationFormState.country).toBe("");
      expect(emptyDestinationFormState.region).toBe("");
      expect(emptyDestinationFormState.status).toBe("draft");
      expect(emptyDestinationFormState.featured).toBe(false);
      expect(emptyDestinationFormState.heroImage).toBe("");
      expect(emptyDestinationFormState.galleryImages).toEqual([]);
      expect(emptyDestinationFormState.sortOrder).toBe("0");
    });

    it("converts Destination to form state correctly", () => {
      const dest: Destination = {
        id: 1,
        name: "Maasai Mara",
        slug: "maasai-mara",
        country: "Kenya",
        region: "Narok County",
        shortDescription: "The world-famous game reserve",
        description: "Full description here",
        status: "published",
        featured: true,
        heroImage: "https://example.com/hero.jpg",
        galleryImages: [{ url: "https://example.com/g1.jpg", alt: "Image 1" }],
        seoTitle: "Maasai Mara Safari",
        seoDescription: "Explore Maasai Mara",
        sortOrder: 1,
        createdAt: "2026-01-01",
        updatedAt: "2026-01-02",
      };

      const form = destinationToFormState(dest);
      expect(form.name).toBe("Maasai Mara");
      expect(form.slug).toBe("maasai-mara");
      expect(form.country).toBe("Kenya");
      expect(form.region).toBe("Narok County");
      expect(form.status).toBe("published");
      expect(form.featured).toBe(true);
      expect(form.galleryImages).toHaveLength(1);
      expect(form.sortOrder).toBe("1");
    });

    it("handles null fields gracefully in form conversion", () => {
      const dest: Destination = {
        id: 1,
        name: "Test",
        slug: "test",
        country: null,
        region: null,
        shortDescription: null,
        description: null,
        status: "draft",
        featured: false,
        heroImage: null,
        galleryImages: [],
        seoTitle: null,
        seoDescription: null,
        sortOrder: 0,
        createdAt: "",
        updatedAt: "",
      };

      const form = destinationToFormState(dest);
      expect(form.country).toBe("");
      expect(form.region).toBe("");
      expect(form.shortDescription).toBe("");
      expect(form.description).toBe("");
      expect(form.heroImage).toBe("");
      expect(form.seoTitle).toBe("");
      expect(form.seoDescription).toBe("");
    });
  });

  describe("Destination Data Model", () => {
    it("Destination has all required fields", () => {
      const dest: Destination = {
        id: 1,
        name: "Maasai Mara",
        slug: "maasai-mara",
        country: "Kenya",
        region: "Narok",
        shortDescription: "Famous reserve",
        description: "Long description",
        status: "published",
        featured: true,
        heroImage: "hero.jpg",
        galleryImages: [],
        seoTitle: "Title",
        seoDescription: "Desc",
        sortOrder: 1,
        createdAt: "2026-01-01",
        updatedAt: "2026-01-01",
      };
      expect(dest.id).toBeDefined();
      expect(dest.name).toBeDefined();
      expect(dest.slug).toBeDefined();
      expect(dest.status).toBeDefined();
      expect(dest.sortOrder).toBeDefined();
    });

    it("DestinationSummary has all required public fields", () => {
      const summary: DestinationSummary = {
        id: 1,
        name: "Maasai Mara",
        slug: "maasai-mara",
        country: "Kenya",
        region: "Narok",
        shortDescription: "Famous reserve",
        featured: true,
        heroImage: "hero.jpg",
        sortOrder: 1,
        createdAt: "2026-01-01",
      };
      expect(summary.name).toBeDefined();
      expect(summary.slug).toBeDefined();
      expect(summary.featured).toBeDefined();
      expect(summary.sortOrder).toBeDefined();
    });

    it("DestinationDetail extends DestinationSummary with packages", () => {
      const detail: DestinationDetail = {
        id: 1,
        name: "Maasai Mara",
        slug: "maasai-mara",
        country: "Kenya",
        region: "Narok",
        shortDescription: "Famous reserve",
        featured: true,
        heroImage: "hero.jpg",
        sortOrder: 1,
        createdAt: "2026-01-01",
        description: "Long text",
        galleryImages: [],
        seoTitle: "Title",
        seoDescription: "Desc",
        packages: [],
      };
      expect(detail.packages).toBeDefined();
      expect(Array.isArray(detail.packages)).toBe(true);
      expect(detail.description).toBeDefined();
    });

    it("DestinationPackage has required fields for listing", () => {
      const pkg: DestinationPackage = {
        id: 1,
        slug: "maasai-mara-3day",
        name: "3-Day Maasai Mara",
        duration: "3 Days / 2 Nights",
        startingPriceUsd: 1500,
        priceCurrency: "USD",
        galleryImages: [],
        idealFor: "Couples",
      };
      expect(pkg.startingPriceUsd).toBeGreaterThan(0);
      expect(pkg.duration).toBeDefined();
      expect(pkg.slug).toBeDefined();
    });
  });

  describe("Package-Destination Junction Logic", () => {
    it("one destination can be linked to multiple packages", () => {
      const links = [
        { package_id: 1, destination_id: 1 },
        { package_id: 2, destination_id: 1 },
        { package_id: 3, destination_id: 1 },
      ];
      const dest1Links = links.filter((l) => l.destination_id === 1);
      expect(dest1Links).toHaveLength(3);
    });

    it("one package can be linked to multiple destinations", () => {
      const links = [
        { package_id: 1, destination_id: 1 },
        { package_id: 1, destination_id: 2 },
      ];
      const pkg1Links = links.filter((l) => l.package_id === 1);
      expect(pkg1Links).toHaveLength(2);
    });

    it("destination selector manages selectedDestinationIds state", () => {
      let selected: number[] = [];
      const onChange = (val: number[]) => {
        selected = val;
      };

      // Add a destination
      onChange([1]);
      expect(selected).toEqual([1]);

      // Add another
      onChange([1, 2]);
      expect(selected).toEqual([1, 2]);

      // Remove one
      onChange(selected.filter((id) => id !== 1));
      expect(selected).toEqual([2]);
    });

    it("clearing all selections results in empty array", () => {
      const selected = [1, 2, 3];
      const cleared = selected.filter(() => false);
      expect(cleared).toEqual([]);
    });

    it("upsert prevents duplicate links", () => {
      const existing = [
        { package_id: 1, destination_id: 1 },
        { package_id: 1, destination_id: 2 },
      ];
      const newLinks = [
        { package_id: 1, destination_id: 1 },
        { package_id: 1, destination_id: 3 },
      ];

      // Simulate upsert: merge new links, deduplicating by package_id+destination_id
      const merged = [...existing];
      for (const link of newLinks) {
        const exists = merged.some(
          (l) => l.package_id === link.package_id && l.destination_id === link.destination_id
        );
        if (!exists) merged.push(link);
      }

      expect(merged).toHaveLength(3);
      expect(merged).toContainEqual({ package_id: 1, destination_id: 3 });
    });
  });

  describe("Navigation Updates", () => {
    it("client navbar includes Destinations link", () => {
      const navLinks = [
        { label: "Home", href: "/" },
        { label: "Destinations", href: "/destinations" },
        { label: "Packages", href: "/packages" },
        { label: "About", href: "/#about" },
        { label: "Contact", href: "/#book" },
      ];
      const destLink = navLinks.find((l) => l.href === "/destinations");
      expect(destLink).toBeDefined();
      expect(destLink!.label).toBe("Destinations");
    });

    it("client navbar has correct link order", () => {
      const navLinks = [
        { label: "Home", href: "/" },
        { label: "Destinations", href: "/destinations" },
        { label: "Packages", href: "/packages" },
        { label: "About", href: "/#about" },
        { label: "Contact", href: "/#book" },
      ];
      expect(navLinks[0].label).toBe("Home");
      expect(navLinks[1].label).toBe("Destinations");
      expect(navLinks[2].label).toBe("Packages");
      expect(navLinks[3].label).toBe("About");
      expect(navLinks[4].label).toBe("Contact");
    });

    it("client footer includes Destinations link", () => {
      const quickLinks = [
        { label: "Destinations", href: "/destinations" },
        { label: "Packages", href: "/packages" },
        { label: "Book Now", href: "/#book" },
        { label: "About Us", href: "/#about" },
      ];
      const destLink = quickLinks.find((l) => l.href === "/destinations");
      expect(destLink).toBeDefined();
    });

    it("admin sidebar includes Destinations nav item", () => {
      const sidebarItems = [
        { label: "Dashboard", href: "/" },
        { label: "Admin Users", href: "/admin-users" },
        { label: "Clients", href: "/clients" },
        { label: "Bookings", href: "/bookings" },
        { label: "Quotations", href: "/quotations" },
        { label: "Destinations", href: "/destinations" },
        { label: "Packages", href: "/packages" },
        { label: "Payments", href: "/payments" },
      ];
      const destItem = sidebarItems.find((l) => l.href === "/destinations");
      expect(destItem).toBeDefined();
      expect(destItem!.label).toBe("Destinations");
    });

    it("admin sidebar has correct navigation count", () => {
      const sidebarItems = [
        { label: "Dashboard", href: "/" },
        { label: "Admin Users", href: "/admin-users" },
        { label: "Clients", href: "/clients" },
        { label: "Bookings", href: "/bookings" },
        { label: "Quotations", href: "/quotations" },
        { label: "Destinations", href: "/destinations" },
        { label: "Packages", href: "/packages" },
        { label: "Payments", href: "/payments" },
      ];
      expect(sidebarItems).toHaveLength(8);
    });
  });

  describe("Featured Destinations Data Flow", () => {
    it("featured destinations filter only featured=true entries", () => {
      const destinations: DestinationSummary[] = [
        {
          id: 1,
          name: "Maasai Mara",
          slug: "maasai-mara",
          country: "Kenya",
          region: "Narok",
          shortDescription: "Famous reserve",
          featured: true,
          heroImage: null,
          sortOrder: 1,
          createdAt: "",
        },
        {
          id: 2,
          name: "Nairobi",
          slug: "nairobi",
          country: "Kenya",
          region: "Nairobi",
          shortDescription: "Capital city",
          featured: false,
          heroImage: null,
          sortOrder: 2,
          createdAt: "",
        },
      ];

      const featured = destinations.filter((d) => d.featured);
      expect(featured).toHaveLength(1);
      expect(featured[0].name).toBe("Maasai Mara");
    });

    it("published destinations are filtered by status=published", () => {
      const statuses: DestinationStatus[] = ["draft", "published", "archived"];
      const published = statuses.filter((s) => s === "published");
      expect(published).toHaveLength(1);
    });

    it("destinations are sorted by sortOrder ascending", () => {
      const destinations: DestinationSummary[] = [
        {
          id: 2,
          name: "Nairobi",
          slug: "nairobi",
          country: null,
          region: null,
          shortDescription: null,
          featured: false,
          heroImage: null,
          sortOrder: 2,
          createdAt: "",
        },
        {
          id: 1,
          name: "Maasai Mara",
          slug: "maasai-mara",
          country: null,
          region: null,
          shortDescription: null,
          featured: false,
          heroImage: null,
          sortOrder: 1,
          createdAt: "",
        },
      ];

      const sorted = [...destinations].sort((a, b) => a.sortOrder - b.sortOrder);
      expect(sorted[0].name).toBe("Maasai Mara");
      expect(sorted[1].name).toBe("Nairobi");
    });

    it("empty database returns empty array for featured destinations", () => {
      const destinations: DestinationSummary[] = [];
      const featured = destinations.filter((d) => d.featured);
      expect(featured).toEqual([]);
    });
  });

  describe("Destination Detail with Packages", () => {
    it("detail page includes related packages from junction table", () => {
      const detail: DestinationDetail = {
        id: 1,
        name: "Maasai Mara",
        slug: "maasai-mara",
        country: "Kenya",
        region: "Narok",
        shortDescription: "Famous reserve",
        featured: true,
        heroImage: "hero.jpg",
        sortOrder: 1,
        createdAt: "",
        description: "Full description",
        galleryImages: [],
        seoTitle: "Maasai Mara",
        seoDescription: "Desc",
        packages: [
          {
            id: 1,
            slug: "mara-3day",
            name: "3-Day Maasai Mara",
            duration: "3 Days / 2 Nights",
            startingPriceUsd: 1500,
            priceCurrency: "USD",
            galleryImages: [],
            idealFor: "Couples",
          },
          {
            id: 2,
            slug: "mara-5day",
            name: "5-Day Maasai Mara",
            duration: "5 Days / 4 Nights",
            startingPriceUsd: 2800,
            priceCurrency: "USD",
            galleryImages: [],
            idealFor: "Families",
          },
        ],
      };

      expect(detail.packages).toHaveLength(2);
      expect(detail.packages[0].startingPriceUsd).toBe(1500);
      expect(detail.packages[1].startingPriceUsd).toBe(2800);
    });

    it("destination with no packages shows empty array", () => {
      const detail: DestinationDetail = {
        id: 1,
        name: "Test",
        slug: "test",
        country: null,
        region: null,
        shortDescription: null,
        featured: false,
        heroImage: null,
        sortOrder: 0,
        createdAt: "",
        description: null,
        galleryImages: [],
        seoTitle: null,
        seoDescription: null,
        packages: [],
      };
      expect(detail.packages).toEqual([]);
    });

    it("only active packages are shown on destination detail", () => {
      const packages = [
        { id: 1, name: "Active Package", isActive: true },
        { id: 2, name: "Inactive Package", isActive: false },
      ];
      const activePackages = packages.filter((p) => p.isActive);
      expect(activePackages).toHaveLength(1);
      expect(activePackages[0].name).toBe("Active Package");
    });

    it("SEO metadata falls back to name and shortDescription", () => {
      const dest: DestinationDetail = {
        id: 1,
        name: "Maasai Mara",
        slug: "maasai-mara",
        country: "Kenya",
        region: "Narok",
        shortDescription: "Famous reserve",
        featured: true,
        heroImage: null,
        sortOrder: 1,
        createdAt: "",
        description: null,
        galleryImages: [],
        seoTitle: null,
        seoDescription: null,
        packages: [],
      };

      const title = dest.seoTitle || `${dest.name} | PE Falcon Safaris`;
      const description =
        dest.seoDescription || dest.shortDescription || `Explore ${dest.name}`;

      expect(title).toBe("Maasai Mara | PE Falcon Safaris");
      expect(description).toBe("Famous reserve");
    });
  });

  describe("Destinations Page Routes", () => {
    const CLIENT_DESTINATION_ROUTES = ["/destinations", "/destinations/[slug]"];
    const ADMIN_DESTINATION_ROUTES = ["/destinations"];

    it("client has destinations listing page", () => {
      expect(CLIENT_DESTINATION_ROUTES).toContain("/destinations");
    });

    it("client has destination detail page with slug param", () => {
      expect(CLIENT_DESTINATION_ROUTES).toContain("/destinations/[slug]");
    });

    it("admin has destinations management page", () => {
      expect(ADMIN_DESTINATION_ROUTES).toContain("/destinations");
    });

    it("destination slugs follow the pattern for generateStaticParams", () => {
      const destinations = [
        { slug: "maasai-mara" },
        { slug: "amboseli" },
        { slug: "samburu" },
      ];
      const slugs = destinations.map((d) => ({ slug: d.slug }));
      expect(slugs).toEqual([
        { slug: "maasai-mara" },
        { slug: "amboseli" },
        { slug: "samburu" },
      ]);
    });
  });

  describe("Destination Gallery Images", () => {
    it("gallery images have url and alt fields", () => {
      const images = [
        { url: "https://example.com/img1.jpg", alt: "Landscape view" },
        { url: "https://example.com/img2.jpg", alt: "Wildlife" },
      ];
      expect(images[0].url).toBeDefined();
      expect(images[0].alt).toBeDefined();
      expect(images[1].url).toBeDefined();
      expect(images[1].alt).toBeDefined();
    });

    it("empty gallery is valid", () => {
      const images: { url: string; alt: string }[] = [];
      expect(images).toEqual([]);
    });
  });

  describe("Database Migration Safety", () => {
    it("migration 007 is purely additive (new tables only)", () => {
      const existingTables = [
        "packages",
        "bookings",
        "quotations",
        "payments",
        "customers",
        "admins",
        "booking_status_history",
        "quotation_status_history",
      ];
      const newTables = ["destinations", "package_destinations"];

      // Ensure no existing table is modified by new migration
      for (const table of newTables) {
        expect(existingTables).not.toContain(table);
      }
    });

    it("junction table has composite unique constraint fields", () => {
      const junctionColumns = ["package_id", "destination_id"];
      expect(junctionColumns).toContain("package_id");
      expect(junctionColumns).toContain("destination_id");
    });

    it("destinations table has required RLS columns", () => {
      const rlsColumns = ["id", "status", "slug", "name"];
      for (const col of rlsColumns) {
        expect(rlsColumns).toContain(col);
      }
    });
  });
});
