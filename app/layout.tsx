import type { Metadata, Viewport } from "next";
import "./globals.css";
import Nav from "@/components/Nav";
import DemoBanner from "@/components/DemoBanner";

export const metadata: Metadata = {
  title: "Whale Flow",
  description:
    "Track the 500 largest on-chain movers, see which tokens they are moving, and test whether that flow relates to price.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0d1117",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <DemoBanner />
        <Nav />
        <main className="mx-auto w-full max-w-[1400px] px-4 pb-24 pt-6 sm:px-6">{children}</main>
      </body>
    </html>
  );
}
