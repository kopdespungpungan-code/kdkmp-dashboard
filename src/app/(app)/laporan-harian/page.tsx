import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function LaporanHarian() {
  return (
    <div className="space-y-6">
      <PageHeader title="Laporan Harian" sub="Kelola laporan operasional toko setiap hari" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          {
            href: "/laporan-harian/summary",
            label: "Summary",
            desc: "Ringkasan harian penjualan, stok, dan keuangan",
            icon: "📊",
          },
          {
            href: "/laporan-harian/so",
            label: "SOP",
            desc: "Standar Operasi Prosedur harian toko",
            icon: "📋",
          },
          {
            href: "/laporan-harian/kebersihan",
            label: "Kebersihan Checklist",
            desc: "Checklist kebersihan harian toko",
            icon: "🧹",
          },
          {
            href: "/laporan-harian/absensi",
            label: "Absensi",
            desc: "Absensi karyawan internal dan Agrinas",
            icon: "👥",
          },
          {
            href: "/laporan-harian/keuangan",
            label: "Keuangan",
            desc: "Pemasukan dan pengeluaran harian",
            icon: "💰",
          },
          {
            href: "/laporan-harian/rekomendasi",
            label: "Rekomendasi Catatan Harian",
            desc: "Catatan dan rekomendasi harian",
            icon: "📝",
          },
        ].map((item) => (
          <Card key={item.href}>
            <CardHeader>
              <CardTitle className="text-lg">{item.icon} {item.label}</CardTitle>
              <CardDescription className="text-sm">{item.desc}</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Button asChild className="w-full">
                <a href={item.href}>Buka</a>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
