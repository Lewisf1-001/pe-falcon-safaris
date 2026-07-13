import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { CurrencyProvider } from "@/components/currency/CurrencyProvider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "PE Falcon Admin",
  description: "Admin dashboard for PE Falcon Safaris",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} antialiased`} suppressHydrationWarning>
        <CurrencyProvider>{children}</CurrencyProvider>
      </body>
    </html>
  );
}
