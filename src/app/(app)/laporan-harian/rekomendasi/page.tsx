import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const rekomendasi = [
  {
    judul: "Perhatikan produk hampir expired",
    isi: "Ada produk yang akan expired dalam 60 hari. Pindahkan ke depan rak dan pertimbangkan diskon kecil agar cepat laku.",
    prioritas: "Tinggi",
  },
  {
    judul: "Stok menipis di rak",
    isi: "Beberapa produk laris mulai menipis. Segera opname dan pesan ulang ke supplier sebelum habis.",
    prioritas: "Tinggi",
  },
  {
    judul: "Review penjualan minggu ini",
    isi: "Bandingkan omzet minggu ini dengan minggu lalu. Identifikasi produk yang naik dan turun penjualannya.",
    prioritas: "Sedang",
  },
  {
    judul: "Bersihkan area pendingin",
    isi: "Pastikan kulkas dan pendingin toko bersih dari uap air agar awet dan hemat listrik.",
    prioritas: "Rendah",
  },
];

export default function RekomendasiCatatanHarian() {
  return (
    <div className="space-y-6">
      <PageHeader title="Rekomendasi Catatan Harian" sub="Catatan dan saran operasi untuk toko hari ini" />

      <Card>
        <CardHeader>
          <CardTitle>Tambah Catatan Baru</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="judul">Judul catatan</Label>
              <Input id="judul" placeholder="Misal: Stok sabun menipis" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="isi">Isi catatan</Label>
              <Textarea id="isi" rows={4} placeholder="Tulis catatan atau rekomendasi di sini..." />
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Select>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Prioritas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tinggi">Tinggi</SelectItem>
                  <SelectItem value="sedang">Sedang</SelectItem>
                  <SelectItem value="rendah">Rendah</SelectItem>
                </SelectContent>
              </Select>
              <Button type="submit" className="w-full sm:w-auto">Simpan</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rekomendasi Otomatis</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-4">
            {rekomendasi.map((r) => (
              <div key={r.judul} className="p-3 border border-garis rounded-lg">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h4 className="font-semibold text-sm">{r.judul}</h4>
                  <Badge tone={r.prioritas === "Tinggi" ? "merah" : r.prioritas === "Sedang" ? "kuning" : "hijau"}>
                    {r.prioritas}
                  </Badge>
                </div>
                <p className="text-sm text-redup">{r.isi}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Panduan Catatan Harian</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc list-inside text-sm text-redup space-y-2">
            <li>Tulis catatan setiap hari setelah penutup toko.</li>
            <li>Sebutkan masalah stok, pelanggan, atau operasional yang ditemukan.</li>
            <li>Berikan prioritas tinggi pada hal yang memerlukan tindakan segera.</li>
            <li>Catatan dapat digunakan untuk evaluasi akhir bulan.</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
