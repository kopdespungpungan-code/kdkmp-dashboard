"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui";
import UploadLaporan from "@/components/UploadLaporan";
import { Skeleton } from "@/components/ui/skeleton";

type ExtractedData = {
  jenis_dokumen?: string;
  tanggal?: string;
  karyawan?: { nama: string; jabatan?: string; status?: string; jam_masuk?: string; jam_keluar?: string }[];
  ringkasan?: string;
  catatan?: string;
  error?: string;
};

export default function UploadLaporanPage() {
  const router = useRouter();
  const [data, setData] = useState<ExtractedData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("ocr_laporan");
      if (saved) {
        setData(JSON.parse(saved));
      }
    } catch {}
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Upload Dokumen" sub="Ekstrak data dari PDF atau gambar" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <PageHeader title="Upload Dokumen" sub="Ekstrak data dari PDF atau gambar" />
        <UploadLaporan />
      </div>
    );
  }

  if (data.error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Upload Dokumen" sub="Ekstrak data dari PDF atau gambar" />
        <Alert>{data.error}</Alert>
        <Button variant="outline" onClick={() => { sessionStorage.removeItem("ocr_laporan"); setData(null); }}>
          Upload Ulang
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Preview Hasil OCR" sub="Koreksi data jika perlu, lalu generate laporan" />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            📄 {data.jenis_dokumen ?? "Dokumen"}
            {data.tanggal && <Badge tone="abu">{data.tanggal}</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {data.ringkasan && (
            <div>
              <Label>Ringkasan</Label>
              <Textarea defaultValue={data.ringkasan} rows={2} />
            </div>
          )}

          {data.karyawan && data.karyawan.length > 0 && (
            <div className="space-y-3">
              <Label>Daftar Karyawan</Label>
              {data.karyawan.map((k, i) => (
                <Card key={i} className="border-garis">
                  <CardContent className="p-4">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <Label className="text-xs text-redup">Nama</Label>
                        <Input defaultValue={k.nama} />
                      </div>
                      <div>
                        <Label className="text-xs text-redup">Jabatan</Label>
                        <Input defaultValue={k.jabatan ?? ""} />
                      </div>
                      <div>
                        <Label className="text-xs text-redup">Status</Label>
                        <Input defaultValue={k.status ?? ""} />
                      </div>
                      <div>
                        <Label className="text-xs text-redup">Jam Masuk</Label>
                        <Input defaultValue={k.jam_masuk ?? ""} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {data.catatan && (
            <div>
              <Label>Catatan</Label>
              <Textarea defaultValue={data.catatan} rows={2} />
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => { sessionStorage.removeItem("ocr_laporan"); setData(null); }}
            >
              Upload Ulang
            </Button>
            <Button
              onClick={() => {
                sessionStorage.setItem("laporan_siap", JSON.stringify(data));
                router.push("/laporan-karyawan/generate");
              }}
            >
              Generate Laporan
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
