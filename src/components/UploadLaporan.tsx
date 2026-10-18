"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Alert } from "@/components/ui";

const MAX_PAGES = 20;

async function ocrBatch(images: string[]) {
  const res = await fetch("/api/ocr-laporan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ images }),
  });
  const raw = await res.text();
  let json: any = {};
  try { json = JSON.parse(raw); } catch {}
  if (!res.ok) throw new Error(json.error ?? `Server membalas ${res.status}`);
  return json;
}

export default function UploadLaporan() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const router = useRouter();

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const isPdf = file.type === "application/pdf";
    const isImage = file.type.startsWith("image/");
    if (!isPdf && !isImage) return setErr("File harus PDF atau gambar (JPG/PNG).");
    if (file.size > 20 * 1024 * 1024) return setErr("Maksimal 20 MB.");

    setLoading(true);
    setErr(null);
    setProgress(0);

    try {
      const images: string[] = [];

      if (isPdf) {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url,
        ).toString();

        const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
        const total = Math.min(pdf.numPages, MAX_PAGES);

        for (let p = 1; p <= total; p++) {
          setStatus(`Membaca halaman ${p} dari ${total}...`);
          setProgress(Math.round((p / total) * 50));
          const page = await pdf.getPage(p);
          const viewport = page.getViewport({ scale: 1.5 });
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          await page.render({ canvasContext: canvas.getContext("2d")!, viewport }).promise;
          images.push(canvas.toDataURL("image/jpeg", 0.8));
        }
      } else {
        setStatus("Membaca gambar...");
        setProgress(30);
        const reader = new FileReader();
        const dataUrl = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        images.push(dataUrl);
        setProgress(50);
      }

      setStatus("Mengekstrak data dengan OCR...");
      setProgress(70);
      const result = await ocrBatch(images);
      setProgress(100);

      sessionStorage.setItem("ocr_laporan", JSON.stringify(result));
      router.push("/laporan-karyawan/preview");
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
      setStatus(null);
      setProgress(0);
    }
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col items-center gap-4">
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,image/*"
            hidden
            onChange={onPick}
          />
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={() => inputRef.current?.click()}
            className="w-full sm:w-auto"
          >
            {loading ? status ?? "Memproses..." : "Upload PDF / Gambar"}
          </Button>
          {loading && <Progress value={progress} className="w-full" />}
          {err && <Alert>{err}</Alert>}
          <p className="text-xs text-redup text-center">
            Format: PDF, JPG, PNG. Maksimal 20 MB. Hasil OCR akan ditampilkan untuk dikoreksi.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
