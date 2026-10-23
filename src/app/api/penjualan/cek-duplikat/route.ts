import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type ItemInput = { product_id: number; qty: number; harga: number };
type NotaInput = {
  tanggal: string | null;
  jam: string | null;
  total: number | null;
  items: ItemInput[];
};

type SaleRow = {
  id: number;
  invoice_no: string;
  tanggal: string;
  sale_items:
    | { product_id: number | null; qty_pcs: number; harga: number | string }[]
    | null;
};

type Hasil = {
  status: "ada" | "aman" | "tidak-cek";
  sale_id?: number;
  invoice_no?: string;
  /** true bila jam ikut cocok, null bila jam nota tidak terbaca. */
  jam_cocok?: boolean | null;
};

const angka = (v: unknown, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n) : fallback;
};

/** "HH:MM" dari teks jam apa pun. */
function jamPendek(v: string | null | undefined): string | null {
  if (!v) return null;
  const m = String(v).match(/(\d{1,2})[:.](\d{2})/);
  return m ? `${m[1].padStart(2, "0")}:${m[2]}` : null;
}

/** Tanggal + jam menurut WIB dari sebuah timestamptz. */
function wib(iso: string): { tanggal: string; jam: string } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const ambil = (tipe: string) => parts.find((p) => p.type === tipe)?.value ?? "";
  return {
    tanggal: `${ambil("year")}-${ambil("month")}-${ambil("day")}`,
    jam: `${ambil("hour")}:${ambil("minute")}`,
  };
}

/** Tanda isi nota: barang + qty + harga, urut supaya tidak tergantung urutan. */
function isiNota(items: ItemInput[]): string {
  return items
    .map((i) => `${i.product_id}:${i.qty}:${angka(i.harga)}`)
    .sort()
    .join("|");
}

/** "YYYY-MM-DD" dari teks tanggal (boleh ikut jam). */
function tanggalPendek(v: string | null | undefined): string | null {
  if (!v) return null;
  const m = String(v).match(/(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}

type SB = Awaited<ReturnType<typeof createClient>>;

/**
 * Ambil nota + barisnya pada rentang tanggal. Cara utama memakai nested select
 * PostgREST; kalau relasinya belum terbaca di schema cache, fallback ke dua
 * query terpisah supaya pengecekan duplikat tetap jalan.
 */
async function ambilSales(
  sb: SB,
  start: string,
  end: string
): Promise<{ data: SaleRow[] | null; error: string | null }> {
  const nested = await sb
    .from("sales")
    .select("id, invoice_no, tanggal, sale_items(product_id, qty_pcs, harga)")
    .gte("tanggal", start)
    .lt("tanggal", end)
    .order("tanggal", { ascending: false });
  if (!nested.error) {
    return { data: (nested.data ?? []) as unknown as SaleRow[], error: null };
  }

  const dasar = await sb
    .from("sales")
    .select("id, invoice_no, tanggal")
    .gte("tanggal", start)
    .lt("tanggal", end)
    .order("tanggal", { ascending: false });
  if (dasar.error) return { data: null, error: dasar.error.message };

  const sales = (dasar.data ?? []) as unknown as { id: number; invoice_no: string; tanggal: string }[];
  if (sales.length === 0) return { data: [], error: null };

  const items = await sb
    .from("sale_items")
    .select("sale_id, product_id, qty_pcs, harga")
    .in("sale_id", sales.map((s) => s.id));
  if (items.error) return { data: null, error: items.error.message };

  const per = new Map<number, { product_id: number; qty_pcs: number; harga: number | string }[]>();
  for (const it of (items.data ?? []) as unknown as {
    sale_id: number;
    product_id: number;
    qty_pcs: number;
    harga: number | string;
  }[]) {
    const arr = per.get(Number(it.sale_id)) ?? [];
    arr.push(it);
    per.set(Number(it.sale_id), arr);
  }

  return {
    data: sales.map((s) => ({
      ...s,
      sale_items: per.get(Number(s.id)) ?? [],
    })),
    error: null,
  };
}

export async function POST(req: Request) {
  try {
    const sb = await createClient();
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) return NextResponse.json({ error: "Belum login" }, { status: 401 });

    const body = (await req.json()) as { notas?: NotaInput[] };
    const notas = Array.isArray(body.notas) ? body.notas.slice(0, 300) : [];
    if (notas.length === 0) return NextResponse.json({ hasil: [] });

    const hasil: Hasil[] = notas.map(() => ({ status: "tidak-cek" }));

    // Hanya nota yang punya tanggal + barang yang bisa dicek.
    const dicek = notas
      .map((n, index) => ({ n, index }))
      .filter(
        ({ n }) =>
          tanggalPendek(n.tanggal) &&
          Array.isArray(n.items) &&
          n.items.length > 0 &&
          n.items.every(
            (i) => i && Number.isInteger(i.product_id) && Number(i.qty) > 0
          )
      );
    if (dicek.length === 0) return NextResponse.json({ hasil });

    const tanggal = [
      ...new Set(
        dicek
          .map(({ n }) => tanggalPendek(n.tanggal))
          .filter((v): v is string => Boolean(v))
      ),
    ].sort();
    if (tanggal.length === 0) return NextResponse.json({ hasil });
    const min = tanggal[0];
    const max = tanggal[tanggal.length - 1];

    // Rentang [min 00:00 WIB, max+1 00:00 WIB)
    const start = `${min}T00:00:00+07:00`;
    const akhir = new Date(`${max}T12:00:00+07:00`);
    akhir.setUTCDate(akhir.getUTCDate() + 1);
    const maxNext = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(akhir);
    const end = `${maxNext}T00:00:00+07:00`;

    const { data, error } = await ambilSales(sb, start, end);
    if (error) return NextResponse.json({ error }, { status: 500 });

    const sales = ((data ?? []) as unknown as SaleRow[]).map((s) => {
      const items = (s.sale_items ?? [])
        .filter((i) => i.product_id != null)
        .map((i) => ({
          product_id: Number(i.product_id),
          qty: angka(i.qty_pcs),
          harga: angka(i.harga),
        }));
      return {
        id: Number(s.id),
        invoice_no: s.invoice_no,
        ...wib(s.tanggal),
        items,
        isi: isiNota(items),
        total: items.reduce((a, i) => a + i.qty * i.harga, 0),
      };
    });

    for (const { n, index } of dicek) {
      const tgl = tanggalPendek(n.tanggal);
      if (!tgl) {
        hasil[index] = { status: "tidak-cek" };
        continue;
      }
      const jam = jamPendek(n.jam);
      const items = n.items.map((i) => ({
        product_id: Number(i.product_id),
        qty: Math.max(1, Math.floor(Number(i.qty) || 1)),
        harga: angka(i.harga),
      }));
      const total = n.total == null ? items.reduce((a, i) => a + i.qty * i.harga, 0) : angka(n.total);
      const isi = isiNota(items);

      const cocok = sales.find(
        (s) =>
          s.tanggal === tgl &&
          s.total === total &&
          s.isi === isi &&
          (!jam || s.jam === jam)
      );

      hasil[index] = cocok
        ? {
            status: "ada",
            sale_id: cocok.id,
            invoice_no: cocok.invoice_no,
            jam_cocok: jam ? true : null,
          }
        : { status: "aman" };
    }

    return NextResponse.json({ hasil });
  } catch (e: unknown) {
    console.error("[cek-duplikat]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server error" },
      { status: 500 }
    );
  }
}
