"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faClipboardList,
  faPlus,
  faTrash,
  faFloppyDisk,
  faBox,
  faCircleCheck,
} from "@fortawesome/free-solid-svg-icons";
import { angka, tglTanggal, todayWIB } from "@/lib/format";
import { PETUGAS, TINGKAT, cariPetugas } from "@/lib/petugas";
import { simpanSo, type ItemSo } from "./actions";

export type ProdukOpt = {
  id: number;
  item: string;
  sku: string | null;
  gramasi: string | null;
  stok_toko: number;
  expired_terdekat: string | null;
};

type Baris = {
  key: number;
  produk_id: string;
  qty_fisik: string;
  rusak_exp: string;
  keterangan: string;
};

let seq = 1;
const barisKosong = (): Baris => ({ key: seq++, produk_id: "", qty_fisik: "", rusak_exp: "", keterangan: "" });

// Gaya <select> bawaan HTML (pengganti komponen Select Radix).
const selectClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";
const selectClassHemat =
  "flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

export default function SoProdukClient({ produk }: { produk: ProdukOpt[] }) {
  const router = useRouter();
  const [petugasKey, setPetugasKey] = useState("");
  const [gondolaNo, setGondolaNo] = useState("");
  const [gondolaLokasi, setGondolaLokasi] = useState("");
  const [tingkat, setTingkat] = useState("1");
  const [tanggal, setTanggal] = useState(todayWIB());
  const [baris, setBaris] = useState<Baris[]>([barisKosong()]);
  const [pesan, setPesan] = useState<{ jenis: "ok" | "err"; teks: string } | null>(null);
  const [pending, start] = useTransition();

  const info = petugasKey ? cariPetugas(petugasKey) : undefined;
  const pakaiGondola = !!info && info.gondolas.length > 0;
  const wilayah = pakaiGondola ? gondolaNo : gondolaLokasi;
  const siapInput = !!petugasKey && !!wilayah;
  const petaProduk = useMemo(() => new Map(produk.map((p) => [String(p.id), p])), [produk]);

  const ubahBaris = (key: number, patch: Partial<Baris>) =>
    setBaris((prev) => prev.map((b) => (b.key === key ? { ...b, ...patch } : b)));

  const gantiPetugas = (v: string) => {
    setPetugasKey(v);
    setGondolaNo("");
    setGondolaLokasi("");
    setPesan(null);
  };

  const selisih = (b: Baris) => {
    const p = petaProduk.get(b.produk_id);
    const fisik = parseInt(b.qty_fisik, 10);
    if (!p || isNaN(fisik)) return null;
    return fisik - p.stok_toko;
  };

  const daftarProdukTerpakai = baris.map((b) => b.produk_id).filter(Boolean);

  const simpan = () => {
    setPesan(null);
    if (!info || !wilayah) return setPesan({ jenis: "err", teks: "Pilih petugas dan gondola/lokasi dulu." });

    const items: ItemSo[] = [];
    for (const b of baris) {
      if (!b.produk_id) continue;
      if (daftarProdukTerpakai.filter((x) => x === b.produk_id).length > 1) {
        return setPesan({ jenis: "err", teks: "Ada barang yang tercatat dua kali. Hapus salah satunya." });
      }
      const p = petaProduk.get(b.produk_id);
      const fisik = parseInt(b.qty_fisik, 10);
      if (isNaN(fisik) || fisik < 0) {
        return setPesan({ jenis: "err", teks: `Isi Qty Fisik untuk "${p?.item ?? "barang"}".` });
      }
      items.push({
        produk_id: Number(b.produk_id),
        qty_fisik: fisik,
        stok_sistem: p?.stok_toko ?? 0,
        expired: p?.expired_terdekat ?? null,
        rusak_exp: parseInt(b.rusak_exp, 10) || 0,
        keterangan: b.keterangan || null,
      });
    }
    if (items.length === 0) return setPesan({ jenis: "err", teks: "Belum ada barang yang diisi." });

    start(async () => {
      const res = await simpanSo({
        tanggal,
        petugas: petugasKey,
        gondola_no: pakaiGondola ? Number(gondolaNo) : null,
        gondola_lokasi: pakaiGondola ? "" : gondolaLokasi,
        tingkat: Number(tingkat),
        items,
      });
      if (res.ok) {
        setPesan({
          jenis: "ok",
          teks: `Tersimpan: ${res.jumlah} barang.${res.peringatan ? ` ${res.peringatan}` : ""}`,
        });
        setBaris([barisKosong()]);
        router.refresh();
      } else {
        setPesan({ jenis: "err", teks: res.error });
      }
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Input SO" sub="Stock Opname per petugas, mengikuti format Excel SO Grocery" />

      {pesan && (
        <div
          role="alert"
          className={`rounded border px-3 py-2 text-sm ${
            pesan.jenis === "ok"
              ? "border-hijau/40 bg-hijau-muda text-hijau"
              : "border-primary/40 bg-accent text-accent-foreground"
          }`}
        >
          {pesan.teks}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FontAwesomeIcon icon={faClipboardList} className="text-primary" />
            Konfigurasi SO
          </CardTitle>
          <CardDescription>Pilih petugas, gondola/lokasi, tingkat, dan tanggal hitung.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="petugas">Nama Petugas</Label>
              <select
                id="petugas"
                value={petugasKey}
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
              <Label htmlFor="wilayah">{pakaiGondola ? "Gondola" : "Lokasi"}</Label>
              <select
                id="wilayah"
                value={gondolaNo || gondolaLokasi}
                disabled={!petugasKey}
                onChange={(e) => {
                  const v = e.target.value;
                  if (pakaiGondola) setGondolaNo(v);
                  else setGondolaLokasi(v);
                }}
                className={selectClass}
              >
                <option value="">{pakaiGondola ? "Pilih gondola" : "Pilih lokasi"}</option>
                {info?.gondolas.map((g) => (
                  <option key={g} value={String(g)}>Gondola {g}</option>
                ))}
                {info?.lokasi.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
              {!petugasKey && <p className="text-xs text-muted-foreground">Pilih petugas dulu.</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="tingkat">Tingkat</Label>
              <select
                id="tingkat"
                value={tingkat}
                onChange={(e) => setTingkat(e.target.value)}
                className={selectClass}
              >
                {TINGKAT.map((t) => (
                  <option key={t} value={String(t)}>Tingkat {t}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tanggal">Tanggal Hitung</Label>
              <Input id="tanggal" type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FontAwesomeIcon icon={faBox} className="text-primary" />
            Daftar Barang
          </CardTitle>
          <CardDescription>
            Pilih barang dari dropdown, isi Qty Fisik (pcs). Selisih dihitung otomatis dari stok sistem toko.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {!siapInput ? (
            <p className="rounded border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
              Pilih petugas dan gondola/lokasi untuk mulai mengisi.
            </p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted text-muted-foreground">
                      <th className="p-2 text-left">No</th>
                      <th className="p-2 text-left">Nama Barang</th>
                      <th className="p-2 text-right">Stok Sistem</th>
                      <th className="p-2 text-center">Qty Fisik</th>
                      <th className="p-2 text-right">Selisih</th>
                      <th className="p-2 text-center">Rusak/EXP</th>
                      <th className="p-2 text-left">Keterangan</th>
                      <th className="p-2 text-center">Expired</th>
                      <th className="p-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {baris.map((b, idx) => {
                      const p = petaProduk.get(b.produk_id);
                      const sl = selisih(b);
                      return (
                        <tr key={b.key} className="border-b border-border align-top">
                          <td className="p-2 text-muted-foreground">{idx + 1}</td>
                          <td className="p-2 min-w-[220px]">
                            <select
                              value={b.produk_id}
                              onChange={(e) => ubahBaris(b.key, { produk_id: e.target.value })}
                              className={selectClassHemat}
                            >
                              <option value="">Pilih barang...</option>
                              {produk.map((pr) => (
                                <option key={pr.id} value={String(pr.id)}>
                                  {pr.item}{pr.gramasi ? ` - ${pr.gramasi}` : ""}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="p-2 text-right font-mono">{p ? angka(p.stok_toko) : "-"}</td>
                          <td className="p-2 w-24">
                            <Input
                              type="number"
                              min={0}
                              inputMode="numeric"
                              value={b.qty_fisik}
                              onChange={(e) => ubahBaris(b.key, { qty_fisik: e.target.value })}
                              className="h-9 text-center"
                              placeholder="0"
                            />
                          </td>
                          <td
                            className={`p-2 text-right font-semibold ${
                              sl == null
                                ? "text-muted-foreground"
                                : sl === 0
                                  ? "text-hijau"
                                  : sl < 0
                                    ? "text-destructive"
                                    : "text-primary"
                            }`}
                          >
                            {sl == null ? "-" : (sl >= 0 ? "+" : "") + angka(sl)}
                          </td>
                          <td className="p-2 w-20">
                            <Input
                              type="number"
                              min={0}
                              inputMode="numeric"
                              value={b.rusak_exp}
                              onChange={(e) => ubahBaris(b.key, { rusak_exp: e.target.value })}
                              className="h-9 text-center"
                              placeholder="0"
                            />
                          </td>
                          <td className="p-2 min-w-[140px]">
                            <Input
                              value={b.keterangan}
                              onChange={(e) => ubahBaris(b.key, { keterangan: e.target.value })}
                              className="h-9"
                              placeholder="opsional"
                            />
                          </td>
                          <td className="p-2 text-center text-xs text-muted-foreground whitespace-nowrap">
                            {p?.expired_terdekat ? tglTanggal(p.expired_terdekat) : "-"}
                          </td>
                          <td className="p-2 text-center">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              aria-label="Hapus baris"
                              onClick={() => setBaris((prev) => (prev.length === 1 ? [barisKosong()] : prev.filter((x) => x.key !== b.key)))}
                            >
                              <FontAwesomeIcon icon={faTrash} className="text-muted-foreground" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <Button type="button" variant="outline" onClick={() => setBaris((prev) => [...prev, barisKosong()])}>
                  <FontAwesomeIcon icon={faPlus} className="mr-2" />
                  Tambah Baris
                </Button>
                <Button type="button" onClick={simpan} disabled={pending}>
                  <FontAwesomeIcon icon={pending ? faCircleCheck : faFloppyDisk} className="mr-2" />
                  {pending ? "Menyimpan..." : "Simpan SO"}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
