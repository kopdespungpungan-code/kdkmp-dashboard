"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type MouseEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
  BarChart3,
  Boxes,
  Briefcase,
  CalendarDays,
  FileText,
  MapPin,
  Menu,
  Package,
  ReceiptText,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  TrendingUp,
  Trophy,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { WeatherWidget } from "@/components/landing/WeatherWidget";
import { PlantingCalendar } from "@/components/landing/PlantingCalendar";
import { angka, rupiah } from "@/lib/format";
import type { LandingStats } from "@/lib/landing";

const features = [
  {
    icon: ShoppingCart,
    title: "Penjualan & Nota",
    desc: "Buat nota, pantau transaksi harian, dan akses riwayat penjualan dengan cepat.",
  },
  {
    icon: Boxes,
    title: "Stok & Penerimaan",
    desc: "Kelola stok toko dan gudang, penerimaan barang, mutasi, opname, serta stok menipis.",
  },
  {
    icon: FileText,
    title: "Laporan Harian",
    desc: "Laporan keuangan, absensi, kebersihan, dan rekap operasional dalam satu tempat.",
  },
  {
    icon: BarChart3,
    title: "Ringkasan & Analitik",
    desc: "Lihat omzet, produk terlaris, dan kondisi stok penting langsung dari dashboard.",
  },
  {
    icon: Users,
    title: "Data Petugas",
    desc: "Pantau kontribusi dan aktivitas petugas agar operasional lebih terukur.",
  },
  {
    icon: Sparkles,
    title: "Cepat & Modern",
    desc: "Tampilan bersih, ringan, dan nyaman dipakai di laptop maupun ponsel.",
  },
];

const socials = [
  {
    label: "Instagram Desa Pungpungan",
    href: "https://www.instagram.com/pungpunganberbenah0820/",
    icon: "fab fa-instagram",
  },
  {
    label: "Facebook Desa Pungpungan",
    href: "https://web.facebook.com/pungpungan.berbenah.12",
    icon: "fab fa-facebook-f",
  },
  {
    label: "WhatsApp Desa Pungpungan",
    href: "https://api.whatsapp.com/send?phone=085336331114",
    icon: "fab fa-whatsapp",
  },
];

const alamat =
  "Jl. Masjid II No. 425, Pungpungan, Kalitidu, Bojonegoro, Jawa Timur 62152";

const mapsUrl =
  "https://www.google.com/maps/search/?api=1&query=KDKMP+Pungpungan+Kalitidu+Bojonegoro+Jl.+Masjid+II+No.+425";

const navLinks = [
  { href: "#ringkasan", label: "Ringkasan" },
  { href: "#fitur", label: "Fitur" },
  { href: "#kalender-tanam", label: "Kalender Tanam" },
  { href: "#organisasi", label: "Organisasi" },
  { href: "#kontak", label: "Kontak" },
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.12 },
  },
};

const item = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

