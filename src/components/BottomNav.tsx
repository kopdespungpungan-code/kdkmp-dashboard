"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/components/ui/utils";

const items = [
  { href: "/dashboard", label: "Beranda", icon: "fa-home" },
  { href: "/penjualan", label: "Jual", icon: "fa-cart-shopping" },
  { href: "/produk", label: "Produk", icon: "fa-box" },
  { href: "/stok", label: "Stok", icon: "fa-warehouse" },
  { href: "/laporan-harian", label: "Laporan", icon: "fa-file-invoice" },
];

export default function BottomNav() {
  const path = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-border bg-background/95 backdrop-blur-lg lg:hidden">
      {items.map((it) => {
        const active = it.href === "/" ? path === "/" : path.startsWith(it.href);
        return (
          <Link
            key={it.href}
            href={it.href}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-xs font-medium transition-colors",
              active ? "text-primary" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <span className={`fas ${it.icon} h-5 w-5`} aria-hidden="true" />
            <span>{it.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
