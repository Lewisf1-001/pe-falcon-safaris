export type Destination = {
  id: string;
  name: string;
  duration: string;
  region: string;
  price: number;
  featured?: boolean;
};

export const featuredDestinations: Destination[] = [
  {
    id: "maasai-mara",
    name: "Maasai Mara",
    duration: "3 days",
    region: "Southwest Kenya",
    price: 500,
    featured: true,
  },
  {
    id: "amboseli",
    name: "Amboseli",
    duration: "2 days",
    region: "Southern Kenya",
    price: 380,
  },
  {
    id: "tsavo-east",
    name: "Tsavo East",
    duration: "4 days",
    region: "Coast Province",
    price: 620,
  },
];
