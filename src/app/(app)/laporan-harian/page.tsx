"use client";
import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export default function LaporanHarian() {
  return (
    <div className="space-y-6">
      <PageHeader title="Laporan Harian" sub="Kelola laporan operasional toko setiap hari" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          {
            href: "/laporan-harian/harian",
            label: "Laporan Harian",
            desc: "1 klik generate: ringkasan penjualan, stok, keuangan, TTD",
            icon: "fa-file-signature",
          },
          {
            href: "/laporan-harian/so-gondola",
            label: "SO Gondola",
            desc: "Stock Opname per gondola (setiap 3 hari), input qty fisik",
            icon: "fa-warehouse",
          },
          {
            href: "/laporan-harian/so-harian",
            label: "SO Harian",
            desc: "Surat order & stok real fisik harian siap cetak",
            icon: "fa-clipboard-check",
          },
          {
            href: "/laporan-harian/summary",
            label: "Summary",
            desc: "Ringkasan harian penjualan, stok, dan keuangan",
            icon: "fa-chart-simple",
          },
          {
            href: "/laporan-harian/keuangan",
            label: "Keuangan",
            desc: "Pemasukan dan pengeluaran harian",
            icon: "fa-money-bill",
          },
          {
            href: "/laporan-harian/absensi",
            label: "Absensi",
            desc: "Absensi karyawan internal dan Agrinas",
            icon: "fa-users",
          },
          {
            href: "/laporan-harian/kebersihan",
            label: "Kebersihan",
            desc: "Checklist kebersihan harian toko",
            icon: "fa-broom",
          },
          {
            href: "/laporan-harian/so",
            label: "SOP",
            desc: "Standar Operasi Prosedur harian toko",
            icon: "fa-list-check",
          },
          {
            href: "/laporan-harian/rekomendasi",
            label: "Rekomendasi",
            desc: "Catatan dan rekomendasi harian",
            icon: "fa-lightbulb",
          },
        ].map((item) => (
          <motion.div
            key={item.href}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <span className={`fas ${item.icon} text-primary`} aria-hidden="true" />
                  {item.label}
                </CardTitle>
                <CardDescription className="text-sm">{item.desc}</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Button asChild className="w-full">
                  <a href={item.href}>Buka</a>
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
