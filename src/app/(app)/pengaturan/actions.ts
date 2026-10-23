"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getOcrConfig,
  isOpenRouter,
  OCR_REASONING_OPTIONS,
  ocrHeaders,
  rapikanBaseUrl,
  reasoningBody,
  validOcrBaseUrl,
} from "@/lib/ocr-config";

function bad(msg: string): never {
  redirect(`/pengaturan?error=${encodeURIComponent(msg)}`);
}

function pesanSkema(msg: string): string {
  if (/app_settings|schema cache|does not exist/i.test(msg)) {
    return "Tabel pengaturan belum ada. Jalankan supabase/pengaturan.sql di Supabase SQL Editor.";
  }
  return msg;
}

export async function simpanPengaturan(formData: FormData) {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect("/login");

  const rawBase = String(formData.get("base_url") ?? "").trim();
  const baseUrl = rawBase ? rapikanBaseUrl(rawBase) : "";
  if (!validOcrBaseUrl(baseUrl)) {
    bad("Base URL harus diawali https:// (http:// hanya untuk localhost).");
  }

  const model = String(formData.get("model") ?? "").trim();
  const reasoning = String(formData.get("reasoning") ?? "").trim().toLowerCase() || "auto";
  if (!(OCR_REASONING_OPTIONS as readonly string[]).includes(reasoning)) {
    bad("Pilihan reasoning tidak valid.");
  }

  const apiKeyInput = String(formData.get("api_key") ?? "").trim();
  const hapusKey = formData.get("hapus_key") === "on";
  if (hapusKey && apiKeyInput) {
    bad("Pilih salah satu: isi API key baru atau centang hapus key.");
  }

  const { data: existing, error: bacaErr } = await sb
    .from("app_settings")
    .select("ocr_api_key")
    .eq("id", 1)
    .maybeSingle();
  if (bacaErr) bad(pesanSkema(bacaErr.message));

  // Kolom key kosong = pertahankan yang sudah tersimpan.
  const keyFinal = hapusKey ? null : apiKeyInput || existing?.ocr_api_key?.trim() || null;

  const { error } = await sb.from("app_settings").upsert(
    {
      id: 1,
      ocr_base_url: baseUrl || null,
      ocr_api_key: keyFinal,
      ocr_model: model || null,
      ocr_reasoning: reasoning,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  if (error) bad(pesanSkema(error.message));

  revalidatePath("/pengaturan");
  redirect("/pengaturan?ok=1");
}

export async function tesKoneksi(formData: FormData) {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect("/login");

  const cfg = await getOcrConfig(sb);

  const rawBase = String(formData.get("base_url") ?? "").trim();
  const baseUrl = rawBase ? rapikanBaseUrl(rawBase) : cfg.baseUrl;
  if (!validOcrBaseUrl(baseUrl)) {
    bad("Base URL harus diawali https:// (http:// hanya untuk localhost).");
  }

  const hapusKey = formData.get("hapus_key") === "on";
  const apiKeyInput = String(formData.get("api_key") ?? "").trim();
  if (hapusKey && apiKeyInput) {
    bad("Pilih salah satu: isi API key baru atau centang hapus key.");
  }
  const apiKey = apiKeyInput || (hapusKey ? "" : cfg.apiKey);
  if (!apiKey) bad("API key belum diisi.");

  const model = String(formData.get("model") ?? "").trim() || cfg.model;
  const reasoning = String(formData.get("reasoning") ?? "").trim().toLowerCase() || cfg.reasoning;

  const body: Record<string, unknown> = {
    model,
    temperature: 0,
    max_tokens: 8,
    messages: [{ role: "user", content: "Balas hanya dengan: OK" }],
  };
  if (isOpenRouter(baseUrl)) {
    const r = reasoningBody(reasoning);
    if (r) body.reasoning = r;
  }

  const mulai = Date.now();
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: ocrHeaders(baseUrl, apiKey),
    signal: AbortSignal.timeout(20_000),
    body: JSON.stringify(body),
  }).catch((e: unknown) => {
    bad(`Koneksi gagal: ${e instanceof Error ? e.message : "tidak diketahui"}`);
  });

  const raw = await res.text();
  if (!res.ok) {
    bad(`Koneksi gagal (${res.status}): ${raw.slice(0, 300)}`);
  }

  const ms = Date.now() - mulai;
  redirect(`/pengaturan?tes=ok&ms=${ms}&model=${encodeURIComponent(model)}`);
}
