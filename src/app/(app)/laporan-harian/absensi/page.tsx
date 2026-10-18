"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/ui";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { todayWIB } from "@/lib/format";

type JenisAbsensi = "internal" | "agrinas";
type StatusAbsensi = "belum" | "masuk" | "pulang";

type Karyawan = {
  id: string;
  nama: string;
  jenis: JenisAbsensi;
  jabatan: string;
};

const KARYAWAN: Karyawan[] = [
  { id: "1", nama: "Budi Santoso", jenis: "internal", jabatan: "Kasir" },
  { id: "2", nama: "Siti Rahayu", jenis: "internal", jabatan: "Gudang" },
  { id: "3", nama: "Ahmad Fauzi", jenis: "agrinas", jabatan: "Mitra Agrinas" },
  { id: "4", nama: "Dewi Lestari", jenis: "agrinas", jabatan: "Mitra Agrinas" },
];

type AbsensiRecord = {
  karyawanId: string;
  tanggal: string;
  jamMasuk: string | null;
  jamKeluar: string | null;
};

function nowWIB(): string {
  return new Date().toLocaleTimeString("id-ID", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit" });
}

export default function Absensi() {
  const [records, setRecords] = useState<AbsensiRecord[]>([]);
  const today = todayWIB();
  const now = nowWIB();

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`absensi_${today}`);
      if (saved) setRecords(JSON.parse(saved));
    } catch {}
  }, [today]);

  const save = useCallback((next: AbsensiRecord[]) => {
    setRecords(next);
    try {
      localStorage.setItem(`absensi_${today}`, JSON.stringify(next));
    } catch {}
  }, [today]);

  const getRecord = (karyawanId: string) =>
    records.find((r) => r.karyawanId === karyawanId && r.tanggal === today);

  const checkIn = (karyawanId: string) => {
    const rec = getRecord(karyawanId);
    if (rec?.jamMasuk) return;
    save(
      records.map((r) =>
        r.karyawanId === karyawanId && r.tanggal === today ? { ...r, jamMasuk: now } : r
      ),
    );
    if (!rec) save([...records, { karyawanId, tanggal: today, jamMasuk: now, jamKeluar: null }]);
  };

  const checkOut = (karyawanId: string) => {
    const rec = getRecord(karyawanId);
    if (!rec || !rec.jamMasuk || rec.jamKeluar) return;
    save(
      records.map((r) =>
        r.karyawanId === karyawanId && r.tanggal === today ? { ...r, jamKeluar: now } : r
      ),
    );
  };

  const statusFor = (karyawanId: string): StatusAbsensi => {
    const rec = getRecord(karyawanId);
    if (!rec) return "belum";
    if (rec.jamMasuk && !rec.jamKeluar) return "masuk";
    if (rec.jamMasuk && rec.jamKeluar) return "pulang";
    return "belum";
  };

  const statusLabel = (s: StatusAbsensi) => {
    if (s === "masuk") return { label: "Masuk", tone: "hijau" as const };
    if (s === "pulang") return { label: "Pulang", tone: "abu" as const };
    return { label: "Belum Absen", tone: "merah" as const };
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Absensi Harian" sub={`${today} • Internal & Agrinas`} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {["internal", "agrinas"].map((jenis) => {
          const list = KARYAWAN.filter((k) => k.jenis === jenis);
          const total = list.length;
          const masuk = list.filter((k) => statusFor(k.id) === "masuk").length;
          const pulang = list.filter((k) => statusFor(k.id) === "pulang").length;
          const belum = total - masuk - pulang;
          return (
            <Card key={jenis}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {jenis === "internal" ? "🏢" : "🤝"} {jenis === "internal" ? "Internal" : "Agrinas"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="text-xs text-redup">Masuk</div>
                    <div className="font-semibold text-hijau">{masuk}</div>
                  </div>
                  <div>
                    <div className="text-xs text-redup">Pulang</div>
                    <div className="font-semibold text-redup">{pulang}</div>
                  </div>
                  <div>
                    <div className="text-xs text-redup">Belum</div>
                    <div className="font-semibold text-merah">{belum}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>👥</span> Daftar Karyawan
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-2">
            {KARYAWAN.map((k) => {
              const st = statusFor(k.id);
              const sl = statusLabel(st);
              const isMasuk = st === "masuk";
              const isPulang = st === "pulang";
              return (
                <div key={k.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 border border-garis rounded-lg">
                  <div className="flex flex-col gap-1">
                    <div className="font-semibold text-sm">{k.nama}</div>
                    <div className="text-xs text-redup">{k.jabatan} • {k.jenis}</div>
                  </div>
                  <Badge tone={sl.tone} className="sm:shrink-0">
                    {sl.label}
                  </Badge>
                  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    {!isMasuk && !isPulang && (
                      <Button size="sm" className="w-full sm:w-auto" onClick={() => checkIn(k.id)}>
                        Masuk
                      </Button>
                    )}
                    {isMasuk && (
                      <Button size="sm" variant="outline" className="w-full sm:w-auto" onClick={() => checkOut(k.id)}>
                        Keluar
                      </Button>
                    )}
                    {isPulang && (
                      <Button size="sm" variant="outline" disabled className="w-full sm:w-auto">
                        Selesai
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Keterangan</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc list-inside text-sm text-redup space-y-1">
            <li>Absensi internal untuk karyawan tetap toko.</li>
            <li>Absensi Agrinas untuk mitra/mitra kerja sama.</li>
            <li>Data disimpan di browser (localStorage). Pindahkan ke Supabase untuk produksi.</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
