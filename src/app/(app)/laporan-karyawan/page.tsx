import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUpload, faFileSignature, faClockRotateLeft } from "@fortawesome/free-solid-svg-icons";

const menu = [
  {
    href: "/laporan-karyawan/upload",
    label: "Upload Dokumen",
    desc: "Upload PDF atau gambar laporan/absensi karyawan, lalu ekstrak data (OCR).",
    icon: faUpload,
  },
  {
    href: "/laporan-karyawan/generate",
    label: "Generate Laporan",
    desc: "Buat laporan harian siap ditandatangani dari data yang sudah diekstrak.",
    icon: faFileSignature,
  },
  {
    href: "/laporan-karyawan/riwayat",
    label: "Riwayat Laporan",
    desc: "Lihat laporan yang sudah dibuat.",
    icon: faClockRotateLeft,
  },
];

export default function LaporanKaryawan() {
  return (
    <div className="space-y-6">
      <PageHeader title="Laporan Karyawan" sub="Upload dokumen, ekstrak data, dan generate laporan harian siap TTD" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {menu.map((item) => (
          <Card key={item.href}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FontAwesomeIcon icon={item.icon} className="text-primary" />
                {item.label}
              </CardTitle>
              <CardDescription>{item.desc}</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Button asChild className="w-full">
                <Link href={item.href}>Buka</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
