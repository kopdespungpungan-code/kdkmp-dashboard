"use client";

import Nav from "@/components/Nav";
import { logout } from "@/app/login/actions";
import MobileHeader from "@/components/MobileHeader";
import BottomNav from "@/components/BottomNav";
import { ThemeToggle } from "@/components/ThemeToggle";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";

interface AppLayoutClientProps {
  user: { email?: string | null } | null;
  children: React.ReactNode;
}

export default function AppLayoutClient({ user, children }: AppLayoutClientProps) {
  const pathname = usePathname();

  return (
    <div className="lg:grid lg:min-h-screen lg:grid-cols-[16rem_1fr]">
      {/* Mobile header */}
      <MobileHeader />

      {/* Desktop sidebar */}
      <motion.aside
        initial={{ x: "-100%" }}
        animate={{ x: 0 }}
        exit={{ x: "-100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 400 }}
        className="hidden lg:flex lg:flex-col bg-card text-foreground sticky lg:top-0 h-screen px-4 py-6 border-r border-border"
      >
        <div className="mb-8 flex flex-col gap-2">
          <a href="/dashboard" aria-label="Beranda Toko Pungpungan" className="block px-1 py-0.5">
            <img
              src="/assets/logo-kolaborasi-apn.webp"
              alt="Agrinas Pangan Nusantara x KDKMP Pungpungan"
              className="logo-light h-auto w-full object-contain"
            />
            <img
              src="/assets/logo-kolaborasi-apn-dark.webp"
              alt=""
              aria-hidden="true"
              className="logo-dark h-auto w-full object-contain"
            />
          </a>
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-widest text-primary">KDKMP Pungpungan</p>
              <p className="text-xs text-muted-foreground">Koperasi Desa Merah Putih</p>
            </div>
            <ThemeToggle />
          </div>
        </div>
        <Nav />
        <div className="mt-auto p-4 text-xs text-muted-foreground border-t border-border/50">
          <p className="mb-1 truncate">{user?.email}</p>
          <form action={logout} className="flex items-center gap-2 mt-2">
            <button className="text-sm text-muted-foreground underline hover:text-foreground">Keluar</button>
          </form>
        </div>
      </motion.aside>

      <main className="pt-16 lg:pt-0 pb-20 lg:pb-6 px-3 py-6 sm:px-4 lg:px-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="min-h-0"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
      <BottomNav />
    </div>
  );
}
