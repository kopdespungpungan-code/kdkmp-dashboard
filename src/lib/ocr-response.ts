/**
 * Ambil teks dari balasan OpenAI-compatible, baik JSON biasa maupun streaming SSE.
 * Dipakai OCR nota dan OCR laporan.
 */
export function extractOcrContent(raw: string): string {
  const t = raw.trim();
  if (!t.startsWith("data:")) {
    return JSON.parse(t).choices?.[0]?.message?.content ?? "";
  }
  let out = "";
  for (const line of t.split("\n")) {
    const s = line.trim();
    if (!s.startsWith("data:")) continue;
    const payload = s.slice(5).trim();
    if (!payload || payload === "[DONE]") continue;
    try {
      const j = JSON.parse(payload);
      const c = j.choices?.[0];
      out += c?.delta?.content ?? c?.message?.content ?? "";
    } catch {}
  }
  return out;
}
