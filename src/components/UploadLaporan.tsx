"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { OcrLoadingOverlay, type OcrPageInfo, type OcrPhase } from "@/components/OcrLoadingOverlay";
import { OcrErrorToast } from "@/components/OcrErrorToast";

const MAX_PAGES = 20;

async function ocrBatch(images: string[]) {
  const res = await fetch("/api/ocr-laporan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ images }),
  });
  const raw = await res.text();
  let json: any = {};
  try {
    json = JSON.parse(raw);
  } catch {}
  if (!res.ok) throw new Error(json.error ?? `Server membalas ${res.status}`);
  return json;
}

export default function UploadLaporan() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<OcrPhase>("read");
  const [fileName, setFileName] = useState("");
  const [pageInfo, setPageInfo] = useState<OcrPageInfo>(null);
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
    setFileName(file.name);
    setProgress(4);
    setPhase("read");
    setPageInfo(null);

    try {
      const images: string[] = [];
      let totalPages = 1;

      if (isPdf) {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url,
        ).toString();

        const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
        totalPages = Math.min(pdf.numPages, MAX_PAGES);
        setProgress(10);

        for (let p = 1; p <= totalPages; p++) {
          setPhase("render");
          setPageInfo({ start: p, end: p, total: totalPages });
          setProgress(10 + ((p - 1) / totalPages) * 40);

          const page = await pdf.getPage(p);
          const viewport = page.getViewport({ scale: 1.5 });
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          await page.render({ canvasContext: canvas.getContext("2d")!, viewport }).promise;
          images.push(canvas.toDataURL("image/jpeg", 0.8));
        }
        setProgress(50);
      } else {
        setPhase("read");
        setProgress(20);
        const reader = new FileReader();
        const dataUrl = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        images.push(dataUrl);
        setProgress(50);
      }

      setPhase("ocr");
      setPageInfo({ start: 1, end: totalPages, total: totalPages });
      setProgress(60);
      const result = await ocrBatch(images);

      setPhase("finish");
      setProgress(94);
      sessionStorage.setItem("ocr_laporan", JSON.stringify(result));
      setProgress(100);
      await new Promise((resolve) => setTimeout(resolve, 350));
      router.push("/laporan-karyawan/upload");
    } catch (e: any) {
      setErr(e?.message || "Gagal membaca dokumen.");
    } finally {
      setLoading(false);
      setProgress(0);
      setPhase("read");
      setPageInfo(null);
    }
  }

  return (
    <>
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
              {loading ? "OCR berjalan..." : "Upload PDF / Gambar"}
            </Button>
            <p className="text-xs text-redup text-center">
              Format: PDF, JPG, PNG. Maksimal 20 MB. Hasil OCR akan ditampilkan untuk dikoreksi.
            </p>
          </div>
        </CardContent>
      </Card>

      <OcrLoadingOverlay
        open={loading}
        phase={phase}
        progress={progress}
        fileName={fileName}
        pageInfo={pageInfo}
      />
      <OcrErrorToast message={err} onClose={() => setErr(null)} title="OCR laporan gagal" />
    </>
  );
}
