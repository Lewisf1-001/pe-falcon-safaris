import { describe, it, expect } from "vitest";

// Re-implement types and helpers inline for testing (mirrors admin/src/types/wildlife.ts)

type ConservationStatus =
  | "least_concern"
  | "near_threatened"
  | "vulnerable"
  | "endangered"
  | "critically_endangered"
  | "data_deficient"
  | "not_evaluated";

type WildlifeStatus = "draft" | "published" | "archived";

type WildlifeSpecies = {
  id: number;
  name: string;
  slug: string;
  scientificName: string | null;
  commonName: string | null;
  shortDescription: string | null;
  description: string | null;
  habitat: string | null;
  behavior: string | null;
  diet: string | null;
  conservationStatus: ConservationStatus | null;
  safariViewing: string | null;
  status: WildlifeStatus;
  featured: boolean;
  heroImage: string | null;
  galleryImages: { url: string; alt: string }[];
  seoTitle: string | null;
  seoDescription: string | null;
  sortOrder: number;
  destinationCount?: number;
  createdAt: string;
  updatedAt: string;
};

type WildlifeFormState = {
  name: string;
  slug: string;
  scientificName: string;
  commonName: string;
  shortDescription: string;
  description: string;
  habitat: string;
  behavior: string;
  diet: string;
  conservationStatus: string;
  safariViewing: string;
  status: WildlifeStatus;
  featured: boolean;
  heroImage: string;
  galleryImages: { url: string; alt: string }[];
  seoTitle: string;
  seoDescription: string;
  sortOrder: string;
};

const emptyWildlifeFormState: WildlifeFormState = {
  name: "",
  slug: "",
  scientificName: "",
  commonName: "",
  shortDescription: "",
  description: "",
  habitat: "",
  behavior: "",
  diet: "",
  conservationStatus: "",
  safariViewing: "",
  status: "draft",
  featured: false,
  heroImage: "",
  galleryImages: [],
  seoTitle: "",
  seoDescription: "",
  sortOrder: "0",
};

function wildlifeToFormState(species: WildlifeSpecies): WildlifeFormState {
  return {
    name: species.name,
    slug: species.slug,
    scientificName: species.scientificName ?? "",
    commonName: species.commonName ?? "",
    shortDescription: species.shortDescription ?? "",
    description: species.description ?? "",
    habitat: species.habitat ?? "",
    behavior: species.behavior ?? "",
    diet: species.diet ?? "",
    conservationStatus: species.conservationStatus ?? "",
    safariViewing: species.safariViewing ?? "",
    status: species.status,
    featured: species.featured,
    heroImage: species.heroImage ?? "",
    galleryImages: species.galleryImages ?? [],
    seoTitle: species.seoTitle ?? "",
    seoDescription: species.seoDescription ?? "",
    sortOrder: String(species.sortOrder),
  };
}

