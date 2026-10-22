import type { Metadata } from "next";
import "@fortawesome/fontawesome-free/css/all.min.css";
import "@fontsource-variable/bricolage-grotesque";
import "@fontsource-variable/public-sans";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: "Toko KDKMP Pungpungan",
  description: "Dashboard retail Koperasi Desa Merah Putih Pungpungan",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Providers defaultTheme="system">
      <html lang="id" className="min-h-screen">
        <body className="min-h-screen">
          {children}
          <Toaster />
        </body>
      </html>
    </Providers>
  );
}
