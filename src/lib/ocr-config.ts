import type { SupabaseClient } from "@supabase/supabase-js";

export const DEFAULT_OCR_BASE_URL = "https://openrouter.ai/api/v1";
export const DEFAULT_OCR_MODEL = "qwen/qwen3-vl-30b-a3b-instruct";
export const DEFAULT_OCR_REASONING = "auto";

export const OCR_REASONING_OPTIONS = [
  "auto",
  "off",
  "low",
  "medium",
  "high",
  "max",
  "on",
] as const;

export type OcrConfig = {
  baseUrl: string;
  apiKey: string;
  model: string;
  reasoning: string;
  baseUrlSource: "database" | "env" | "default";
  apiKeySource: "database" | "env" | "none";
  modelSource: "database" | "env" | "default";
  reasoningSource: "database" | "env" | "default";
  tableReady: boolean;
  tableError?: string;
};

/** Rapikan base URL: buang spasi/trailing slash dan endpoint chat yang tidak sengaja ditempel. */
export function rapikanBaseUrl(value: string): string {
  return value
    .trim()
    .replace(/\/+$/, "")
    .replace(/\/chat\/completions$/i, "");
}

/** Hanya HTTPS; HTTP diperbolehkan untuk localhost saat pengembangan. */
export function validOcrBaseUrl(value: string): boolean {
  if (!value) return true;
  try {
    const u = new URL(value);
    if (u.username || u.password || u.search || u.hash) return false;
    if (u.protocol === "https:") return true;
    return (
      u.protocol === "http:" &&
      ["localhost", "127.0.0.1", "::1"].includes(u.hostname.toLowerCase())
    );
  } catch {
    return false;
  }
}

export function isOpenRouter(baseUrl: string): boolean {
  try {
    const host = new URL(baseUrl).hostname.toLowerCase();
    return host === "openrouter.ai" || host.endsWith(".openrouter.ai");
  } catch {
    return false;
  }
}

export function maskApiKey(key: string): string {
  if (!key) return "";
  if (key.length <= 8) return "••••••••";
  return `••••••••${key.slice(-4)}`;
}

/** Parameter reasoning hanya untuk OpenRouter; auto = jangan kirim apa pun. */
export function reasoningBody(reasoning: string): Record<string, unknown> | null {
  const r = reasoning.trim().toLowerCase();
  if (!r || r === "auto") return null;
  if (r === "off") return { enabled: false };
  if (r === "on") return { enabled: true };
  if (["low", "medium", "high", "max"].includes(r)) return { effort: r };
  return null;
}

export function ocrHeaders(baseUrl: string, apiKey: string): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };
  if (isOpenRouter(baseUrl)) {
    // Atribusi opsional OpenRouter (tidak dipakai untuk autentikasi).
    headers["HTTP-Referer"] =
      process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
    headers["X-Title"] = "KDKMP Dashboard";
  }
  return headers;
}

/**
 * Baca konfigurasi OCR dari tabel app_settings.
 * Bila tabel belum dibuat, otomatis memakai environment lama supaya OCR tetap jalan.
 */
export async function getOcrConfig(sb: SupabaseClient): Promise<OcrConfig> {
  let row: {
    ocr_base_url?: string | null;
    ocr_api_key?: string | null;
    ocr_model?: string | null;
    ocr_reasoning?: string | null;
  } | null = null;
  let tableReady = false;
  let tableError: string | undefined;

  const { data, error } = await sb
    .from("app_settings")
    .select("ocr_base_url, ocr_api_key, ocr_model, ocr_reasoning")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    const pesan = error.message ?? "";
    if (
      error.code === "42P01" ||
      error.code === "PGRST205" ||
      /app_settings|schema cache|does not exist/i.test(pesan)
    ) {
      tableError = "Tabel app_settings belum ada. Jalankan supabase/pengaturan.sql di Supabase SQL Editor.";
    } else {
      tableError = pesan || "Gagal membaca pengaturan.";
    }
  } else {
    tableReady = true;
    row = data;
  }

  const dbBase = String(row?.ocr_base_url ?? "").trim();
  const dbKey = String(row?.ocr_api_key ?? "").trim();
  const dbModel = String(row?.ocr_model ?? "").trim();
  const dbReasoning = String(row?.ocr_reasoning ?? "").trim();

  const envOpenRouterKey = process.env.OPENROUTER_API_KEY?.trim() ?? "";
  const envBase = process.env.OCR_BASE_URL?.trim() ?? "";
  const envKey = process.env.OCR_API_KEY?.trim() ?? "";

  // Tanpa pengaturan database: OpenRouter dipakai kalau key OpenRouter tersedia,
  // kalau tidak pakai endpoint lama OCR_BASE_URL.
  const baseUrl = rapikanBaseUrl(
    dbBase || (envOpenRouterKey ? DEFAULT_OCR_BASE_URL : envBase) || DEFAULT_OCR_BASE_URL,
  );
  const pakaiOpenRouter = isOpenRouter(baseUrl);
  // Jangan campur key OpenRouter dengan endpoint kustom (dan sebaliknya).
  const envKeyForBase = pakaiOpenRouter ? envOpenRouterKey : envKey;
  const apiKey = dbKey || envKeyForBase;

  const envModel = pakaiOpenRouter
    ? process.env.OPENROUTER_OCR_MODEL?.trim()
    : process.env.OCR_MODEL?.trim();
  const model = dbModel || envModel || (pakaiOpenRouter ? DEFAULT_OCR_MODEL : "newgrafity");

  const envReasoning = process.env.OPENROUTER_OCR_REASONING?.trim();
  const reasoning = dbReasoning || envReasoning || DEFAULT_OCR_REASONING;

  const baseUrlSource: OcrConfig["baseUrlSource"] = dbBase
    ? "database"
    : envBase && !envOpenRouterKey
      ? "env"
      : "default";
  const apiKeySource: OcrConfig["apiKeySource"] = dbKey
    ? "database"
    : envKeyForBase
      ? "env"
      : "none";
  const modelSource: OcrConfig["modelSource"] = dbModel
    ? "database"
    : envModel
      ? "env"
      : "default";
  const reasoningSource: OcrConfig["reasoningSource"] = dbReasoning
    ? "database"
    : envReasoning
      ? "env"
      : "default";

  return {
    baseUrl,
    apiKey,
    model,
    reasoning,
    baseUrlSource,
    apiKeySource,
    modelSource,
    reasoningSource,
    tableReady,
    tableError,
  };
}