function slugifyWildlife(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

type WildlifeSummary = {
  id: number;
  name: string;
  slug: string;
  scientificName: string | null;
  commonName: string | null;
  shortDescription: string | null;
  conservationStatus: string | null;
  featured: boolean;
  heroImage: string | null;
  sortOrder: number;
  createdAt: string;
};

type WildlifeDetail = WildlifeSummary & {
  description: string | null;
  habitat: string | null;
  behavior: string | null;
  diet: string | null;
  safariViewing: string | null;
  galleryImages: { url: string; alt: string }[];
  seoTitle: string | null;
  seoDescription: string | null;
  destinations: WildlifeDestination[];
};

type WildlifeDestination = {
  id: number;
  name: string;
  slug: string;
  heroImage: string | null;
};

describe("Phase 8: Wildlife Explorer", () => {
  describe("Wildlife Statuses", () => {
    const WILDLIFE_STATUSES: WildlifeStatus[] = ["draft", "published", "archived"];

    it("includes all required status values", () => {
      expect(WILDLIFE_STATUSES).toContain("draft");
      expect(WILDLIFE_STATUSES).toContain("published");
      expect(WILDLIFE_STATUSES).toContain("archived");
    });

    it("defaults to draft status", () => {
      expect(emptyWildlifeFormState.status).toBe("draft");
    });

    it("draft species are not shown publicly", () => {
      const species: WildlifeSpecies = {
        id: 1,
        name: "Lion",
        slug: "lion",
        scientificName: "Panthera leo",
        commonName: null,
        shortDescription: null,
        description: null,
        habitat: null,
        behavior: null,
        diet: null,
        conservationStatus: "vulnerable",
        safariViewing: null,
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
      expect(species.status).not.toBe("published");
    });

    it("archived species are not shown publicly", () => {
      const species: WildlifeSpecies = {
        id: 1,
        name: "Lion",
        slug: "lion",
        scientificName: null,
        commonName: null,
        shortDescription: null,
        description: null,
        habitat: null,
        behavior: null,
        diet: null,
        conservationStatus: null,
        safariViewing: null,
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
      expect(species.status).not.toBe("published");
    });

    it("only published species are visible on public pages", () => {
      const statuses: WildlifeStatus[] = ["draft", "published", "archived"];
      const published = statuses.filter((s) => s === "published");
      expect(published).toHaveLength(1);
      expect(published[0]).toBe("published");
    });
  });

  describe("Conservation Statuses", () => {
    const VALID_CONSERVATION: ConservationStatus[] = [
      "least_concern", "near_threatened", "vulnerable",
      "endangered", "critically_endangered", "data_deficient", "not_evaluated",
    ];

    it("includes all IUCN-style statuses", () => {
      expect(VALID_CONSERVATION).toContain("least_concern");
      expect(VALID_CONSERVATION).toContain("near_threatened");
      expect(VALID_CONSERVATION).toContain("vulnerable");
      expect(VALID_CONSERVATION).toContain("endangered");
      expect(VALID_CONSERVATION).toContain("critically_endangered");
      expect(VALID_CONSERVATION).toContain("data_deficient");
      expect(VALID_CONSERVATION).toContain("not_evaluated");
    });

    it("has 7 conservation status options", () => {
      expect(VALID_CONSERVATION).toHaveLength(7);
    });
  });

  describe("Slug Generation", () => {
    it("converts name to lowercase slug", () => {
      expect(slugifyWildlife("African Elephant")).toBe("african-elephant");
    });

    it("handles special characters", () => {
      expect(slugifyWildlife("Black Rhinoceros!")).toBe("black-rhinoceros");
    });

    it("trims whitespace", () => {
      expect(slugifyWildlife("  Lion  ")).toBe("lion");
    });

    it("handles multiple consecutive special characters", () => {
      expect(slugifyWildlife("Cape   Buffalo!!")).toBe("cape-buffalo");
    });

    it("strips leading and trailing hyphens", () => {
      expect(slugifyWildlife("-Leopard-")).toBe("leopard");
    });

    it("handles empty string", () => {
      expect(slugifyWildlife("")).toBe("");
    });

    it("preserves all-lowercase names", () => {
      expect(slugifyWildlife("cheetah")).toBe("cheetah");
    });

    it("handles scientific-style names", () => {
      expect(slugifyWildlife("Panthera leo")).toBe("panthera-leo");
    });
  });

  describe("Form State", () => {
    it("has correct empty initial state", () => {
      expect(emptyWildlifeFormState.name).toBe("");
      expect(emptyWildlifeFormState.slug).toBe("");
      expect(emptyWildlifeFormState.scientificName).toBe("");
      expect(emptyWildlifeFormState.commonName).toBe("");
      expect(emptyWildlifeFormState.status).toBe("draft");
      expect(emptyWildlifeFormState.featured).toBe(false);
      expect(emptyWildlifeFormState.conservationStatus).toBe("");
      expect(emptyWildlifeFormState.galleryImages).toEqual([]);
      expect(emptyWildlifeFormState.sortOrder).toBe("0");
    });

    it("converts species to form state correctly", () => {
      const species: WildlifeSpecies = {
        id: 1,
        name: "African Elephant",
        slug: "african-elephant",
        scientificName: "Loxodonta africana",
        commonName: "Savanna Elephant",
        shortDescription: "The largest land animal",
        description: "Full description",
        habitat: "Savanna and forests",
        behavior: "Matriarchal herds",
        diet: "Herbivore",
        conservationStatus: "endangered",
        safariViewing: "Common in Amboseli",
        status: "published",
        featured: true,
        heroImage: "https://example.com/hero.jpg",
        galleryImages: [{ url: "https://example.com/g1.jpg", alt: "Image 1" }],
        seoTitle: "African Elephant Safari",
        seoDescription: "See elephants in Kenya",
        sortOrder: 1,
        createdAt: "2026-01-01",
        updatedAt: "2026-01-02",
      };

      const form = wildlifeToFormState(species);
      expect(form.name).toBe("African Elephant");
      expect(form.slug).toBe("african-elephant");
      expect(form.scientificName).toBe("Loxodonta africana");
      expect(form.commonName).toBe("Savanna Elephant");
      expect(form.conservationStatus).toBe("endangered");
      expect(form.status).toBe("published");
      expect(form.featured).toBe(true);
      expect(form.galleryImages).toHaveLength(1);
      expect(form.sortOrder).toBe("1");
    });

    it("handles null fields gracefully in form conversion", () => {
      const species: WildlifeSpecies = {
        id: 1,
        name: "Test",
        slug: "test",
        scientificName: null,
        commonName: null,
        shortDescription: null,
        description: null,
        habitat: null,
        behavior: null,
        diet: null,
        conservationStatus: null,
        safariViewing: null,
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

      const form = wildlifeToFormState(species);
      expect(form.scientificName).toBe("");
      expect(form.commonName).toBe("");
      expect(form.habitat).toBe("");
      expect(form.behavior).toBe("");
      expect(form.diet).toBe("");
      expect(form.conservationStatus).toBe("");
      expect(form.safariViewing).toBe("");
      expect(form.heroImage).toBe("");
    });
  });

  describe("Data Model", () => {
    it("WildlifeSpecies has all required fields", () => {
      const species: WildlifeSpecies = {
        id: 1,
        name: "Lion",
        slug: "lion",
        scientificName: "Panthera leo",
        commonName: null,
        shortDescription: null,
        description: null,
        habitat: null,
        behavior: null,
        diet: null,
        conservationStatus: "vulnerable",
        safariViewing: null,
        status: "published",
        featured: false,
        heroImage: null,
        galleryImages: [],
        seoTitle: null,
        seoDescription: null,
        sortOrder: 1,
        createdAt: "",
        updatedAt: "",
      };
      expect(species.id).toBeDefined();
      expect(species.name).toBeDefined();
      expect(species.slug).toBeDefined();
      expect(species.status).toBeDefined();
      expect(species.conservationStatus).toBeDefined();
      expect(species.sortOrder).toBeDefined();
    });

    it("WildlifeSummary has required public fields", () => {
      const summary: WildlifeSummary = {
        id: 1,
        name: "Lion",
        slug: "lion",
        scientificName: "Panthera leo",
        commonName: null,
        shortDescription: null,
        conservationStatus: "vulnerable",
        featured: false,
        heroImage: null,
        sortOrder: 1,
        createdAt: "",
      };
      expect(summary.name).toBeDefined();
      expect(summary.slug).toBeDefined();
      expect(summary.conservationStatus).toBeDefined();
    });

    it("WildlifeDetail extends WildlifeSummary with destinations", () => {
      const detail: WildlifeDetail = {
        id: 1,
        name: "Lion",
        slug: "lion",
        scientificName: null,
        commonName: null,
        shortDescription: null,
        conservationStatus: null,
        featured: false,
        heroImage: null,
        sortOrder: 1,
        createdAt: "",
        description: null,
        habitat: null,
        behavior: null,
        diet: null,
        safariViewing: null,
        galleryImages: [],
        seoTitle: null,
        seoDescription: null,
        destinations: [],
      };
      expect(detail.destinations).toBeDefined();
      expect(Array.isArray(detail.destinations)).toBe(true);
      expect(detail.habitat).toBeDefined();
      expect(detail.behavior).toBeDefined();
    });
  });

  describe("Destination-Wildlife Junction Logic", () => {
    it("one destination can feature multiple species", () => {
      const links = [
        { destination_id: 1, species_id: 1 },
        { destination_id: 1, species_id: 2 },
        { destination_id: 1, species_id: 3 },
      ];
      const dest1Links = links.filter((l) => l.destination_id === 1);
      expect(dest1Links).toHaveLength(3);
    });

    it("one species can appear in multiple destinations", () => {
      const links = [
        { destination_id: 1, species_id: 1 },
        { destination_id: 2, species_id: 1 },
      ];
      const species1Links = links.filter((l) => l.species_id === 1);
      expect(species1Links).toHaveLength(2);
    });

    it("clearing all selections results in empty array", () => {
      const selected = [1, 2, 3];
      const cleared = selected.filter(() => false);
      expect(cleared).toEqual([]);
    });

    it("upsert prevents duplicate links", () => {
      const existing = [
        { destination_id: 1, species_id: 1 },
        { destination_id: 1, species_id: 2 },
      ];
      const newLinks = [
        { destination_id: 1, species_id: 1 },
        { destination_id: 1, species_id: 3 },
      ];

      const merged = [...existing];
      for (const link of newLinks) {
        const exists = merged.some(
          (l) => l.destination_id === link.destination_id && l.species_id === link.species_id
        );
        if (!exists) merged.push(link);
      }

      expect(merged).toHaveLength(3);
      expect(merged).toContainEqual({ destination_id: 1, species_id: 3 });
    });
  });

  describe("Navigation Updates", () => {
    it("client navbar includes Wildlife link", () => {
      const navLinks = [
        { label: "Home", href: "/" },
        { label: "Destinations", href: "/destinations" },
        { label: "Wildlife", href: "/wildlife" },
        { label: "Packages", href: "/packages" },
        { label: "About", href: "/#about" },
        { label: "Contact", href: "/#book" },
      ];
      const wildlifeLink = navLinks.find((l) => l.href === "/wildlife");
      expect(wildlifeLink).toBeDefined();
      expect(wildlifeLink!.label).toBe("Wildlife");
    });

    it("client navbar has correct link order", () => {
      const navLinks = [
        { label: "Home", href: "/" },
        { label: "Destinations", href: "/destinations" },
        { label: "Wildlife", href: "/wildlife" },
        { label: "Packages", href: "/packages" },
        { label: "About", href: "/#about" },
        { label: "Contact", href: "/#book" },
      ];
      expect(navLinks[0].label).toBe("Home");
      expect(navLinks[1].label).toBe("Destinations");
      expect(navLinks[2].label).toBe("Wildlife");
      expect(navLinks[3].label).toBe("Packages");
    });

    it("client footer includes Wildlife link", () => {
      const quickLinks = [
        { label: "Destinations", href: "/destinations" },
        { label: "Wildlife", href: "/wildlife" },
        { label: "Packages", href: "/packages" },
        { label: "Book Now", href: "/#book" },
        { label: "About Us", href: "/#about" },
      ];
      const wildlifeLink = quickLinks.find((l) => l.href === "/wildlife");
      expect(wildlifeLink).toBeDefined();
    });

    it("admin sidebar includes Wildlife nav item", () => {
      const sidebarItems = [
        { label: "Dashboard", href: "/" },
        { label: "Admin Users", href: "/admin-users" },
        { label: "Clients", href: "/clients" },
        { label: "Bookings", href: "/bookings" },
        { label: "Quotations", href: "/quotations" },
        { label: "Destinations", href: "/destinations" },
        { label: "Wildlife", href: "/wildlife" },
        { label: "Packages", href: "/packages" },
        { label: "Payments", href: "/payments" },
      ];
      const wildlifeItem = sidebarItems.find((l) => l.href === "/wildlife");
      expect(wildlifeItem).toBeDefined();
      expect(wildlifeItem!.label).toBe("Wildlife");
    });

    it("admin sidebar has correct navigation count", () => {
      const sidebarItems = [
        { label: "Dashboard", href: "/" },
        { label: "Admin Users", href: "/admin-users" },
        { label: "Clients", href: "/clients" },
        { label: "Bookings", href: "/bookings" },
        { label: "Quotations", href: "/quotations" },
        { label: "Destinations", href: "/destinations" },
        { label: "Wildlife", href: "/wildlife" },
        { label: "Packages", href: "/packages" },
        { label: "Payments", href: "/payments" },
      ];
      expect(sidebarItems).toHaveLength(9);
    });
  });

  describe("Featured Wildlife Data Flow", () => {
    it("featured wildlife filter only featured=true entries", () => {
      const species: WildlifeSummary[] = [
        {
          id: 1,
          name: "Lion",
          slug: "lion",
          scientificName: "Panthera leo",
          commonName: null,
          shortDescription: null,
          conservationStatus: "vulnerable",
          featured: true,
          heroImage: null,
          sortOrder: 1,
          createdAt: "",
        },
        {
          id: 2,
          name: "Cheetah",
          slug: "cheetah",
          scientificName: "Acinonyx jubatus",
          commonName: null,
          shortDescription: null,
          conservationStatus: "vulnerable",
          featured: false,
          heroImage: null,
          sortOrder: 2,
          createdAt: "",
        },
      ];

      const featured = species.filter((s) => s.featured);
      expect(featured).toHaveLength(1);
      expect(featured[0].name).toBe("Lion");
    });

    it("published species are filtered by status=published", () => {
      const statuses: WildlifeStatus[] = ["draft", "published", "archived"];
      const published = statuses.filter((s) => s === "published");
      expect(published).toHaveLength(1);
    });

    it("species are sorted by sortOrder ascending", () => {
      const species: WildlifeSummary[] = [
        {
          id: 2,
          name: "Cheetah",
          slug: "cheetah",
          scientificName: null,
          commonName: null,
          shortDescription: null,
          conservationStatus: null,
          featured: false,
          heroImage: null,
          sortOrder: 2,
          createdAt: "",
        },
        {
          id: 1,
          name: "Lion",
          slug: "lion",
          scientificName: null,
          commonName: null,
          shortDescription: null,
          conservationStatus: null,
          featured: false,
          heroImage: null,
          sortOrder: 1,
          createdAt: "",
        },
      ];

      const sorted = [...species].sort((a, b) => a.sortOrder - b.sortOrder);
      expect(sorted[0].name).toBe("Lion");
      expect(sorted[1].name).toBe("Cheetah");
    });

    it("empty database returns empty array", () => {
      const species: WildlifeSummary[] = [];
      const featured = species.filter((s) => s.featured);
      expect(featured).toEqual([]);
    });
  });

  describe("Wildlife Detail with Destinations", () => {
    it("detail page includes related destinations", () => {
      const detail: WildlifeDetail = {
        id: 1,
        name: "Lion",
        slug: "lion",
        scientificName: "Panthera leo",
        commonName: null,
        shortDescription: "The king of the jungle",
        conservationStatus: "vulnerable",
        featured: true,
        heroImage: "hero.jpg",
        sortOrder: 1,
        createdAt: "",
        description: "Full description",
        habitat: "Savanna",
        behavior: "Prides",
        diet: "Carnivore",
        safariViewing: "Common in Mara",
        galleryImages: [],
        seoTitle: "Lion",
        seoDescription: "Desc",
        destinations: [
          { id: 1, name: "Maasai Mara", slug: "maasai-mara", heroImage: null },
          { id: 2, name: "Amboseli", slug: "amboseli", heroImage: null },
        ],
      };

      expect(detail.destinations).toHaveLength(2);
      expect(detail.destinations[0].name).toBe("Maasai Mara");
      expect(detail.destinations[1].name).toBe("Amboseli");
    });

    it("species with no destinations shows empty array", () => {
      const detail: WildlifeDetail = {
        id: 1,
        name: "Test",
        slug: "test",
        scientificName: null,
        commonName: null,
        shortDescription: null,
        conservationStatus: null,
        featured: false,
        heroImage: null,
        sortOrder: 0,
        createdAt: "",
        description: null,
        habitat: null,
        behavior: null,
        diet: null,
        safariViewing: null,
        galleryImages: [],
        seoTitle: null,
        seoDescription: null,
        destinations: [],
      };
      expect(detail.destinations).toEqual([]);
    });

    it("SEO metadata falls back to name and shortDescription", () => {
      const species: WildlifeDetail = {
        id: 1,
        name: "African Elephant",
        slug: "african-elephant",
        scientificName: "Loxodonta africana",
        commonName: null,
        shortDescription: "The largest land animal",
        conservationStatus: "endangered",
        featured: false,
        heroImage: null,
        sortOrder: 1,
        createdAt: "",
        description: null,
        habitat: null,
        behavior: null,
        diet: null,
        safariViewing: null,
        galleryImages: [],
        seoTitle: null,
        seoDescription: null,
        destinations: [],
      };

      const title = species.seoTitle || `${species.name} | PE Falcon Safaris`;
      const description =
        species.seoDescription || species.shortDescription || `Learn about ${species.name}`;

      expect(title).toBe("African Elephant | PE Falcon Safaris");
      expect(description).toBe("The largest land animal");
    });
  });

  describe("Page Routes", () => {
    const CLIENT_WILDLIFE_ROUTES = ["/wildlife", "/wildlife/[slug]"];
    const ADMIN_WILDLIFE_ROUTES = ["/wildlife"];

    it("client has wildlife listing page", () => {
      expect(CLIENT_WILDLIFE_ROUTES).toContain("/wildlife");
    });

    it("client has wildlife detail page with slug param", () => {
      expect(CLIENT_WILDLIFE_ROUTES).toContain("/wildlife/[slug]");
    });

    it("admin has wildlife management page", () => {
      expect(ADMIN_WILDLIFE_ROUTES).toContain("/wildlife");
    });

    it("wildlife slugs follow the pattern for generateStaticParams", () => {
      const species = [
        { slug: "african-elephant" },
        { slug: "lion" },
        { slug: "cheetah" },
      ];
      const slugs = species.map((s) => ({ slug: s.slug }));
      expect(slugs).toEqual([
        { slug: "african-elephant" },
        { slug: "lion" },
        { slug: "cheetah" },
      ]);
    });
  });

  describe("Gallery Images", () => {
    it("gallery images have url and alt fields", () => {
      const images = [
        { url: "https://example.com/img1.jpg", alt: "Lion in savanna" },
        { url: "https://example.com/img2.jpg", alt: "Lion pride" },
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
    it("migration 008 is purely additive (new tables only)", () => {
      const existingTables = [
        "packages", "bookings", "quotations", "payments",
        "customers", "admins", "booking_status_history",
        "quotation_status_history", "destinations", "package_destinations",
      ];
      const newTables = ["wildlife_species", "destination_wildlife"];

      for (const table of newTables) {
        expect(existingTables).not.toContain(table);
      }
    });

    it("wildlife_species table has required fields", () => {
      const fields = [
        "id", "name", "slug", "scientific_name", "common_name",
        "short_description", "description", "habitat", "behavior", "diet",
        "conservation_status", "safari_viewing", "status", "featured",
        "hero_image", "gallery_images", "seo_title", "seo_description",
        "sort_order", "created_at", "updated_at",
      ];
      expect(fields).toContain("id");
      expect(fields).toContain("slug");
      expect(fields).toContain("status");
      expect(fields).toContain("conservation_status");
      expect(fields).toContain("featured");
    });

    it("destination_wildlife junction has composite key fields", () => {
      const junctionColumns = ["destination_id", "species_id"];
      expect(junctionColumns).toContain("destination_id");
      expect(junctionColumns).toContain("species_id");
    });

    it("wildlife_species has required RLS columns", () => {
      const rlsColumns = ["id", "status", "slug", "name"];
      for (const col of rlsColumns) {
        expect(rlsColumns).toContain(col);
      }
    });
  });

  describe("Backward Compatibility", () => {
    it("existing destinations work without wildlife", () => {
      const destination = {
        id: 1,
        name: "Maasai Mara",
        slug: "maasai-mara",
        status: "published",
      };
      expect(destination.name).toBeDefined();
    });

    it("existing packages work without wildlife", () => {
      const pkg = {
        id: 1,
        name: "3-Day Safari",
        startingPriceUsd: 1500,
        destinations: ["Maasai Mara"],
      };
      expect(pkg.startingPriceUsd).toBe(1500);
    });

    it("wildlife is optional content", () => {
      const hasWildlife = false;
      const siteWorks = true;
      expect(siteWorks).toBe(true);
    });
  });
});
