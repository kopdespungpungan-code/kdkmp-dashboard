"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ShoppingCart, Package, Warehouse, FileText } from "lucide-react";
import { cn } from "@/components/ui/utils";

const items = [
  { href: "/", label: "Home", icon: Home },
  { href: "/penjualan", label: "Jual", icon: ShoppingCart },
  { href: "/produk", label: "Produk", icon: Package },
  { href: "/stok", label: "Stok", icon: Warehouse },
  { href: "/laporan-harian", label: "Laporan", icon: FileText },
];

export default function BottomNav() {
  const path = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-garis bg-white/95 backdrop-blur lg:hidden">
      {items.map((it) => {
        const active = it.href === "/" ? path === "/" : path.startsWith(it.href);
        const Icon = it.icon;
        return (
          <Link
            key={it.href}
            href={it.href}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-xs font-medium transition-colors",
              active ? "text-merah" : "text-redup hover:text-ink",
            )}
          >
            <Icon className="h-5 w-5" />
            <span>{it.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
