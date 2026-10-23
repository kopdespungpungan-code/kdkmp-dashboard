import { createClient } from "@supabase/supabase-js";

export type LandingTopProduct = {
  item: string;
  pcs: number;
  omzet: number;
};

export type LandingStats = {
  total_omzet: number;
  total_nota: number;
  total_pcs: number;
  top_produk: LandingTopProduct[];
};

const angkaAman = (value: unknown): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Statistik landing page diambil lewat RPC `landing_stats` yang hanya
 * mengembalikan agregat (omzet, jumlah nota, pcs, dan nama produk terlaris).
 * RPC ini dibuat oleh `supabase/landing_stats.sql` dan boleh diakses anon.
 */
export async function getLandingStats(): Promise<LandingStats | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) return null;

  try {
    const supabase = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await supabase.rpc("landing_stats");
    if (error || !data) return null;

    const raw = data as Record<string, unknown>;
    const top = Array.isArray(raw.top_produk) ? raw.top_produk : [];

    return {
      total_omzet: angkaAman(raw.total_omzet),
      total_nota: angkaAman(raw.total_nota),
      total_pcs: angkaAman(raw.total_pcs),
      top_produk: top
        .map((row) => {
          const item = row as Record<string, unknown>;
          return {
            item: String(item.item ?? "").trim(),
            pcs: angkaAman(item.pcs),
            omzet: angkaAman(item.omzet),
          };
        })
        .filter((item) => item.item.length > 0)
        .slice(0, 5),
    };
  } catch {
    return null;
  }
}
