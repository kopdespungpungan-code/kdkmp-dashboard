import { daysBetween, todayWIB } from "./format";

export type Tone = "merah" | "kuning" | "hijau" | "abu";
export type Status = { label: string; tone: Tone };

export function statusStok(total: number, min: number | null, expired: string | null): Status[] {
  const out: Status[] = [];
  if (total <= 0) out.push({ label: total < 0 ? "Stok minus" : "Habis", tone: "merah" });
  else if (min != null && total <= min) out.push({ label: "Menipis", tone: "kuning" });

  if (expired) {
    const sisa = daysBetween(todayWIB(), expired);
    if (sisa < 0) out.push({ label: "Kedaluwarsa", tone: "merah" });
    else if (sisa <= 60) out.push({ label: `Expired ${sisa} hari`, tone: "kuning" });
  }
  if (out.length === 0) out.push({ label: "Aman", tone: "hijau" });
  return out;
}
