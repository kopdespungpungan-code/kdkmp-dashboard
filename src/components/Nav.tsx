"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "Ringkasan" },
  { href: "/penjualan", label: "Penjualan" },
  { href: "/produk", label: "Produk" },
  { href: "/stok", label: "Stok" },
  { href: "/retur", label: "Retur" },
  { href: "/laporan-harian", label: "Laporan Harian" },
  { href: "/laporan-karyawan", label: "Laporan Karyawan" },
];

export default function Nav() {
  const path = usePathname();
  return (
    <nav aria-label="Menu utama" className="flex flex-col gap-1 pt-2">
      {items.map((it) => {
        const active = it.href === "/" ? path === "/" : path.startsWith(it.href);
        return (
          <Link
            key={it.href}
            href={it.href}
            aria-current={active ? "page" : undefined}
            className={`whitespace-nowrap rounded px-3 py-2.5 text-sm font-semibold border-l-4 ${
              active
                ? "bg-white/15 text-white border-merah"
                : "text-white/70 hover:bg-white/10 hover:text-white border-transparent"
            }`}
          >
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
