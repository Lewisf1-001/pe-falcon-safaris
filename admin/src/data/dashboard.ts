export const dashboardStats = [
  {
    id: "clients",
    label: "Total clients",
    value: "148",
    change: "+12 this month",
    changeTone: "positive" as const,
  },
  {
    id: "bookings",
    label: "Total bookings",
    value: "312",
    change: "+24 this month",
    changeTone: "positive" as const,
  },
  {
    id: "revenue",
    label: "Revenue",
    value: "$94k",
    change: "+8.4%",
    changeTone: "positive" as const,
  },
  {
    id: "tours",
    label: "Active tours",
    value: "7",
    change: "Upcoming: 3",
    changeTone: "muted" as const,
  },
];

export type BookingStatus = "Paid" | "Pending";

export type RecentBooking = {
  id: string;
  client: string;
  destination: string;
  date: string;
  status: BookingStatus;
};

export const recentBookings: RecentBooking[] = [
  {
    id: "1",
    client: "Edwin K.",
    destination: "Maasai Mara",
    date: "12 Jun",
    status: "Paid",
  },
  {
    id: "2",
    client: "Amina S.",
    destination: "Amboseli",
    date: "24 Jul",
    status: "Pending",
  },
  {
    id: "3",
    client: "James M.",
    destination: "Tsavo East",
    date: "01 Aug",
    status: "Paid",
  },
];
