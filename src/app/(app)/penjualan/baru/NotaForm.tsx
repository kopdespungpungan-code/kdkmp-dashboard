"use client";
import { useCallback, useEffect, useState } from "react";
import ProductSelect from "@/components/ProductSelect";
import { ProductPhoto } from "@/components/ProductPhoto";
import SubmitButton from "@/components/SubmitButton";
import { angka, rupiah } from "@/lib/format";
import { Input } from "@/components/ui/input";
import type { ProductOpt } from "@/lib/types";
import { clearOcrNotas, jamPendek, loadOcrNotas, matchProduk, tanggalPendek, type OcrNota } from "@/lib/ocr-nota";
import { buatNota } from "./actions";
import { Button } from "@/components/ui/button";
import { Alert, Badge } from "@/components/ui";
import { ATURAN_SUBSIDI, KK_PANJANG, kkValid, rapikanKK } from "@/lib/subsidi";

type Line = {
  product_id: number;
  item: string;
  stok: number;
  qty: number;
  harga: number;
  subsidi: boolean;
  foto_url: string | null;
};
type Gagal = { nama: string; qty: number; harga: number; dari: string };
type Duplikat = {
  status: "cek" | "ada" | "aman" | "tidak-cek" | "gagal";
  invoiceNo?: string;
  saleId?: number;
  jamCocok?: boolean | null;
};

const USED_KEY = "ocr_nota_used";
const kunci = (n: OcrNota, i: number) => n.invoice_no ?? `idx-${i}`;

