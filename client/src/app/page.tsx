import FeaturedDestinations from "@/components/home/FeaturedDestinations";
import Hero from "@/components/home/Hero";
import Navbar from "@/components/layout/Navbar";

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <FeaturedDestinations />
      </main>
    </>
  );
}
