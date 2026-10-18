import type { Metadata } from "next";
import "@fontsource-variable/bricolage-grotesque";
import "@fontsource-variable/public-sans";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: "Toko KDKMP Pungpungan",
  description: "Dashboard retail Koperasi Desa Merah Putih Pungpungan",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className="min-h-screen">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
