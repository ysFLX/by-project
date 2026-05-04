import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BY Catering - Kurumsal Yemek Operasyonu",
  description: "Catering firmaları için şirket üyeliği, günlük kişi sayısı ve tabak toplama takip sistemi."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
