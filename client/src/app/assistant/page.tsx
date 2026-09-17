import type { Metadata } from "next";
import SafariAssistant from "@/components/assistant/SafariAssistant";

export const metadata: Metadata = {
  title: "AI Safari Assistant | PE Falcon Safaris",
  description:
    "Get help planning your Kenya safari. Ask about destinations, wildlife, packages, and trip planning.",
};

export default function AssistantPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-16 lg:px-8">
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-forest sm:text-5xl">
          Safari Assistant
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-600">
          Ask questions about destinations, wildlife, packages, and trip
          planning. I&apos;m here to help you plan your perfect safari.
        </p>
      </header>

      <SafariAssistant />
    </div>
  );
}
