import AboutUs from "@/components/home/AboutUs";
import FeaturedDestinations from "@/components/home/FeaturedDestinations";
import FeaturedWildlife from "@/components/home/FeaturedWildlife";
import SafariPackages from "@/components/home/SafariPackages";
import Hero from "@/components/home/Hero";
import UpcomingTours from "@/components/home/UpcomingTours";
import WhyChooseUs from "@/components/home/WhyChooseUs";
import Footer from "@/components/layout/Footer";
import Navbar from "@/components/layout/Navbar";
import { fetchPackages } from "@/lib/packages";

export default async function HomePage() {
  const packages = await fetchPackages();

  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <FeaturedDestinations />
        <FeaturedWildlife />
        <SafariPackages packages={packages} />
        <AboutUs />
        <WhyChooseUs />
        <UpcomingTours />
      </main>
      <Footer />
    </>
  );
}
