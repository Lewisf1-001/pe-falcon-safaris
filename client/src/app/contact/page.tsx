import type { Metadata } from "next";
import InquiryForm from "@/components/contact/InquiryForm";
import WhatsAppButton from "@/components/contact/WhatsAppButton";
import { buildInquiryMessage } from "@/lib/whatsapp";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "Contact Us | PE Falcon Safaris",
  description:
    "Get in touch with PE Falcon Safaris. Send an inquiry about our safari packages, destinations, or custom trip planning.",
};

export default function ContactPage() {
  const whatsappMessage = buildInquiryMessage({ name: "Visitor" });

  return (
    <>
      <Navbar />
      <main className="bg-cream py-12 sm:py-16">
        <div className="mx-auto max-w-4xl px-6 lg:px-8">
          <header className="mb-10 text-center">
            <h1 className="text-4xl font-bold text-forest sm:text-5xl">
              Contact Us
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-600">
              Have questions about planning your safari? We&apos;re here to
              help. Send us an inquiry or chat with us directly on WhatsApp.
            </p>
          </header>

          <div className="grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
                <h2 className="mb-6 text-xl font-bold text-forest">
                  Send an Inquiry
                </h2>
                <InquiryForm />
              </div>
            </div>

            <div className="lg:col-span-1">
              <div className="sticky top-6 space-y-6">
                <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
                  <h3 className="text-lg font-bold text-forest">
                    Quick Contact
                  </h3>
                  <p className="mt-2 text-sm text-gray-600">
                    Prefer to chat directly? Reach us on WhatsApp for a quick
                    response.
                  </p>
                  <div className="mt-4">
                    <WhatsAppButton
                      message={whatsappMessage}
                      label="Chat on WhatsApp"
                      className="w-full justify-center"
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
                  <h3 className="text-lg font-bold text-forest">
                    Other Ways to Reach Us
                  </h3>
                  <div className="mt-3 space-y-3 text-sm text-gray-600">
                    <p>
                      <span className="font-medium text-forest">Email:</span>{" "}
                      <a
                        href="mailto:info@pefalcon.co.ke"
                        className="text-forest underline hover:text-champagne-deep"
                      >
                        info@pefalcon.co.ke
                      </a>
                    </p>
                    <p>
                      <span className="font-medium text-forest">Phone:</span>{" "}
                      <a
                        href="tel:+254700000000"
                        className="text-forest underline hover:text-champagne-deep"
                      >
                        +254 700 000 000
                      </a>
                    </p>
                    <p>
                      <span className="font-medium text-forest">
                        Location:
                      </span>{" "}
                      Nairobi, Kenya
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
