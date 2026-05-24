import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Crypto Loan Tracker",
  description: "Monitor kinerja pinjaman untuk beli aset kripto — XRP vs biaya bunga bulanan.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0d1117",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <head />
      <body>{children}</body>
    </html>
  );
}
