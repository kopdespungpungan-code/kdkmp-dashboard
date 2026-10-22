"use client";

import { useState, useCallback, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPrint,
  faClipboardList,
  faBox,
  faCalendarAlt,
  faFloppyDisk,
  faCircleCheck,
  faPlus,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { angka, tglTanggal, todayWIB } from "@/lib/format";
import { PETUGAS, TINGKAT, cariPetugas } from "@/lib/petugas";
import SoGondolaPrint from "./SoGondolaPrint";
import { simpanSoGondola, simpanTingkatProduk, tambahProdukGondola } from "./actions";

export type StockRow = {
  /** id baris pemetaan product_gondola (unik per barang+gondola+tingkat). */
  pemetaan_id: number;
  id: number;
  sku: string;
  item: string;
  gramasi: string;
  stok_toko: number;
  stok_gudang: number;
  expired_terdekat: string | null;
  stok_min: number | null;
  gondola_no: number | null;
  gondola_lokasi: string;
  /** null = tingkat belum diisi. */
  tingkat: number | null;
  qty_fisik: string;
};

/**
 * Kunci unik satu baris. product_gondola punya satu baris per
 * produk + gondola/lokasi + tingkat, jadi id pemetaan sudah unik dan
 * tidak berubah walau tingkatnya diedit.
 */
const barisKey = (r: StockRow) => String(r.pemetaan_id);

/** Produk aktif yang bisa ditambahkan ke sebuah tingkat. */
export type ProdukOpsi = {
  id: number;
  item: string;
  sku: string;
  gramasi: string;
};

/** Satu wilayah kerja petugas: gondola bernomor atau lokasi (mis. Lia). */
type Wilayah = { gondola_no: number | null; lokasi: string; label: string };

type LastSo = {
  gondola_no: number | null;
  gondola_lokasi: string;
  petugas: string;
  last_so_date: string;
  next_so_date: string;
};

type SoGondolaClientProps = {
  today: string;
  rows: StockRow[];
  lastSo: LastSo[];
  produkOpsi: ProdukOpsi[];
};

const TINGKAT_LIST = TINGKAT;

// Gaya untuk <select> bawaan HTML. Dipakai sebagai ganti komponen Select Radix
// yang sebelumnya tidak bisa diklik.
const selectClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

export default function SoGondolaClient({ today, rows, lastSo, produkOpsi }: SoGondolaClientProps) {
  const router = useRouter();
  const [petugas, setPetugas] = useState("");
  const [gondolaNo, setGondolaNo] = useState("");
  const [gondolaLokasi, setGondolaLokasi] = useState("");
  const [tingkat, setTingkat] = useState(""); // "" = semua tingkat
  const [cari, setCari] = useState("");
  const [qty, setQty] = useState<Record<string, string>>({});
  // Perubahan tingkat yang belum disimpan, dikunci id pemetaan.
  const [tingkatEdit, setTingkatEdit] = useState<Record<number, string>>({});
  // Grup yang sedang membuka form "Tambah produk" (kunci grup).
  const [tambahBuka, setTambahBuka] = useState<string | null>(null);
  const [tambahProdukId, setTambahProdukId] = useState("");
  const [tambahSibuk, setTambahSibuk] = useState(false);
  const [catatan, setCatatan] = useState("");
  const [printing, setPrinting] = useState(false);
  const [pesan, setPesan] = useState<{ jenis: "ok" | "err"; teks: string } | null>(null);
  const [pending, start] = useTransition();

  const info = petugas ? cariPetugas(petugas) : undefined;
  // Sebelum petugas dipilih, info belum ada. Anggap mode gondola supaya label
  // tetap "Gondola", bukan berubah jadi "Lokasi" (hanya Lia yang memakai lokasi).
  const pakaiGondola = !info || info.gondolas.length > 0;
  const selectedGondola = gondolaNo || gondolaLokasi;
  const selectedLokasi = pakaiGondola ? (gondolaNo ? `Gondola ${gondolaNo}` : "") : gondolaLokasi;

  const gondolaOptions = useMemo(() => {
    if (!info) return [];
    if (info.gondolas.length > 0) {
      return info.gondolas.map((g) => ({ value: String(g), label: `Gondola ${g}` }));
    }
    return info.lokasi.map((l) => ({ value: l, label: l }));
  }, [info]);

  // Tingkat yang sedang ditampilkan: pakai editan lokal bila ada.
  const tingkatTampil = useCallback(
    (r: StockRow): string => {
      const edit = tingkatEdit[r.pemetaan_id];
      if (edit !== undefined) return edit;
      return r.tingkat === null ? "" : String(r.tingkat);
    },
    [tingkatEdit],
  );

  // Nilai tingkat yang akan disimpan (null bila dikosongkan).
  const tingkatAkhir = useCallback(
    (r: StockRow): number | null => {
      const v = tingkatTampil(r);
      return v === "" ? null : Number(v);
    },
    [tingkatTampil],
  );

  // Barang petugas yang dipilih. Gondola & tingkat hanya menyaring kalau diisi.
  const stockData = useMemo(() => {
    if (!petugas) return [];

    // Wilayah milik petugas ini (gondola bernomor, atau lokasi untuk Lia).
    const wilayahPetugas = (r: StockRow) =>
      info && info.gondolas.length > 0
        ? r.gondola_no !== null && info.gondolas.includes(r.gondola_no)
        : r.gondola_no === null;

    const kata = cari.trim().toLowerCase();

    return rows.filter((r) => {
      if (!wilayahPetugas(r)) return false;
      if (gondolaNo && r.gondola_no !== Number(gondolaNo)) return false;
      if (gondolaLokasi && r.gondola_lokasi !== gondolaLokasi) return false;
      if (tingkat && tingkatTampil(r) !== tingkat) return false;
      if (!kata) return true;
      return (
        r.item.toLowerCase().includes(kata) ||
        r.sku.toLowerCase().includes(kata) ||
        `gondola ${r.gondola_no}`.includes(kata) ||
        r.gondola_lokasi.toLowerCase().includes(kata)
      );
    });
  }, [rows, petugas, info, pakaiGondola, gondolaNo, gondolaLokasi, tingkat, cari, tingkatTampil]);

  // Semua wilayah kerja petugas (mengikuti filter gondola/lokasi).
  const daftarWilayah = useMemo<Wilayah[]>(() => {
    if (!info) return [];
    if (info.gondolas.length > 0) {
      return info.gondolas
        .filter((g) => !gondolaNo || String(g) === gondolaNo)
        .map((g) => ({ gondola_no: g, lokasi: "", label: `Gondola ${g}` }));
    }
    return info.lokasi
      .filter((l) => !gondolaLokasi || l === gondolaLokasi)
      .map((l) => ({ gondola_no: null, lokasi: l, label: l }));
  }, [info, gondolaNo, gondolaLokasi]);

  // Tingkat yang ditampilkan: semua 1-6, atau satu saja bila filter diisi.
  const daftarTingkat = useMemo(() => (tingkat ? [Number(tingkat)] : TINGKAT_LIST), [tingkat]);

  const samaWilayah = useCallback(
    (r: StockRow, w: Wilayah) =>
      w.gondola_no !== null ? r.gondola_no === w.gondola_no : r.gondola_no === null && r.gondola_lokasi === w.lokasi,
    [],
  );

  // Kelompokkan per wilayah + tingkat. Semua tingkat 1-6 selalu dibuat,
  // termasuk yang belum ada barangnya, supaya bisa langsung ditambahi produk.
  // Saat mencari, kelompok kosong disembunyikan agar hasilnya tidak berisik.
  const grup = useMemo(() => {
    const hasil: {
      kunci: string;
      wilayah: Wilayah;
      tingkat: string;
      rows: StockRow[];
    }[] = [];
    const sedangCari = cari.trim() !== "";

    for (const w of daftarWilayah) {
      for (const t of daftarTingkat) {
        const isi = stockData.filter((r) => samaWilayah(r, w) && tingkatTampil(r) === String(t));
        if (isi.length === 0 && sedangCari) continue;
        hasil.push({ kunci: `${w.gondola_no ?? `L:${w.lokasi}`}-${t}`, wilayah: w, tingkat: String(t), rows: isi });
      }

      // Barang yang tingkatnya masih kosong tetap ditampilkan, di paling bawah.
      const tanpaTingkat = stockData.filter((r) => samaWilayah(r, w) && tingkatTampil(r) === "");
      if (tanpaTingkat.length > 0) {
        hasil.push({ kunci: `${w.gondola_no ?? `L:${w.lokasi}`}-kosong`, wilayah: w, tingkat: "", rows: tanpaTingkat });
      }
    }
    return hasil;
  }, [daftarWilayah, daftarTingkat, stockData, samaWilayah, tingkatTampil, cari]);

  // Jadwal SO: diambil dari wilayah yang sedang difilter (kalau ada).
  const jadwalSo = useMemo(() => {
    if (!selectedGondola) return null;
    const key = selectedGondola;
    return (
      lastSo.find(
        (s) =>
          (s.gondola_lokasi && s.gondola_lokasi === key) ||
          (s.gondola_no != null && String(s.gondola_no) === key),
      ) ?? null
    );
  }, [selectedGondola, lastSo]);

  const setQtyBaris = useCallback((kunci: string, value: string) => {
    setQty((prev) => ({ ...prev, [kunci]: value }));
  }, []);

  const hitungSelisih = useCallback((stokSistem: number, qtyFisik: string) => {
    const fisik = parseInt(qtyFisik, 10);
    if (isNaN(fisik)) return "-";
    return fisik - stokSistem;
  }, []);

  const handlePrint = () => {
    setPrinting(true);
    setTimeout(() => {
      window.print();
      setPrinting(false);
    }, 300);
  };

  const gantiPetugas = (v: string) => {
    setPetugas(v);
    setGondolaNo("");
    setGondolaLokasi("");
    setTingkat("");
    setCari("");
    setQty({});
    setTingkatEdit({});
    setTambahBuka(null);
    setTambahProdukId("");
    setPesan(null);
  };

  // Baris yang sudah diisi qty fisik, siap dikirim ke server.
  const barisTerisi = useMemo(
    () => stockData.filter((r) => qty[barisKey(r)] !== undefined && qty[barisKey(r)] !== ""),
    [stockData, qty],
  );

  // Total selisih dari baris yang sudah diisi (dipakai untuk ringkasan di HP).
  const selisihTotal = useMemo(() => {
    return barisTerisi.reduce((total, r) => {
      const fisik = parseInt(qty[barisKey(r)], 10);
      if (isNaN(fisik)) return total;
      return total + (fisik - r.stok_toko);
    }, 0);
  }, [barisTerisi, qty]);

  // Tambahkan produk ke wilayah + tingkat pada grup yang sedang dibuka.
  const tambahProduk = async (w: Wilayah, t: string) => {
    const id = Number(tambahProdukId);
    if (!Number.isInteger(id) || id <= 0) {
      setPesan({ jenis: "err", teks: "Pilih produk dulu." });
      return;
    }
    if (t === "") {
      setPesan({ jenis: "err", teks: "Tingkat belum ditentukan." });
      return;
    }
    setTambahSibuk(true);
    setPesan(null);
    try {
      const res = await tambahProdukGondola({
        petugas,
        produk_id: id,
        gondola_no: w.gondola_no,
        gondola_lokasi: w.lokasi,
        tingkat: Number(t),
      });
      if (res.ok) {
        setPesan({
          jenis: "ok",
          teks: `"${res.item}" ditambahkan ke ${w.label} tingkat ${t}.`,
        });
        setTambahProdukId("");
        setTambahBuka(null);
        router.refresh();
      } else {
        setPesan({ jenis: "err", teks: res.error });
      }
    } finally {
      setTambahSibuk(false);
    }
  };

  // Perubahan tingkat yang belum disimpan dibandingkan nilai aslinya di DB.
  const perubahanTingkat = useMemo(() => {
    const hasil: { pemetaan_id: number; tingkat: number | null; item: string }[] = [];
    for (const r of rows) {
      const edit = tingkatEdit[r.pemetaan_id];
      if (edit === undefined) continue;
      const asli = r.tingkat === null ? "" : String(r.tingkat);
      if (edit === asli) continue;
      hasil.push({
        pemetaan_id: r.pemetaan_id,
        tingkat: edit === "" ? null : Number(edit),
        item: r.item,
      });
    }
    return hasil;
  }, [rows, tingkatEdit]);

  const simpan = () => {
    setPesan(null);
    if (!info) {
      return setPesan({ jenis: "err", teks: "Pilih petugas dulu." });
    }

    // Barang tanpa tingkat tidak bisa disimpan ke SO (SO harus punya rak).
    const tanpaTingkat = barisTerisi.filter((r) => tingkatAkhir(r) === null);
    if (tanpaTingkat.length > 0) {
      return setPesan({
        jenis: "err",
        teks: `Isi tingkat dulu untuk: ${tanpaTingkat.slice(0, 3).map((r) => r.item).join(", ")}${
          tanpaTingkat.length > 3 ? `, +${tanpaTingkat.length - 3} lainnya` : ""
        }.`,
      });
    }

    if (barisTerisi.length === 0 && perubahanTingkat.length === 0) {
      return setPesan({ jenis: "err", teks: "Belum ada Qty Fisik yang diisi." });
    }
    for (const r of barisTerisi) {
      const n = parseInt(qty[barisKey(r)], 10);
      if (isNaN(n) || n < 0) {
        return setPesan({ jenis: "err", teks: `Qty Fisik "${r.item}" harus nol atau lebih.` });
      }
    }

    start(async () => {
      // 1. Sinkronkan perubahan tingkat ke tabel pemetaan lebih dulu, supaya
      //    SO yang disimpan memakai tingkat yang sudah dikoreksi.
      if (perubahanTingkat.length > 0) {
        const resTingkat = await simpanTingkatProduk({
          petugas,
          items: perubahanTingkat.map(({ pemetaan_id, tingkat }) => ({ pemetaan_id, tingkat })),
        });
        if (!resTingkat.ok) {
          return setPesan({ jenis: "err", teks: `Gagal menyimpan tingkat: ${resTingkat.error}` });
        }
      }

      if (barisTerisi.length === 0) {
        setPesan({
          jenis: "ok",
          teks: `Tingkat tersimpan: ${perubahanTingkat.length} barang diperbarui.`,
        });
        setTingkatEdit({});
        router.refresh();
        return;
      }

      const res = await simpanSoGondola({
        tanggal: today,
        petugas,
        // Gondola & tingkat diambil per baris supaya tetap akurat walau
        // tabel menampilkan semua gondola/tingkat sekaligus.
        catatan: catatan.trim() || null,
        items: barisTerisi.map((r) => ({
          produk_id: r.id,
          qty_fisik: parseInt(qty[barisKey(r)], 10),
          stok_sistem: r.stok_toko,
          expired: r.expired_terdekat,
          gondola_no: r.gondola_no,
          gondola_lokasi: r.gondola_no === null ? r.gondola_lokasi : "",
          tingkat: tingkatAkhir(r) ?? 1,
        })),
      });
      if (res.ok) {
        const bagianTingkat =
          perubahanTingkat.length > 0 ? ` Tingkat ${perubahanTingkat.length} barang diperbarui.` : "";
        const bagianCatatan = res.peringatan ? ` Catatan: ${res.peringatan}` : "";
        setPesan({ jenis: "ok", teks: `Tersimpan: ${res.jumlah} barang.${bagianTingkat}${bagianCatatan}` });
        setQty({});
        setTingkatEdit({});
        router.refresh();
      } else {
        setPesan({ jenis: "err", teks: res.error });
      }
    });
  };

  return (
    <motion.div className="space-y-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <div className="no-print space-y-6">
        <PageHeader title="SO Gondola" sub="Stock Opname per Gondola - Grocery" />

        {pesan && (
          <Alert tone={pesan.jenis === "ok" ? "hijau" : "merah"}>{pesan.teks}</Alert>
        )}

        {/* ===== Filter (opsional) ===== */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FontAwesomeIcon icon={faClipboardList} className="text-primary" />
              Petugas & Filter
            </CardTitle>
            <CardDescription>
              Pilih petugas untuk langsung melihat semua barangnya, dikelompokkan per gondola dan tingkat.
              Filter di bawah sifatnya opsional - biarkan kosong untuk menampilkan semuanya.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="petugas">Petugas</Label>
                <select
                  id="petugas"
                  value={petugas}
                  onChange={(e) => gantiPetugas(e.target.value)}
                  className={selectClass}
                >
                  <option value="">Pilih petugas</option>
                  {PETUGAS.map((p) => (
                    <option key={p.key} value={p.key}>{p.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="gondola">{pakaiGondola ? "Gondola" : "Lokasi"}</Label>
                <select
                  id="gondola"
                  value={selectedGondola}
                  disabled={!petugas}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (pakaiGondola) setGondolaNo(v);
                    else setGondolaLokasi(v);
                    setPesan(null);
                  }}
                  className={selectClass}
                >
                  <option value="">
                    {pakaiGondola ? "Semua gondola" : "Semua lokasi"}
                  </option>
                  {gondolaOptions.map((g) => (
                    <option key={g.value} value={g.value}>{g.label}</option>
                  ))}
                </select>
                {!petugas && <p className="text-xs text-muted-foreground">Pilih petugas dulu.</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="tingkat">Tingkat</Label>
                <select
                  id="tingkat"
                  value={tingkat}
                  onChange={(e) => setTingkat(e.target.value)}
                  className={selectClass}
                >
                  <option value="">Semua tingkat</option>
                  {TINGKAT_LIST.map((t) => (
                    <option key={t} value={String(t)}>Tingkat {t}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cari">Cari barang</Label>
                <Input
                  id="cari"
                  value={cari}
                  onChange={(e) => setCari(e.target.value)}
                  placeholder="Nama / SKU / gondola"
                  className="h-10"
                />
              </div>
            </div>

            {petugas && (
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Button onClick={handlePrint} disabled={printing} variant="outline">
                  <FontAwesomeIcon icon={faPrint} className="mr-2" />
                  {printing ? "Mencetak..." : "Cetak SO"}
                </Button>
                <span className="text-sm text-muted-foreground">
                  {stockData.length} barang
                  {selectedLokasi ? ` di ${selectedLokasi}` : ""}
                  {tingkat ? ` tingkat ${tingkat}` : ""}
                </span>
              </div>
            )}

            {/* Jadwal SO */}
            {jadwalSo && (
              <div className="mt-4 rounded border border-border/50 bg-muted/50 p-3 text-sm">
                <div className="flex flex-wrap items-center gap-2 text-muted-foreground">
                  <FontAwesomeIcon icon={faCalendarAlt} className="text-primary" />
                  <span>SO Terakhir: <strong>{tglTanggal(jadwalSo.last_so_date)}</strong></span>
                  <span className="mx-2">|</span>
                  <span>SO Berikutnya: <strong>{tglTanggal(jadwalSo.next_so_date)}</strong></span>
                  {new Date(jadwalSo.next_so_date) <= new Date() && (
                    <Badge tone="merah" className="ml-2">Sudah waktunya SO!</Badge>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {!petugas ? (
          <Alert>
            Pilih petugas di atas. Semua gondola dan tingkat 1-6 langsung tampil, termasuk yang masih
            kosong, sehingga barang bisa langsung ditambahkan.
          </Alert>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FontAwesomeIcon icon={faBox} className="text-primary" />
                Tabel SO {info?.label ?? ""}
              </CardTitle>
              <CardDescription>
                Isi Qty Fisik per produk. Selisih dihitung otomatis (Qty Fisik - Stok Sistem).
                Tingkat bisa dikoreksi langsung di tiap baris (1-6); perubahannya ikut tersimpan
                ke pemetaan di database.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {grup.length === 0 && (
                <div className="px-3 py-6 text-sm text-muted-foreground">
                  Tidak ada barang yang cocok dengan pencarian atau filter ini. Kosongkan pencarian
                  untuk melihat semua gondola dan tingkat.
                </div>
              )}
              {grup.map((g) => {
                const buka = tambahBuka === g.kunci;
                // Hanya hitung saat form dibuka; grup bisa mencapai 72 buah.
                const opsiGrup = buka
                  ? produkOpsi.filter((p) => {
                      const sudah = rows.some(
                        (r) =>
                          r.id === p.id &&
                          samaWilayah(r, g.wilayah) &&
                          tingkatTampil(r) === g.tingkat,
                      );
                      return !sudah;
                    })
                  : [];

                return (
                <div key={g.kunci}>
                  {/* Judul kelompok: wilayah + tingkat. Selalu tampil, walau kosong. */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-y border-border bg-muted px-3 py-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{g.wilayah.label}</span>
                      {g.tingkat === "" ? (
                        <Badge tone="kuning">Tingkat belum diisi</Badge>
                      ) : (
                        <Badge tone="merah">Tingkat {g.tingkat}</Badge>
                      )}
                      {g.rows.length === 0 && (
                        <span className="text-xs text-muted-foreground">belum ada barang</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">
                        {g.rows.filter((r) => qty[barisKey(r)]).length}/{g.rows.length} terisi
                      </span>
                      {g.tingkat !== "" && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setTambahBuka(buka ? null : g.kunci);
                            setTambahProdukId("");
                          }}
                          className="h-8"
                        >
                          <FontAwesomeIcon icon={buka ? faXmark : faPlus} className="mr-1.5" />
                          {buka ? "Batal" : "Tambah"}
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Form tambah produk untuk wilayah + tingkat ini */}
                  {buka && g.tingkat !== "" && (
                    <div className="space-y-2 border-b border-border bg-card px-3 py-3">
                      <p className="text-xs text-muted-foreground">
                        Tambah barang ke <strong>{g.wilayah.label}</strong> tingkat{" "}
                        <strong>{g.tingkat}</strong>. Daftar hanya menampilkan barang yang belum ada di
                        tingkat ini.
                      </p>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <select
                          value={tambahProdukId}
                          onChange={(e) => setTambahProdukId(e.target.value)}
                          className="h-10 flex-1 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                          aria-label="Pilih produk yang akan ditambahkan"
                        >
                          <option value="">Pilih barang ({opsiGrup.length} tersedia)</option>
                          {opsiGrup.map((p) => (
                            <option key={p.id} value={String(p.id)}>
                              {p.item}
                              {p.gramasi ? ` - ${p.gramasi}` : ""}
                              {p.sku ? ` (${p.sku})` : ""}
                            </option>
                          ))}
                        </select>
                        <Button
                          type="button"
                          onClick={() => tambahProduk(g.wilayah, g.tingkat)}
                          disabled={tambahSibuk || !tambahProdukId}
                          className="h-10"
                        >
                          <FontAwesomeIcon icon={faPlus} className="mr-2" />
                          {tambahSibuk ? "Menyimpan..." : "Tambah ke sini"}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Tingkat kosong: beri penjelasan, bukan tabel kosong */}
                  {g.rows.length === 0 ? (
                    <div className="border-b border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
                      Belum ada barang di {g.wilayah.label}
                      {g.tingkat === "" ? " tanpa tingkat" : ` tingkat ${g.tingkat}`}. Klik{" "}
                      <strong>Tambah</strong> di atas untuk menaruh barang di sini.
                    </div>
                  ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                      {/* Header hanya untuk layar lebar. Di HP tabel berubah jadi kartu. */}
                      <thead className="hidden md:table-header-group">
                        <tr className="bg-background text-muted-foreground">
                          <th className="border-b border-border p-3 text-left">No</th>
                          <th className="border-b border-border p-3 text-left">SKU</th>
                          <th className="border-b border-border p-3 text-left">Nama Produk</th>
                          <th className="border-b border-border p-3 text-left">Gramasi</th>
                          <th className="border-b border-border p-3 text-center">Tingkat</th>
                          <th className="border-b border-border p-3 text-right">Stok Sistem</th>
                          <th className="border-b border-border p-3 text-right">Stok Gudang</th>
                          <th className="border-b border-border p-3 text-center">Qty Fisik</th>
                          <th className="border-b border-border p-3 text-right">Selisih</th>
                          <th className="border-b border-border p-3 text-left">Expired</th>
                        </tr>
                      </thead>
                      <tbody className="block md:table-row-group">
                        {g.rows.map((row, index) => {
                          const selisih = hitungSelisih(row.stok_toko, qty[barisKey(row)] ?? "");
                          let selisihClass = "text-muted-foreground";
                          if (selisih !== "-" && typeof selisih === "number") {
                            if (selisih < 0) selisihClass = "text-destructive";
                            else if (selisih > 0) selisihClass = "text-primary";
                            else selisihClass = "text-hijau";
                          }
                          const selisihTeks =
                            typeof selisih === "number" ? (selisih >= 0 ? "+" : "") + angka(selisih) : "-";

                          // Dipakai berulang di HP maupun desktop.
                          const selBarang = (
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-baseline gap-x-2">
                                <span className="font-mono text-[11px] text-muted-foreground">{row.sku}</span>
                                {row.expired_terdekat && (
                                  <span className="text-[11px] font-semibold text-destructive">
                                    Exp {tglTanggal(row.expired_terdekat)}
                                  </span>
                                )}
                              </div>
                              <div className="font-medium leading-tight">{row.item}</div>
                              <div className="text-[11px] text-muted-foreground">
                                {row.gramasi !== "-" ? `Gramasi ${row.gramasi}` : "Gramasi -"}
                                {" • Gudang "}
                                {angka(row.stok_gudang)}
                              </div>
                            </div>
                          );

                          return (
                            <tr
                              key={barisKey(row)}
                              className="block border-b border-border p-3 md:table-row md:p-0 md:hover:bg-accent"
                            >
                              <td className="hidden md:table-cell md:border-b md:border-border md:p-3 md:text-muted-foreground">
                                {index + 1}
                              </td>
                              <td className="hidden font-mono text-xs md:table-cell md:border-b md:border-border md:p-3">
                                {row.sku}
                              </td>
                              <td className="hidden max-w-[220px] font-medium md:table-cell md:border-b md:border-border md:p-3">
                                {row.item}
                              </td>
                              <td className="hidden text-xs text-muted-foreground md:table-cell md:border-b md:border-border md:p-3">
                                {row.gramasi}
                              </td>

                              {/* Tingkat bisa dikoreksi per baris; kosongkan bila belum tahu. */}
                              <td className="hidden md:table-cell md:border-b md:border-border md:p-3">
                                <select
                                  value={tingkatTampil(row)}
                                  onChange={(e) =>
                                    setTingkatEdit((prev) => ({ ...prev, [row.pemetaan_id]: e.target.value }))
                                  }
                                  className="h-9 w-full rounded-md border border-input bg-background px-2 text-center text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                  aria-label={`Tingkat ${row.item}`}
                                >
                                  <option value="">-</option>
                                  {TINGKAT_LIST.map((t) => (
                                    <option key={t} value={String(t)}>{t}</option>
                                  ))}
                                </select>
                              </td>

                              <td className="hidden text-right font-mono md:table-cell md:border-b md:border-border md:p-3">
                                {angka(row.stok_toko)}
                              </td>
                              <td className="hidden text-right font-mono md:table-cell md:border-b md:border-border md:p-3">
                                {angka(row.stok_gudang)}
                              </td>

                              <td className="block border-b border-border/60 pb-3 md:table-cell md:border-b md:border-border md:p-3">
                                <div className="mb-2 flex items-baseline gap-2 md:hidden">
                                  <span className="text-xs text-muted-foreground">{index + 1}.</span>
                                  <div className="min-w-0 flex-1">{selBarang}</div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="w-20 shrink-0 text-xs text-muted-foreground md:hidden">
                                    Qty Fisik
                                  </span>
                                  <Input
                                    type="number"
                                    min={0}
                                    inputMode="numeric"
                                    value={qty[barisKey(row)] ?? ""}
                                    onChange={(e) => setQtyBaris(barisKey(row), e.target.value)}
                                    disabled={tingkatAkhir(row) === null}
                                    className="h-11 flex-1 text-center text-base md:h-8 md:text-sm"
                                    placeholder="0"
                                  />
                                  <span className="w-24 shrink-0 text-right text-xs text-muted-foreground md:hidden">
                                    Sistem {angka(row.stok_toko)}
                                  </span>
                                </div>

                                {/* Pemilih tingkat untuk HP (di desktop sudah ada kolomnya). */}
                                <div className="mt-2 flex items-center gap-2 md:hidden">
                                  <span className="w-20 shrink-0 text-xs text-muted-foreground">Tingkat</span>
                                  <select
                                    value={tingkatTampil(row)}
                                    onChange={(e) =>
                                      setTingkatEdit((prev) => ({ ...prev, [row.pemetaan_id]: e.target.value }))
                                    }
                                    className="h-11 flex-1 rounded-md border border-input bg-background px-2 text-center text-base focus:outline-none focus:ring-2 focus:ring-ring"
                                    aria-label={`Tingkat ${row.item}`}
                                  >
                                    <option value="">Tingkat belum diisi</option>
                                    {TINGKAT_LIST.map((t) => (
                                      <option key={t} value={String(t)}>{t}</option>
                                    ))}
                                  </select>
                                </div>
                                {tingkatAkhir(row) === null && (
                                  <p className="mt-1 text-[11px] text-destructive md:hidden">
                                    Isi tingkat dulu supaya Qty Fisik bisa diisi.
                                  </p>
                                )}
                              </td>

                              {/* Selisih: di HP jadi baris ringkas berlabel. */}
                              <td className="flex items-center justify-between py-3 md:table-cell md:border-b md:border-border md:p-3 md:text-right">
                                <span className="text-xs text-muted-foreground md:hidden">Selisih</span>
                                <span className={"font-semibold " + selisihClass}>{selisihTeks}</span>
                              </td>

                              <td
                                className={
                                  "hidden text-xs md:table-cell md:border-b md:border-border md:p-3 " +
                                  (row.expired_terdekat
                                    ? "font-semibold text-destructive"
                                    : "text-muted-foreground")
                                }
                              >
                                {row.expired_terdekat ? tglTanggal(row.expired_terdekat) : "-"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  )}
                </div>
                );
              })}

              <div className="mt-3 space-y-2 rounded border border-border bg-muted p-3 text-sm text-muted-foreground">
                <div>
                  <strong>Catatan:</strong>
                  <Input
                    value={catatan}
                    onChange={(e) => setCatatan(e.target.value)}
                    placeholder="Catatan SO gondola ini"
                    className="mt-1"
                  />
                </div>
              </div>

              {/* toolbar Simpan: menempel di bawah layar saat dibuka dari HP,
                  supaya tombol selalu terjangkau tanpa scroll ke dasar tabel. */}
              <div className="sticky bottom-0 z-10 border-t border-border bg-card p-3 md:static">
                {/* Info ringkas di HP */}
                <div className="mb-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-muted-foreground md:hidden">
                  <span>
                    Terisi <strong className="text-foreground">{barisTerisi.length}</strong> dari {stockData.length} barang
                  </span>
                  {selisihTotal !== 0 && (
                    <span className={selisihTotal < 0 ? "text-destructive" : "text-primary"}>
                      Selisih total {selisihTotal >= 0 ? "+" : ""}
                      {angka(selisihTotal)}
                    </span>
                  )}
                  {perubahanTingkat.length > 0 && (
                    <span className="text-kuning">
                      {perubahanTingkat.length} tingkat diubah
                    </span>
                  )}
                </div>

                {perubahanTingkat.length > 0 && (
                  <p className="mb-2 hidden text-xs text-kuning md:block">
                    {perubahanTingkat.length} perubahan tingkat akan disimpan ke pemetaan gondola.
                  </p>
                )}

                <Button
                  onClick={simpan}
                  disabled={pending || (barisTerisi.length === 0 && perubahanTingkat.length === 0)}
                  className="h-11 w-full md:h-10 md:w-auto"
                >
                  <FontAwesomeIcon icon={pending ? faCircleCheck : faFloppyDisk} className="mr-2" />
                  {pending
                    ? "Menyimpan..."
                    : barisTerisi.length > 0
                      ? `Simpan (${barisTerisi.length} barang${
                          perubahanTingkat.length > 0 ? `, ${perubahanTingkat.length} tingkat` : ""
                        })`
                      : perubahanTingkat.length > 0
                        ? `Simpan Tingkat (${perubahanTingkat.length})`
                        : "Simpan SO"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="print-only">
        <SoGondolaPrint
          today={today}
          petugas={petugas ? (info?.label ?? petugas) : ""}
          gondola={selectedGondola}
          gondolaLokasi={selectedLokasi}
          tingkat={tingkat || "semua"}
          catatan={catatan}
          rows={stockData.map((r) => ({
            ...r,
            qty_fisik: qty[barisKey(r)] ?? "",
            baris_key: barisKey(r),
            tingkat_label: tingkatTampil(r),
          }))}
          hitungSelisih={hitungSelisih}
        />
      </div>
    </motion.div>
  );
}
