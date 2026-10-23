import { createClient } from "@/lib/supabase/server";
import {
  DEFAULT_OCR_BASE_URL,
  DEFAULT_OCR_MODEL,
  getOcrConfig,
  isOpenRouter,
  maskApiKey,
  type OcrConfig,
} from "@/lib/ocr-config";
import { Alert, Badge, PageHeader } from "@/components/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import SubmitButton from "@/components/SubmitButton";
import { simpanPengaturan, tesKoneksi } from "./actions";

export const dynamic = "force-dynamic";

const labelSumber: Record<OcrConfig["apiKeySource"] | OcrConfig["baseUrlSource"], string> = {
  database: "Database",
  env: "Environment",
  default: "Default",
  none: "Belum diisi",
};

export default async function PengaturanPage({
  searchParams,
}: {
  searchParams: Promise<{
    ok?: string;
    error?: string;
    tes?: string;
    ms?: string;
    model?: string;
  }>;
}) {
  const { ok, error, tes, ms, model } = await searchParams;
  const sb = await createClient();
  const cfg = await getOcrConfig(sb);
  const openrouter = isOpenRouter(cfg.baseUrl);

  return (
    <>
      <PageHeader
        title="Pengaturan OCR"
        sub="Atur koneksi OCR nota dan laporan. Perubahan langsung dipakai tanpa redeploy."
      />

      {error && <Alert tone="merah">{error}</Alert>}
      {ok === "1" && (
        <Alert tone="hijau">
          Pengaturan berhasil disimpan. Upload PDF nota/laporan berikutnya sudah memakai
          konfigurasi ini.
        </Alert>
      )}
      {tes === "ok" && (
        <Alert tone="hijau">
          Koneksi berhasil ke model <strong>{model || cfg.model}</strong>
          {ms ? ` dalam ${Number(ms).toLocaleString("id-ID")} ms` : ""}.
        </Alert>
      )}
      {!cfg.tableReady && (
        <Alert tone="kuning">
          {cfg.tableError ??
            "Tabel pengaturan belum siap. Jalankan supabase/pengaturan.sql di Supabase SQL Editor."}{" "}
          Sementara itu, OCR masih memakai konfigurasi environment.
        </Alert>
      )}

      <div className="grid max-w-5xl gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <form action={simpanPengaturan} className="grid gap-5">
          <div className="space-y-2">
            <Label htmlFor="base_url">Base URL API</Label>
            <Input
              id="base_url"
              name="base_url"
              type="url"
              defaultValue={cfg.baseUrl}
              placeholder={DEFAULT_OCR_BASE_URL}
              spellCheck={false}
            />
            <p className="text-xs text-redup">
              Untuk OpenRouter: <code>{DEFAULT_OCR_BASE_URL}</code>. Untuk endpoint lain, isi
              base URL yang kompatibel OpenAI (biasanya berakhiran <code>/v1</code>).
              Kosongkan untuk memakai default/environment.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="api_key">API key</Label>
            <Input
              id="api_key"
              name="api_key"
              type="password"
              autoComplete="new-password"
              placeholder={
                cfg.apiKey
                  ? "Biarkan kosong untuk mempertahankan key yang ada"
                  : "sk-or-v1-..."
              }
            />
            <p className="text-xs text-redup">
              Status:{" "}
              <strong>
                {cfg.apiKeySource === "none"
                  ? "belum diisi"
                  : `${maskApiKey(cfg.apiKey)} (${labelSumber[cfg.apiKeySource]})`}
              </strong>
              . Key lengkap tidak pernah dikirim ke browser.
              {cfg.apiKeySource === "none" && (
                <>
                  {" "}
                  <a
                    href="https://openrouter.ai/keys"
                    target="_blank"
                    rel="noreferrer"
                    className="underline"
                  >
                    Buat API key OpenRouter
                  </a>
                  .
                </>
              )}
            </p>
            {cfg.apiKeySource === "env" && (
              <p className="text-xs text-redup">
                Key saat ini berasal dari environment. Isi kolom di atas bila ingin
                menyimpannya ke database.
              </p>
            )}
            {cfg.apiKeySource === "database" && (
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="hapus_key" className="size-4 accent-merah" />
                Hapus key dari database (kembali memakai environment bila ada)
              </label>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="model">Model OCR</Label>
            <Input
              id="model"
              name="model"
              defaultValue={cfg.model}
              placeholder={DEFAULT_OCR_MODEL}
              spellCheck={false}
            />
            <p className="text-xs text-redup">
              Default <code>{DEFAULT_OCR_MODEL}</code>. Untuk OpenRouter, daftar model ada di{" "}
              <a
                href="https://openrouter.ai/models?modality=image"
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                openrouter.ai/models
              </a>
              . Kosongkan untuk memakai default/environment.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reasoning">Reasoning</Label>
            <select
              id="reasoning"
              name="reasoning"
              defaultValue={cfg.reasoning}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="auto">auto — tidak mengirim parameter (disarankan)</option>
              <option value="off">off — matikan reasoning</option>
              <option value="low">low — effort rendah</option>
              <option value="medium">medium — effort sedang</option>
              <option value="high">high — effort tinggi</option>
              <option value="max">max — effort maksimal</option>
              <option value="on">on — aktifkan reasoning</option>
            </select>
            <p className="text-xs text-redup">
              Hanya dikirim ke OpenRouter. Untuk model non-reasoning seperti Qwen3-VL,
              biarkan <code>auto</code>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <SubmitButton>Simpan pengaturan</SubmitButton>
            <Button type="submit" formAction={tesKoneksi} variant="outline">
              Tes koneksi
            </Button>
            <span className="text-xs text-redup">
              Tes memakai isi form saat ini, belum harus disimpan.
            </span>
          </div>
        </form>

        <aside className="h-fit rounded-lg border border-border bg-muted/30 p-4">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">
            Status konfigurasi
          </h2>
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-xs text-redup">Provider</dt>
              <dd className="flex items-center gap-2 font-semibold">
                {openrouter ? "OpenRouter" : "Kustom / OpenAI-compatible"}
                <Badge tone={cfg.tableReady ? "hijau" : "kuning"}>
                  {cfg.tableReady ? "Database siap" : "Belum migrasi"}
                </Badge>
              </dd>
            </div>
            <div>
              <dt className="text-xs text-redup">Base URL</dt>
              <dd className="break-all font-medium">{cfg.baseUrl}</dd>
              <dd className="text-xs text-redup">Sumber: {labelSumber[cfg.baseUrlSource]}</dd>
            </div>
            <div>
              <dt className="text-xs text-redup">API key</dt>
              <dd className="font-medium">
                {cfg.apiKeySource === "none" ? "Belum diisi" : maskApiKey(cfg.apiKey)}
              </dd>
              <dd className="text-xs text-redup">Sumber: {labelSumber[cfg.apiKeySource]}</dd>
            </div>
            <div>
              <dt className="text-xs text-redup">Model</dt>
              <dd className="break-all font-medium">{cfg.model}</dd>
              <dd className="text-xs text-redup">Sumber: {labelSumber[cfg.modelSource]}</dd>
            </div>
            <div>
              <dt className="text-xs text-redup">Reasoning</dt>
              <dd className="font-medium">{cfg.reasoning}</dd>
              <dd className="text-xs text-redup">Sumber: {labelSumber[cfg.reasoningSource]}</dd>
            </div>
          </dl>
          <p className="mt-4 border-t border-border pt-3 text-xs text-redup">
            Pengaturan ini dipakai OCR nota di menu Penjualan dan OCR laporan/absensi.
            Kalau Base URL/API key dikosongkan, OCR laporan memakai{" "}
            <code>GEMINI_API_KEY</code> sebagai fallback.
          </p>
        </aside>
      </div>
    </>
  );
}
