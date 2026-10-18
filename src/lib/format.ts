const TZ = "Asia/Jakarta";

export const rupiah = (n: number | null | undefined) =>
  n == null
    ? "-"
    : new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

export const angka = (n: number | null | undefined) =>
  n == null ? "-" : new Intl.NumberFormat("id-ID").format(n);

/** 'YYYY-MM-DD' menurut WIB */
export function ymdWIB(d: Date | string = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(typeof d === "string" ? new Date(d) : d);
}

export const todayWIB = () => ymdWIB(new Date());

export function addDays(ymd: string, n: number): string {
  const d = new Date(`${ymd}T12:00:00+07:00`);
  d.setUTCDate(d.getUTCDate() + n);
  return ymdWIB(d);
}

export function daysBetween(fromYmd: string, toYmd: string): number {
  const a = new Date(`${fromYmd}T12:00:00+07:00`).getTime();
  const b = new Date(`${toYmd}T12:00:00+07:00`).getTime();
  return Math.round((b - a) / 86400000);
}

export function tglPanjang(ymd: string): string {
  return new Intl.DateTimeFormat("id-ID", { timeZone: TZ, weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(
    new Date(`${ymd}T12:00:00+07:00`)
  );
}

export function tglPendek(ymd: string): string {
  return new Intl.DateTimeFormat("id-ID", { timeZone: TZ, day: "numeric", month: "short" }).format(new Date(`${ymd}T12:00:00+07:00`));
}

export function tglTanggal(ymd: string | null): string {
  if (!ymd) return "-";
  return new Intl.DateTimeFormat("id-ID", { timeZone: TZ, day: "numeric", month: "short", year: "numeric" }).format(
    new Date(`${ymd}T12:00:00+07:00`)
  );
}

export function tglWaktu(iso: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: TZ,
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}
