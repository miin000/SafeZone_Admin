import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AuthGuard from "@/components/AuthGuard";
import DiseaseCatalogInit from "@/components/DiseaseCatalogInit";

const inter = Inter({
  subsets: ["latin", "vietnamese"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "SafeZone Admin - Hệ thống giám sát dịch bệnh",
  description: "Trang quản trị theo dõi dịch bệnh và quản lý vùng dịch",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <meta charSet="UTF-8" />
      </head>
      <body
        className={`${inter.className} antialiased`}
        suppressHydrationWarning
      >
        <DiseaseCatalogInit />
        <AuthGuard>{children}</AuthGuard>
      </body>
    </html>
  );
}
