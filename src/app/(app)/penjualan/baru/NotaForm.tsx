"use client";
import { useEffect, useState } from "react";
import ProductSelect from "@/components/ProductSelect";
import SubmitButton from "@/components/SubmitButton";
import { angka, rupiah } from "@/lib/format";
import { Input } from "@/components/ui/input";
import type { ProductOpt } from "@/lib/types";
import { clearOcrNotas, loadOcrNotas, matchProduk, type OcrNota } from "@/lib/ocr-nota";
import { buatNota } from "./actions";
import { Button } from "@/components/ui/button";

type Line = { product_id: number; item: string; stok: number; qty: number; harga: number };
type Gagal = { nama: string; qty: number; harga: number; dari: string };

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

  useEffect(() => {
    setOcrNotas(loadOcrNotas());
    setUsed(loadUsed());
  }, []);

  function tambahNota(n: OcrNota, key: string) {
    if (ditambah.includes(key) && !window.confirm("Nota ini sudah ada di form. Tambahkan lagi?")) return;
    if (!ditambah.includes(key) && used.includes(key) && !window.confirm("Nota ini sudah pernah ditambahkan sebelumnya. Tambahkan lagi?")) return;

    const baru: Line[] = [];
    const gagal: Gagal[] = [];
    for (const it of n.items) {
      const qty = Math.max(1, Math.floor(Number(it.qty) || 1));
      const hargaOcr = Number(it.harga) || 0;
      const p = matchProduk(it.nama, products, (x) => x.item);
      if (!p) {
        gagal.push({ nama: it.nama, qty, harga: hargaOcr, dari: n.invoice_no ?? "(tanpa nomor)" });
        continue;
      }
      const harga = hargaOcr > 0 ? hargaOcr : Number(p.harga_jual ?? 0);
      const ada = baru.find((l) => l.product_id === p.id);
      if (ada) ada.qty += qty;
      else baru.push({ product_id: p.id, item: p.item, stok: p.stok_toko ?? 0, qty, harga });
    }

    // tambahkan ke bawah tabel; barang yang sama -> qty ditambah
    setLines((cur) => {
      const next = cur.map((l) => ({ ...l }));
      for (const b of baru) {
        const ada = next.find((l) => l.product_id === b.product_id);
        if (ada) ada.qty += b.qty;
        else next.push(b);
      }
      return next;
    });
    setBelumCocok((cur) => [...cur, ...gagal]);
    setDitambah((cur) => [...cur, key]);

    const nextUsed = used.includes(key) ? used : [...used, key];
    setUsed(nextUsed);
    sessionStorage.setItem(USED_KEY, JSON.stringify(nextUsed));
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
      return [...cur, { product_id: id, item: p.item, stok: p.stok_toko ?? 0, qty: g.qty, harga }];
    });
    setBelumCocok((cur) => cur.filter((_, i) => i !== index));
  }

  function tambah(id: number) {
    const p = products.find((x) => x.id === id);
    if (!p) return;
    setLines((cur) => {
      const ada = cur.find((l) => l.product_id === id);
      if (ada) return cur.map((l) => (l.product_id === id ? { ...l, qty: l.qty + 1 } : l));
      return [...cur, { product_id: id, item: p.item, stok: p.stok_toko ?? 0, qty: 1, harga: Number(p.harga_jual ?? 0) }];
    });
  }
  const ubah = (id: number, patch: Partial<Line>) => setLines((cur) => cur.map((l) => (l.product_id === id ? { ...l, ...patch } : l)));
  const hapus = (id: number) => setLines((cur) => cur.filter((l) => l.product_id !== id));

  const total = lines.reduce((a, l) => a + l.qty * l.harga, 0);
  const payload = JSON.stringify(lines.map((l) => ({ product_id: l.product_id, qty: l.qty, harga: l.harga })));
  const adaHargaKosong = lines.some((l) => l.harga <= 0);

  // total nota asli dari semua nota yang sudah ditambahkan ke form
  const totalOcr = ditambah.reduce((a, key) => {
    const n = ocrNotas.find((x, i) => kunci(x, i) === key);
    return a + Number(n?.total ?? 0);
  }, 0);

  return (
    <form action={buatNota} className="max-w-3xl">
      {ocrNotas.length > 0 && (
        <div className="mb-6 rounded border border-garis p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-sm font-semibold">
              Hasil OCR: {ocrNotas.length} nota · {used.length} pernah ditambahkan
            </p>
            <button type="button" onClick={buangOcr} className="text-sm font-semibold text-merah underline">
              Buang semua
            </button>
          </div>

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
              return (
                <li key={key} className="flex flex-wrap items-center justify-between gap-2 px-2 py-2 text-sm">
                  <div>
                    <p className="font-semibold">
                      {n.invoice_no ?? "(tanpa nomor)"}
                      {jumlah > 0 ? (
                        <span className="ml-2 text-xs font-semibold text-redup">Di form{jumlah > 1 ? ` (${jumlah}x)` : ""}</span>
                      ) : pernah ? (
                        <span className="ml-2 text-xs font-semibold text-redup">Pernah ditambahkan</span>
                      ) : null}
                    </p>
                    <p className="text-xs text-redup">
                      {n.tanggal ?? "tanggal tidak terbaca"} · {n.kasir ?? "-"} · {n.items.length} barang · {rupiah(Number(n.total ?? 0))}
                    </p>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={() => tambahNota(n, key)}>
                    {jumlah > 0 ? "Tambah lagi" : "Tambah ke form"}
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

      <label className="label">Tambah barang</label>
      <ProductSelect options={products} onPick={tambah} resetOnPick placeholder="Ketik nama barang, lalu pilih dari daftar" />

      <div className="mt-5">
        {lines.length === 0 ? (
          <p className="rounded border border-dashed border-garis px-4 py-8 text-center text-sm text-redup">Belum ada barang di nota ini.</p>
        ) : (
          <div className="space-y-3">
            {lines.map((l) => (
              <div key={l.product_id} className="rounded-lg border border-garis p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold text-sm">{l.item}</div>
                    {l.qty > l.stok && <div className="text-xs font-semibold text-kuning">Stok toko {angka(l.stok)}, qty melebihi stok</div>}
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

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t-2 border-ink pt-4">
        <div>
          <p className="text-xs font-semibold text-redup">Total</p>
          <p className="font-display text-3xl font-bold">{rupiah(total)}</p>
        </div>
        <input type="hidden" name="payload" value={payload} />
        <SubmitButton disabled={lines.length === 0}>Simpan nota</SubmitButton>
      </div>
    </form>
  );
}