export default function LandingPage({ stats }: { stats: LandingStats | null }) {
  const topProduk = stats?.top_produk ?? [];
  const hasStats = stats !== null;
  const [menuOpen, setMenuOpen] = useState(false);
  const [showTop, setShowTop] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  const handleMenuNav = (event: MouseEvent<HTMLAnchorElement>, href: string) => {
    event.preventDefault();
    setMenuOpen(false);
    window.setTimeout(() => {
      const target = document.querySelector(href);
      if (!target) return;
      target.scrollIntoView({ block: "start" });
      window.history.replaceState(null, "", href);
    }, 0);
  };

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 600);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const onChange = () => {
      if (media.matches) setMenuOpen(false);
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  return (
    <main className="landing-shell font-landing relative min-h-screen overflow-x-clip">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div className="absolute -top-48 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(190,30,45,0.16)_0%,transparent_70%)] blur-3xl dark:bg-[radial-gradient(circle,rgba(248,113,113,0.18)_0%,transparent_70%)] sm:h-[680px] sm:w-[680px]" />
        <div className="absolute -bottom-64 -right-48 h-[560px] w-[560px] rounded-full bg-[radial-gradient(circle,rgba(47,125,79,0.12)_0%,transparent_72%)] blur-3xl dark:bg-[radial-gradient(circle,rgba(74,222,128,0.10)_0%,transparent_72%)] sm:h-[760px] sm:w-[760px]" />
        <div className="lp-grid-bg absolute inset-0 opacity-70" />
      </div>

      {/* Header */}
      <header className="lp-header sticky top-0 z-50 border-b lp-border">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-1.5 px-4 sm:h-[72px] sm:gap-3 sm:px-6 lg:px-8">
          <Link
            href="/"
            onClick={closeMenu}
            className="flex min-w-0 shrink-0 items-center"
            aria-label="Beranda KDKMP Pungpungan"
          >
            <span className="relative block w-[112px] overflow-hidden rounded-xl bg-white p-1.5 shadow-sm ring-1 ring-black/5 sm:w-[172px]">
              <Image
                src="/assets/logo-kolaborasi-apn.webp"
                alt="Kolaborasi APN x KOPDES Pungpungan"
                width={1716}
                height={590}
                loading="eager"
                fetchPriority="high"
                className="h-auto w-full object-contain"
              />
            </span>
          </Link>

          <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Navigasi utama">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-full px-2.5 py-2 text-[13px] font-medium lp-muted transition hover:bg-[color:var(--lp-chip)] hover:text-[color:var(--lp-fg)] xl:px-3 xl:text-sm"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <WeatherWidget />
            <ThemeToggle />
            <Button
              asChild
              className="hidden h-9 rounded-full bg-red-600 px-4 text-white hover:bg-red-700 sm:inline-flex"
            >
              <Link href="/login">
                Masuk
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
            <button
              type="button"
              onClick={() => setMenuOpen((value) => !value)}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              aria-label={menuOpen ? "Tutup menu" : "Buka menu"}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full lp-chip lp-text transition hover:opacity-80 lg:hidden"
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {menuOpen && (
            <motion.div
              id="mobile-menu"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="lp-menu absolute inset-x-0 top-full z-50 overflow-hidden rounded-b-3xl border-y lp-border shadow-2xl lg:hidden"
            >
              <nav
                className="mx-auto max-w-6xl px-4 py-4 sm:px-6"
                aria-label="Navigasi seluler"
              >
                <div className="space-y-1">
                  {navLinks.map((link) => (
                    <a
                      key={link.href}
                      href={link.href}
                      onClick={(event) => handleMenuNav(event, link.href)}
                      className="flex items-center justify-between rounded-xl px-3 py-3 text-sm font-medium lp-text transition hover:bg-[color:var(--lp-chip)]"
                    >
                      {link.label}
                      <ArrowUpRight className="h-4 w-4 lp-soft" />
                    </a>
                  ))}
                </div>
                <div className="mt-3 grid gap-2">
                  <Button
                    asChild
                    className="h-11 w-full rounded-full bg-red-600 text-white hover:bg-red-700"
                  >
                    <Link href="/login" onClick={closeMenu}>
                      Masuk ke Dashboard
                      <ArrowRight className="ml-1.5 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
                <p className="mt-3 text-center text-[11px] lp-soft">
                  Cuaca dan kalender tanam untuk warga Pungpungan.
                </p>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Hero */}
      <section className="relative z-10 mx-auto max-w-6xl px-4 pb-12 pt-8 sm:px-6 sm:pb-16 sm:pt-12 lg:px-8 lg:pb-20">
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid items-center gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12"
        >
          <div className="space-y-6 sm:space-y-8">
            <motion.div
              variants={item}
              className="inline-flex items-center gap-2 rounded-full lp-chip px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] lp-muted sm:text-xs"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_0_5px_rgba(16,185,129,0.12)]" />
              Dashboard KDKMP Pungpungan
            </motion.div>

            <motion.div variants={item} className="space-y-4 sm:space-y-5">
              <h1 className="text-[2rem] font-semibold leading-[1.06] tracking-tight lp-text sm:text-5xl lg:text-6xl">
                Satu Dashboard untuk
                <span className="lp-title-gradient mt-1 block sm:mt-2">
                  Penjualan, Stok & Laporan
                </span>
              </h1>
              <p className="max-w-xl text-sm leading-relaxed lp-muted sm:text-lg">
                Kelola operasional toko KDKMP Pungpungan dengan tampilan yang
                ringkas, modern, dan mudah dipahami oleh seluruh tim.
              </p>
            </motion.div>

            <motion.div
              variants={item}
              className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3"
            >
              <Button
                asChild
                size="lg"
                className="h-11 w-full rounded-full bg-red-600 px-6 text-white shadow-lg shadow-red-600/20 hover:bg-red-700 sm:w-auto sm:px-8"
              >
                <Link href="/login">
                  Masuk ke Dashboard
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
              <a
                href="#fitur"
                className="inline-flex h-11 w-full items-center justify-center rounded-full lp-glass px-6 text-sm font-semibold lp-text transition hover:opacity-80 sm:w-auto sm:px-8"
              >
                Lihat Fitur
              </a>
            </motion.div>

            <motion.div variants={item} className="grid grid-cols-3 gap-2 sm:gap-3">
              {[
                { label: "Terpusat", value: "Semua modul" },
                { label: "Realtime", value: "Ringkasan harian" },
                { label: "Praktis", value: "Siap dipakai tim" },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl lp-glass px-3 py-3 sm:px-5 sm:py-4"
                >
                  <p className="text-[10px] lp-soft sm:text-xs">{stat.label}</p>
                  <p className="mt-1 text-xs font-semibold lp-text sm:text-sm">
                    {stat.value}
                  </p>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Dashboard preview */}
          <motion.div variants={item} className="relative">
            <div className="absolute -inset-x-8 -top-10 h-56 rounded-full bg-[radial-gradient(circle,rgba(190,30,45,0.18)_0%,transparent_70%)] blur-3xl dark:bg-[radial-gradient(circle,rgba(248,113,113,0.2)_0%,transparent_70%)]" />
            <div className="relative overflow-hidden rounded-3xl lp-glass-strong p-3 shadow-2xl sm:p-5">
              <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-red-400/60 to-transparent" />
              <div className="flex items-center justify-between gap-2 px-1 py-1 sm:px-2">
                <div className="flex items-center gap-2.5">
                  <div className="relative h-9 w-9 overflow-hidden rounded-full ring-1 ring-black/10 dark:ring-white/20">
                    <Image
                      src="/assets/logo-kopdes.jpg"
                      alt="Logo KDKMP Pungpungan"
                      fill
                      sizes="36px"
                      className="object-cover"
                    />
                  </div>
                  <div>
                    <p className="text-xs font-semibold lp-text sm:text-sm">
                      Dashboard Penjualan
                    </p>
                    <p className="text-[10px] lp-soft sm:text-xs">
                      KDKMP Pungpungan
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 rounded-full lp-chip px-2.5 py-1 text-[10px] lp-muted">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Siap
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                {[
                  { label: "Omzet Hari Ini", value: "Ringkasan", sub: "Grafik & KPI" },
                  {
                    label: "Stok & Perhatian",
                    value: "Kontrol Stok",
                    sub: "Menipis / Hampir Expired",
                  },
                  {
                    label: "Penjualan",
                    value: "Nota & Struk",
                    sub: "Cepat & praktis",
                  },
                  {
                    label: "Laporan",
                    value: "Harian Terpusat",
                    sub: "Lengkap untuk rekap",
                  },
                ].map((card) => (
                  <div key={card.label} className="rounded-2xl lp-chip p-3">
                    <p className="text-[10px] lp-soft">{card.label}</p>
                    <p className="mt-1.5 text-sm font-semibold lp-text">
                      {card.value}
                    </p>
                    <p className="mt-0.5 text-[10px] lp-soft">{card.sub}</p>
                  </div>
                ))}
              </div>

              <div className="mt-3 flex items-center justify-between rounded-2xl lp-deep px-3 py-2.5">
                <p className="text-[11px] lp-muted sm:text-xs">
                  Login untuk mengakses semua fitur
                </p>
                <ArrowRight className="h-4 w-4 lp-soft" />
              </div>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* Ringkasan operasional */}
      <section
        id="ringkasan"
        className="relative z-10 mx-auto max-w-6xl scroll-mt-24 px-4 pb-14 sm:px-6 sm:pb-16 lg:px-8"
      >
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between"
        >
          <div className="space-y-2 sm:space-y-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] lp-soft sm:text-xs">
              Ringkasan Operasional
            </p>
            <h2 className="text-2xl font-semibold lp-text sm:text-4xl">
              Tumbuh bersama warga sejak Mei 2025
            </h2>
            <p className="max-w-2xl text-sm lp-muted sm:text-base">
              Angka ringkas dari perjalanan operasional KDKMP Pungpungan, diambil
              langsung dari data penjualan dashboard.
            </p>
          </div>
          <div className="inline-flex w-fit items-center gap-2 rounded-full lp-chip px-3.5 py-2 text-[11px] font-medium lp-muted">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                stats
                  ? "bg-emerald-500 shadow-[0_0_0_5px_rgba(16,185,129,0.12)]"
                  : "bg-amber-400"
              }`}
            />
            {stats ? "Statistik live" : "Statistik disiapkan"}
          </div>
        </motion.div>

        <div className="grid gap-3 sm:gap-4 lg:grid-cols-[1.08fr_0.92fr]">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.55 }}
            className="relative overflow-hidden rounded-3xl lp-glass p-5 sm:p-8"
          >
            <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-red-500/15 blur-3xl" />
            <div className="relative">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.22em] lp-soft sm:text-xs">
                <TrendingUp className="h-4 w-4 text-red-500" />
                Total Omzet Operasional
              </div>
              <p className="mt-3 text-3xl font-semibold tracking-tight lp-text sm:mt-4 sm:text-5xl">
                {stats ? rupiah(stats.total_omzet) : "—"}
              </p>
              <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs lp-muted sm:mt-3 sm:text-sm">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5" />
                  Sejak 1 Mei 2025
                </span>
                <span className="lp-soft">•</span>
                <span>{stats ? `${angka(stats.total_nota)} nota` : "menunggu data"}</span>
              </div>

              <div className="mt-5 grid gap-2.5 sm:mt-6 sm:grid-cols-2 sm:gap-3">
                <div className="rounded-2xl lp-deep p-3.5 sm:p-4">
                  <div className="flex items-center gap-2 text-[11px] lp-soft">
                    <ReceiptText className="h-4 w-4" />
                    Total Nota
                  </div>
                  <p className="mt-1.5 text-lg font-semibold lp-text sm:text-xl">
                    {stats ? angka(stats.total_nota) : "—"}
                  </p>
                </div>
                <div className="rounded-2xl lp-deep p-3.5 sm:p-4">
                  <div className="flex items-center gap-2 text-[11px] lp-soft">
                    <Package className="h-4 w-4" />
                    Barang Terjual
                  </div>
                  <p className="mt-1.5 text-lg font-semibold lp-text sm:text-xl">
                    {stats ? `${angka(stats.total_pcs)} pcs` : "—"}
                  </p>
                </div>
              </div>

              {!hasStats && (
                <p className="mt-3 text-[11px] leading-relaxed lp-soft">
                  Statistik akan muncul otomatis setelah data operasional tersedia.
                </p>
              )}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.55, delay: 0.08 }}
            className="relative overflow-hidden rounded-3xl lp-glass p-5 sm:p-7"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.22em] lp-soft sm:text-xs">
                <Trophy className="h-4 w-4 text-amber-500" />
                Produk Paling Laris
              </div>
              <span className="rounded-full lp-chip px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.18em] lp-soft">
                Top 5
              </span>
            </div>

            <div className="mt-4 space-y-2">
              {topProduk.length > 0 ? (
                topProduk.slice(0, 5).map((produk, index) => (
                  <div
                    key={`${produk.item}-${index}`}
                    className="flex items-center gap-2.5 rounded-2xl lp-chip px-2.5 py-2.5 sm:gap-3 sm:px-3 sm:py-3"
                  >
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-[11px] font-semibold ${
                        index === 0
                          ? "bg-amber-400/15 text-amber-600 dark:text-amber-300"
                          : "lp-deep lp-soft"
                      }`}
                    >
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold lp-text sm:text-sm">
                        {produk.item}
                      </p>
                      <p className="text-[10px] lp-soft sm:text-xs">
                        {angka(produk.pcs)} pcs terjual
                      </p>
                    </div>
                    <p className="shrink-0 text-[11px] font-medium lp-muted sm:text-sm">
                      {rupiah(produk.omzet)}
                    </p>
                  </div>
                ))
              ) : (
                <div className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed lp-border lp-deep px-5 text-center sm:min-h-[260px]">
                  <Trophy className="h-7 w-7 lp-soft" />
                  <p className="mt-3 text-sm lp-muted">Belum ada data penjualan.</p>
                  <p className="mt-1 text-[11px] lp-soft">
                    Produk terlaris akan tampil otomatis dari dashboard.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section
        id="fitur"
        className="relative z-10 mx-auto max-w-6xl scroll-mt-24 px-4 pb-14 sm:px-6 sm:pb-16 lg:px-8"
      >
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="mb-6 space-y-2 sm:mb-10 sm:space-y-3"
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] lp-soft sm:text-xs">
            Fitur
          </p>
          <h2 className="text-2xl font-semibold lp-text sm:text-4xl">
            Fitur yang Membantu Operasional
          </h2>
          <p className="max-w-2xl text-sm lp-muted sm:text-base">
            Dirancang khusus untuk kebutuhan KDKMP Pungpungan.
          </p>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3"
        >
          {features.map(({ icon: Icon, title, desc }) => (
            <motion.div
              variants={item}
              key={title}
              className="group relative overflow-hidden rounded-3xl lp-glass p-4 transition hover:border-red-400/40 sm:p-6"
            >
              <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-red-500/10 blur-3xl transition group-hover:bg-red-500/20" />
              <div className="relative flex items-start gap-3 sm:gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl lp-chip lp-text sm:h-11 sm:w-11">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="space-y-1.5 sm:space-y-2">
                  <h3 className="text-base font-semibold lp-text sm:text-lg">
                    {title}
                  </h3>
                  <p className="text-xs leading-relaxed lp-muted sm:text-sm">
                    {desc}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Kalender tanam */}
      <section
        id="kalender-tanam"
        className="relative z-10 mx-auto max-w-6xl scroll-mt-24 px-4 pb-14 sm:px-6 sm:pb-16 lg:px-8"
      >
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="mb-6 space-y-2 sm:mb-8 sm:space-y-3"
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] lp-soft sm:text-xs">
            Kalender Tanam
          </p>
          <h2 className="text-2xl font-semibold lp-text sm:text-4xl">
            Panduan Tanam untuk Warga Pungpungan
          </h2>
          <p className="max-w-2xl text-sm lp-muted sm:text-base">
            Lihat perkiraan musim dan pilihan tanaman per bulan. Gunakan bersama
            informasi cuaca di atas.
          </p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.55 }}
          className="mx-auto max-w-4xl"
        >
          <PlantingCalendar />
        </motion.div>
      </section>

      {/* Struktur organisasi */}
      <section
        id="organisasi"
        className="relative z-10 mx-auto max-w-6xl scroll-mt-24 px-4 pb-14 sm:px-6 sm:pb-16 lg:px-8"
      >
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="mb-6 space-y-2 text-center sm:mb-10 sm:space-y-3"
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] lp-soft sm:text-xs">
            Organisasi
          </p>
          <h2 className="text-2xl font-semibold lp-text sm:text-4xl">
            Struktur Organisasi
          </h2>
          <p className="mx-auto max-w-2xl text-sm lp-muted sm:text-base">
            Susunan ringkas pengelola KDKMP Pungpungan dari pengurus hingga staff
            operasional.
          </p>
        </motion.div>

        <div className="relative mx-auto max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5 }}
            className="relative overflow-hidden rounded-3xl lp-glass-strong p-5 text-center sm:p-6"
          >
            <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-red-400/50 to-transparent" />
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10 text-red-500">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <p className="mt-3 text-[9px] font-semibold uppercase tracking-[0.26em] lp-soft sm:mt-4 sm:text-[10px]">
              Tingkat Pengurus
            </p>
            <h3 className="mt-1 text-lg font-semibold lp-text sm:text-xl">
              Pengurus / Pengawas
            </h3>
            <p className="mx-auto mt-1.5 max-w-md text-xs leading-relaxed lp-muted sm:mt-2 sm:text-sm">
              Pembina, pengawas, dan penentu arah kebijakan koperasi.
            </p>
          </motion.div>

          <div className="mx-auto h-6 w-px bg-[color:var(--lp-border-strong)] sm:h-8" />

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, delay: 0.08 }}
            className="relative mx-auto max-w-xl overflow-hidden rounded-3xl lp-glass p-4 text-center sm:p-5"
          >
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-2xl lp-chip lp-text">
              <Briefcase className="h-5 w-5" />
            </div>
            <p className="mt-3 text-[9px] font-semibold uppercase tracking-[0.26em] lp-soft sm:text-[10px]">
              Pengelola
            </p>
            <h3 className="mt-1 text-lg font-semibold lp-text">Manajer</h3>
            <p className="mt-1 text-xs lp-muted sm:text-sm">
              Mengelola operasional harian dan koordinasi unit.
            </p>
          </motion.div>

          <div className="mx-auto h-6 w-px bg-[color:var(--lp-border-strong)] sm:h-8" />

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, delay: 0.16 }}
            className="relative mx-auto max-w-2xl overflow-hidden rounded-3xl lp-glass p-4 text-center sm:p-5"
          >
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-2xl lp-chip lp-text">
              <Users className="h-5 w-5" />
            </div>
            <p className="mt-3 text-[9px] font-semibold uppercase tracking-[0.26em] lp-soft sm:text-[10px]">
              Pelaksana
            </p>
            <h3 className="mt-1 text-lg font-semibold lp-text">Staff</h3>
            <p className="mt-1 text-xs lp-muted sm:text-sm">
              Kasir, stok, administrasi, dan pelaporan operasional.
            </p>
            <div className="mt-3 flex flex-wrap justify-center gap-1.5 sm:mt-4 sm:gap-2">
              {["Kasir", "Stok", "Administrasi", "Laporan"].map((unit) => (
                <span
                  key={unit}
                  className="rounded-full lp-chip px-2.5 py-1 text-[10px] lp-muted sm:px-3 sm:text-xs"
                >
                  {unit}
                </span>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 mx-auto max-w-6xl px-4 pb-14 sm:px-6 sm:pb-16 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="relative overflow-hidden rounded-[28px] lp-glass p-6 text-center sm:rounded-[32px] sm:p-10"
        >
          <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-red-400/60 to-transparent" />
          <div className="absolute -top-24 left-1/2 h-56 w-[440px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(190,30,45,0.22)_0%,transparent_70%)] blur-3xl dark:bg-[radial-gradient(circle,rgba(248,113,113,0.28)_0%,transparent_70%)]" />
          <div className="relative mx-auto max-w-2xl space-y-3 sm:space-y-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] lp-soft sm:text-xs">
              Mulai Sekarang
            </p>
            <h2 className="text-2xl font-semibold lp-text sm:text-4xl">
              Masuk untuk mengakses Dashboard
            </h2>
            <p className="text-sm lp-muted sm:text-base">
              Gunakan akun yang terdaftar untuk masuk dan mulai mengelola
              operasional hari ini.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-1 sm:pt-2">
              <Button
                asChild
                size="lg"
                className="h-11 rounded-full bg-red-600 px-7 text-white hover:bg-red-700"
              >
                <Link href="/login">
                  Masuk ke Dashboard
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer
        id="kontak"
        className="relative z-10 scroll-mt-24 border-t lp-border lp-deep"
      >
        <div className="mx-auto max-w-6xl px-4 py-9 sm:px-6 sm:py-10 lg:px-8">
          <div className="grid gap-7 sm:gap-8 md:grid-cols-[1.2fr_0.9fr_1fr]">
            <div>
              <div className="flex items-center gap-3">
                <span className="relative block w-[150px] overflow-hidden rounded-xl bg-white p-1.5 shadow-sm ring-1 ring-black/5 sm:w-[180px]">
                  <Image
                    src="/assets/logo-kolaborasi-apn.webp"
                    alt="Kolaborasi APN x KOPDES Pungpungan"
                    width={1716}
                    height={590}
                    className="h-auto w-full object-contain"
                  />
                </span>
              </div>
              <p className="mt-4 max-w-sm text-xs leading-relaxed lp-muted sm:text-sm">
                Dashboard operasional toko KDKMP Pungpungan untuk penjualan, stok,
                laporan, dan kebutuhan tim.
              </p>
              <p className="mt-2 text-[11px] lp-soft">
                APN × KOPDES Pungpungan · Kalitidu, Bojonegoro
              </p>
            </div>

            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] lp-soft sm:text-xs">
                Alamat
              </p>
              <div className="mt-3 flex gap-2 text-xs leading-relaxed lp-muted sm:text-sm">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                <p>{alamat}</p>
              </div>
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 transition hover:text-red-500 dark:text-red-400 dark:hover:text-red-300 sm:text-sm"
              >
                Buka Google Maps
                <ArrowUpRight className="h-4 w-4" />
              </a>
            </div>

            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] lp-soft sm:text-xs">
                Media Sosial
              </p>
              <div className="mt-3 flex gap-2">
                {socials.map(({ label, href, icon }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    title={label}
                    className="flex h-9 w-9 items-center justify-center rounded-full lp-chip lp-muted transition hover:border-red-400/40 hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-300 sm:h-10 sm:w-10"
                  >
                    <i className={`${icon} text-sm sm:text-base`} aria-hidden="true" />
                  </a>
                ))}
              </div>
              <p className="mt-3 text-[11px] leading-relaxed lp-soft">
                Akun resmi Desa Pungpungan. Untuk informasi KDKMP, silakan hubungi
                pengurus.
              </p>
            </div>
          </div>

          <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t lp-border pt-5 text-center text-[11px] lp-soft sm:mt-10 sm:flex-row sm:pt-6 sm:text-left">
            <p>© {new Date().getFullYear()} KDKMP Pungpungan. All rights reserved.</p>
            <p>
              Create by <span className="font-semibold lp-muted">d&apos;one</span>{" "}
              (Dedik Kurniawan) · Sekretaris Kopdes
            </p>
          </div>
        </div>
      </footer>

      <AnimatePresence>
        {showTop && (
          <motion.button
            type="button"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            aria-label="Kembali ke atas"
            title="Kembali ke atas"
            className="fixed bottom-4 right-4 z-40 inline-flex h-11 w-11 items-center justify-center rounded-full lp-btn shadow-xl sm:bottom-6 sm:right-6"
          >
            <ArrowUp className="h-5 w-5" />
          </motion.button>
        )}
      </AnimatePresence>
    </main>
  );
}
