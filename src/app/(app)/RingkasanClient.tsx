"use client";

import Link from "next/link";
import { angka, rupiah, tglPanjang, tglPendek, tglTanggal, tglWaktu } from "@/lib/format";
import { statusStok } from "@/lib/stok";
import type { Tone } from "@/lib/stok";
import { Alert, Badge, Empty, PageHeader, Section } from "@/components/ui";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import OmzetChart from "@/components/OmzetChart";
import { motion } from "framer-motion";

type Harian = { tanggal: string; nota: number; pcs: number; omzet: number };
type Laris = { id: number; item: string; pcs: number; omzet: number };
type Perhatian = {
  id: number; sku: string | null; item: string; gramasi: string | null;
  stok_toko: number; stok_gudang: number; stok_total: number; stok_min: number | null; expired_terdekat: string | null;
};
type Ringkas = { jenis_produk: number; total_stok: number; menipis: number; habis: number; hampir_expired: number };
type Invoice = { id: number; invoice_no: string; tanggal: string; kasir: string | null; pcs: number; total: number };

type RingkasanClientProps = {
  today: string;
  r: Ringkas;
  chart: { label: string; omzet: number; hariIni: boolean }[];
  hari: Harian | undefined;
  omzet14: number;
  urut: Perhatian[];
  kpi: { label: string; value: string; big?: boolean }[];
  laris: Laris[];
  terakhir: Invoice[];
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export default function RingkasanClient({
  today,
  r,
  chart,
  hari,
  omzet14,
  urut,
  kpi,
  laris,
  terakhir,
}: RingkasanClientProps) {
  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <PageHeader title="Ringkasan" sub={tglPanjang(today)} />
      </motion.div>

      {/* KPI Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {kpi.map((k, idx) => (
            <motion.div
              key={k.label}
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              transition={{ delay: 0.1 + idx * 0.05 }}
              className="group"
            >
              <Card className="hover:border-primary/50 transition-colors">
                <CardHeader>
                  <CardTitle className="text-sm text-muted-foreground">{k.label}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className={`font-display font-bold ${k.big ? "text-2xl text-primary" : "text-xl"}`}>{k.value}</div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
          <Section title="Omzet 14 hari terakhir">
            <Card>
              <CardContent className="p-0">
                <div className="h-64 w-full p-4">
                  <OmzetChart data={chart} />
                </div>
              </CardContent>
            </Card>
          </Section>

          <Section title="Terlaris 30 hari">
            <Card>
              <CardContent className="p-0">
                {laris.length === 0 ? (
                  <Empty>Belum ada penjualan.</Empty>
                ) : (
                  <div className="divide-y divide-border">
                    {laris.slice(0, 8).map((p, idx) => (
                      <motion.div
                        key={p.id}
                        variants={cardVariants}
                        initial="hidden"
                        animate="visible"
                        transition={{ delay: 0.1 + idx * 0.05 }}
                        className="flex items-baseline justify-between gap-3 px-4 py-3"
                      >
                        <span className="min-w-0 truncate text-sm">{p.item}</span>
                        <span className="shrink-0 font-semibold text-sm">{angka(Number(p.pcs))} pcs</span>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </Section>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.3 }}
      >
        <Section
          title="Perlu perhatian"
          action={
            <Link href="/produk?f=perhatian" className="text-sm font-semibold text-primary underline">
              Lihat semua ({urut.length})
            </Link>
          }
        >
          <div className="mb-4 flex flex-wrap gap-2 text-sm">
            <Badge tone="merah">{angka(Number(r.habis))} habis atau minus</Badge>
            <Badge tone="kuning">{angka(Number(r.menipis))} menipis</Badge>
            <Badge tone="kuning">{angka(Number(r.hampir_expired))} hampir expired</Badge>
            <span className="self-center text-muted-foreground">
              dari {angka(Number(r.jenis_produk))} produk, total {angka(Number(r.total_stok))} pcs
            </span>
          </div>
          {urut.length === 0 ? (
            <Empty>Semua stok aman.</Empty>
          ) : (
            <div className="space-y-3">
              {urut.map((p, idx) => {
                const status = statusStok(p.stok_total, p.stok_min, p.expired_terdekat);
                return (
                  <motion.div
                    key={p.id}
                    variants={cardVariants}
                    initial="hidden"
                    animate="visible"
                    transition={{ delay: 0.1 + idx * 0.05 }}
                  >
                    <Card>
                      <CardHeader className="p-4">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                          <div>
                            <Link href={`/produk/${p.id}`} className="font-semibold hover:underline text-sm">
                              {p.item}
                            </Link>
                            {p.sku && <span className="text-xs text-muted-foreground">{p.sku}</span>}
                          </div>
                          <div className="flex gap-1">
                            {status.map((s) => (
                              <Badge key={s.label} tone={s.tone as Tone}>
                                {s.label}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="px-4 pb-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <div className="text-xs text-muted-foreground">Toko</div>
                            <div className="font-semibold">{angka(p.stok_toko)}</div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">Gudang</div>
                            <div className="font-semibold">{angka(p.stok_gudang)}</div>
                          </div>
                        </div>
                        {p.expired_terdekat && (
                          <div className="mt-3 text-xs text-muted-foreground">
                            Expired: {tglTanggal(p.expired_terdekat)}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </Section>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.4 }}
      >
        <Section title="Nota terakhir" action={<Link href="/penjualan" className="text-sm font-semibold text-primary underline">Semua nota</Link>}>
          {terakhir.length === 0 ? (
            <Empty>Belum ada nota. Buat nota pertama dari menu Penjualan.</Empty>
          ) : (
            <div className="space-y-3">
              {terakhir.map((n) => (
                <motion.div
                  key={n.id}
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  transition={{ delay: 0.1 }}
                >
                  <Card>
                    <CardHeader className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <Link href={`/penjualan/${n.id}`} className="font-semibold hover:underline text-sm">
                            {n.invoice_no}
                          </Link>
                          <div className="text-xs text-muted-foreground">{tglWaktu(n.tanggal)}</div>
                          {n.kasir && <div className="text-xs text-muted-foreground">{n.kasir}</div>}
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-semibold text-sm">{rupiah(Number(n.total))}</div>
                          <div className="text-xs text-muted-foreground">{angka(Number(n.pcs))} pcs</div>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </Section>
      </motion.div>
    </div>
  );
}
