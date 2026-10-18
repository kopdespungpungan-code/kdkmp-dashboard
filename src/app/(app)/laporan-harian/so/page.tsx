import { PageHeader } from "@/components/ui";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const sopItems = [
  {
    waktu: "Pagi (07:00 - 09:00)",
    tasks: [
      "Buka toko dan nyalakan lampu / AC",
      "Periksa kerapian rak dan tampilan produk",
      "Turn over produk dekat expired ke depan",
      "Siapkan kasir dan kembalian",
      "Absensi masuk semua karyawan",
    ],
  },
  {
    waktu: "Siang (11:00 - 14:00)",
    tasks: [
      "Isi ulang rak dari gudang",
      "Periksa stok minimum produk laris",
      "Bersihkan lantai toko dan area kasir",
      "Kontrol suhu pendingin / chiller",
    ],
  },
  {
    waktu: "Sore (17:00 - 19:00)",
    tasks: [
      "Catat penjualan harian di laporan",
      "Buat nota retur jika ada",
      "Absensi pulang karyawan",
      "Kunci toko dan matikan semua listrik",
    ],
  },
];

export default function SOP() {
  return (
    <div className="space-y-6">
      <PageHeader title="Standar Operasi Prosedur (SOP)" sub="Rutin harian yang harus dilakukan di toko" />

      <div className="space-y-6">
        {sopItems.map((block) => (
          <Card key={block.waktu}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span>🕒</span> {block.waktu}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="space-y-2">
                {block.tasks.map((task, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm">
                    <span className="text-merah shrink-0">✓</span>
                    <span>{task}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Catatan Penting</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc list-inside text-sm text-redup space-y-2">
            <li>Selalu gunakan sarung tangan saat menangani produk basah.</li>
            <li>Jangan biarkan produk expired berada di rak depan.</li>
            <li>Laporkan stok minus ke pengurus segera.</li>
            <li>Simpan semua nota penjualan untuk audit akhir bulan.</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
