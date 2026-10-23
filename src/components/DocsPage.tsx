"use client";

import { useEffect, useState } from "react";
import DocsAiHelper from "@/components/DocsAiHelper";
import Mockup from "@/components/Mockup";
import Link from "next/link";
import { cn } from "@/components/ui/utils";
import {
  BookOpen,
  ChevronRight,
  Copy,
  Check,
  Lightbulb,
  AlertTriangle,
  ShieldCheck,
  ShoppingCart,
  Boxes,
  Package,
  FileText,
  BarChart3,
  Users,
  Settings,
  Palette,
  ReceiptText,
  Truck,
  ClipboardList,
  Camera,
  Sparkles,
  Keyboard,
  Database,
  Cloud,
  Lock,
  Zap,
  ArrowRight,
  Info,
} from "lucide-react";

type Section = { id: string; label: string; icon: typeof BookOpen; children?: { id: string; label: string }[] };

const sections: Section[] = [
  {
    id: "pendahuluan",
    label: "Pendahuluan",
    icon: BookOpen,
    children: [
      { id: "tentang", label: "Tentang aplikasi" },
      { id: "persiapan", label: "Persiapan & instalasi" },
      { id: "akun", label: "Akun & login" },
      { id: "navigasi", label: "Navigasi & tata letak" },
    ],
  },
  {
    id: "dashboard",
    label: "Dashboard",
    icon: BarChart3,
    children: [
      { id: "ringkasan-dashboard", label: "Ringkasan KPI" },
      { id: "grafik-omzet", label: "Grafik omzet 14 hari" },
      { id: "perhatian", label: "Daftar perlu perhatian" },
      { id: "nota-terakhir", label: "Nota terakhir" },
    ],
  },
  {
    id: "penjualan",
    label: "Penjualan & Nota",
    icon: ShoppingCart,
    children: [
      { id: "daftar-nota", label: "Daftar & detail nota" },
      { id: "buat-nota", label: "Buat nota baru" },
      { id: "subsidi-kk", label: "Barang subsidi & No. KK" },
      { id: "ocr-nota", label: "OCR nota (scan struk)" },
      { id: "batalkan-nota", label: "Batalkan nota" },
    ],
  },
  {
    id: "produk",
    label: "Produk",
    icon: Package,
    children: [
      { id: "daftar-produk", label: "Daftar & filter" },
      { id: "tambah-produk", label: "Tambah produk" },
      { id: "edit-produk", label: "Edit produk & foto" },
      { id: "subsidi-produk", label: "Tandai barang subsidi" },
      { id: "so-gondola", label: "Input SO (stock opname)" },
    ],
  },
  {
    id: "stok",
    label: "Stok",
    icon: Boxes,
    children: [
      { id: "terima-barang", label: "Terima barang" },
      { id: "mutasi", label: "Mutasi gudang/toko" },
      { id: "opname", label: "Koreksi opname" },
      { id: "dokumen-stok", label: "Dokumentasi & STB" },
      { id: "stok-menipis", label: "Stok menipis & expired" },
    ],
  },
  {
    id: "retur",
    label: "Retur",
    icon: Truck,
    children: [
      { id: "catat-retur", label: "Catat retur" },
      { id: "jenis-retur", label: "Jenis retur" },
    ],
  },
  {
    id: "laporan",
    label: "Laporan Harian",
    icon: FileText,
    children: [
      { id: "laporan-keuangan", label: "Laporan keuangan" },
      { id: "laporan-absensi", label: "Absensi" },
      { id: "laporan-kebersihan", label: "Kebersihan" },
      { id: "laporan-so", label: "SO harian & gondola" },
      { id: "laporan-summary", label: "Ringkasan" },
    ],
  },
  {
    id: "karyawan",
    label: "Laporan Karyawan",
    icon: Users,
    children: [
      { id: "generate-laporan", label: "Generate laporan" },
      { id: "riwayat-laporan", label: "Riwayat & upload" },
    ],
  },
  {
    id: "pengaturan",
    label: "Pengaturan",
    icon: Settings,
    children: [
      { id: "ocr-settings", label: "Pengaturan OCR" },
      { id: "tema", label: "Tema terang/gelap" },
      { id: "profil", label: "Profil & akun" },
    ],
  },
  {
    id: "subsidi-aturan",
    label: "Aturan Subsidi",
    icon: ShieldCheck,
    children: [
      { id: "aturan-kk", label: "Aturan No. KK" },
      { id: "cek-subsidi", label: "Cek & perbaikan" },
      { id: "kk-mingguan", label: "Pengecekan mingguan" },
    ],
  },
  {
    id: "keyboard",
    label: "Shortcut & Tip",
    icon: Keyboard,
    children: [
      { id: "shortcut", label: "Shortcut keyboard" },
      { id: "tips", label: "Tips penggunaan" },
    ],
  },
  {
    id: "faq",
    label: "FAQ & Troubleshoot",
    icon: Lightbulb,
    children: [
      { id: "faq-umum", label: "Pertanyaan umum" },
      { id: "troubleshoot", label: "Pemecahan masalah" },
      { id: "error-codes", label: "Kode error" },
    ],
  },
  {
    id: "database",
    label: "Database & Migrasi",
    icon: Database,
    children: [
      { id: "schema", label: "Skema tabel" },
      { id: "migrasi", label: "Urutan migrasi" },
      { id: "rls", label: "Row Level Security" },
    ],
  },
];

