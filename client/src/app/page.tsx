import AboutUs from "@/components/home/AboutUs";
import FeaturedDestinations from "@/components/home/FeaturedDestinations";
import FeaturedWildlife from "@/components/home/FeaturedWildlife";
import SafariPackages from "@/components/home/SafariPackages";
import Hero from "@/components/home/Hero";
import Testimonials from "@/components/home/Testimonials";
import UpcomingTours from "@/components/home/UpcomingTours";
import WhyChooseUs from "@/components/home/WhyChooseUs";
import Footer from "@/components/layout/Footer";
import Navbar from "@/components/layout/Navbar";
import { fetchPackages } from "@/lib/packages";
import { fetchApprovedReviews } from "@/lib/reviews";

export default async function HomePage() {
  const [packages, reviews] = await Promise.all([
    fetchPackages(),
    fetchApprovedReviews(6),
  ]);

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
        <Testimonials reviews={reviews} />
        <UpcomingTours />
      </main>
      <Footer />
    </>
  );
}
