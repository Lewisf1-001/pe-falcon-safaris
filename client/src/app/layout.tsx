import type { Metadata } from "next";
import { Inter, Montserrat, Outfit } from "next/font/google";
import { CurrencyProvider } from "@/components/currency/CurrencyProvider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
});

const outfit = Outfit({
  weight: "200",
  subsets: ["latin"],
  variable: "--font-outfit-face",
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
        className={`${inter.variable} ${montserrat.variable} ${outfit.variable} antialiased`}
        suppressHydrationWarning
      >
        <CurrencyProvider>{children}</CurrencyProvider>
      </body>
    </html>
  );
}
