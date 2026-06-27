export type UpcomingTour = {
  id: string;
  name: string;
  date: string;
  seatsLeft: number;
  price: number;
  seatsTone: "green" | "orange" | "blue";
};

export const upcomingTours: UpcomingTour[] = [
  {
    id: "mara-migration",
    name: "Mara Migration Safari",
    date: "15 Jul 2025",
    seatsLeft: 8,
    price: 500,
    seatsTone: "green",
  },
  {
    id: "amboseli-elephant",
    name: "Amboseli Elephant Tour",
    date: "22 Jul 2025",
    seatsLeft: 3,
    price: 380,
    seatsTone: "orange",
  },
  {
    id: "tsavo-red-elephant",
    name: "Tsavo Red Elephant Trek",
    date: "01 Aug 2025",
    seatsLeft: 12,
    price: 620,
    seatsTone: "blue",
  },
];