function loadUsed(): string[] {
  try {
    return JSON.parse(sessionStorage.getItem(USED_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export default function NotaForm({ products }: { products: ProductOpt[] }) {
  const [lines, setLines] = useState<Line[]>([]);
  const [ocrNotas, setOcrNotas] = useState<OcrNota[]>([]);
  const [used, setUsed] = useState<string[]>([]);          // pernah ditambahkan (tersimpan di browser)
  const [ditambah, setDitambah] = useState<string[]>([]);  // nota yang ada di form saat ini
  const [belumCocok, setBelumCocok] = useState<Gagal[]>([]);
  const [duplikat, setDuplikat] = useState<Record<string, Duplikat>>({});
  const [noKk, setNoKk] = useState("");
  const [modeKk, setModeKk] = useState<"bulk" | "per_item">("bulk");
  const [kkPerItem, setKkPerItem] = useState<Record<number, string>>({});
  const [cekKk, setCekKk] = useState<{ status: "idle" | "memeriksa" | "bentrok" | "gagal"; pesan?: string }>({
    status: "idle",
  });

  useEffect(() => {
    setOcrNotas(loadOcrNotas());
    setUsed(loadUsed());
  }, []);

  const barisDariNota = useCallback((n: OcrNota) => {
    const baru: Line[] = [];
    const gagal: Gagal[] = [];
    for (const it of n.items) {
      const qty = Math.max(1, Math.floor(Number(it.qty) || 1));
      const hargaOcr = Number(it.harga) || 0;
      const nama = String(it.nama ?? "").trim();
      const p = matchProduk(nama, products, (x) => x.item);
      if (!p) {
        gagal.push({ nama, qty, harga: hargaOcr, dari: n.invoice_no ?? "(tanpa nomor)" });
        continue;
      }
      const harga = hargaOcr > 0 ? hargaOcr : Number(p.harga_jual ?? 0);
      const ada = baru.find((l) => l.product_id === p.id);
      if (ada) ada.qty += qty;
      else
        baru.push({
          product_id: p.id,
          item: p.item,
          stok: p.stok_toko ?? 0,
          qty,
          harga,
          subsidi: Boolean(p.subsidi),
          foto_url: p.foto_url ?? null,
        });
    }
    return { baru, gagal };
  }, [products]);

  // Bandingkan tiap nota OCR dengan nota yang sudah tersimpan:
  // barang + qty + harga sama, tanggal sama, jam sama, dan total sama.
  useEffect(() => {
    if (ocrNotas.length === 0) {
      setDuplikat({});
      return;
    }

    let batal = false;
    const entries = ocrNotas.map((n, i) => {
      const key = kunci(n, i);
      const { baru, gagal } = barisDariNota(n);
      return { key, n, baru, gagal };
    });

    const awal: Record<string, Duplikat> = {};
    for (const e of entries) {
      awal[e.key] =
        tanggalPendek(e.n.tanggal) && e.gagal.length === 0 && e.baru.length > 0
          ? { status: "cek" }
          : { status: "tidak-cek" };
    }
    setDuplikat(awal);

    const periksa = entries.filter((e) => awal[e.key].status === "cek");
    if (periksa.length === 0) return;

    (async () => {
      try {
        const res = await fetch("/api/penjualan/cek-duplikat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            notas: periksa.map((e) => ({
              tanggal: tanggalPendek(e.n.tanggal),
              jam: jamPendek(e.n.jam),
              total: e.n.total,
              items: e.baru.map((l) => ({
                product_id: l.product_id,
                qty: l.qty,
                harga: l.harga,
              })),
            })),
          }),
        });
        if (!res.ok) throw new Error("gagal memeriksa");
        const json = (await res.json()) as {
          hasil?: {
            status: "ada" | "aman" | "tidak-cek";
            invoice_no?: string;
            sale_id?: number;
            jam_cocok?: boolean | null;
          }[];
        };
        if (batal) return;
        setDuplikat((cur) => {
          const next = { ...cur };
          periksa.forEach((e, idx) => {
            const h = json.hasil?.[idx];
            if (h?.status === "ada")
              next[e.key] = {
                status: "ada",
                invoiceNo: h.invoice_no,
                saleId: h.sale_id,
                jamCocok: h.jam_cocok ?? null,
              };
            else if (h?.status === "aman") next[e.key] = { status: "aman" };
            else next[e.key] = { status: "tidak-cek" };
          });
          return next;
        });
      } catch {
        if (batal) return;
        setDuplikat((cur) => {
          const next = { ...cur };
          for (const e of periksa) next[e.key] = { status: "gagal" };
          return next;
        });
      }
    })();

    return () => {
      batal = true;
    };
  }, [ocrNotas, barisDariNota]);

  function terapkanNota(daftar: { n: OcrNota; key: string }[]) {
    if (daftar.length === 0) return;

    const semuaBaru: Line[] = [];
    const semuaGagal: Gagal[] = [];
    for (const { n } of daftar) {
      const { baru, gagal } = barisDariNota(n);
      for (const b of baru) {
        const ada = semuaBaru.find((l) => l.product_id === b.product_id);
        if (ada) ada.qty += b.qty;
        else semuaBaru.push(b);
      }
      semuaGagal.push(...gagal);
    }

    // tambahkan ke bawah tabel; barang yang sama -> qty ditambah
    setLines((cur) => {
      const next = cur.map((l) => ({ ...l }));
      for (const b of semuaBaru) {
        const ada = next.find((l) => l.product_id === b.product_id);
        if (ada) ada.qty += b.qty;
        else next.push(b);
      }
      return next;
    });
    setBelumCocok((cur) => [...cur, ...semuaGagal]);

    const keys = daftar.map(({ key }) => key);
    setDitambah((cur) => [...cur, ...keys]);
    setUsed((cur) => {
      const next = [...cur];
      for (const key of keys) if (!next.includes(key)) next.push(key);
      sessionStorage.setItem(USED_KEY, JSON.stringify(next));
      return next;
    });
  }

  function tambahNota(n: OcrNota, key: string) {
    const dup = duplikat[key];
    if (dup?.status === "ada") {
      const nama = dup.invoiceNo ? ` sebagai ${dup.invoiceNo}` : "";
      if (
        !window.confirm(
          `Nota ini sudah diinput${nama} (tanggal, jam, total, dan barang sama). Tetap tambahkan?`,
        )
      )
        return;
    }
    if (ditambah.includes(key) && !window.confirm("Nota ini sudah ada di form. Tambahkan lagi?")) return;
    if (!ditambah.includes(key) && used.includes(key) && !window.confirm("Nota ini sudah pernah ditambahkan sebelumnya. Tambahkan lagi?")) return;
    terapkanNota([{ n, key }]);
  }

  function tambahSemua() {
    const semua = ocrNotas.map((n, i) => ({ n, key: kunci(n, i) }));
    const belumDiForm = semua.filter(({ key }) => !ditambah.includes(key));

    // Kalau semua sudah ada, konfirmasi sebelum qty digandakan.
    if (belumDiForm.length === 0) {
      if (!window.confirm("Semua nota sudah ada di form. Tambahkan lagi?")) return;
      terapkanNota(semua);
      return;
    }

    // Nota yang sudah ada di database sebaiknya dilewati supaya tidak dobel.
    const duplikatBaru = belumDiForm.filter(({ key }) => duplikat[key]?.status === "ada");
    let akanDitambah = belumDiForm;
    if (duplikatBaru.length > 0) {
      const sisa = belumDiForm.filter(({ key }) => duplikat[key]?.status !== "ada");
      if (sisa.length === 0) {
        if (
          !window.confirm(
            `${duplikatBaru.length} nota sudah pernah diinput (tanggal, jam, total, dan barang sama). Tetap tambahkan semuanya?`,
          )
        )
          return;
      } else {
        if (
          !window.confirm(
            `${duplikatBaru.length} nota sudah pernah diinput dan akan dilewati. Tambahkan ${sisa.length} nota lainnya?`,
          )
        )
          return;
        akanDitambah = sisa;
      }
    }

    // Nota yang pernah ditambahkan sebelumnya tetap boleh, tapi beri tahu sekali.
    const pernah = akanDitambah.filter(({ key }) => used.includes(key));
    if (pernah.length > 0) {
      const lanjut = window.confirm(
        `${pernah.length} nota sudah pernah ditambahkan sebelumnya. Tetap tambahkan ${akanDitambah.length} nota yang belum ada di form?`,
      );
      if (!lanjut) return;
    }

    terapkanNota(akanDitambah);
  }

  function kosongkanForm() {
    if (lines.length > 0 && !window.confirm("Kosongkan semua barang di form?")) return;
    setLines([]);
    setDitambah([]);
    setBelumCocok([]);
  }

  function buangOcr() {
    setOcrNotas([]);
    setUsed([]);
    clearOcrNotas();
    sessionStorage.removeItem(USED_KEY);
  }

  function pilihManual(index: number, id: number) {
    const g = belumCocok[index];
    const p = products.find((x) => x.id === id);
    if (!g || !p) return;
    const harga = g.harga > 0 ? g.harga : Number(p.harga_jual ?? 0);
    setLines((cur) => {
      const ada = cur.find((l) => l.product_id === id);
      if (ada) return cur.map((l) => (l.product_id === id ? { ...l, qty: l.qty + g.qty } : l));
      return [
        ...cur,
        {
          product_id: id,
          item: p.item,
          stok: p.stok_toko ?? 0,
          qty: g.qty,
          harga,
          subsidi: Boolean(p.subsidi),
          foto_url: p.foto_url ?? null,
        },
      ];
    });
    setBelumCocok((cur) => cur.filter((_, i) => i !== index));
  }

  function tambah(id: number) {
    const p = products.find((x) => x.id === id);
    if (!p) return;
    setLines((cur) => {
      const ada = cur.find((l) => l.product_id === id);
      if (ada) return cur.map((l) => (l.product_id === id ? { ...l, qty: l.qty + 1 } : l));
      return [
        ...cur,
        {
          product_id: id,
          item: p.item,
          stok: p.stok_toko ?? 0,
          qty: 1,
          harga: Number(p.harga_jual ?? 0),
          subsidi: Boolean(p.subsidi),
          foto_url: p.foto_url ?? null,
        },
      ];
    });
  }
  const ubah = (id: number, patch: Partial<Line>) => setLines((cur) => cur.map((l) => (l.product_id === id ? { ...l, ...patch } : l)));
  const hapus = (id: number) => setLines((cur) => cur.filter((l) => l.product_id !== id));
  const ubahModeKk = (mode: "bulk" | "per_item") => {
    setModeKk(mode);
    setCekKk({ status: "idle" });
  };

  const total = lines.reduce((a, l) => a + l.qty * l.harga, 0);
  const barisSubsidi = lines.filter((l) => l.subsidi);
  const adaHargaKosong = lines.some((l) => l.harga <= 0);
  const adaSubsidi = barisSubsidi.length > 0;
  const daftarSubsidi = [...new Set(barisSubsidi.map((l) => l.item))];

  // KK per barang memakai No. KK bulk sebagai nilai awal supaya barang baru
  // otomatis terisi saat mode per barang dipilih.
  const kkBaris = (l: Line) => rapikanKK(kkPerItem[l.product_id] ?? (modeKk === "per_item" ? noKk : ""));
  const kkItemLengkap = barisSubsidi.length > 0 && barisSubsidi.every((l) => kkValid(kkBaris(l)));
  const kkLengkap = modeKk === "bulk" ? kkValid(noKk) : kkItemLengkap;
  const belumLengkap = adaSubsidi && !kkLengkap;
  const kksUntukCek =
    adaSubsidi && kkLengkap
      ? modeKk === "bulk"
        ? [rapikanKK(noKk)]
        : [...new Set(barisSubsidi.map(kkBaris).filter((kk) => kk !== ""))]
      : [];
  const kunciCek = kksUntukCek.join(",");

  const payload = JSON.stringify(
    lines.map((l) => ({
      product_id: l.product_id,
      qty: l.qty,
      harga: l.harga,
      ...(l.subsidi && modeKk === "per_item" ? { no_kk: kkBaris(l) } : {}),
    })),
  );

  // Cek lebih awal supaya keranjang tidak hilang kalau KK sudah dipakai minggu ini.
  useEffect(() => {
    if (!adaSubsidi || !kkLengkap) {
      setCekKk({ status: "idle" });
      return;
    }
    const kks = kunciCek ? kunciCek.split(",") : [];
    if (kks.length === 0) {
      setCekKk({ status: "idle" });
      return;
    }
    let batal = false;
    setCekKk({ status: "memeriksa" });
    const timer = setTimeout(async () => {
      try {
        const hasil = await Promise.all(
          kks.map(async (kk) => {
            const res = await fetch(`/api/subsidi/cek?kk=${encodeURIComponent(kk)}`, { cache: "no-store" });
            let json: { ok?: boolean; pesan?: string } = {};
            try {
              json = (await res.json()) as { ok?: boolean; pesan?: string };
            } catch {}
            return { kk, resOk: res.ok, json };
          }),
        );
        if (batal) return;
        const gagal = hasil.find((h) => !h.resOk);
        if (gagal) {
          setCekKk({ status: "gagal", pesan: gagal.json.pesan ?? "Gagal memeriksa No. KK." });
          return;
        }
        const bentrok = hasil.find((h) => h.json.ok === false);
        if (bentrok) {
          setCekKk({
            status: "bentrok",
            pesan: bentrok.json.pesan ?? `KK ${bentrok.kk} sudah dipakai minggu ini.`,
          });
          return;
        }
        setCekKk({ status: "idle" });
      } catch {
        if (!batal) {
          setCekKk({
            status: "gagal",
            pesan: "Tidak bisa memeriksa No. KK. Server tetap akan memvalidasi saat menyimpan.",
          });
        }
      }
    }, 400);
    return () => {
      batal = true;
      clearTimeout(timer);
    };
  }, [adaSubsidi, kkLengkap, modeKk, kunciCek]);

  const cekBentrok = cekKk.status === "bentrok";
  const cekProses = cekKk.status === "memeriksa";

  // total nota asli dari semua nota yang sudah ditambahkan ke form
  const totalOcr = ditambah.reduce((a, key) => {
    const n = ocrNotas.find((x, i) => kunci(x, i) === key);
    return a + Number(n?.total ?? 0);
  }, 0);

  const jumlahDuplikat = ocrNotas.reduce(
    (a, n, i) => a + (duplikat[kunci(n, i)]?.status === "ada" ? 1 : 0),
    0,
  );
  const adaYangMemeriksa = ocrNotas.some((n, i) => duplikat[kunci(n, i)]?.status === "cek");

  return (
    <form action={buatNota} className="max-w-3xl">
      {ocrNotas.length > 0 && (
        <div className="mb-6 rounded border border-garis p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold">
              Hasil OCR: {ocrNotas.length} nota · {used.length} pernah ditambahkan
            </p>
            <div className="flex items-center gap-3">
              <Button type="button" size="sm" onClick={tambahSemua} disabled={adaYangMemeriksa}>
                <span className="fas fa-layer-group mr-1.5" aria-hidden="true" />
                {adaYangMemeriksa ? "Memeriksa..." : "Tambahkan semua"}
              </Button>
              <button type="button" onClick={buangOcr} className="text-sm font-semibold text-merah underline">
                Buang semua
              </button>
            </div>
          </div>

          {jumlahDuplikat > 0 && (
            <Alert tone="merah">
              {jumlahDuplikat} nota terdeteksi <b>sudah pernah diinput</b> (item, tanggal, jam, dan total
              sama). Nota seperti ini akan dilewati saat memakai tombol “Tambahkan semua”.
            </Alert>
          )}

          {ditambah.length > 0 && (
            <div className="mb-3 rounded border border-garis p-3 text-sm">
              <p className="font-semibold">
                {ditambah.length} nota ditambahkan ke form · total {rupiah(total)}
              </p>
              <p className="text-xs text-redup">Total nota asli {rupiah(totalOcr)}</p>
              {totalOcr !== total && (
                <p className="mt-1 font-semibold text-kuning">
                  Total form berbeda dengan total nota asli. Cek barang yang belum cocok, qty, dan harga.
                </p>
              )}
              <button type="button" onClick={kosongkanForm} className="mt-2 text-xs font-semibold text-merah underline">
                Kosongkan form
              </button>
            </div>
          )}

          <ul className="divide-y divide-garis">
            {ocrNotas.map((n, i) => {
              const key = kunci(n, i);
              const jumlah = ditambah.filter((k) => k === key).length;
              const pernah = used.includes(key);
              const dup = duplikat[key];
              const sudahDiinput = dup?.status === "ada";
              const memeriksa = dup?.status === "cek";
              const jam = jamPendek(n.jam);
              return (
                <li key={key} className="flex flex-wrap items-center justify-between gap-2 px-2 py-2 text-sm">
                  <div>
                    <p className="font-semibold">
                      {n.invoice_no ?? "(tanpa nomor)"}
                      {sudahDiinput ? (
                        <span className="ml-2 rounded bg-merah-muda px-1.5 py-0.5 text-xs font-semibold text-merah">
                          Sudah diinput
                        </span>
                      ) : jumlah > 0 ? (
                        <span className="ml-2 text-xs font-semibold text-redup">Di form{jumlah > 1 ? ` (${jumlah}x)` : ""}</span>
                      ) : pernah ? (
                        <span className="ml-2 text-xs font-semibold text-redup">Pernah ditambahkan</span>
                      ) : null}
                    </p>
                    <p className="text-xs text-redup">
                      {tanggalPendek(n.tanggal) ?? "tanggal tidak terbaca"}
                      {jam ? ` ${jam}` : ""} · {n.kasir ?? "-"} · {n.items.length} barang · {rupiah(Number(n.total ?? 0))}
                    </p>
                    {sudahDiinput && (
                      <p className="mt-0.5 text-xs font-semibold text-merah">
                        {dup.invoiceNo ? `Sama dengan ${dup.invoiceNo}` : "Sama dengan nota yang sudah tersimpan"}
                        {dup.jamCocok === null
                          ? " (tanggal, total, dan barang sama; jam tidak terbaca)"
                          : " (tanggal, jam, total, dan barang sama)"}
                      </p>
                    )}
                    {memeriksa && <p className="mt-0.5 text-xs text-redup">Memeriksa duplikat...</p>}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => tambahNota(n, key)}
                    disabled={memeriksa}
                  >
                    {memeriksa ? "Memeriksa..." : jumlah > 0 ? "Tambah lagi" : "Tambah ke form"}
                  </Button>
                </li>
              );
            })}
          </ul>
          <p className="hint mt-2">Barang nota ditambahkan ke tabel di bawah. Barang yang sama digabung qty-nya.</p>
        </div>
      )}

      {belumCocok.length > 0 && (
        <div className="mb-6 rounded border border-garis p-4 text-sm">
          <p className="font-semibold text-merah">
            {belumCocok.length} barang belum cocok. Pilih produknya, qty dan harga dari nota ikut terbawa:
          </p>
          <ul className="mt-2 space-y-3">
            {belumCocok.map((g, i) => (
              <li key={`${g.dari}-${g.nama}-${i}`} className="rounded border border-garis p-3">
                <p className="text-xs">
                  <span className="font-semibold">{g.nama}</span> · qty {g.qty} · {rupiah(g.harga)} · dari {g.dari}
                </p>
                <div className="mt-2">
                  <ProductSelect
                    options={products}
                    onPick={(id) => pilihManual(i, id)}
                    resetOnPick
                    placeholder="Cari produk yang sesuai"
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <label className="label" htmlFor="tambah_barang">Tambah barang</label>
      <ProductSelect inputId="tambah_barang" options={products} onPick={tambah} resetOnPick placeholder="Ketik nama barang, lalu pilih dari daftar" />

      <div className="mt-5">
        {lines.length === 0 ? (
          <p className="rounded border border-dashed border-garis px-4 py-8 text-center text-sm text-redup">Belum ada barang di nota ini.</p>
        ) : (
          <div className="space-y-3">
            {lines.map((l) => (
              <div key={l.product_id} className="rounded-lg border border-garis p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-start gap-2.5">
                    <ProductPhoto
                      src={l.foto_url}
                      className="h-12 w-12 rounded-md border border-garis"
                      iconClassName="text-sm"
                    />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 font-semibold text-sm">
                        <span>{l.item}</span>
                        {l.subsidi && <Badge tone="merah">Subsidi</Badge>}
                      </div>
                      {l.qty > l.stok && <div className="text-xs font-semibold text-kuning">Stok toko {angka(l.stok)}, qty melebihi stok</div>}
                    </div>
                  </div>
                  <button type="button" onClick={() => hapus(l.product_id)} className="text-xs font-semibold text-merah underline shrink-0" aria-label={`Hapus ${l.item}`}>
                    Hapus
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <label className="text-xs text-redup">Qty</label>
                    <Input
                      aria-label={`Qty ${l.item}`}
                      type="number"
                      min={1}
                      step={1}
                      value={l.qty}
                      onChange={(e) => ubah(l.product_id, { qty: Math.max(1, Math.floor(Number(e.target.value) || 1)) })}
                      className="text-right"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-redup">Harga (Rp)</label>
                    <Input
                      aria-label={`Harga ${l.item}`}
                      type="number"
                      min={0}
                      value={l.harga}
                      onChange={(e) => ubah(l.product_id, { harga: Math.max(0, Number(e.target.value) || 0) })}
                      className={`text-right ${l.harga <= 0 ? "border-merah" : ""}`}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-redup">Subtotal</label>
                    <div className="flex h-10 items-center justify-end font-semibold text-sm">{rupiah(l.qty * l.harga)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {adaHargaKosong && <p className="hint mt-2 text-merah">Ada barang dengan harga 0. Isi harga jual atau lengkapi di menu Produk.</p>}

      {adaSubsidi && (
        <div className="mt-5 rounded-lg border border-primary/40 bg-accent p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="border-primary bg-primary text-primary-foreground">Subsidi</Badge>
            <p className="text-sm font-semibold">Transaksi barang subsidi</p>
          </div>
          <p className="mt-1 text-xs leading-relaxed">
            {ATURAN_SUBSIDI} Wajib isi No. KK pembeli. Pilih satu KK untuk semua barang, atau isi
            KK berbeda untuk tiap barang.
          </p>

          <fieldset className="mt-3 space-y-1.5">
            <legend className="text-xs font-semibold">Cara input No. KK</legend>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="radio"
                name="kk_mode"
                value="bulk"
                checked={modeKk === "bulk"}
                onChange={() => ubahModeKk("bulk")}
                className="size-4 accent-merah"
              />
              Satu No. KK untuk semua barang subsidi
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="radio"
                name="kk_mode"
                value="per_item"
                checked={modeKk === "per_item"}
                onChange={() => ubahModeKk("per_item")}
                className="size-4 accent-merah"
              />
              No. KK berbeda untuk tiap barang
            </label>
          </fieldset>

          {modeKk === "bulk" ? (
            <div className="mt-3 max-w-xs space-y-1">
              <label htmlFor="no_kk" className="block text-xs font-semibold">
                No. KK / NIK (16 digit)
              </label>
              <Input
                id="no_kk"
                name="no_kk"
                inputMode="numeric"
                autoComplete="off"
                maxLength={KK_PANJANG}
                value={noKk}
                onChange={(e) => setNoKk(rapikanKK(e.target.value))}
                placeholder="Contoh: 3507123456780001"
                aria-invalid={(noKk.length > 0 && !kkLengkap) || cekBentrok}
                aria-describedby="no_kk_hint"
                className={(noKk.length > 0 && !kkLengkap) || cekBentrok ? "border-merah" : ""}
              />
              <p id="no_kk_hint" className={`hint ${noKk.length > 0 && !kkLengkap ? "text-merah" : ""}`}>
                {noKk.length}/{KK_PANJANG} digit
                {noKk.length > 0 && !kkLengkap ? " — No. KK harus tepat 16 digit angka." : ""}
              </p>
            </div>
          ) : (
            <div className="mt-3 space-y-3">
              {barisSubsidi.map((l) => {
                const nilai = kkBaris(l);
                const salah = nilai.length > 0 && !kkValid(nilai);
                return (
                  <div key={l.product_id} className="grid gap-2 sm:grid-cols-[1fr_16rem] sm:items-start">
                    <div className="pt-1 text-sm font-semibold">{l.item}</div>
                    <div className="space-y-1">
                      <label htmlFor={`kk_${l.product_id}`} className="block text-xs font-semibold">
                        No. KK / NIK (16 digit)
                      </label>
                      <Input
                        id={`kk_${l.product_id}`}
                        inputMode="numeric"
                        autoComplete="off"
                        maxLength={KK_PANJANG}
                        value={nilai}
                        onChange={(e) =>
                          setKkPerItem((cur) => ({
                            ...cur,
                            [l.product_id]: rapikanKK(e.target.value),
                          }))
                        }
                        placeholder="Contoh: 3507123456780001"
                        aria-invalid={salah}
                        className={`max-w-xs ${salah ? "border-merah" : ""}`}
                      />
                      <p className={`hint ${salah ? "text-merah" : ""}`}>
                        {nilai.length}/{KK_PANJANG} digit
                        {salah ? " — No. KK harus tepat 16 digit angka." : ""}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {cekProses && <p className="hint mt-2">Memeriksa pemakaian No. KK minggu ini...</p>}
          {cekBentrok && <p className="hint text-merah">{cekKk.pesan}</p>}
          {cekKk.status === "gagal" && <p className="hint text-kuning">{cekKk.pesan}</p>}
          <p className="mt-2 text-xs">
            Barang subsidi di nota ini: <span className="font-semibold">{daftarSubsidi.join(", ")}</span>
          </p>
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t-2 border-ink pt-4">
        <div>
          <p className="text-xs font-semibold text-redup">Total</p>
          <p className="font-display text-3xl font-bold">{rupiah(total)}</p>
          {adaSubsidi && <p className="mt-1 text-xs font-semibold text-redup">Termasuk barang subsidi · No. KK wajib</p>}
        </div>
        <input type="hidden" name="payload" value={payload} />
        <SubmitButton disabled={lines.length === 0 || belumLengkap || cekBentrok || cekProses}>Simpan nota</SubmitButton>
      </div>
      {belumLengkap && (
        <p className="hint mt-2 text-merah">
          {modeKk === "bulk"
            ? "Lengkapi No. KK 16 digit sebelum menyimpan nota subsidi."
            : "Lengkapi No. KK 16 digit untuk setiap barang subsidi sebelum menyimpan nota."}
        </p>
      )}
      {cekBentrok && (
        <p className="hint mt-2 text-merah">Gunakan No. KK lain atau hapus barang subsidi dari nota ini.</p>
      )}
    </form>
  );
}