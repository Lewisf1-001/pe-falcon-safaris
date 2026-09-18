"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";

type QuotationItemCategory =
  | "accommodation"
  | "transport"
  | "park_fees"
  | "activities"
  | "meals"
  | "guide"
  | "other"
  | "discount";

const ITEM_CATEGORIES: { value: QuotationItemCategory; label: string }[] = [
  { value: "accommodation", label: "Accommodation" },
  { value: "transport", label: "Transport" },
  { value: "park_fees", label: "Park fees" },
  { value: "activities", label: "Activities" },
  { value: "meals", label: "Meals" },
  { value: "guide", label: "Guide / Driver" },
  { value: "other", label: "Other" },
  { value: "discount", label: "Discount / Adjustment" },
];

type LineItem = {
  tempId: string;
  description: string;
  quantity: string;
  unitPriceUsd: string;
  category: QuotationItemCategory;
};

type Customer = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
};

type Package = {
  id: number;
  name: string;
  slug: string;
  startingPriceUsd: number;
};

type Booking = {
  id: number;
  travelDate: string;
  guests: number;
  totalPriceUsd: number;
  status: string;
  packageName: string;
};

type QuotationData = {
  id: number;
  userId: number;
  bookingId: number | null;
  packageId: number | null;
  title: string;
  description: string | null;
  travelDate: string;
  guests: number;
  currency: string;
  subtotalUsd: number;
  discountUsd: number;
  taxUsd: number;
  totalUsd: number;
  validUntil: string;
  status: string;
  notesCustomer: string | null;
  notesAdmin: string | null;
  items: {
    id: number;
    description: string;
    quantity: number;
    unitPriceUsd: number;
    amountUsd: number;
    category: string;
    sortOrder: number;
  }[];
};

type AdminQuotationFormProps = {
  editingQuotation?: QuotationData | null;
  onSaved?: () => void;
  onCancelEdit?: () => void;
};

function emptyLineItem(): LineItem {
  return {
    tempId: crypto.randomUUID(),
    description: "",
    quantity: "1",
    unitPriceUsd: "",
    category: "other",
  };
}

