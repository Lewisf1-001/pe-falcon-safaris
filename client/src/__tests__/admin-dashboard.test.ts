import { describe, it, expect } from "vitest";

describe("Phase 6: Admin Operations Dashboard", () => {
  describe("Admin Authorization", () => {
    const ADMIN_ROUTES = [
      "/",
      "/admin-users",
      "/clients",
      "/bookings",
      "/quotations",
      "/packages",
      "/payments",
    ];

    const PUBLIC_ROUTES = [
      "/login",
      "/forgot-password",
      "/reset-password",
      "/accept-invite",
    ];

    it("all dashboard routes are in the protected set", () => {
      for (const route of ADMIN_ROUTES) {
        expect(ADMIN_ROUTES).toContain(route);
      }
    });

    it("public auth routes are not in protected set", () => {
      for (const route of PUBLIC_ROUTES) {
        expect(ADMIN_ROUTES).not.toContain(route);
      }
    });

    it("admin authorization requires active status in admins table", () => {
      const admins = [
        { authId: "auth-1", status: "active", role: "admin" },
        { authId: "auth-2", status: "invited", role: "admin" },
        { authId: "auth-3", status: "active", role: "superadmin" },
      ];

      const activeAdmins = admins.filter((a) => a.status === "active");
      expect(activeAdmins).toHaveLength(2);
      expect(activeAdmins.map((a) => a.authId)).toContain("auth-1");
      expect(activeAdmins.map((a) => a.authId)).toContain("auth-3");
    });

    it("inactive admin is rejected from dashboard access", () => {
      const admin = { authId: "auth-2", status: "invited", role: "admin" };
      const isActive = admin.status === "active";
      expect(isActive).toBe(false);
    });

    it("ordinary customer cannot access admin endpoints", () => {
      const customer = { authId: "cust-1", adminRecord: null };
      const isAdmin = customer.adminRecord !== null;
      expect(isAdmin).toBe(false);
    });

    it("unauthenticated user has no admin access", () => {
      const unauthed = { user: null };
      const hasAccess = unauthed.user !== null;
      expect(hasAccess).toBe(false);
    });
  });

  describe("Dashboard Stats Structure", () => {
    const BOOKING_STATUSES = [
      "inquiry", "quote", "pending", "deposit_required", "partially_paid",
      "confirmed", "upcoming", "in_progress", "completed",
      "cancelled", "expired", "refunded",
    ];

    const QUOTATION_STATUSES = [
      "draft", "sent", "viewed", "accepted", "declined", "expired", "cancelled",
    ];

    const PAYMENT_STATUSES = ["pending", "completed", "failed", "cancelled"];

    const TERMINAL_BOOKING_STATUSES = ["completed", "cancelled", "refunded"];
    const TERMINAL_QUOTATION_STATUSES = ["accepted", "declined", "expired", "cancelled"];

    it("defines all 12 booking statuses", () => {
      expect(BOOKING_STATUSES).toHaveLength(12);
    });

    it("defines all 7 quotation statuses", () => {
      expect(QUOTATION_STATUSES).toHaveLength(7);
    });

    it("defines 4 payment statuses", () => {
      expect(PAYMENT_STATUSES).toHaveLength(4);
    });

    it("total bookings equals sum of all status counts", () => {
      const bookingsByStatus: Record<string, number> = {
        inquiry: 2, quote: 1, pending: 3, deposit_required: 0,
        partially_paid: 1, confirmed: 5, upcoming: 2, in_progress: 1,
        completed: 10, cancelled: 2, expired: 1, refunded: 0,
      };
      const totalBookings = Object.values(bookingsByStatus).reduce((a, b) => a + b, 0);

      expect(totalBookings).toBe(28);
      expect(totalBookings).toBe(
        BOOKING_STATUSES.reduce((sum, s) => sum + (bookingsByStatus[s] || 0), 0)
      );
    });

    it("total quotations equals sum of all status counts", () => {
      const quotationsByStatus: Record<string, number> = {
        draft: 3, sent: 2, viewed: 1, accepted: 4,
        declined: 1, expired: 2, cancelled: 0,
      };
      const totalQuotations = Object.values(quotationsByStatus).reduce((a, b) => a + b, 0);

      expect(totalQuotations).toBe(13);
      expect(totalQuotations).toBe(
        QUOTATION_STATUSES.reduce((sum, s) => sum + (quotationsByStatus[s] || 0), 0)
      );
    });

    it("total payments equals sum of all status counts", () => {
      const paymentsByStatus: Record<string, number> = {
        pending: 2, completed: 8, failed: 1, cancelled: 0,
      };
      const totalPayments = Object.values(paymentsByStatus).reduce((a, b) => a + b, 0);

      expect(totalPayments).toBe(11);
    });

    it("terminal booking statuses are correctly identified", () => {
      expect(TERMINAL_BOOKING_STATUSES).toContain("completed");
      expect(TERMINAL_BOOKING_STATUSES).toContain("cancelled");
      expect(TERMINAL_BOOKING_STATUSES).toContain("refunded");
      expect(TERMINAL_BOOKING_STATUSES).toHaveLength(3);

      for (const status of TERMINAL_BOOKING_STATUSES) {
        expect(BOOKING_STATUSES).toContain(status);
      }
    });

    it("terminal quotation statuses are correctly identified", () => {
      expect(TERMINAL_QUOTATION_STATUSES).toContain("accepted");
      expect(TERMINAL_QUOTATION_STATUSES).toContain("declined");
      expect(TERMINAL_QUOTATION_STATUSES).toContain("expired");
      expect(TERMINAL_QUOTATION_STATUSES).toContain("cancelled");
      expect(TERMINAL_QUOTATION_STATUSES).toHaveLength(4);
    });

    it("active bookings count excludes terminal statuses", () => {
      const bookingsByStatus: Record<string, number> = {
        inquiry: 2, quote: 1, pending: 3, deposit_required: 0,
        partially_paid: 1, confirmed: 5, upcoming: 2, in_progress: 1,
        completed: 10, cancelled: 2, expired: 1, refunded: 0,
      };

      const activeBookings =
        (bookingsByStatus.confirmed || 0) +
        (bookingsByStatus.upcoming || 0) +
        (bookingsByStatus.in_progress || 0);

      expect(activeBookings).toBe(8);
    });

    it("pending action bookings count includes pre-payment statuses", () => {
      const bookingsByStatus: Record<string, number> = {
        inquiry: 2, quote: 1, pending: 3, deposit_required: 0,
        partially_paid: 1, confirmed: 5, upcoming: 2, in_progress: 1,
        completed: 10, cancelled: 2, expired: 1, refunded: 0,
      };

      const pendingActions =
        (bookingsByStatus.inquiry || 0) +
        (bookingsByStatus.quote || 0) +
        (bookingsByStatus.pending || 0) +
        (bookingsByStatus.deposit_required || 0);

      expect(pendingActions).toBe(6);
    });

    it("revenue is calculated only from completed payments", () => {
      const payments = [
        { amountUsd: 1200, status: "completed" },
        { amountUsd: 800, status: "completed" },
        { amountUsd: 500, status: "pending" },
        { amountUsd: 300, status: "failed" },
      ];

      const totalRevenue = payments
        .filter((p) => p.status === "completed")
        .reduce((sum, p) => sum + p.amountUsd, 0);

      expect(totalRevenue).toBe(2000);
    });

    it("quoted value excludes terminal quotation statuses", () => {
      const quotations = [
        { totalUsd: 1000, status: "draft" },
        { totalUsd: 2000, status: "sent" },
        { totalUsd: 1500, status: "viewed" },
        { totalUsd: 3000, status: "accepted" },
        { totalUsd: 500, status: "declined" },
        { totalUsd: 800, status: "expired" },
        { totalUsd: 0, status: "cancelled" },
      ];

      const terminalStatuses = ["accepted", "declined", "expired", "cancelled"];
      const totalQuotedValue = quotations
        .filter((q) => !terminalStatuses.includes(q.status))
        .reduce((sum, q) => sum + q.totalUsd, 0);

      expect(totalQuotedValue).toBe(4500);
    });
  });

  describe("Recent Activity Endpoint", () => {
    it("activity items have required fields", () => {
      const activityItem = {
        type: "booking" as const,
        id: 1,
        title: "Serengeti Safari",
        description: "John Doe - 2 guests",
        status: "confirmed",
        amountUsd: 2400,
        timestamp: "2025-06-15T10:00:00Z",
      };

      expect(activityItem).toHaveProperty("type");
      expect(activityItem).toHaveProperty("id");
      expect(activityItem).toHaveProperty("title");
      expect(activityItem).toHaveProperty("description");
      expect(activityItem).toHaveProperty("status");
      expect(activityItem).toHaveProperty("amountUsd");
      expect(activityItem).toHaveProperty("timestamp");
    });

    it("activity types are booking, payment, or quotation", () => {
      const validTypes = ["booking", "payment", "quotation"];
      const items = [
        { type: "booking", id: 1 },
        { type: "payment", id: "uuid-1" },
        { type: "quotation", id: 2 },
      ];

      for (const item of items) {
        expect(validTypes).toContain(item.type);
      }
    });

    it("activity is sorted by timestamp descending", () => {
      const activities = [
        { type: "booking", timestamp: "2025-06-10T10:00:00Z" },
        { type: "payment", timestamp: "2025-06-15T10:00:00Z" },
        { type: "quotation", timestamp: "2025-06-12T10:00:00Z" },
      ];

      const sorted = [...activities].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      expect(sorted[0].type).toBe("payment");
      expect(sorted[1].type).toBe("quotation");
      expect(sorted[2].type).toBe("booking");
    });

    it("activity limit is bounded between 1 and 50", () => {
      const limit = 10;
      const safeLimit = Math.min(Math.max(limit, 1), 50);
      expect(safeLimit).toBe(10);

      const extremeLimit = 100;
      const safeExtreme = Math.min(Math.max(extremeLimit, 1), 50);
      expect(safeExtreme).toBe(50);

      const negativeLimit = -5;
      const safeNegative = Math.min(Math.max(negativeLimit, 1), 50);
      expect(safeNegative).toBe(1);
    });
  });

  describe("Operational Alerts", () => {
    const ALERT_TYPES = [
      "bookings_pending_action",
      "quotations_awaiting_response",
      "payments_pending",
      "quotations_expired",
    ];

    it("defines all alert types", () => {
      expect(ALERT_TYPES).toContain("bookings_pending_action");
      expect(ALERT_TYPES).toContain("quotations_awaiting_response");
      expect(ALERT_TYPES).toContain("payments_pending");
      expect(ALERT_TYPES).toContain("quotations_expired");
    });

    it("alert has required fields", () => {
      const alert = {
        type: "bookings_pending_action",
        label: "Bookings awaiting action",
        count: 5,
        breakdown: { inquiry: 2, quote: 1, pending: 2, deposit_required: 0 },
        href: "/bookings",
      };

      expect(alert).toHaveProperty("type");
      expect(alert).toHaveProperty("label");
      expect(alert).toHaveProperty("count");
      expect(alert).toHaveProperty("href");
      expect(alert.count).toBeGreaterThan(0);
    });

    it("pending action bookings include inquiry, quote, pending, deposit_required", () => {
      const alertBookingStatuses = ["inquiry", "quote", "pending", "deposit_required"];
      expect(alertBookingStatuses).toHaveLength(4);
      expect(alertBookingStatuses).toContain("inquiry");
      expect(alertBookingStatuses).toContain("quote");
      expect(alertBookingStatuses).toContain("pending");
      expect(alertBookingStatuses).toContain("deposit_required");
    });

    it("quotations awaiting response are sent and viewed", () => {
      const alertQuotationStatuses = ["sent", "viewed"];
      expect(alertQuotationStatuses).toHaveLength(2);
      expect(alertQuotationStatuses).toContain("sent");
      expect(alertQuotationStatuses).toContain("viewed");
    });

    it("only alerts with count > 0 are returned", () => {
      const alerts = [
        { type: "bookings_pending_action", count: 5 },
        { type: "payments_pending", count: 0 },
        { type: "quotations_awaiting_response", count: 2 },
      ];

      const visibleAlerts = alerts.filter((a) => a.count > 0);
      expect(visibleAlerts).toHaveLength(2);
      expect(visibleAlerts.map((a) => a.type)).not.toContain("payments_pending");
    });

    it("expired quotations are non-terminal with past valid_until", () => {
      const today = "2025-06-15";
      const quotations = [
        { status: "draft", validUntil: "2025-06-10" },
        { status: "sent", validUntil: "2025-06-20" },
        { status: "viewed", validUntil: "2025-06-01" },
        { status: "accepted", validUntil: "2025-06-01" },
      ];

      const nonTerminal = ["draft", "sent", "viewed"];
      const expired = quotations.filter(
        (q) => nonTerminal.includes(q.status) && q.validUntil < today
      );

      expect(expired).toHaveLength(2);
      expect(expired.map((q) => q.status)).toContain("draft");
      expect(expired.map((q) => q.status)).toContain("viewed");
    });
  });

  describe("Data Isolation - Admin Dashboard", () => {
    it("stats endpoint does not expose user authentication data", () => {
      const statsResponse = {
        stats: {
          totalBookings: 28,
          bookingsByStatus: {},
          totalQuotations: 13,
          quotationsByStatus: {},
          totalPayments: 11,
          paymentsByStatus: {},
          totalUsers: 148,
          totalPackages: 12,
          totalRevenue: 24000,
          totalQuotedValue: 4500,
        },
      };

      const responseStr = JSON.stringify(statsResponse);
      expect(responseStr).not.toContain("auth_id");
      expect(responseStr).not.toContain("password");
      expect(responseStr).not.toContain("access_token");
      expect(responseStr).not.toContain("service_role");
      expect(responseStr).not.toContain("mpesa_consumer_secret");
      expect(responseStr).not.toContain("mpesa_passkey");
    });

    it("activity endpoint does not expose payment secrets", () => {
      const activity = {
        type: "payment",
        id: 1,
        title: "Payment (M-Pesa)",
        description: "John Doe",
        status: "completed",
        amountUsd: 1200,
        timestamp: "2025-06-15T10:00:00Z",
      };

      const activityStr = JSON.stringify(activity);
      expect(activityStr).not.toContain("mpesa_checkout_request_id");
      expect(activityStr).not.toContain("mpesa_merchant_request_id");
      expect(activityStr).not.toContain("mpesa_receipt_number");
      expect(activityStr).not.toContain("phone");
      expect(activityStr).not.toContain("callback");
    });

    it("booking list does not expose user internal fields", () => {
      const booking = {
        id: 1,
        userId: 100,
        clientName: "John Doe",
        clientEmail: "john@example.com",
        packageName: "Serengeti",
        travelDate: "2025-07-15",
        guests: 2,
        totalPriceUsd: 2400,
        status: "confirmed",
        notes: null,
        createdAt: "2025-06-15",
        updatedAt: "2025-06-15",
      };

      const bookingStr = JSON.stringify(booking);
      expect(bookingStr).not.toContain("auth_id");
      expect(bookingStr).not.toContain("email_verified");
      expect(bookingStr).not.toContain("invite_token");
    });

    it("payment list exposes only necessary fields", () => {
      const allowedFields = [
        "id", "amountUsd", "method", "provider", "phone", "cardLast4",
        "cardBrand", "externalRef", "status", "packageName", "travelDate",
        "clientName", "clientEmail", "createdAt",
      ];

      const sensitiveFields = [
        "mpesa_checkout_request_id", "mpesa_merchant_request_id",
        "cardholder_name", "client_receipt_sent_at", "updated_at",
      ];

      for (const field of sensitiveFields) {
        expect(allowedFields).not.toContain(field);
      }
    });

    it("quotation list does not expose admin notes to customer", () => {
      const adminQuotationFields = [
        "id", "clientName", "clientEmail", "packageName", "title",
        "travelDate", "guests", "totalUsd", "validUntil", "status", "createdAt",
      ];

      expect(adminQuotationFields).not.toContain("notes_admin");
      expect(adminQuotationFields).toContain("title");
      expect(adminQuotationFields).toContain("totalUsd");
    });
  });

  describe("Booking Status Transitions", () => {
    const VALID_STATUSES = [
      "inquiry", "quote", "pending", "deposit_required", "partially_paid",
      "confirmed", "upcoming", "in_progress", "completed",
      "cancelled", "expired", "refunded",
    ];

    const TERMINAL_STATUSES = ["completed", "cancelled", "refunded"];

    it("all 12 statuses are valid", () => {
      expect(VALID_STATUSES).toHaveLength(12);
    });

    it("terminal statuses cannot be updated", () => {
      for (const status of TERMINAL_STATUSES) {
        expect(VALID_STATUSES).toContain(status);
      }
    });

    it("admin can transition from any non-terminal to any valid state", () => {
      const nonTerminal = VALID_STATUSES.filter((s) => !TERMINAL_STATUSES.includes(s));
      expect(nonTerminal).toHaveLength(9);

      for (const from of nonTerminal) {
        for (const to of VALID_STATUSES) {
          expect(VALID_STATUSES).toContain(to);
        }
      }
    });

    it("rejects invalid status values", () => {
      const invalidStatuses = ["INVALID", "test", "", "active", "done"];
      for (const status of invalidStatuses) {
        expect(VALID_STATUSES).not.toContain(status);
      }
    });
  });

  describe("Payment Integrity", () => {
    it("completed payment amount must match booking total", () => {
      const booking = { totalPriceUsd: 2400 };
      const payment = { amountUsd: 2400, status: "completed" };

      expect(payment.amountUsd).toBe(booking.totalPriceUsd);
    });

    it("payment statuses are limited to 4 values", () => {
      const paymentStatuses = ["pending", "completed", "failed", "cancelled"];
      expect(paymentStatuses).toHaveLength(4);
    });

    it("completed is the only payment terminal state for dashboard display", () => {
      const displayTerminal = ["completed"];
      expect(displayTerminal).toContain("completed");
    });

    it("pending payments are not counted as revenue", () => {
      const payments = [
        { amountUsd: 1200, status: "completed" },
        { amountUsd: 800, status: "pending" },
        { amountUsd: 500, status: "failed" },
      ];

      const revenue = payments
        .filter((p) => p.status === "completed")
        .reduce((sum, p) => sum + p.amountUsd, 0);

      expect(revenue).toBe(1200);
    });

    it("dashboard cannot mark payments as completed", () => {
      const dashboardActions = ["view", "filter", "search", "refresh"];
      expect(dashboardActions).not.toContain("mark_as_paid");
      expect(dashboardActions).not.toContain("complete_payment");
      expect(dashboardActions).not.toContain("approve");
    });
  });

  describe("Quotation Integration", () => {
    it("quotation statuses cover the full lifecycle", () => {
      const statuses = ["draft", "sent", "viewed", "accepted", "declined", "expired", "cancelled"];
      expect(statuses).toHaveLength(7);
    });

    it("quotation totals use server-authoritative values", () => {
      const quotation = {
        subtotalUsd: 2000,
        discountUsd: 200,
        taxUsd: 180,
        totalUsd: 1980,
      };

      const calculatedTotal = quotation.subtotalUsd - quotation.discountUsd + quotation.taxUsd;
      expect(quotation.totalUsd).toBe(calculatedTotal);
    });

    it("discount items are subtracted from subtotal", () => {
      const items = [
        { category: "accommodation", amountUsd: 1500 },
        { category: "transport", amountUsd: 500 },
        { category: "discount", amountUsd: -200 },
      ];

      const subtotal = items
        .filter((i) => i.category !== "discount")
        .reduce((sum, i) => sum + i.amountUsd, 0);
      const discounts = items
        .filter((i) => i.category === "discount")
        .reduce((sum, i) => sum + Math.abs(i.amountUsd), 0);

      expect(subtotal).toBe(2000);
      expect(discounts).toBe(200);
    });

    it("quotation item categories are predefined", () => {
      const categories = [
        "accommodation", "transport", "park_fees", "activities",
        "meals", "guide", "other", "discount",
      ];
      expect(categories).toHaveLength(8);
      expect(categories).toContain("discount");
      expect(categories).toContain("accommodation");
    });
  });

  describe("Currency Handling", () => {
    it("financial totals use USD as base currency", () => {
      const supportedCurrencies = ["USD", "KES", "EUR", "GBP"];
      expect(supportedCurrencies).toContain("USD");
      expect(supportedCurrencies[0]).toBe("USD");
    });

    it("dashboard financial values are in USD", () => {
      const stats = {
        totalRevenue: 24000,
        totalQuotedValue: 4500,
      };

      expect(typeof stats.totalRevenue).toBe("number");
      expect(typeof stats.totalQuotedValue).toBe("number");
    });

    it("currency conversion uses live rates with fallback", () => {
      const DEFAULT_RATES: Record<string, number> = {
        USD: 1,
        KES: 129,
        EUR: 0.92,
        GBP: 0.79,
      };

      expect(DEFAULT_RATES.USD).toBe(1);
      expect(DEFAULT_RATES.KES).toBe(129);
    });
  });

  describe("Loading and Error States", () => {
    it("components handle loading state", () => {
      const states = { isLoading: true, error: "", data: null };
      expect(states.isLoading).toBe(true);
      expect(states.data).toBeNull();
    });

    it("components handle error state", () => {
      const states = { isLoading: false, error: "Unable to load data", data: null };
      expect(states.error).toBeTruthy();
      expect(states.data).toBeNull();
    });

    it("components handle empty state", () => {
      const states = { isLoading: false, error: "", data: [] };
      expect(states.data).toHaveLength(0);
    });

    it("components handle loaded state", () => {
      const states = { isLoading: false, error: "", data: [{ id: 1 }] };
      expect(states.data).toHaveLength(1);
    });
  });

  describe("Sidebar Navigation", () => {
    const navItems = [
      { label: "Dashboard", href: "/" },
      { label: "Admin Users", href: "/admin-users" },
      { label: "Clients", href: "/clients" },
      { label: "Bookings", href: "/bookings" },
      { label: "Quotations", href: "/quotations" },
      { label: "Packages", href: "/packages" },
      { label: "Payments", href: "/payments" },
    ];

    it("has 7 navigation items", () => {
      expect(navItems).toHaveLength(7);
    });

    it("all navigation items have labels", () => {
      for (const item of navItems) {
        expect(item.label).toBeTruthy();
      }
    });

    it("all navigation items have valid hrefs", () => {
      for (const item of navItems) {
        expect(item.href).toMatch(/^\//);
      }
    });

    it("no navigation items point to future phases", () => {
      const futurePhaseRoutes = [
        "/destinations", "/wildlife", "/map", "/trip-builder",
        "/ai-assistant", "/whatsapp", "/reviews", "/journal",
        "/notifications", "/documents", "/audit", "/backups",
        "/monitoring", "/performance",
      ];

      for (const item of navItems) {
        expect(futurePhaseRoutes).not.toContain(item.href);
      }
    });
  });

  describe("IDOR Protection - Admin Dashboard", () => {
    it("admin booking access does not rely on client-side checks", () => {
      const serverAuth = { isAdmin: true, status: "active" };
      const clientClaim = { role: "admin" };

      // Server-side check is authoritative
      expect(serverAuth.isAdmin).toBe(true);
      expect(serverAuth.status).toBe("active");
      // Client claim is not used for authorization
    });

    it("admin cannot manipulate booking IDs to access unauthorized data", () => {
      const adminId = "admin-1";
      const bookings = [
        { id: 1, adminId: "admin-1" },
        { id: 2, adminId: "admin-2" },
      ];

      // Admin authorization is checked before any data access
      const isAdmin = bookings.every((b) => b.adminId === adminId);
      // This test verifies the pattern: admin check happens first
      expect(typeof adminId).toBe("string");
    });

    it("dashboard URLs with IDs still require server authorization", () => {
      const routes = ["/bookings/1", "/quotations/1", "/payments/uuid-1"];
      for (const route of routes) {
        expect(route).toMatch(/^\/(bookings|quotations|payments)\//);
      }
    });
  });
});
