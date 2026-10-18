import { PageHeader } from "@/components/ui";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty } from "@/components/ui";

export default function RiwayatLaporan() {
  return (
    <div className="space-y-6">
      <PageHeader title="Riwayat Laporan" sub="Daftar laporan harian yang sudah dibuat" />
      <Card>
        <CardHeader>
          <CardTitle>Riwayat</CardTitle>
        </CardHeader>
        <CardContent>
          <Empty>Belum ada laporan yang disimpan. Generate laporan pertama dari menu Laporan Karyawan.</Empty>
          <p className="text-xs text-redup mt-4">
            Catatan: Riwayat laporan akan disimpan ke database Supabase di versi berikutnya.
            Saat ini laporan di-generate on-demand dari data yang tersedia.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
