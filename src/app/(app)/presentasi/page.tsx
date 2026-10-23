import { createClient } from "@/lib/supabase/server";
import { addDays, angka, rupiah, tglPanjang, tglWaktu, todayWIB } from "@/lib/format";

export const dynamic = "force-dynamic";

type Ringkas = { jenis_produk: number; total_stok: number; menipis: number; habis: number; hampir_expired: number };
type Harian = { tanggal: string; nota: number; pcs: number; omzet: number };
type Laris = { id: number; item: string; pcs: number; omzet: number };
type Perhatian = { id: number; item: string; stok_toko: number; stok_gudang: number; stok_total: number; stok_min: number | null; expired_terdekat: string | null };
type Invoice = { id: number; invoice_no: string; tanggal: string; kasir: string | null; pcs: number; total: number };

export default async function PresentasiPage() {
  const sb = await createClient();
  const today = todayWIB();
  const start30 = addDays(today, -29);
  const start7 = addDays(today, -6);
  const { mulai: mingguMulai } = mingguBerjalanWIB();

  const [ring, harian30, laris, perhatian, terakhir, kkMinggu] = await Promise.all([
    sb.from("v_ringkasan_stok").select("*").single(),
    sb.from("v_omzet_harian").select("*").gte("tanggal", start30).order("tanggal"),
    sb.from("v_terlaris_30hari").select("*").limit(5),
    sb.from("v_perlu_perhatian").select("*").limit(20),
    sb.from("v_total_invoice").select("*").order("tanggal", { ascending: false }).limit(10),
    sb.from("sale_kk").select("no_kk").gte("tanggal", mingguMulai),
  ]);

  const r = (ring.data ?? {}) as Ringkas;
  const rows30 = (harian30.data ?? []) as Harian[];
  const omzet30 = rows30.reduce((a, b) => a + Number(b.omzet ?? 0), 0);
  const nota30 = rows30.reduce((a, b) => a + Number(b.nota ?? 0), 0);
  const pcs30 = rows30.reduce((a, b) => a + Number(b.pcs ?? 0), 0);

  const rows7 = rows30.filter((x) => x.tanggal >= start7);
  const omzet7 = rows7.reduce((a, b) => a + Number(b.omzet ?? 0), 0);
  const nota7 = rows7.reduce((a, b) => a + Number(b.nota ?? 0), 0);

  const todayRow = rows30.find((x) => x.tanggal === today);
  const omzetHari = Number(todayRow?.omzet ?? 0);
  const notaHari = Number(todayRow?.nota ?? 0);
  const pcsHari = Number(todayRow?.pcs ?? 0);

  const kkUnik = new Set((kkMinggu.data ?? []).map((x: any) => x.no_kk)).size;

  const urut = ((perhatian.data ?? []) as Perhatian[])
    .sort((a, b) => {
      const pa = a.stok_total <= 0 ? 0 : 1;
      const pb = b.stok_total <= 0 ? 0 : 1;
      if (pa !== pb) return pa - pb;
      return (a.expired_terdekat ?? "9999").localeCompare(b.expired_terdekat ?? "9999");
    })
    .slice(0, 8);

  const maxLaris = Math.max(...((laris.data ?? []) as Laris[]).map((x) => Number(x.pcs)), 1);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-6 space-y-6">
      {/* Header presentasi */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b-2 border-primary pb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Presentasi Pengawas</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Ringkasan Operasional KDKMP Pungpungan</h1>
          <p className="mt-1 text-sm text-muted-foreground">{tglPanjang(today)} · Data live dari dashboard</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            {r.habis ?? 0} habis · {r.menipis ?? 0} menipis · {r.hampir_expired ?? 0} expired
          </span>
        </div>
      </div>

      {/* Bar ekspor */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3 shadow-sm">
        <span className="text-xs font-semibold text-muted-foreground">Ekspor:</span>
        <a href={`/api/presentasi/export?period=daily&format=xlsx&date=${today}`} className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted">
          <span className="fas fa-file-excel text-emerald-600" aria-hidden="true" /> Excel Harian
        </a>
        <a href={`/api/presentasi/export?period=weekly&format=xlsx&date=${today}`} className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted">
          <span className="fas fa-file-excel text-emerald-600" aria-hidden="true" /> Excel Mingguan
        </a>
        <a href={`/api/presentasi/export?period=monthly&format=xlsx&date=${today}`} className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted">
          <span className="fas fa-file-excel text-emerald-600" aria-hidden="true" /> Excel Bulanan
        </a>
        <a href={`/api/presentasi/export?period=daily&format=docx&date=${today}`} className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted">
          <span className="fas fa-file-word text-blue-600" aria-hidden="true" /> DOCX
        </a>
        <a href={`/api/presentasi/export?period=daily&format=pdf&date=${today}`} className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted">
          <span className="fas fa-file-pdf text-red-600" aria-hidden="true" /> PDF
        </a>
        <span className="ml-auto text-[10px] text-muted-foreground">Periode: {today}</span>
      </div>

      {/* KPI utama */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard title="Omzet hari ini" value={rupiah(omzetHari)} sub={`${angka(notaHari)} nota · ${angka(pcsHari)} pcs`} accent="primary" />
        <KpiCard title="Omzet 7 hari" value={rupiah(omzet7)} sub={`${angka(nota7)} nota`} accent="blue" />
        <KpiCard title="Omzet 30 hari" value={rupiah(omzet30)} sub={`${angka(nota30)} nota · ${angka(pcs30)} pcs`} accent="emerald" />
        <KpiCard title="KK subsidi minggu ini" value={angka(kkUnik)} sub="KK unik dipakai" accent="amber" />
      </div>

      {/* Top produk + Stok kritis */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Top 5 produk */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="text-lg font-bold">Top 5 Produk Terlaris (30 hari)</h2>
          <p className="text-xs text-muted-foreground">Berdasarkan jumlah pcs terjual</p>
          <div className="mt-4 space-y-3">
            {((laris.data ?? []) as Laris[]).map((p, i) => (
              <div key={p.id} className="flex items-center gap-3">
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  i === 0 ? "bg-amber-400 text-amber-900" : "bg-muted text-muted-foreground"
                }`}>
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-semibold">{p.item}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{angka(p.pcs)} pcs · {rupiah(p.omzet)}</span>
                  </div>
                  <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${(Number(p.pcs) / maxLaris) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
            {(!laris.data || (laris.data as Laris[]).length === 0) && (
              <p className="text-sm text-muted-foreground">Belum ada data penjualan.</p>
            )}
          </div>
        </div>

        {/* Stok kritis */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="text-lg font-bold">Stok Kritis</h2>
          <p className="text-xs text-muted-foreground">Habis, menipis, atau hampir expired</p>
          <div className="mt-3 grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-red-50 p-3 text-center dark:bg-red-950/30">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">{angka(r.habis ?? 0)}</div>
              <div className="text-xs text-red-600/80 dark:text-red-400/80">Habis</div>
            </div>
            <div className="rounded-lg bg-amber-50 p-3 text-center dark:bg-amber-950/30">
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{angka(r.menipis ?? 0)}</div>
              <div className="text-xs text-amber-600/80 dark:text-amber-400/80">Menipis</div>
            </div>
            <div className="rounded-lg bg-blue-50 p-3 text-center dark:bg-blue-950/30">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{angka(r.hampir_expired ?? 0)}</div>
              <div className="text-xs text-blue-600/80 dark:text-blue-400/80">Hampir expired</div>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {urut.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{p.item}</div>
                  <div className="text-xs text-muted-foreground">
                    Toko {angka(p.stok_toko)} · Gudang {angka(p.stok_gudang)} · Min {angka(p.stok_min ?? 0)}
                  </div>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                  p.stok_total <= 0
                    ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400"
                    : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                }`}>
                  {p.stok_total <= 0 ? "Habis" : "Menipis"}
                </span>
              </div>
            ))}
            {urut.length === 0 && <p className="text-sm text-muted-foreground">Tidak ada stok kritis. 👍</p>}
          </div>
        </div>
      </div>

      {/* Nota terakhir */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h2 className="text-lg font-bold">10 Nota Terakhir</h2>
        <p className="text-xs text-muted-foreground">Transaksi terbaru</p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="pb-2 pr-4 font-semibold">No. Nota</th>
                <th className="pb-2 pr-4 font-semibold">Tanggal</th>
                <th className="pb-2 pr-4 font-semibold">Kasir</th>
                <th className="pb-2 pr-4 text-right font-semibold">Pcs</th>
                <th className="pb-2 text-right font-semibold">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {((terakhir.data ?? []) as Invoice[]).map((inv) => (
                <tr key={inv.id}>
                  <td className="py-2 pr-4 font-semibold">{inv.invoice_no}</td>
                  <td className="py-2 pr-4 text-muted-foreground">{tglWaktu(inv.tanggal)}</td>
                  <td className="py-2 pr-4 text-muted-foreground">{inv.kasir ?? "-"}</td>
                  <td className="py-2 pr-4 text-right">{angka(inv.pcs)}</td>
                  <td className="py-2 text-right font-semibold">{rupiah(inv.total)}</td>
                </tr>
              ))}
              {(!terakhir.data || (terakhir.data as Invoice[]).length === 0) && (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-muted-foreground">Belum ada nota.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-border pt-4 text-xs text-muted-foreground">
        <span>KDKMP Pungpungan · Presentasi Pengawas</span>
        <span>Diperbarui: {tglPanjang(today)}</span>
      </div>
    </div>
  );
}

function KpiCard({ title, value, sub, accent }: { title: string; value: string; sub: string; accent: string }) {
  const colors: Record<string, string> = {
    primary: "from-primary/10 to-primary/5 border-primary/20",
    blue: "from-blue-50 to-blue-50/50 border-blue-200 dark:from-blue-950/30 dark:to-blue-950/10 dark:border-blue-800",
    emerald: "from-emerald-50 to-emerald-50/50 border-emerald-200 dark:from-emerald-950/30 dark:to-emerald-950/10 dark:border-emerald-800",
    amber: "from-amber-50 to-amber-50/50 border-amber-200 dark:from-amber-950/30 dark:to-amber-950/10 dark:border-amber-800",
  };
  return (
    <div className={`rounded-xl border bg-gradient-to-br p-5 shadow-sm ${colors[accent] ?? colors.primary}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      <p className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}

function mingguBerjalanWIB() {
  const now = new Date();
  const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  const [y, m, d] = ymd.split("-").map(Number);
  const hari = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  const sejakSenin = (hari + 6) % 7;
  const mulai = new Date(Date.UTC(y, m - 1, d - sejakSenin, -7));
  return { mulai: mulai.toISOString() };
}
