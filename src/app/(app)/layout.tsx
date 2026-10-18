import Nav from "@/components/Nav";
import { createClient } from "@/lib/supabase/server";
import { logout } from "../login/actions";
import MobileHeader from "@/components/MobileHeader";
import BottomNav from "@/components/BottomNav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="lg:grid lg:min-h-screen lg:grid-cols-[16rem_1fr]">
      <MobileHeader />

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col bg-ink text-white sticky lg:top-0 h-screen px-4 py-6">
        <div className="mb-6 flex flex-col gap-1">
          <p className="text-lg font-bold text-white">Toko Pungpungan</p>
          <p className="text-xs text-white/60">Koperasi Desa Merah Putih</p>
        </div>
        <nav aria-label="Menu utama" className="flex-grow flex flex-col gap-1 pt-2">
          {[
            { href: "/", label: "Ringkasan" },
            { href: "/penjualan", label: "Penjualan" },
            { href: "/produk", label: "Produk" },
            { href: "/stok", label: "Stok" },
            { href: "/retur", label: "Retur" },
            { href: "/laporan-harian", label: "Laporan Harian" },
            { href: "/laporan-karyawan", label: "Laporan Karyawan" },
          ].map((it) => {
            return (
              <a
                key={it.href}
                href={it.href}
                className={`whitespace-nowrap rounded px-3 py-2 text-sm font-semibold lg:border-l-4 lg:rounded-l-none ${
                  it.href === "/laporan-harian"
                    ? "bg-white/15 text-white lg:border-merah"
                    : "text-white/70 hover:bg-white/10 hover:text-white lg:border-transparent"
                }`}
              >
                {it.label}
              </a>
            );
          })}
        </nav>
        <div className="mt-auto p-4 text-xs text-white/60 border-t border-white/10">
          <p className="mb-1 truncate">{user?.email}</p>
          <form action={logout} className="flex items-center gap-2 mt-2">
            <button className="underline hover:text-white">Keluar</button>
          </form>
        </div>
      </aside>

      <main className="pt-16 lg:pt-0 pb-20 lg:pb-6 px-3 py-6 sm:px-4 lg:px-8">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