function calculatePreviewTotals(items: LineItem[], taxUsd: string) {
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

export default function AdminQuotationForm({
  editingQuotation,
  onSaved,
  onCancelEdit,
}: AdminQuotationFormProps) {
  const router = useRouter();
  const isEditing = Boolean(editingQuotation);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const [selectedUserId, setSelectedUserId] = useState<string>(
    editingQuotation ? String(editingQuotation.userId) : ""
  );
  const [selectedPackageId, setSelectedPackageId] = useState<string>(
    editingQuotation?.packageId ? String(editingQuotation.packageId) : ""
  );
  const [selectedBookingId, setSelectedBookingId] = useState<string>(
    editingQuotation?.bookingId ? String(editingQuotation.bookingId) : ""
  );
  const [title, setTitle] = useState(editingQuotation?.title || "");
  const [description, setDescription] = useState(editingQuotation?.description || "");
  const [travelDate, setTravelDate] = useState(editingQuotation?.travelDate || "");
  const [guests, setGuests] = useState<string>(editingQuotation ? String(editingQuotation.guests) : "2");
  const [validUntil, setValidUntil] = useState(editingQuotation?.validUntil || "");
  const [taxUsd, setTaxUsd] = useState<string>(
    editingQuotation ? String(editingQuotation.taxUsd) : "0"
  );
  const [notesCustomer, setNotesCustomer] = useState(editingQuotation?.notesCustomer || "");
  const [notesAdmin, setNotesAdmin] = useState(editingQuotation?.notesAdmin || "");

  const [lineItems, setLineItems] = useState<LineItem[]>(() => {
    if (editingQuotation?.items?.length) {
      return editingQuotation.items.map((item) => ({
        tempId: crypto.randomUUID(),
        description: item.description,
        quantity: String(item.quantity),
        unitPriceUsd: String(item.unitPriceUsd),
        category: item.category as QuotationItemCategory,
      }));
    }
    return [emptyLineItem()];
  });

  const [showPreview, setShowPreview] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");

  const loadReferenceData = useCallback(async () => {
    setIsLoadingData(true);
    try {
      const supabase = createClient();

      const { data: usersData, error: usersError } = await supabase
        .from("users")
        .select("id, first_name, last_name, email")
        .order("email", { ascending: true });

      if (usersError) throw usersError;

      setCustomers(
        (usersData || []).map((u: any) => ({
          id: u.id,
          firstName: u.first_name,
          lastName: u.last_name,
          email: u.email,
        }))
      );

      const { data: packagesData } = await supabase
        .from("packages")
        .select("id, name, slug, starting_price_usd")
        .eq("is_active", true)
        .order("name", { ascending: true });

      setPackages(
        (packagesData || []).map((p: any) => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          startingPriceUsd: Number(p.starting_price_usd),
        }))
      );
    } catch {
      setError("Failed to load reference data.");
    } finally {
      setIsLoadingData(false);
    }
  }, []);

  useEffect(() => {
    loadReferenceData();
  }, [loadReferenceData]);

  useEffect(() => {
    if (!selectedUserId) {
      setBookings([]);
      setSelectedBookingId("");
      return;
    }

    async function loadBookings() {
      const supabase = createClient();
      const { data } = await supabase
        .from("bookings")
        .select(`
          id, travel_date, guests, total_price_usd, status,
          packages!bookings_package_id_fkey (name)
        `)
        .eq("user_id", Number(selectedUserId))
        .in("status", ["inquiry", "quote", "pending"])
        .order("created_at", { ascending: false });

      setBookings(
        (data || []).map((b: any) => ({
          id: b.id,
          travelDate: b.travel_date?.slice(0, 10) || "",
          guests: b.guests,
          totalPriceUsd: Number(b.total_price_usd),
          status: b.status,
          packageName: b.packages?.name || "",
        }))
      );
    }

    loadBookings();
  }, [selectedUserId]);

  useEffect(() => {
    if (!selectedBookingId || !bookings.length) return;
    const booking = bookings.find((b) => b.id === Number(selectedBookingId));
    if (booking) {
      if (!travelDate) setTravelDate(booking.travelDate);
      if (!guests || guests === "2") setGuests(String(booking.guests));
    }
  }, [selectedBookingId, bookings, travelDate, guests]);

  function updateLineItem(tempId: string, field: keyof LineItem, value: string) {
    setLineItems((prev) =>
      prev.map((item) => (item.tempId === tempId ? { ...item, [field]: value } : item))
    );
  }

  function addLineItem() {
    setLineItems((prev) => [...prev, emptyLineItem()]);
  }

  function removeLineItem(tempId: string) {
    setLineItems((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((item) => item.tempId !== tempId);
    });
  }

  const filteredCustomers = customers.filter((c) => {
    if (!customerSearch.trim()) return true;
    const q = customerSearch.toLowerCase();
    return (
      c.email.toLowerCase().includes(q) ||
      c.firstName.toLowerCase().includes(q) ||
      c.lastName.toLowerCase().includes(q)
    );
  });

  const previewTotals = calculatePreviewTotals(lineItems, taxUsd);

  async function handleSubmit(event: FormEvent<HTMLFormElement>, action: "draft" | "preview") {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (action === "preview") {
      setShowPreview(true);
      return;
    }

    if (!selectedUserId) {
      setError("Select a customer.");
      return;
    }
    if (!title.trim()) {
      setError("Enter a quotation title.");
      return;
    }
    if (!travelDate) {
      setError("Set a travel date.");
      return;
    }
    const guestCount = Number(guests);
    if (!Number.isInteger(guestCount) || guestCount < 1 || guestCount > 20) {
      setError("Guests must be between 1 and 20.");
      return;
    }
    if (!validUntil) {
      setError("Set a validity date.");
      return;
    }

    const validItems = lineItems.filter(
      (item) => item.description.trim() && Number(item.quantity) >= 1 && Number(item.unitPriceUsd) >= 0
    );
    if (validItems.length === 0) {
      setError("Add at least one line item with a description, quantity, and price.");
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

      const payload = {
        userId: Number(selectedUserId),
        bookingId: selectedBookingId ? Number(selectedBookingId) : null,
        packageId: selectedPackageId ? Number(selectedPackageId) : null,
        title: title.trim(),
        description: description.trim() || null,
        travelDate,
        guests: guestCount,
        currency: "USD",
        taxUsd: Number(taxUsd) || 0,
        validUntil,
        notesCustomer: notesCustomer.trim() || null,
        notesAdmin: notesAdmin.trim() || null,
        items: validItems.map((item, index) => ({
          description: item.description.trim(),
          quantity: Number(item.quantity),
          unitPriceUsd: Number(item.unitPriceUsd),
          category: item.category,
          sortOrder: index,
        })),
      };

      if (isEditing) {
        const res = await fetch(
          `${supabaseUrl}/functions/v1/quotations/admin/${editingQuotation!.id}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session?.access_token || ""}`,
              apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            },
            body: JSON.stringify(payload),
          }
        );

        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        setSuccess("Quotation updated successfully.");
        if (onSaved) onSaved();
      } else {
        const res = await fetch(`${supabaseUrl}/functions/v1/quotations/admin`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token || ""}`,
            apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        setSuccess("Quotation created as draft.");
        if (onSaved) {
          onSaved();
        } else {
          router.push(`/quotations/${data.quotation.id}`);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoadingData) {
    return <p className="text-sm text-gray-500">Loading form data...</p>;
  }

  return (
    <div className="space-y-6">
      <form onSubmit={(e) => handleSubmit(e, "draft")} className="space-y-6">
        <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-forest">
                {isEditing ? "Edit quotation" : "Create quotation"}
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                {isEditing
                  ? "Update the draft quotation details below."
                  : "Create a new draft quotation for a customer."}
              </p>
            </div>
            {isEditing && (
              <button
                type="button"
                onClick={onCancelEdit}
                className="text-sm font-medium text-forest hover:underline"
              >
                Cancel edit
              </button>
            )}
          </div>

          {error && (
            <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          )}

          {success && (
            <p className="mt-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              {success}
            </p>
          )}

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="customer-search" className="mb-1.5 block text-sm font-medium text-forest">
                Customer *
              </label>
              <input
                id="customer-search"
                type="search"
                placeholder="Search by name or email..."
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                className="mb-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-forest focus:border-forest focus:outline-none"
              />
              <select
                id="customer"
                required
                value={selectedUserId}
                onChange={(e) => {
                  setSelectedUserId(e.target.value);
                  setSelectedBookingId("");
                  setCustomerSearch("");
                }}
                className="w-full rounded-md border border-gray-300 px-4 py-2.5 text-forest outline-none focus:border-forest focus:ring-2 focus:ring-forest/20"
              >
                <option value="">Select customer</option>
                {filteredCustomers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.firstName} {c.lastName} ({c.email})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="package" className="mb-1.5 block text-sm font-medium text-forest">
                Package (optional)
              </label>
              <select
                id="package"
                value={selectedPackageId}
                onChange={(e) => setSelectedPackageId(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-4 py-2.5 text-forest outline-none focus:border-forest focus:ring-2 focus:ring-forest/20"
              >
                <option value="">No package</option>
                {packages.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {selectedUserId && bookings.length > 0 && (
            <div className="mt-4">
              <label htmlFor="booking" className="mb-1.5 block text-sm font-medium text-forest">
                Link to existing booking (optional)
              </label>
              <select
                id="booking"
                value={selectedBookingId}
                onChange={(e) => setSelectedBookingId(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-4 py-2.5 text-forest outline-none focus:border-forest focus:ring-2 focus:ring-forest/20"
              >
                <option value="">No linked booking</option>
                {bookings.map((b) => (
                  <option key={b.id} value={b.id}>
                    #{b.id} — {b.packageName} — {b.travelDate} — ${b.totalPriceUsd} ({b.status})
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Only showing bookings in inquiry, quote, or pending status for this customer.
              </p>
            </div>
          )}

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="title" className="mb-1.5 block text-sm font-medium text-forest">
                Title *
              </label>
              <input
                id="title"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. 5-Day Masai Mara Safari"
                className="w-full rounded-md border border-gray-300 px-4 py-2.5 text-forest outline-none focus:border-forest focus:ring-2 focus:ring-forest/20"
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="description" className="mb-1.5 block text-sm font-medium text-forest">
                Description
              </label>
              <textarea
                id="description"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief overview of the quotation..."
                className="w-full rounded-md border border-gray-300 px-4 py-2.5 text-forest outline-none focus:border-forest focus:ring-2 focus:ring-forest/20"
              />
            </div>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="travelDate" className="mb-1.5 block text-sm font-medium text-forest">
                Travel date *
              </label>
              <input
                id="travelDate"
                type="date"
                required
                value={travelDate}
                onChange={(e) => setTravelDate(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-4 py-2.5 text-forest outline-none focus:border-forest focus:ring-2 focus:ring-forest/20"
              />
            </div>
            <div>
              <label htmlFor="guests" className="mb-1.5 block text-sm font-medium text-forest">
                Guests *
              </label>
              <input
                id="guests"
                type="number"
                min={1}
                max={20}
                required
                value={guests}
                onChange={(e) => setGuests(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-4 py-2.5 text-forest outline-none focus:border-forest focus:ring-2 focus:ring-forest/20"
              />
            </div>
            <div>
              <label htmlFor="validUntil" className="mb-1.5 block text-sm font-medium text-forest">
                Valid until *
              </label>
              <input
                id="validUntil"
                type="date"
                required
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-4 py-2.5 text-forest outline-none focus:border-forest focus:ring-2 focus:ring-forest/20"
              />
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-forest">Line Items</h2>
              <p className="mt-1 text-sm text-gray-500">
                Add services, fees, and adjustments. Totals are calculated by the server.
              </p>
            </div>
            <button
              type="button"
              onClick={addLineItem}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-forest transition-colors hover:border-forest"
            >
              + Add item
            </button>
          </div>

          <div className="mt-4 space-y-4">
            {lineItems.map((item, index) => (
              <div
                key={item.tempId}
                className="grid gap-3 rounded-lg border border-gray-100 bg-gray-50 p-4 sm:grid-cols-12"
              >
                <div className="sm:col-span-4">
                  {index === 0 && (
                    <label className="mb-1.5 block text-xs font-medium text-gray-500">
                      Description *
                    </label>
                  )}
                  <input
                    required
                    value={item.description}
                    onChange={(e) => updateLineItem(item.tempId, "description", e.target.value)}
                    placeholder="e.g. Luxury tented camp (3 nights)"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-forest outline-none focus:border-forest focus:ring-2 focus:ring-forest/20"
                  />
                </div>
                <div className="sm:col-span-2">
                  {index === 0 && (
                    <label className="mb-1.5 block text-xs font-medium text-gray-500">
                      Category
                    </label>
                  )}
                  <select
                    value={item.category}
                    onChange={(e) =>
                      updateLineItem(item.tempId, "category", e.target.value)
                    }
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-forest outline-none focus:border-forest focus:ring-2 focus:ring-forest/20"
                  >
                    {ITEM_CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-1">
                  {index === 0 && (
                    <label className="mb-1.5 block text-xs font-medium text-gray-500">Qty</label>
                  )}
                  <input
                    type="number"
                    min={1}
                    required
                    value={item.quantity}
                    onChange={(e) => updateLineItem(item.tempId, "quantity", e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-forest outline-none focus:border-forest focus:ring-2 focus:ring-forest/20"
                  />
                </div>
                <div className="sm:col-span-2">
                  {index === 0 && (
                    <label className="mb-1.5 block text-xs font-medium text-gray-500">
                      Unit price (USD)
                    </label>
                  )}
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    required
                    value={item.unitPriceUsd}
                    onChange={(e) =>
                      updateLineItem(item.tempId, "unitPriceUsd", e.target.value)
                    }
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-forest outline-none focus:border-forest focus:ring-2 focus:ring-forest/20"
                  />
                </div>
                <div className="flex items-end sm:col-span-3">
                  {index === 0 && (
                    <label className="mb-1.5 block text-xs font-medium text-gray-500">
                      Amount
                    </label>
                  )}
                  <div className="flex w-full items-center gap-2">
                    <span className="flex-1 rounded-md bg-white px-3 py-2 text-sm font-medium text-forest border border-gray-200">
                      USD{" "}
                      {(
                        (Number(item.quantity) || 0) * (Number(item.unitPriceUsd) || 0)
                      ).toFixed(2)}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeLineItem(item.tempId)}
                      disabled={lineItems.length <= 1}
                      className="rounded-md border border-red-200 px-2 py-2 text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                      title="Remove item"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-forest">Pricing & Notes</h2>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="taxUsd" className="mb-1.5 block text-sm font-medium text-forest">
                Tax (USD)
              </label>
              <input
                id="taxUsd"
                type="number"
                min={0}
                step={0.01}
                value={taxUsd}
                onChange={(e) => setTaxUsd(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-4 py-2.5 text-forest outline-none focus:border-forest focus:ring-2 focus:ring-forest/20"
              />
            </div>
            <div className="flex items-end">
              <div className="w-full rounded-lg border border-gray-200 bg-gray-50 p-4">
                <dl className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Subtotal</dt>
                    <dd className="font-medium text-forest">USD {previewTotals.subtotal.toFixed(2)}</dd>
                  </div>
                  {previewTotals.discount > 0 && (
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Discount</dt>
                      <dd className="font-medium text-green-700">-USD {previewTotals.discount.toFixed(2)}</dd>
                    </div>
                  )}
                  {(Number(taxUsd) || 0) > 0 && (
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Tax</dt>
                      <dd className="font-medium text-forest">USD {(Number(taxUsd) || 0).toFixed(2)}</dd>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-gray-200 pt-1">
                    <dt className="text-base font-semibold text-forest">Total</dt>
                    <dd className="text-base font-bold text-forest">USD {previewTotals.total.toFixed(2)}</dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="notesCustomer" className="mb-1.5 block text-sm font-medium text-forest">
                Customer notes
              </label>
              <textarea
                id="notesCustomer"
                rows={3}
                value={notesCustomer}
                onChange={(e) => setNotesCustomer(e.target.value)}
                placeholder="Visible to the customer..."
                className="w-full rounded-md border border-gray-300 px-4 py-2.5 text-forest outline-none focus:border-forest focus:ring-2 focus:ring-forest/20"
              />
            </div>
            <div>
              <label htmlFor="notesAdmin" className="mb-1.5 block text-sm font-medium text-forest">
                Admin notes
              </label>
              <textarea
                id="notesAdmin"
                rows={3}
                value={notesAdmin}
                onChange={(e) => setNotesAdmin(e.target.value)}
                placeholder="Internal notes (not visible to customer)..."
                className="w-full rounded-md border border-gray-300 px-4 py-2.5 text-forest outline-none focus:border-forest focus:ring-2 focus:ring-forest/20"
              />
            </div>
          </div>
        </section>

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="nav-cta rounded-md border-0 px-5 py-2.5 text-sm font-semibold text-forest transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting
              ? "Saving..."
              : isEditing
                ? "Update draft"
                : "Save as draft"}
          </button>
          <button
            type="button"
            onClick={(e) => handleSubmit(e as any, "preview")}
            className="rounded-md border border-gray-300 px-5 py-2.5 text-sm font-medium text-forest transition-colors hover:border-forest"
          >
            Preview
          </button>
          <Link
            href="/quotations"
            className="px-5 py-2.5 text-sm font-medium text-forest hover:underline"
          >
            Cancel
          </Link>
        </div>
      </form>

      {showPreview && (
        <QuotationPreview
          title={title}
          description={description}
          travelDate={travelDate}
          guestsNumber={Number(guests) || 0}
          validUntil={validUntil}
          items={lineItems}
          taxUsd={Number(taxUsd) || 0}
          totals={previewTotals}
          notesCustomer={notesCustomer}
          customerName={
            customers.find((c) => c.id === Number(selectedUserId))
              ? `${customers.find((c) => c.id === Number(selectedUserId))!.firstName} ${customers.find((c) => c.id === Number(selectedUserId))!.lastName}`
              : ""
          }
          packageName={
            packages.find((p) => p.id === Number(selectedPackageId))?.name || null
          }
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
}

function QuotationPreview({
  title,
  description,
  travelDate,
  guestsNumber,
  validUntil,
  items,
  taxUsd,
  totals,
  notesCustomer,
  customerName,
  packageName,
  onClose,
}: {
  title: string;
  description: string;
  travelDate: string;
  guestsNumber: number;
  validUntil: string;
  items: LineItem[];
  taxUsd: number;
  totals: { subtotal: number; discount: number; total: number };
  notesCustomer: string;
  customerName: string;
  packageName: string | null;
  onClose: () => void;
}) {
  const validItems = items.filter(
    (item) => item.description.trim() && Number(item.quantity) >= 1
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white shadow-xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4">
          <h3 className="text-lg font-semibold text-forest">Quotation Preview</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-forest hover:bg-gray-50"
          >
            Close
          </button>
        </div>

        <div className="px-6 py-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-forest">{title || "Untitled Quotation"}</h2>
            {description && (
              <p className="mt-2 text-sm text-gray-600">{description}</p>
            )}
          </div>

          <div className="mb-6 grid gap-4 sm:grid-cols-2">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Customer</dt>
                <dd className="font-medium text-forest">{customerName || "—"}</dd>
              </div>
              {packageName && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Package</dt>
                  <dd className="font-medium text-forest">{packageName}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-gray-500">Travel date</dt>
                <dd className="font-medium text-forest">{travelDate || "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Guests</dt>
                <dd className="font-medium text-forest">{guestsNumber}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Valid until</dt>
                <dd className="font-medium text-forest">{validUntil || "—"}</dd>
              </div>
            </dl>
          </div>

          {validItems.length > 0 && (
            <div className="mb-6">
              <h4 className="mb-3 text-sm font-semibold text-forest">Line Items</h4>
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-500">
                    <th className="px-2 py-2 font-medium">Description</th>
                    <th className="px-2 py-2 font-medium">Category</th>
                    <th className="px-2 py-2 font-medium text-right">Qty</th>
                    <th className="px-2 py-2 font-medium text-right">Unit Price</th>
                    <th className="px-2 py-2 font-medium text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {validItems.map((item) => {
                    const amount = (Number(item.quantity) || 0) * (Number(item.unitPriceUsd) || 0);
                    return (
                      <tr key={item.tempId} className="border-b border-gray-50 last:border-0">
                        <td className="px-2 py-3 text-forest">{item.description}</td>
                        <td className="px-2 py-3 capitalize text-gray-600">
                          {item.category.replace(/_/g, " ")}
                        </td>
                        <td className="px-2 py-3 text-right text-gray-600">{item.quantity}</td>
                        <td className="px-2 py-3 text-right text-gray-600">
                          USD {Number(item.unitPriceUsd).toFixed(2)}
                        </td>
                        <td className="px-2 py-3 text-right font-medium text-forest">
                          USD {amount.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
            <dl className="space-y-1 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Subtotal</dt>
                <dd className="font-medium text-forest">USD {totals.subtotal.toFixed(2)}</dd>
              </div>
              {totals.discount > 0 && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Discount</dt>
                  <dd className="font-medium text-green-700">-USD {totals.discount.toFixed(2)}</dd>
                </div>
              )}
              {taxUsd > 0 && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Tax</dt>
                  <dd className="font-medium text-forest">USD {taxUsd.toFixed(2)}</dd>
                </div>
              )}
              <div className="flex justify-between border-t border-gray-200 pt-2">
                <dt className="text-base font-semibold text-forest">Total</dt>
                <dd className="text-base font-bold text-forest">USD {totals.total.toFixed(2)}</dd>
              </div>
            </dl>
          </div>

          {notesCustomer && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <h4 className="mb-2 text-sm font-semibold text-forest">Notes</h4>
              <p className="text-sm text-gray-600">{notesCustomer}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
