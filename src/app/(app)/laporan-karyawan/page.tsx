import { PageHeader } from "@/components/ui";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function LaporanKaryawan() {
  return (
    <div className="space-y-6">
      <PageHeader title="Laporan Karyawan" sub="Upload dokumen, ekstrak data, dan generate laporan harian siap TTD" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>📤 Upload Dokumen</CardTitle>
            <CardDescription>Upload PDF atau gambar laporan/absensi karyawan</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <Button asChild className="w-full">
              <Link href="/laporan-karyawan/upload">Upload</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>📋 Generate Laporan</CardTitle>
            <CardDescription>Buat laporan harian siap ditandatangani</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <Button asChild className="w-full">
              <Link href="/laporan-karyawan/generate">Generate</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>📁 Riwayat Laporan</CardTitle>
            <CardDescription>Lihat laporan yang sudah dibuat</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <Button asChild variant="outline" className="w-full">
              <Link href="/laporan-karyawan/riwayat">Lihat</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Panduan</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside text-sm text-redup space-y-2">
            <li>Upload dokumen PDF/gambar dari karyawan (absensi, laporan, struk).</li>
            <li>Sistem akan mengekstrak data secara otomatis (OCR).</li>
            <li>Koreksi data jika ada kesalahan.</li>
            <li>Generate laporan harian yang siap ditandatangani.</li>
            <li>Print laporan dan tanda tangan manual, atau simpan digital.</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
