import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BY Project - QR Sipariş Sistemi",
  description: "Masa QR, müşteri siparişi, kasa ve mutfak panelleri için başlangıç projesi."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
