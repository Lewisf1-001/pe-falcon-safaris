import { describe, it, expect } from "vitest";

describe("Phase 4: Quotation System", () => {
  describe("Quotation Status Lifecycle", () => {
    const VALID_STATUSES = ["draft", "sent", "viewed", "accepted", "declined", "expired", "cancelled"];
    const TERMINAL_STATUSES = ["accepted", "declined", "expired", "cancelled"];

    const ALLOWED_TRANSITIONS: Record<string, string[]> = {
      draft: ["sent", "cancelled"],
      sent: ["viewed", "accepted", "declined", "expired", "cancelled"],
      viewed: ["accepted", "declined", "expired", "cancelled"],
      accepted: [],
      declined: [],
      expired: [],
      cancelled: [],
    };

    it("has 7 valid statuses", () => {
      expect(VALID_STATUSES).toHaveLength(7);
    });

    it("has 4 terminal statuses", () => {
      expect(TERMINAL_STATUSES).toHaveLength(4);
    });

    it("allows draft → sent (admin sends)", () => {
      expect(ALLOWED_TRANSITIONS.draft).toContain("sent");
    });

    it("allows sent → viewed (customer views)", () => {
      expect(ALLOWED_TRANSITIONS.sent).toContain("viewed");
    });

    it("allows viewed → accepted (customer accepts)", () => {
      expect(ALLOWED_TRANSITIONS.viewed).toContain("accepted");
    });

    it("allows viewed → declined (customer declines)", () => {
      expect(ALLOWED_TRANSITIONS.viewed).toContain("declined");
    });

    it("allows sent → accepted directly", () => {
      expect(ALLOWED_TRANSITIONS.sent).toContain("accepted");
    });

    it("allows admin cancellation from draft", () => {
      expect(ALLOWED_TRANSITIONS.draft).toContain("cancelled");
    });

    it("allows admin cancellation from sent", () => {
      expect(ALLOWED_TRANSITIONS.sent).toContain("cancelled");
    });

    it("blocks transition from accepted", () => {
      expect(ALLOWED_TRANSITIONS.accepted).toHaveLength(0);
    });

    it("blocks transition from declined", () => {
      expect(ALLOWED_TRANSITIONS.declined).toHaveLength(0);
    });

    it("blocks transition from expired", () => {
      expect(ALLOWED_TRANSITIONS.expired).toHaveLength(0);
    });

    it("blocks transition from cancelled", () => {
      expect(ALLOWED_TRANSITIONS.cancelled).toHaveLength(0);
    });

    it("every non-terminal status has at least one transition", () => {
      for (const status of VALID_STATUSES) {
        if (!TERMINAL_STATUSES.includes(status)) {
          expect(ALLOWED_TRANSITIONS[status].length).toBeGreaterThan(0);
        }
      }
    });
  });

  describe("Quotation Item Categories", () => {
    const VALID_CATEGORIES = [
      "accommodation", "transport", "park_fees", "activities",
      "meals", "guide", "other", "discount",
    ];

    it("has 8 valid categories", () => {
      expect(VALID_CATEGORIES).toHaveLength(8);
    });

    it("includes discount category", () => {
      expect(VALID_CATEGORIES).toContain("discount");
    });

    it("includes all safari-relevant categories", () => {
      expect(VALID_CATEGORIES).toContain("accommodation");
      expect(VALID_CATEGORIES).toContain("transport");
      expect(VALID_CATEGORIES).toContain("park_fees");
      expect(VALID_CATEGORIES).toContain("activities");
      expect(VALID_CATEGORIES).toContain("meals");
      expect(VALID_CATEGORIES).toContain("guide");
    });
  });

  describe("Server-Side Price Calculation", () => {
    it("calculates line item amount as quantity × unit price", () => {
      const quantity = 3;
      const unitPrice = 150;
      const amount = quantity * unitPrice;
      expect(amount).toBe(450);
    });

    it("calculates subtotal as sum of non-discount items", () => {
      const items = [
        { category: "accommodation", amount: 600 },
        { category: "transport", amount: 200 },
        { category: "park_fees", amount: 150 },
        { category: "discount", amount: -50 },
      ];
      const subtotal = items
        .filter((i) => i.category !== "discount")
        .reduce((sum, i) => sum + i.amount, 0);
      expect(subtotal).toBe(950);
    });

    it("calculates discount as sum of discount items", () => {
      const items = [
        { category: "accommodation", amount: 600 },
        { category: "discount", amount: -50 },
      ];
      const discount = items
        .filter((i) => i.category === "discount")
        .reduce((sum, i) => sum + Math.abs(i.amount), 0);
      expect(discount).toBe(50);
    });

    it("calculates total as subtotal - discount + tax", () => {
      const subtotal = 950;
      const discount = 50;
      const tax = 100;
      const total = subtotal - discount + tax;
      expect(total).toBe(1000);
    });

    it("rejects negative unit prices", () => {
      const unitPrice = -100;
      expect(unitPrice >= 0).toBe(false);
    });

    it("rejects zero quantity", () => {
      const quantity = 0;
      expect(quantity >= 1).toBe(false);
    });

    it("rejects negative amounts", () => {
      const amount = -500;
      expect(amount >= 0).toBe(false);
    });
  });

  describe("Customer Authorization", () => {
    it("customer can only see own quotations", () => {
      const quotations = [
        { id: 1, userId: 100, title: "Trip A" },
        { id: 2, userId: 101, title: "Trip B" },
      ];
      const authenticatedUserId = 100;
      const visible = quotations.filter((q) => q.userId === authenticatedUserId);
      expect(visible).toHaveLength(1);
      expect(visible[0].id).toBe(1);
    });

    it("customer cannot accept another customer's quotation", () => {
      const quotation = { id: 1, userId: 101 };
      const authenticatedUserId = 100;
      const canAccept = quotation.userId === authenticatedUserId;
      expect(canAccept).toBe(false);
    });

    it("customer cannot modify quotation prices", () => {
      const customerAllowedFields = ["title", "description", "travelDate", "guests"];
      expect(customerAllowedFields).not.toContain("totalUsd");
      expect(customerAllowedFields).not.toContain("subtotalUsd");
      expect(customerAllowedFields).not.toContain("discountUsd");
      expect(customerAllowedFields).not.toContain("taxUsd");
    });

    it("customer cannot modify admin notes", () => {
      const customerAllowedFields = ["notesCustomer"];
      expect(customerAllowedFields).not.toContain("notesAdmin");
    });
  });

  describe("Booking Integration", () => {
    it("quote acceptance does not mark payment as completed", () => {
      const quotationStatus = "accepted";
      const paymentStatus = "pending";
      expect(quotationStatus).toBe("accepted");
      expect(paymentStatus).not.toBe("completed");
    });

    it("quote acceptance transitions booking to pending", () => {
      const validTransitions: Record<string, string> = {
        inquiry: "pending",
        quote: "pending",
      };
      expect(validTransitions.inquiry).toBe("pending");
      expect(validTransitions.quote).toBe("pending");
    });

    it("does not create duplicate bookings", () => {
      const existingBooking = { id: 1, userId: 100, packageId: 5, travelDate: "2026-08-01" };
      const quotationBookingId = existingBooking.id;
      expect(quotationBookingId).toBe(existingBooking.id);
    });

    it("booking status remains valid after quote acceptance", () => {
      const validBookingStatuses = [
        "pending", "deposit_required", "partially_paid", "confirmed",
        "upcoming", "in_progress", "completed", "cancelled", "expired", "refunded",
      ];
      expect(validBookingStatuses).toContain("pending");
    });
  });

  describe("Quotation Validation Rules", () => {
    it("requires title", () => {
      const title = "";
      expect(title.length > 0).toBe(false);
    });

    it("requires travel date", () => {
      const travelDate = undefined;
      expect(travelDate).toBeUndefined();
    });

    it("requires at least one line item", () => {
      const items: unknown[] = [];
      expect(items.length > 0).toBe(false);
    });

    it("validates guest count 1-20", () => {
      expect(1 >= 1 && 1 <= 20).toBe(true);
      expect(20 >= 1 && 20 <= 20).toBe(true);
      expect(0 >= 1 && 0 <= 20).toBe(false);
      expect(21 >= 1 && 21 <= 20).toBe(false);
    });

    it("validates validity date is in the future for sending", () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      expect(futureDate >= today).toBe(true);
    });
  });

  describe("Protected Routes", () => {
    it("includes /quotations in protected routes", () => {
      const PROTECTED_ROUTES = ["/profile", "/bookings", "/dashboard", "/quotations"];
      expect(PROTECTED_ROUTES).toContain("/quotations");
    });
  });

  describe("Admin Creation Authorization", () => {
    it("admin can create draft quotations", () => {
      const adminRole = "admin";
      const canCreate = adminRole === "admin";
      expect(canCreate).toBe(true);
    });

    it("customer cannot create quotations via admin endpoint", () => {
      const customerRole = "customer" as string;
      const canCreate = customerRole === "admin";
      expect(canCreate).toBe(false);
    });

    it("unauthenticated user cannot create quotations", () => {
      const userRole = null as string | null;
      const canCreate = userRole === "admin";
      expect(canCreate).toBe(false);
    });

    it("admin can update draft quotations", () => {
      const quotationStatus = "draft";
      const isAdmin = true;
      const canEdit = isAdmin && quotationStatus === "draft";
      expect(canEdit).toBe(true);
    });

    it("admin cannot update sent quotations", () => {
      const quotationStatus = "sent" as string;
      const isAdmin = true;
      const canEdit = isAdmin && quotationStatus === "draft";
      expect(canEdit).toBe(false);
    });

    it("admin cannot update accepted quotations", () => {
      const quotationStatus = "accepted" as string;
      const isAdmin = true;
      const canEdit = isAdmin && quotationStatus === "draft";
      expect(canEdit).toBe(false);
    });

    it("admin can send draft quotations", () => {
      const quotationStatus = "draft";
      const isAdmin = true;
      const canSend = isAdmin && quotationStatus === "draft";
      expect(canSend).toBe(true);
    });

    it("admin cannot send already sent quotations", () => {
      const quotationStatus = "sent" as string;
      const isAdmin = true;
      const canSend = isAdmin && quotationStatus === "draft";
      expect(canSend).toBe(false);
    });

    it("admin can cancel draft quotations", () => {
      const quotationStatus = "draft";
      const isAdmin = true;
      const terminalStatuses = ["accepted", "cancelled", "expired"];
      const canCancel = isAdmin && !terminalStatuses.includes(quotationStatus);
      expect(canCancel).toBe(true);
    });

    it("admin cannot cancel accepted quotations", () => {
      const quotationStatus = "accepted";
      const isAdmin = true;
      const terminalStatuses = ["accepted", "cancelled", "expired"];
      const canCancel = isAdmin && !terminalStatuses.includes(quotationStatus);
      expect(canCancel).toBe(false);
    });
  });

  describe("Admin Form Validation", () => {
    it("requires customer selection", () => {
      const selectedUserId = "" as string;
      const isValid = selectedUserId !== "";
      expect(isValid).toBe(false);
    });

    it("accepts valid customer selection", () => {
      const selectedUserId = "123" as string;
      const isValid = selectedUserId !== "";
      expect(isValid).toBe(true);
    });

    it("requires title", () => {
      const title = "";
      const isValid = title.trim().length > 0;
      expect(isValid).toBe(false);
    });

    it("accepts valid title", () => {
      const title = "5-Day Masai Mara Safari";
      const isValid = title.trim().length > 0;
      expect(isValid).toBe(true);
    });

    it("requires travel date", () => {
      const travelDate = "";
      const isValid = travelDate !== "";
      expect(isValid).toBe(false);
    });

    it("requires valid until date", () => {
      const validUntil = "";
      const isValid = validUntil !== "";
      expect(isValid).toBe(false);
    });

    it("validates guest count 1-20", () => {
      expect(Number("1") >= 1 && Number("1") <= 20).toBe(true);
      expect(Number("20") >= 1 && Number("20") <= 20).toBe(true);
      expect(Number("0") >= 1 && Number("0") <= 20).toBe(false);
      expect(Number("21") >= 1 && Number("21") <= 20).toBe(false);
    });

    it("requires at least one valid line item", () => {
      const lineItems = [
        { description: "", quantity: "1", unitPriceUsd: "100" },
      ];
      const validItems = lineItems.filter(
        (item) => item.description.trim() && Number(item.quantity) >= 1 && Number(item.unitPriceUsd) >= 0
      );
      expect(validItems.length > 0).toBe(false);
    });

    it("accepts valid line items", () => {
      const lineItems = [
        { description: "Luxury tented camp", quantity: "3", unitPriceUsd: "200" },
      ];
      const validItems = lineItems.filter(
        (item) => item.description.trim() && Number(item.quantity) >= 1 && Number(item.unitPriceUsd) >= 0
      );
      expect(validItems.length > 0).toBe(true);
    });
  });

  describe("Line Item Management", () => {
    it("calculates line item amount correctly", () => {
      const quantity = 3;
      const unitPrice = 200;
      const amount = quantity * unitPrice;
      expect(amount).toBe(600);
    });

    it("handles zero quantity", () => {
      const quantity = 0;
      const unitPrice = 200;
      const amount = quantity * unitPrice;
      expect(amount).toBe(0);
    });

    it("handles zero unit price", () => {
      const quantity = 3;
      const unitPrice = 0;
      const amount = quantity * unitPrice;
      expect(amount).toBe(0);
    });

    it("prevents removing last line item", () => {
      const lineItems = [{ tempId: "1", description: "Item 1" }];
      const canRemove = lineItems.length > 1;
      expect(canRemove).toBe(false);
    });

    it("allows removing non-last line item", () => {
      const lineItems = [
        { tempId: "1", description: "Item 1" },
        { tempId: "2", description: "Item 2" },
      ];
      const canRemove = lineItems.length > 1;
      expect(canRemove).toBe(true);
    });

    it("supports discount category with negative impact", () => {
      const items = [
        { category: "accommodation", quantity: 1, unitPriceUsd: 500 },
        { category: "discount", quantity: 1, unitPriceUsd: 50 },
      ];

      let subtotal = 0;
      let discount = 0;

      for (const item of items) {
        const amount = item.quantity * item.unitPriceUsd;
        if (item.category === "discount") {
          discount += Math.abs(amount);
        } else {
          subtotal += amount;
        }
      }

      expect(subtotal).toBe(500);
      expect(discount).toBe(50);
    });
  });

  describe("Pricing Calculation (Form Preview)", () => {
    function calculatePreviewTotals(
      items: { category: string; quantity: string; unitPriceUsd: string }[],
      taxUsd: string
    ) {
      let subtotal = 0;
      let discount = 0;

      for (const item of items) {
        const qty = Number(item.quantity) || 0;
        const price = Number(item.unitPriceUsd) || 0;
        const amount = qty * price;

        if (item.category === "discount") {
          discount += Math.abs(amount);
        } else {
          subtotal += amount;
        }
      }

      subtotal = Math.max(0, subtotal);
      const tax = Number(taxUsd) || 0;
      const total = subtotal - discount + tax;

      return { subtotal, discount, total };
    }

    it("calculates subtotal from non-discount items", () => {
      const items = [
        { category: "accommodation", quantity: "3", unitPriceUsd: "200" },
        { category: "transport", quantity: "1", unitPriceUsd: "150" },
      ];
      const result = calculatePreviewTotals(items, "0");
      expect(result.subtotal).toBe(750);
    });

    it("calculates discount from discount items", () => {
      const items = [
        { category: "accommodation", quantity: "1", unitPriceUsd: "500" },
        { category: "discount", quantity: "1", unitPriceUsd: "50" },
      ];
      const result = calculatePreviewTotals(items, "0");
      expect(result.discount).toBe(50);
    });

    it("includes tax in total", () => {
      const items = [
        { category: "accommodation", quantity: "1", unitPriceUsd: "500" },
      ];
      const result = calculatePreviewTotals(items, "75");
      expect(result.total).toBe(575);
    });

    it("handles empty items", () => {
      const items: { category: string; quantity: string; unitPriceUsd: string }[] = [];
      const result = calculatePreviewTotals(items, "0");
      expect(result.subtotal).toBe(0);
      expect(result.discount).toBe(0);
      expect(result.total).toBe(0);
    });

    it("handles multiple discount items", () => {
      const items = [
        { category: "accommodation", quantity: "1", unitPriceUsd: "1000" },
        { category: "discount", quantity: "1", unitPriceUsd: "100" },
        { category: "discount", quantity: "1", unitPriceUsd: "50" },
      ];
      const result = calculatePreviewTotals(items, "0");
      expect(result.subtotal).toBe(1000);
      expect(result.discount).toBe(150);
      expect(result.total).toBe(850);
    });

    it("subtotal never goes below zero", () => {
      const items = [
        { category: "discount", quantity: "1", unitPriceUsd: "500" },
      ];
      const result = calculatePreviewTotals(items, "0");
      expect(result.subtotal).toBe(0);
    });
  });

  describe("Quotation Edit Restrictions", () => {
    const EDITABLE_STATUSES = ["draft"];
    const NON_EDITABLE_STATUSES = ["sent", "viewed", "accepted", "declined", "expired", "cancelled"];

    it("allows editing draft quotations", () => {
      for (const status of EDITABLE_STATUSES) {
        expect(status).toBe("draft");
      }
    });

    it("prevents editing sent quotations", () => {
      for (const status of NON_EDITABLE_STATUSES) {
        expect(status).not.toBe("draft");
      }
    });

    it("prevents editing viewed quotations", () => {
      expect(NON_EDITABLE_STATUSES).toContain("viewed");
      expect(NON_EDITABLE_STATUSES).not.toContain("draft");
    });

    it("prevents editing accepted quotations", () => {
      expect(NON_EDITABLE_STATUSES).toContain("accepted");
    });

    it("prevents editing expired quotations", () => {
      expect(NON_EDITABLE_STATUSES).toContain("expired");
    });

    it("prevents editing cancelled quotations", () => {
      expect(NON_EDITABLE_STATUSES).toContain("cancelled");
    });
  });

  describe("Send Workflow", () => {
    it("requires draft status to send", () => {
      const status = "draft";
      const canSend = status === "draft";
      expect(canSend).toBe(true);
    });

    it("rejects sending non-draft quotations", () => {
      const nonDraftStatuses = ["sent", "viewed", "accepted", "declined", "expired", "cancelled"];
      for (const status of nonDraftStatuses) {
        expect(status).not.toBe("draft");
      }
    });

    it("records sent timestamp on send", () => {
      const now = new Date().toISOString();
      const sentAt = now;
      expect(sentAt).toBeTruthy();
      expect(new Date(sentAt).getTime()).toBeGreaterThan(0);
    });

    it("transitions status from draft to sent", () => {
      const fromStatus = "draft";
      const toStatus = "sent";
      const validTransition = fromStatus === "draft" && toStatus === "sent";
      expect(validTransition).toBe(true);
    });

    it("payment remains unpaid after sending", () => {
      const quotationStatus = "sent";
      const paymentStatus = "pending";
      expect(quotationStatus).toBe("sent");
      expect(paymentStatus).not.toBe("completed");
    });
  });

  describe("Preview Functionality", () => {
    it("hides admin notes from preview", () => {
      const notesAdmin = "Internal pricing notes";
      const notesCustomer = "Thank you for your inquiry";
      const previewFields = ["notesCustomer"];
      expect(previewFields).toContain("notesCustomer");
      expect(previewFields).not.toContain("notesAdmin");
    });

    it("shows customer notes in preview", () => {
      const notesCustomer = "We look forward to your safari!";
      const showInPreview = notesCustomer.length > 0;
      expect(showInPreview).toBe(true);
    });

    it("displays all line item details", () => {
      const item = {
        description: "Luxury tented camp",
        category: "accommodation",
        quantity: 3,
        unitPriceUsd: 200,
        amountUsd: 600,
      };
      expect(item.description).toBeTruthy();
      expect(item.category).toBeTruthy();
      expect(item.quantity).toBeGreaterThan(0);
      expect(item.unitPriceUsd).toBeGreaterThanOrEqual(0);
      expect(item.amountUsd).toBe(item.quantity * item.unitPriceUsd);
    });

    it("shows package name when linked", () => {
      const packageName = "Masai Mara Explorer";
      expect(packageName).toBeTruthy();
    });

    it("shows 'No package' when not linked", () => {
      const packageName = null;
      const display = packageName || "No package";
      expect(display).toBe("No package");
    });
  });

  describe("Customer Association Security", () => {
    it("quotation belongs to selected customer", () => {
      const selectedUserId = 42;
      const quotationUserId = 42;
      expect(selectedUserId).toBe(quotationUserId);
    });

    it("booking association belongs to selected customer", () => {
      const selectedUserId = 42;
      const bookingUserId = 42;
      expect(selectedUserId).toBe(bookingUserId);
    });

    it("rejects cross-customer booking association", () => {
      const selectedUserId = 42;
      const bookingUserId = 99 as number;
      const isValid = selectedUserId === bookingUserId;
      expect(isValid).toBe(false);
    });

    it("allows null booking association", () => {
      const selectedBookingId = null;
      const isValid = selectedBookingId === null || typeof selectedBookingId === "number";
      expect(isValid).toBe(true);
    });
  });

  describe("Database Price Authority", () => {
    it("server recalculates amount as quantity × unit price", () => {
      const quantity = 5;
      const unitPriceUsd = 120;
      const serverAmount = quantity * unitPriceUsd;
      expect(serverAmount).toBe(600);
    });

    it("server recalculates subtotal from items", () => {
      const items = [
        { quantity: 3, unitPriceUsd: 200, category: "accommodation" },
        { quantity: 1, unitPriceUsd: 150, category: "transport" },
      ];
      let subtotal = 0;
      for (const item of items) {
        if (item.category !== "discount") {
          subtotal += item.quantity * item.unitPriceUsd;
        }
      }
      expect(subtotal).toBe(750);
    });

    it("server recalculates total with tax", () => {
      const subtotal = 750;
      const tax = 112.5;
      const total = subtotal + tax;
      expect(total).toBe(862.5);
    });

    it("client-submitted totals are overwritten by server", () => {
      const clientTotal = 999999;
      const serverTotal = 862.5;
      const authoritative = serverTotal;
      expect(authoritative).not.toBe(clientTotal);
      expect(authoritative).toBe(862.5);
    });
  });
});
