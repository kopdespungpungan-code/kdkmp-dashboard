import { PageHeader } from "@/components/ui";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type CheckItem = { id: string; label: string; done: boolean };

const checklist: CheckItem[] = [
  { id: "lantai", label: "Lantai toko dilepas dan dibersihkan", done: false },
  { id: "rak", label: "Rak produk dirapikan dan debu dibersihkan", done: false },
  { id: "kasir", label: "Area kasir dibersihkan dari sisa nota", done: false },
  { id: "kaca", label: "Kaca toko dan pintu berkilau", done: false },
  { id: "sampah", label: "Tempat sampah dibuang dan diganti plastik", done: false },
  { id: "toilet", label: "Kamar kecil toko bersih dan berbau wangi", done: false },
  { id: "pendingin", label: "Pendingin/kipas dikeringkan dari uap", done: false },
];

export default function KebersihanChecklist() {
  return (
    <div className="space-y-6">
      <PageHeader title="Checklist Kebersihan" sub="Tandai setiap item yang sudah selesai dilakukan" />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>🧹</span> Daftar Pembersihan Harian
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-2">
            {checklist.map((item) => (
              <div key={item.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 border border-garis rounded-lg">
                <span className="text-sm">{item.label}</span>
                <Badge tone={item.done ? "hijau" : "abu"} className="self-start sm:self-center">
                  {item.done ? "Selesai" : "Belum"}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
        <CardFooter>
          <Button variant="outline" className="w-full">
            Simpan Checklist
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Standar Kebersihan</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc list-inside text-sm text-redup space-y-2">
            <li>Pembersihan dilakukan minimal 2 kali sehari (pagi dan sore).</li>
            <li>Rak produk harus rapi, tidak ada barang yang tumpah.</li>
            <li>Lantai tidak boleh licin setelah dibersihkan.</li>
            <li>Tempat sampah harus dibuang sebelum penutup toko.</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
