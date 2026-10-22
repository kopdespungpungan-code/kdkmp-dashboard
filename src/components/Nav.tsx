"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "Ringkasan", icon: "fa-layer-group" },
  { href: "/penjualan", label: "Penjualan", icon: "fa-cart-shopping" },
  { href: "/produk", label: "Produk", icon: "fa-box" },
  { href: "/stok", label: "Stok", icon: "fa-warehouse" },
  { href: "/retur", label: "Retur", icon: "fa-undo" },
  { href: "/laporan-harian", label: "Laporan Harian", icon: "fa-file-invoice" },
  { href: "/laporan-karyawan", label: "Laporan Karyawan", icon: "fa-users" },
];

export default function Nav() {
  const path = usePathname();
  return (
    <nav aria-label="Menu utama" className="flex flex-col gap-0.5 pt-2">
      {items.map((it) => {
        const active = it.href === "/" ? path === "/" : path.startsWith(it.href);
        return (
          <Link
            key={it.href}
            href={it.href}
            aria-current={active ? "page" : undefined}
            className={`whitespace-nowrap flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold border-l-4 transition-colors ${
              active
                ? "bg-primary text-primary-foreground border-primary"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground border-transparent"
            }`}
          >
            <span className={`fas ${it.icon} w-5 shrink-0`} aria-hidden="true" />
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