function CodeBlock({ children }: { children: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative mt-3 overflow-hidden rounded-lg border border-border bg-muted/40">
      <button
        type="button"
        onClick={() => {
          navigator.clipboard?.writeText(children).catch(() => {});
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition hover:text-foreground"
        aria-label="Salin kode"
      >
        {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
      </button>
      <pre className="overflow-x-auto p-4 text-xs leading-relaxed">
        <code>{children}</code>
      </pre>
    </div>
  );
}


function Callout({
  tone = "info",
  title,
  children,
}: {
  tone?: "info" | "warning" | "success" | "tip";
  title?: string;
  children: React.ReactNode;
}) {
  const styles = {
    info: "border-primary/30 bg-primary/5",
    warning: "border-amber-500/40 bg-amber-500/10",
    success: "border-emerald-500/40 bg-emerald-500/10",
    tip: "border-sky-500/40 bg-sky-500/10",
  };
  const icon = {
    info: <Lightbulb className="mt-0.5 h-4 w-4 text-primary" />,
    warning: <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-500" />,
    success: <ShieldCheck className="mt-0.5 h-4 w-4 text-emerald-500" />,
    tip: <Zap className="mt-0.5 h-4 w-4 text-sky-500" />,
  }[tone];
  return (
    <div className={`mt-4 flex gap-3 rounded-lg border p-4 ${styles[tone]}`}>
      {icon}
      <div className="min-w-0 flex-1 text-sm leading-relaxed">
        {title && <p className="mb-1 font-semibold">{title}</p>}
        <div className="text-muted-foreground">{children}</div>
      </div>
    </div>
  );
}

function H2({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="mt-12 scroll-mt-24 text-2xl font-semibold tracking-tight first:mt-0 border-b border-border pb-2">
      {children}
    </h2>
  );
}

function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="mt-6 text-lg font-semibold tracking-tight">{children}</h3>;
}

function H4({ children }: { children: React.ReactNode }) {
  return <h4 className="mt-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{children}</h4>;
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="mt-3 leading-relaxed text-muted-foreground">{children}</p>;
}

function Ul({ children }: { children: React.ReactNode }) {
  return <ul className="mt-3 list-disc space-y-2 pl-5 text-muted-foreground">{children}</ul>;
}

function Ol({ children }: { children: React.ReactNode }) {
  return <ol className="mt-3 list-decimal space-y-2 pl-5 text-muted-foreground">{children}</ol>;
}

function Li({ children }: { children: React.ReactNode }) {
  return <li className="leading-relaxed">{children}</li>;
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="mt-4 flex gap-4">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground shadow-sm">
        {n}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{title}</p>
        <div className="mt-1 text-sm leading-relaxed text-muted-foreground">{children}</div>
      </div>
    </div>
  );
}

function Table({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="mt-4 overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            {headers.map((h) => (
              <th key={h} className="px-4 py-2 text-left font-semibold">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((r, i) => (
            <tr key={i} className="hover:bg-muted/30">
              {r.map((c, j) => (
                <td key={j} className="px-4 py-2 text-muted-foreground">{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function DocsPage() {
  const [active, setActive] = useState<string>("pendahuluan");
  const [mobileNav, setMobileNav] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const ids = sections.flatMap((s) => [s.id, ...(s.children?.map((c) => c.id) ?? [])]);
      let current = ids[0];
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= 120) current = id;
      }
      setActive(current);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const goto = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      window.history.replaceState(null, "", `#${id}`);
    }
    setMobileNav(false);
  };

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      {/* Sidebar */}
      <aside className="lg:sticky lg:top-20 lg:h-[calc(100vh-5rem)] lg:w-64 lg:shrink-0">
        <div className="mb-3 flex items-center justify-between lg:mb-4">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-bold">Dokumentasi</h1>
          </div>
          <button
            type="button"
            onClick={() => setMobileNav((v) => !v)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border lg:hidden"
            aria-label="Buka navigasi dokumentasi"
          >
            <ChevronRight className={`h-4 w-4 transition ${mobileNav ? "rotate-90" : ""}`} />
          </button>
        </div>
        <nav className={`${mobileNav ? "block" : "hidden"} space-y-1 overflow-y-auto lg:block lg:max-h-[calc(100vh-7rem)]`}>
          {sections.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.id} className="space-y-0.5">
                <button
                  type="button"
                  onClick={() => goto(s.id)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm font-semibold transition",
                    active === s.id || s.children?.some((c) => c.id === active)
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {s.label}
                </button>
                {s.children?.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => goto(c.id)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md pl-8 pr-2 py-1 text-xs transition",
                      active === c.id
                        ? "bg-primary/10 font-semibold text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            );
          })}
        </nav>
      </aside>

      {/* Content */}
      <main className="min-w-0 flex-1 space-y-2">
        {/* Pendahuluan */}
        <section id="pendahuluan" className="space-y-2">
          <H2 id="tentang">Tentang aplikasi</H2>
          <P>
            Dashboard Toko KDKMP Pungpungan adalah aplikasi web untuk mengelola operasional toko koperasi:
            penjualan &amp; nota, stok (toko &amp; gudang), produk, retur, laporan harian, laporan karyawan, pengaturan OCR,
            tema terang/gelap, dan statistik publik di landing page.
          </P>
          <Callout tone="info" title="Siapa yang bisa memakai?">
            Hanya pengguna yang sudah terdaftar di Supabase Auth. Pendaftaran publik tidak tersedia; akun dibuat oleh
            administrator melalui Supabase Dashboard → Authentication → Users → Add user.
          </Callout>
          <Mockup caption="Tampilan dashboard utama setelah login" variant="dashboard" />

          <H3>Persiapan &amp; instalasi</H3>
          <P>Jalankan SQL migrasi di Supabase SQL Editor sesuai urutan di README, lalu:</P>
          <CodeBlock>{`npm install
npm run dev
# buka http://localhost:3000`}</CodeBlock>
          <P>
            Variabel lingkungan (`.env.local`): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
            `OCR_BASE_URL`, `OCR_API_KEY`, `OCR_MODEL` (opsional).
          </P>
          <Table
            headers={["Variabel", "Wajib", "Keterangan"]}
            rows={[
              ["NEXT_PUBLIC_SUPABASE_URL", "Ya", "URL project Supabase"],
              ["NEXT_PUBLIC_SUPABASE_ANON_KEY", "Ya", "Anon/public key Supabase"],
              ["OCR_BASE_URL", "Tidak", "Default OpenRouter"],
              ["OCR_API_KEY", "Tidak", "Bisa diisi dari halaman Pengaturan"],
              ["OCR_MODEL", "Tidak", "Default qwen/qwen3-vl-30b-a3b-instruct"],
            ]}
          />

          <H3>Akun &amp; login</H3>
          <Ul>
            <Li>Buka `/login`, masukkan email &amp; kata sandi yang terdaftar.</Li>
            <Li>Setelah login, diarahkan ke `/dashboard`.</Li>
            <Li>Logout lewat menu pengguna di sidebar bawah.</Li>
            <Li>Rute operasional (`/penjualan`, `/stok`, dll.) otomatis redirect ke `/login` bila belum login.</Li>
            <Li>Landing page `/` tetap publik; tombol <strong>Masuk ke Dashboard</strong> mengarah ke login.</Li>
          </Ul>

          <H3>Navigasi &amp; tata letak</H3>
          <P>
            Desktop: sidebar kiri (menu utama + toggle tema + info pengguna). Mobile: header atas + bottom nav.
            Setiap halaman memiliki judul, filter, dan tabel/kartu.
          </P>
          <Mockup caption="Sidebar desktop dengan menu utama dan toggle tema" variant="mobile" aspect="4/3" />
        </section>

        {/* Dashboard */}
        <section id="dashboard" className="space-y-2">
          <H2 id="ringkasan-dashboard">Ringkasan KPI</H2>
          <P>Halaman `/dashboard` menampilkan KPI operasional harian:</P>
          <Ul>
            <Li>Omzet hari ini &amp; grafik 14 hari.</Li>
            <Li>Produk terlaris 30 hari.</Li>
            <Li>Daftar perlu perhatian (habis, menipis, hampir expired).</Li>
            <Li>Nota terakhir.</Li>
          </Ul>
          <Mockup caption="Dashboard: KPI, grafik omzet, dan daftar perlu perhatian" variant="dashboard" />

          <H3>Grafik omzet 14 hari</H3>
          <P>Grafik menampilkan omzet, pcs terjual, dan jumlah nota per hari selama 14 hari terakhir.</P>

          <H3>Daftar perlu perhatian</H3>
          <P>Produk dengan stok ≤ stok minimum atau expired dalam 60 hari. Klik untuk langsung ke halaman produk.</P>

          <H3>Nota terakhir</H3>
          <P>5 nota terakhir dengan nomor, kasir, total, dan status.</P>
        </section>

        {/* Penjualan */}
        <section id="penjualan" className="space-y-2">
          <H2 id="daftar-nota">Daftar &amp; detail nota</H2>
          <P>
            Menu <strong>Penjualan</strong> menampilkan daftar nota dengan filter (tanggal, kasir, status). Klik nota
            untuk detail, cetak struk, dan batalkan (bila perlu).
          </P>
          <Mockup caption="Halaman daftar nota dengan filter" variant="nota" />

          <H2 id="buat-nota">Buat nota baru</H2>
          <P>Buka <code>/penjualan/baru</code>. Langkah:</P>
          <Step n={1} title="Tambah barang">
            Ketik nama barang di pencarian, pilih dari daftar. Qty dan harga otomatis; harga bisa diubah.
          </Step>
          <Step n={2} title="Scan struk (opsional)">
            Gunakan OCR untuk mengisi barang dari foto struk. Lihat bagian OCR nota.
          </Step>
          <Step n={3} title="Isi No. KK (bila ada barang subsidi)">
            Jika ada barang subsidi, wajib isi No. KK 16 digit (bulk atau per barang).
          </Step>
          <Step n={4} title="Simpan">
            Klik <strong>Simpan nota</strong>. Stok toko berkurang otomatis.
          </Step>
          <Callout tone="warning" title="Stok">
            Qty melebihi stok ditandai kuning tapi tetap bisa disimpan (koreksi manual nanti).
          </Callout>

          <H2 id="subsidi-kk">Barang subsidi &amp; No. KK</H2>
          <P>
            Satu KK hanya boleh 1 transaksi subsidi per minggu (Senin–Minggu, WIB). Sistem menolak KK yang sudah
            dipakai minggu ini (termasuk race condition antar kasir).
          </P>
          <Table
            headers={["Mode", "Keterangan", "Kapan dipakai"]}
            rows={[
              ["Bulk", "Satu No. KK untuk semua barang subsidi di nota", "Pembeli 1 KK, banyak barang"],
              ["Per barang", "No. KK berbeda untuk tiap barang subsidi", "Pembeli beda KK per barang"],
            ]}
          />
          <Ul>
            <Li>Format KK: 16 digit angka (contoh: 3507123456780001).</Li>
            <Li>Barang subsidi: Pupuk NPK, Pupuk Urea, LPG, SPHP, Minyak Kita (auto-tanda berdasarkan nama).</Li>
          </Ul>
          <CodeBlock>{`// Aturan (src/lib/subsidi.ts)
1 KK = 1 transaksi subsidi / minggu (Senin-Minggu WIB)
KK wajib 16 digit angka untuk barang subsidi`}</CodeBlock>

          <H2 id="ocr-nota">OCR nota (scan struk)</H2>
          <P>
            Di halaman buat nota, gunakan tombol OCR untuk memindai foto struk. Hasilnya ditambahkan ke form.
            Pengaturan API key/base URL/model/reasoning ada di menu <strong>Pengaturan</strong>.
          </P>
          <Ul>
            <Li>Default provider: OpenRouter (`qwen/qwen3-vl-30b-a3b-instruct`).</Li>
            <Li>Tombol <strong>Tambahkan semua</strong> untuk menambah semua nota sekaligus.</Li>
            <Li>Barang yang belum cocok ditampilkan untuk dipilih manual.</Li>
            <Li>
              Nota yang barang, tanggal, jam, dan totalnya sama dengan nota tersimpan diberi tanda{" "}
              <strong>Sudah diinput</strong> dan dilewati saat memakai tombol Tambahkan semua.
            </Li>
            <Li>Overlay loading &amp; toast error tersedia.</Li>
          </Ul>
          <Mockup caption="Halaman buat nota dengan hasil OCR dan tombol Tambahkan semua" variant="nota" />

          <H2 id="batalkan-nota">Batalkan nota</H2>
          <P>
            Dari detail nota, klik <strong>Batalkan</strong>. Stok toko dikembalikan. Nota yang sudah dibatalkan
            ditandai status "DIBATALKAN".
          </P>
        </section>

        {/* Produk */}
        <section id="produk" className="space-y-2">
          <H2 id="daftar-produk">Daftar &amp; filter</H2>
          <P>
            Menu <strong>Produk</strong>: cari &amp; filter (perlu perhatian, belum ada foto, belum ada SKU, belum ada
            harga jual). Kolom: SKU, nama, stok toko/gudang, harga jual, status.
          </P>
          <Mockup caption="Daftar produk dengan filter dan pencarian" variant="produk" />

          <H2 id="tambah-produk">Tambah produk</H2>
          <P>
            Dari menu <strong>Stok → Terima barang</strong>, centang "Tambah barang baru" untuk menambah produk baru
            langsung dengan tanggal/jam penerimaan dan expired.
          </P>

          <H2 id="edit-produk">Edit produk &amp; foto</H2>
          <P>
            Klik produk untuk edit SKU, harga beli/jual, batas stok minimum, expired terdekat, dan unggah foto.
            Foto disimpan di bucket Storage `produk` (publik, maks. 5MB, dikompres otomatis).
          </P>
          <Callout tone="tip" title="Foto">
            Format JPG/PNG/WebP. Foto ditampilkan di form nota dan halaman produk.
          </Callout>

          <H2 id="subsidi-produk">Tandai barang subsidi</H2>
          <P>
            Di halaman edit produk, centang <strong>Barang subsidi</strong>. Auto-tanda berlaku untuk produk dengan
            kata kunci: npk, urea, lpg, elpiji, gas 3, sphp, minyak kita, minyakita, pupuk.
          </P>
          <Callout tone="warning" title="Manual">
            Periksa ulang centang subsidi setelah menjalankan subsidi.sql, karena pola auto-tanda bisa menandai
            produk yang seharusnya non-subsidi.
          </Callout>

          <H2 id="so-gondola">Input SO (stock opname)</H2>
          <P>
            Menu <strong>Produk → Input SO</strong>. Pilih petugas (gondola/lokasi otomatis), gondola, tingkat (1-6),
            tanggal hitung, tambah baris barang + qty fisik. Selisih dihitung otomatis dari stok sistem toko.
          </P>
          <Mockup caption="Form input SO per petugas dengan pilihan gondola & tingkat" variant="produk" aspect="4/3" />
        </section>

        {/* Stok */}
        <section id="stok" className="space-y-2">
          <H2 id="terima-barang">Terima barang</H2>
          <P>Menu <strong>Stok → Terima barang</strong>. Isi tanggal/jam penerimaan, expired, qty toko &amp; gudang.</P>
          <Mockup caption="Form terima barang dengan tanggal/jam penerimaan & expired" variant="stok" />

          <H2 id="mutasi">Mutasi gudang/toko</H2>
          <P>Pindahkan stok antara toko dan gudang. Stok total tetap, hanya lokasi yang berubah.</P>

          <H2 id="opname">Koreksi opname</H2>
          <P>Sesuaikan stok toko/gudang dengan hasil hitung fisik (koreksi manual, dengan alasan).</P>

          <H2 id="dokumen-stok">Dokumentasi &amp; STB</H2>
          <P>
            Unggah foto dokumentasi penerimaan dan STB (Surat Tanda Bukti) di menu Stok. Disimpan di bucket Storage
            `stok` (privat, butuh login). Maks. 5MB, dikompres otomatis.
          </P>
          <Mockup caption="Upload dokumentasi & STB di menu Stok" variant="stok" aspect="4/3" />

          <H2 id="stok-menipis">Stok menipis &amp; expired</H2>
          <P>
            Dashboard menampilkan produk dengan stok ≤ stok minimum atau expired dalam 60 hari. Filter "Perlu
            perhatian" di halaman Produk juga tersedia.
          </P>
        </section>

        {/* Retur */}
        <section id="retur" className="space-y-2">
          <H2 id="catat-retur">Catat retur</H2>
          <P>
            Menu <strong>Retur</strong>: catat retur ke supplier, expired, rusak, atau dari pembeli. Stok diperbarui
            sesuai jenis retur.
          </P>
          <Mockup caption="Form catat retur dengan pilihan jenis" variant="laporan" aspect="4/3" />

          <H2 id="jenis-retur">Jenis retur</H2>
          <Table
            headers={["Jenis", "Keterangan", "Efek stok"]}
            rows={[
              ["Ke supplier", "Barang dikembalikan ke supplier", "Stok berkurang"],
              ["Expired", "Barang expired dibuang", "Stok berkurang"],
              ["Rusak", "Barang rusak dibuang", "Stok berkurang"],
              ["Dari pembeli", "Pembeli mengembalikan barang", "Stok bertambah"],
            ]}
          />
        </section>

        {/* Laporan */}
        <section id="laporan" className="space-y-2">
          <H2 id="laporan-keuangan">Laporan keuangan</H2>
          <P>Menu <strong>Laporan Harian → Keuangan</strong>: laporan keuangan harian terpusat, bisa diekspor.</P>

          <H2 id="laporan-absensi">Absensi</H2>
          <P>Menu <strong>Laporan Harian → Absensi</strong>: catat kehadiran petugas per hari.</P>

          <H2 id="laporan-kebersihan">Kebersihan</H2>
          <P>Menu <strong>Laporan Harian → Kebersihan</strong>: checklist kebersihan toko.</P>

          <H2 id="laporan-so">SO harian &amp; gondola</H2>
          <P>
            Menu <strong>Laporan Harian → SO / SO Gondola / SO Harian</strong>: rekap stock opname per petugas/gondola.
          </P>

          <H2 id="laporan-summary">Ringkasan</H2>
          <P>Menu <strong>Laporan Harian → Summary</strong>: ringkasan laporan harian dalam satu halaman.</P>
        </section>

        {/* Karyawan */}
        <section id="karyawan" className="space-y-2">
          <H2 id="generate-laporan">Generate laporan</H2>
          <P>Menu <strong>Laporan Karyawan → Generate</strong>: generate laporan karyawan (PDF).</P>

          <H2 id="riwayat-laporan">Riwayat &amp; upload</H2>
          <P>Menu <strong>Laporan Karyawan → Riwayat / Upload</strong>: lihat riwayat dan upload dokumen.</P>
        </section>

        {/* Pengaturan */}
        <section id="pengaturan" className="space-y-2">
          <H2 id="ocr-settings">Pengaturan OCR</H2>
          <P>
            Menu <strong>Pengaturan</strong>: atur Base URL, API key, model, dan reasoning OCR nota. Default provider
            OpenRouter (`qwen/qwen3-vl-30b-a3b-instruct`).
          </P>
          <Table
            headers={["Field", "Keterangan", "Default"]}
            rows={[
              ["Base URL", "Endpoint API OCR", "https://openrouter.ai/api/v1"],
              ["API key", "Kunci API provider", "(diisi dari Pengaturan)"],
              ["Model", "Model vision-language", "qwen/qwen3-vl-30b-a3b-instruct"],
              ["Reasoning", "Aktifkan reasoning (opsional)", "off"],
            ]}
          />
          <Callout tone="tip" title="OpenRouter">
            Dapatkan API key di openrouter.ai. Model lain yang mendukung vision juga bisa dipakai.
          </Callout>

          <H2 id="tema">Tema terang/gelap</H2>
          <P>
            Toggle di sidebar (desktop) atau header (mobile). Pilihan disimpan di `localStorage` (`kdkmp-theme`).
            Mode sistem (system) mengikuti preferensi OS. Landing page juga ikut tema.
          </P>

          <H2 id="profil">Profil &amp; akun</H2>
          <P>
            Akun dibuat oleh administrator di Supabase Dashboard. Logout lewat sidebar bawah. Tidak ada pendaftaran
            publik.
          </P>
        </section>

        {/* Subsidi */}
        <section id="subsidi-aturan" className="space-y-2">
          <H2 id="aturan-kk">Aturan No. KK</H2>
          <Callout tone="warning" title="Aturan">
            1 KK = 1 transaksi subsidi per minggu (Senin–Minggu, WIB). Sistem menolak KK yang sudah dipakai
            minggu ini (termasuk race condition antar kasir).
          </Callout>
          <Ul>
            <Li>Barang subsidi: Pupuk NPK, Pupuk Urea, LPG, SPHP, Minyak Kita (auto-tanda berdasarkan nama).</Li>
            <Li>No. KK wajib 16 digit angka untuk barang subsidi.</Li>
            <Li>Mode bulk: satu KK untuk semua barang subsidi di nota.</Li>
            <Li>Mode per barang: KK berbeda untuk tiap barang subsidi.</Li>
          </Ul>
          <CodeBlock>{`// Aturan (src/lib/subsidi.ts)
1 KK = 1 transaksi subsidi / minggu (Senin-Minggu WIB)
KK wajib 16 digit angka untuk barang subsidi`}</CodeBlock>

          <H2 id="cek-subsidi">Cek &amp; perbaikan</H2>
          <P>Jalankan `supabase/cek_subsidi.sql` untuk memeriksa kandidat subsidi yang belum ditandai, duplikat produk,
            dan pelanggaran KK mingguan.</P>

          <H2 id="kk-mingguan">Pengecekan mingguan</H2>
          <P>
            Sistem otomatis mengecek pemakaian KK di tabel `sales` dan `sale_kk` untuk minggu berjalan (Senin 00:00
            WIB s.d. Senin berikutnya). Jika KK sudah dipakai, nota ditolak dengan pesan bentrok.
          </P>
        </section>

        {/* Keyboard */}
        <section id="keyboard" className="space-y-2">
          <H2 id="shortcut">Shortcut keyboard</H2>
          <Table
            headers={["Shortcut", "Aksi"]}
            rows={[
              ["Ctrl + ;", "Isi tanggal hari ini (di form stok)"],
              ["Ctrl + Shift + ;", "Isi jam sekarang (di form stok)"],
              ["Esc", "Tutup dialog/menu"],
              ["Tab", "Navigasi antar field form"],
            ]}
          />

          <H2 id="tips">Tips penggunaan</H2>
          <Ul>
            <Li>Gunakan OCR untuk mempercepat input dari struk belanja.</Li>
            <Li>Tombol <strong>Tambahkan semua</strong> untuk menambah semua nota OCR sekaligus.</Li>
            <Li>Filter produk "Perlu perhatian" untuk cek stok menipis &amp; expired.</Li>
            <Li>Gunakan mode per barang untuk nota dengan KK berbeda.</Li>
            <Li>Toggle tema di sidebar/header sesuai preferensi.</Li>
            <Li>Cetak struk dari detail nota.</Li>
          </Ul>
        </section>

        {/* FAQ */}
        <section id="faq" className="space-y-2">
          <H2 id="faq-umum">Pertanyaan umum</H2>
          <Ul>
            <Li><strong>Statistik landing kosong?</strong> Jalankan `supabase/landing_stats.sql` di Supabase SQL Editor.</Li>
            <Li><strong>Fitur subsidi tidak aktif?</strong> Jalankan `supabase/subsidi.sql` lalu `subsidi_per_item.sql`.</Li>
            <Li><strong>Foto produk tidak muncul?</strong> Jalankan `supabase/produk_foto.sql` dan buat bucket `produk`.</Li>
            <Li><strong>Upload dokumen/STB gagal?</strong> Jalankan `supabase/stok_dokumen.sql` dan buat bucket `stok`.</Li>
            <Li><strong>OCR tidak jalan?</strong> Atur API key/base URL di Pengaturan; default OpenRouter.</Li>
            <Li><strong>Stok tidak berkurang?</strong> Pastikan trigger stok aktif (jalankan migrasi).</Li>
            <Li><strong>KK ditolak?</strong> Pastikan 16 digit angka dan belum dipakai minggu ini.</Li>
          </Ul>

          <H2 id="troubleshoot">Pemecahan masalah</H2>
          <Table
            headers={["Masalah", "Solusi"]}
            rows={[
              ["Build gagal 'no direct app page entry found'", "Hapus folder `.next`, lalu `npm run build`."],
              ["Redirect loop login", "Cek middleware; pastikan `/` publik dan `/dashboard` protected."],
              ["Stok tidak berkurang", "Pastikan trigger stok aktif (jalankan migrasi)."],
              ["KK ditolak", "Pastikan 16 digit angka dan belum dipakai minggu ini."],
              ["Foto tidak muncul", "Cek bucket Storage & policy RLS."],
              ["OCR timeout", "Naikkan timeout atau ganti model yang lebih cepat."],
              ["Tema tidak berubah", "Clear localStorage `kdkmp-theme` lalu refresh."],
            ]}
          />

          <H2 id="error-codes">Kode error</H2>
          <Table
            headers={["Kode", "Arti", "Tindakan"]}
            rows={[
              ["23505", "Duplikat (unique constraint)", "Cek data ganda, gunakan nomor berbeda."],
              ["PGRST202", "Fungsi RPC tidak ditemukan", "Jalankan SQL migrasi."],
              ["401/403", "Tidak terautentikasi/izin", "Login ulang atau cek RLS."],
              ["404", "Resource tidak ditemukan", "Cek URL/ID."],
            ]}
          />
          <Callout tone="success" title="Selesai">
            Dokumentasi ini akan diperbarui seiring penambahan fitur. Untuk pertanyaan lebih lanjut, hubungi pengurus KDKMP.
          </Callout>
        </section>

        {/* Database */}
        <section id="database" className="space-y-2">
          <H2 id="schema">Skema tabel</H2>
          <Table
            headers={["Tabel", "Fungsi"]}
            rows={[
              ["products", "Katalog produk (SKU, item, harga, stok, foto, subsidi)"],
              ["sales", "Nota penjualan (invoice_no, tanggal, kasir, no_kk, subsidi)"],
              ["sale_items", "Baris nota (product_id, qty, harga, subsidi, no_kk)"],
              ["sale_kk", "Pemakaian KK per nota (untuk cek mingguan)"],
              ["karyawan", "Petugas SO gondola"],
              ["product_gondola", "Pemetaan produk → gondola/lokasi/tingkat"],
              ["so_gondola", "Hasil stock opname"],
              ["app_settings", "Pengaturan OCR (base URL, API key, model)"],
            ]}
          />

          <H2 id="migrasi">Urutan migrasi</H2>
          <Ol>
            <Li>`kdkmp_retail_simple.sql` — skema dasar.</Li>
            <Li>`seed.sql` — seed produk &amp; karyawan.</Li>
            <Li>`dashboard.sql` — view dashboard.</Li>
            <Li>`subsidi.sql` — fitur subsidi &amp; KK.</Li>
            <Li>`subsidi_per_item.sql` — KK bulk/per barang.</Li>
            <Li>`produk_foto.sql` — foto produk + bucket Storage.</Li>
            <Li>`stok_dokumen.sql` — dokumentasi &amp; STB + bucket.</Li>
            <Li>`landing_stats.sql` — statistik publik landing.</Li>
            <Li>`so_gondola.sql`, `product_gondola.sql`, `migration_tingkat_1_6.sql`, `seed_product_gondola.sql` — SO.</Li>
            <Li>`ocr.sql`, `pengaturan.sql` — OCR &amp; pengaturan.</Li>
          </Ol>

          <H2 id="rls">Row Level Security</H2>
          <P>
            Semua tabel operasional (products, sales, sale_items, dll.) hanya bisa diakses oleh pengguna terautentikasi.
            Bucket `produk` publik (foto produk), bucket `stok` privat (butuh login). Landing stats via RPC
            `landing_stats` (security definer) boleh diakses anon.
          </P>
        </section>
      </main>
      <DocsAiHelper />
    </div>
  );
}
