import type { Metadata } from "next";
import { Space_Grotesk, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { Analytics } from "@vercel/analytics/react";
import { LanguageProvider } from "@/components/LanguageProvider";

const displaySans = Space_Grotesk({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://quantedgefootball.com"),
  title: {
    default: "Quant Edge | Football match analysis",
    template: "%s | Quant Edge",
  },
  description: "Football match analysis with team form, player ratings, projected lineups, probabilities and match context.",
  openGraph: {
    title: "Quant Edge | Football match analysis",
    description: "Investigate football fixtures with evidence, ratings and model context.",
    url: "https://quantedgefootball.com",
    siteName: "Quant Edge",
    type: "website",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${displaySans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ClerkProvider>
          <LanguageProvider>{children}</LanguageProvider>
        </ClerkProvider>
        <Analytics />
      </body>
    </html>
  );
}
