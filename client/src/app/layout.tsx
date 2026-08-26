import type { Metadata } from "next";
import { Figtree, Montserrat, Outfit } from "next/font/google";
import { CurrencyProvider } from "@/components/currency/CurrencyProvider";
import "./globals.css";

const figtree = Figtree({
  subsets: ["latin"],
  variable: "--font-figtree",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  display: "swap",
  weight: ["500", "600", "700"],
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit-face",
  display: "swap",
  weight: ["200", "600", "700"],
});

export const metadata: Metadata = {
  title: "PE Falcon Safaris | Kenya Safari Adventures",
  description:
    "Unforgettable wildlife adventures across Kenya. Expert guides. Memories for life.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${figtree.variable} ${montserrat.variable} ${outfit.variable} antialiased`}
        suppressHydrationWarning
      >
        <CurrencyProvider>{children}</CurrencyProvider>
      </body>
    </html>
  );
}
