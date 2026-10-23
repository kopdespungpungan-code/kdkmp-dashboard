#!/usr/bin/env python3
"""Generate seed SQL (Supabase/Postgres) dari DATABASE_POS_KDKMP_PUNGPUNGAN.xlsx
Sesuai schema: products, sales, sale_items, returns, stock_log, daftar_supplier,
stok_opname, so_gondola, karyawan, product_gondola.

Disesuaikan dengan database produksi:
- kolom generated (total_stok_bersih, selisih, gondola_key) tidak di-INSERT
- product_gondola.lokasi='' untuk gondola bernomor, NULL untuk lokasi
- so_gondola.gondola_no=0 untuk lokasi (DB NOT NULL), tingkat>=1
- constraint yang lebih ketat di DB dilonggarkan sementara lalu dikembalikan NOT VALID
"""
import re, json, sys, datetime as dt
from collections import defaultdict, Counter, OrderedDict
import openpyxl

SRC = sys.argv[1]
OUT = sys.argv[2]

# ---------- KONFIGURASI ----------
TZ = "+07"
INVOICE_FMT = "NOTA-{:04d}"
SUMBER_POS, SUMBER_OCR, SUMBER_MANUAL = "POS", "OCR", "MANUAL"
JENIS_OPENING, JENIS_RUSAK, JENIS_RETURN, JENIS_JUAL, JENIS_KOREKSI = (
    "OPENING", "RUSAK_EXP", "RETURN", "JUAL", "KOREKSI_SO")
TIPE_EXPIRED, TIPE_RUSAK = "EXPIRED", "RUSAK"
OPENING_TS = "2026-10-06 00:00:00"
JOURNAL_SHIFT = dt.timedelta(hours=14)
SUBSIDI_NAMES = {"Beras SPHP", "Minyak Kita 1L", "Gas LPG 3 KG"}
ALIASES = {"indomilk kids cokelat 190ml": "indomilk kids cokelat steril 190ml"}
JABATAN = {"Vyrda Ayu Lestari": "Kasir", "Rista": "Kasir", "Pandu": "Pramuniaga",
           "Dedik": "Asisten Manager", "Lia Agustina": "Asisten Manager", "Imel": None}
# --------------------------------------------------------------------------

wb = openpyxl.load_workbook(SRC, data_only=True)
diag = OrderedDict()


def note(k, v):
    diag.setdefault(k, []).append(v)


def q(v):
    if v is None:
        return "NULL"
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, (int,)):
        return str(v)
    if isinstance(v, float):
        return str(int(v)) if v == int(v) else repr(v)
    if isinstance(v, dt.datetime):
        return "'%s%s'" % (v.strftime("%Y-%m-%d %H:%M:%S"), TZ)
    if isinstance(v, dt.date):
        return "'%s'" % v.isoformat()
    return "'" + str(v).replace("'", "''") + "'"


def ival(v, default=0):
    if v is None or v == "":
        return default
    return int(round(float(v)))


def to_date(v):
    if v is None or v == "" or v == "-":
        return None
    if isinstance(v, dt.datetime):
        return v.date()
    if isinstance(v, dt.date):
        return v
    s = str(v).strip()
    for fmt in ("%d/%m/%Y", "%Y-%m-%d", "%d-%m-%Y"):
        try:
            return dt.datetime.strptime(s, fmt).date()
        except ValueError:
            pass
    return None


def barcode_str(v):
    if v is None or v == "":
        return None
    if isinstance(v, float):
        return str(int(v))
    return str(v).strip()


# =============== 1. MASTER (REKAP SO) ===============
ws = wb["REKAP SO"]
master = []
for r in ws.iter_rows(min_row=5, values_only=True):
    if r[2] is None:
        continue
    master.append(r)
name2no = {}
for r in master:
    name2no[str(r[2]).strip().lower()] = int(r[1])

jur_bc = {}
for r in wb["POS_JURNAL"].iter_rows(min_row=2, values_only=True):
    if r[0] and r[6]:
        try:
            for it in json.loads(r[6]).get("items", []):
                if it.get("barcode"):
                    jur_bc[it["name"].strip().lower()] = it["barcode"]
        except Exception:
            pass


def pno(name, ctx):
    k = str(name).strip().lower() if name else ""
    k = ALIASES.get(k, k)
    if k in name2no:
        return name2no[k]
    note("produk_tidak_ditemukan", f"{ctx}: {name!r}")
    return None


# =============== 2. PENJUALAN ===============
ws = wb["PENJUALAN"]
sale_lines = []
for r in ws.iter_rows(min_row=6, values_only=True):
    if r[0] is None and r[3] is None:
        continue
    sale_lines.append(r)

notas = OrderedDict()
for r in sale_lines:
    n = int(r[0])
    d, t = r[1], r[2]
    ts = dt.datetime.combine(d.date() if isinstance(d, dt.datetime) else d,
                             t if isinstance(t, dt.time) else dt.time(0, 0))
    status = (r[9] or "").strip().upper()
    notas.setdefault(n, {"ts": ts, "status": set(), "kasir": None, "kode": None, "items": []})
    N = notas[n]
    N["status"].add(status)
    if r[10]:
        N["kasir"] = str(r[10]).strip()
    if r[11]:
        N["kode"] = str(r[11]).strip()
    N["items"].append({"name": r[3], "qty": ival(r[4]), "harga": r[5], "jumlah": r[6], "status": status})

cancelled = [n for n, N in notas.items() if N["status"] == {"DIBATALKAN"}]
mixed = [n for n, N in notas.items() if len(N["status"]) > 1]
for n in mixed:
    note("nota_status_campur", n)
active_notas = OrderedDict((n, N) for n, N in notas.items() if "AKTIF" in N["status"])

last_price = {}
for n, N in active_notas.items():
    for it in N["items"]:
        if it["status"] == "AKTIF":
            kk = str(it["name"]).strip().lower()
            last_price[ALIASES.get(kk, kk)] = it["harga"]

# =============== 3. GONDOLA ===============
SHEETS = [("VYRDA (1-12)", 1), ("PANDU (13-24)", 13), ("RISTA (25-36)", 25),
          ("DEDIK (37-48)", 37), ("IMEL (49-60)", 49), ("LIA (DEPAN-BELAKANG)", None)]
gond_rows = []
karyawan = []
for sname, start in SHEETS:
    ws = wb[sname]
    petugas = ws["B3"].value
    rng = ws["F3"].value
    rng_short = None
    if rng:
        rng_short = str(rng).replace("Gondola", "").strip()
    karyawan.append({"nama": petugas, "range": rng_short})
    rows = [r for r in ws.iter_rows(min_row=6, values_only=True) if r[0] is not None]
    dates = [to_date(r[5]) for r in rows if r[3] and to_date(r[5])]
    fallback_date = Counter(dates).most_common(1)[0][0] if dates else dt.date(2026, 10, 6)
    last_g = None
    for r in rows:
        if start is not None:
            if r[1] is not None:
                last_g = int(r[1])
            g_no = last_g
            lokasi = ""
            gkey = str(g_no)
            tingkat = ival(r[2], None)
        else:
            g_no = None
            lokasi = str(r[1])
            gkey = lokasi
            tingkat = 1
        if not r[3]:
            continue
        pid = pno(r[3], f"gondola {sname}")
        if pid is None:
            continue
        tgl = to_date(r[5])
        if tgl is None:
            tgl = fallback_date
            note("gondola_tanggal_kosong_pakai_fallback", f"{sname} {r[3]} -> {fallback_date}")
        exp = to_date(r[6])
        if exp and exp < tgl:
            note("exp_lebih_awal_dari_tanggal_hitung", f"{sname}: {r[3]} EXP {exp} (hitung {tgl}) ket={r[7]}")
        if r[7] and "EXP asal" in str(r[7]):
            m = re.search(r'EXP asal: "([^"]+)"', str(r[7]))
            note("exp_beda_dengan_catatan_asal", f"{r[3]}: tersimpan {exp} vs catatan {m.group(1) if m else ''}")
        gond_rows.append({
            "tanggal": tgl, "gondola_no": g_no, "lokasi": lokasi, "tingkat": tingkat if tingkat is not None else 1,
            "petugas": petugas, "produk_id": pid, "qty": ival(r[4]), "exp": exp,
            "rusak_exp": ival(r[8], None) if r[8] not in (None, "") else None,
            "keterangan": r[7], "gkey": gkey, "named": start is None})

# =============== 4. RETURN ===============
ws = wb["Return"]
ret_date = to_date(ws["D3"].value)
ret_no = ival(ws["B3"].value)
returns = []
for r in ws.iter_rows(min_row=9, max_row=38, values_only=True):
    if r[0] is None or r[3] is None:
        continue
    pid = pno(r[3], "return")
    if pid is None:
        continue
    alasan = str(r[10] or "")
    tipe = TIPE_EXPIRED if "expired" in alasan.lower() else TIPE_RUSAK
    exp = r[5] if isinstance(r[5], dt.datetime) else None
    ket = f"Return #{ret_no} Agrinas | {alasan}"
    if exp:
        ket += f" | EXP {exp.date().isoformat()}"
    if r[8] is not None:
        ket += f" | @Rp{int(float(r[8]))}"
    if r[11]:
        ket += f" | {r[11]}"
    if r[1]:
        ket += f" | SKU {r[1]}"
    returns.append({"tanggal": ret_date, "pid": pid, "qty": ival(r[6]), "tipe": tipe, "ket": ket,
                    "name": r[3]})

# =============== 5. PRODUK + STOK ===============
GR_RE = re.compile(r"(\d+(?:[.,]\d+)?\s?(?:ml|gr|kg|ltr|lt|g|l))\b", re.I)


def gramasi(nm):
    ms = GR_RE.findall(nm)
    return ms[-1].replace(" ", "") if ms else None


ret_by_pid = defaultdict(int)
for x in returns:
    ret_by_pid[x["pid"]] += x["qty"]

sold_by_pid = defaultdict(int)
items_by_pid = defaultdict(list)
for n, N in active_notas.items():
    for it in N["items"]:
        if it["status"] != "AKTIF":
            continue
        pid = pno(it["name"], f"nota {n}")
        it["pid"] = pid
        if pid is None:
            continue
        sold_by_pid[pid] += it["qty"]

exp_by_pid = defaultdict(list)
for g in gond_rows:
    if g["exp"] and g["qty"] > 0 and g["exp"] >= g["tanggal"]:
        exp_by_pid[g["produk_id"]].append(g["exp"])

products = []
used_sku = set()
neg = []
mism_sold, mism_ret = [], []
for r in master:
    no = int(r[1]); nm = str(r[2]).strip()
    D, E, F, G, H, M, Nn = (ival(r[3]), ival(r[4]), ival(r[5]), ival(r[6]), ival(r[7]), ival(r[12]), ival(r[13]))
    if M != sold_by_pid.get(no, 0):
        mism_sold.append((nm, M, sold_by_pid.get(no, 0)))
    if F != Nn + ret_by_pid.get(no, 0):
        mism_ret.append((nm, F, Nn, ret_by_pid.get(no, 0)))
    bc = barcode_str(r[20])
    if not bc and nm.lower() in jur_bc:
        tok = re.match(r"\d+", str(jur_bc[nm.lower()]))
        bc = tok.group(0) if tok else None
        if bc:
            note("barcode_dari_jurnal_pos", f"{nm} -> {bc}")
    sku = bc if bc else f"NOBC-{no:03d}"
    if not bc:
        note("sku_tanpa_barcode", f"{nm} -> {sku}")
    if sku in used_sku:
        note("sku_duplikat", f"{nm} {sku}")
        sku = f"{sku}-{no}"
    used_sku.add(sku)
    sup = r[0]
    harga_jual = r[17]
    if harga_jual is None:
        harga_jual = last_price.get(nm.lower())
    elif nm.lower() in last_price and float(last_price[nm.lower()]) != float(harga_jual):
        note("harga_master_beda_dengan_penjualan", f"{nm}: master {harga_jual} vs jual {last_price[nm.lower()]}")
    toko, gud = D, E
    total_out = Nn + ret_by_pid.get(no, 0) + sold_by_pid.get(no, 0)
    take_t = min(toko, total_out); toko -= take_t
    rem = total_out - take_t
    take_g = min(gud, rem); gud -= take_g
    short = rem - take_g
    if short > 0:
        neg.append((nm, D, E, total_out, short))
    products.append({
        "id": no, "sku": sku, "item": nm, "gramasi": gramasi(nm), "supplier": sup,
        "harga_jual": harga_jual, "toko": toko, "gudang": gud,
        "expired": min(exp_by_pid[no]) if exp_by_pid.get(no) else None,
        "subsidi": nm in SUBSIDI_NAMES, "D": D, "E": E, "N": Nn, "no": no, "G": G})
prod_by_id = {p["id"]: p for p in products}
for p in products:
    if p["G"] >= 0 and (p["toko"] + p["gudang"]) != p["G"]:
        note("stok_tidak_sama_dgn_total_bersih_excel", f"{p['item']}: seed {p['toko']+p['gudang']} vs excel {p['G']}")

# =============== 6. STOCK LOG ===============
stock_log = []
state = {}
for p in products:
    state[p["id"]] = [p["D"], p["E"]]
    if p["D"] or p["E"]:
        stock_log.append((OPENING_TS + TZ, p["id"], JENIS_OPENING, p["D"], p["E"], None,
                          "Saldo awal hasil stock opname (gondola + gudang)"))


def deduct(pid, qty):
    t, g = state[pid]
    dt_ = min(t, qty); t -= dt_
    rem = qty - dt_
    dg = min(g, rem); g -= dg
    state[pid] = [t, g]
    return dt_, dg, rem - dg


for p in products:
    if p["N"] > 0:
        a, b, s = deduct(p["id"], p["N"])
        stock_log.append(("2026-10-06 00:00:01" + TZ, p["id"], JENIS_RUSAK, -a, -b, None,
                          "Rusak/EXP awal (arsip stock opname)" + (f" [kurang {s} pcs]" if s else "")))
for x in returns:
    a, b, s = deduct(x["pid"], x["qty"])
    stock_log.append((x["tanggal"].isoformat() + " 00:00:00" + TZ, x["pid"], JENIS_RETURN, -a, -b, None,
                      x["ket"] + (f" [kurang {s} pcs]" if s else "")))
events = []
for n, N in active_notas.items():
    for it in N["items"]:
        if it["status"] == "AKTIF" and it.get("pid"):
            events.append((N["ts"], n, it))
events.sort(key=lambda e: (e[0], e[1]))
for ts, n, it in events:
    a, b, s = deduct(it["pid"], it["qty"])
    stock_log.append((ts.strftime("%Y-%m-%d %H:%M:%S") + TZ, it["pid"], JENIS_JUAL, -a, -b, None,
                      INVOICE_FMT.format(n) + (f" [kurang {s} pcs]" if s else "")))
for p in products:
    t, g = state[p["id"]]
    assert (t, g) == (p["toko"], p["gudang"]), (p["item"], t, g, p["toko"], p["gudang"])

for r in wb["SO_EDIT_LOG"].iter_rows(min_row=2, values_only=True):
    if not r[0] or r[4] is None:
        continue
    pid = pno(r[4], "so_edit_log")
    if pid is None:
        continue
    ts = (r[0] + JOURNAL_SHIFT).strftime("%Y-%m-%d %H:%M:%S") + TZ
    ket = f"Koreksi qty gondola oleh {r[1]} ({r[2]} baris {int(r[3])}): {ival(r[5])} -> {ival(r[6])}"
    if r[13]:
        ket += f" | {r[13]}"
    stock_log.append((ts, pid, JENIS_KOREKSI, 0, 0, to_date(r[11]), ket))

# =============== 7. EMIT SQL ===============
out = []
w = out.append
w("-- =====================================================================")
w("-- SEED DATA: KDKMP PUNGPUNGAN  (dibuat dari DATABASE_POS_KDKMP_PUNGPUNGAN.xlsx)")
w("-- Jalankan di Supabase SQL Editor. Menggantikan data lama (TRUNCATE).")
w("-- =====================================================================")
w("BEGIN;")
w("")
w("-- Kosongkan dulu tabel bila sudah berisi data lama (agar seed menggantikan data):")
w("TRUNCATE public.sale_items, public.sales, public.sale_kk, public.returns, public.stock_log,")
w("         public.so_gondola, public.product_gondola, public.stok_opname, public.products,")
w("         public.daftar_supplier, public.karyawan RESTART IDENTITY CASCADE;")
w("")
w("-- Data historis seed belum punya KK per baris, jadi longgarkan constraint sementara.")
w("ALTER TABLE public.sale_items DROP CONSTRAINT IF EXISTS sale_items_subsidi_wajib_kk;")
w("")
w("-- stock_log seed memakai jenis historis (OPENING, JUAL, dll) yang tidak ada di constraint.")
w("ALTER TABLE public.stock_log DROP CONSTRAINT IF EXISTS stock_log_jenis_check;")
w("")
w("-- Samakan schema dengan aplikasi: lokasi bernama (mis. Lia) memakai gondola_no NULL.")
w("-- (Aplikasi membaca gondola_no NULL + gondola_lokasi; DB lama mungkin masih NOT NULL.)")
w("ALTER TABLE public.so_gondola ALTER COLUMN gondola_no DROP NOT NULL;")
w("")


def insert(table, cols, rows, override=False, chunk=100):
    if not rows:
        return
    head = f"INSERT INTO public.{table} ({', '.join(cols)})" + (" OVERRIDING SYSTEM VALUE" if override else "") + " VALUES"
    for i in range(0, len(rows), chunk):
        part = rows[i:i + chunk]
        w(head)
        w(",\n".join("  (" + ", ".join(q(v) if not isinstance(v, RawSQL) else v.s for v in row) + ")" for row in part) + ";")
    w("")


class RawSQL:
    def __init__(self, s): self.s = s


NOW = RawSQL("now()")

sups = sorted({p["supplier"] for p in products if p["supplier"]})
w(f"-- daftar_supplier ({len(sups)})")
insert("daftar_supplier", ["id", "nama"], [(i + 1, s) for i, s in enumerate(sups)], override=True)

w(f"-- products ({len(products)})")
insert("products",
       ["id", "sku", "item", "gramasi", "supplier", "pcs_per_karton", "harga_beli", "harga_jual",
        "stok_toko", "stok_gudang", "stok_min", "expired_terdekat", "aktif", "subsidi", "foto_url"],
       [(p["id"], p["sku"], p["item"], p["gramasi"], p["supplier"], None, None, p["harga_jual"],
         p["toko"], p["gudang"], None, p["expired"], True, p["subsidi"], None) for p in products],
       override=True)

w(f"-- stok_opname ({len(master)}) - salinan REKAP SO (tanpa kolom generated)")
so_cols = ["no", "supplier", "nama_produk", "stok_grocery", "gudang", "rusak_exp_return", "terjual",
           "on_hand_sistem", "keterangan", "return_terkirim", "info_return",
           "rusak_exp_awal", "sku_master_return", "barcode_master_return", "satuan", "harga_master_return",
           "harga_jual_master_nota", "kode_barcode"]
so_rows = []
for r in master:
    so_rows.append((int(r[1]), r[0], str(r[2]).strip(), ival(r[3]), ival(r[4]), ival(r[5]), ival(r[12]),
                    ival(r[7]), r[9],
                    ival(r[10]), r[11] or None, ival(r[13]), barcode_str(r[14]), barcode_str(r[15]),
                    r[16], r[17], r[18], barcode_str(r[20])))
insert("stok_opname", so_cols, so_rows)

w(f"-- sales ({len(active_notas)}) - nota DIBATALKAN tidak dimasukkan: {sorted(cancelled)}")
sale_id = {}
sale_rows = []
for i, (n, N) in enumerate(active_notas.items(), start=1):
    sale_id[n] = i
    kode = N["kode"] or ""
    sumber = SUMBER_POS if kode.startswith("POS-") else SUMBER_OCR if kode.startswith("OCR") else SUMBER_MANUAL
    any_sub = any(prod_by_id.get(it.get("pid"), {}).get("subsidi") for it in N["items"] if it["status"] == "AKTIF")
    sale_rows.append((i, INVOICE_FMT.format(n), N["ts"], N["kasir"], sumber, None, bool(any_sub)))
insert("sales", ["id", "invoice_no", "tanggal", "kasir", "sumber", "no_kk", "subsidi"], sale_rows, override=True)

w("-- sale_items")
item_rows = []
k = 0
total_sales = 0
for n, N in active_notas.items():
    for it in N["items"]:
        if it["status"] != "AKTIF" or not it.get("pid"):
            continue
        k += 1
        h = it["harga"]
        total_sales += it["qty"] * float(h)
        item_rows.append((k, sale_id[n], it["pid"], it["qty"], h, None, prod_by_id[it["pid"]]["subsidi"], None))
insert("sale_items", ["id", "sale_id", "product_id", "qty_pcs", "harga", "keterangan", "subsidi", "no_kk"],
       item_rows, override=True)

w(f"-- returns ({len(returns)})")
insert("returns", ["id", "tanggal", "product_id", "qty_pcs", "tipe", "keterangan"],
       [(i + 1, x["tanggal"], x["pid"], x["qty"], x["tipe"], x["ket"]) for i, x in enumerate(returns)],
       override=True)

stock_log.sort(key=lambda s: (s[0], s[1]))
w(f"-- stock_log ({len(stock_log)})")
insert("stock_log", ["id", "tanggal", "product_id", "jenis", "delta_toko", "delta_gudang", "expired",
                     "keterangan", "dokumentasi_path", "stb_path"],
       [(i + 1, RawSQL(f"'{s[0]}'"), s[1], s[2], s[3], s[4], s[5], s[6], None, None) for i, s in enumerate(stock_log)],
       override=True)

w(f"-- karyawan ({len(karyawan)})")
insert("karyawan", ["id", "nama", "jabatan", "jenis", "gondola_range", "aktif", "created_at"],
       [(i + 1, kx["nama"], JABATAN.get(kx["nama"]), None, kx["range"], True, NOW) for i, kx in enumerate(karyawan)])

pg = OrderedDict()
for g in gond_rows:
    key = (g["produk_id"], g["gondola_no"], g["lokasi"], g["tingkat"])
    pg.setdefault(key, g)
w(f"-- product_gondola ({len(pg)}) - tanpa gondola_key (generated)")
pg_rows = []
for i, (key, g) in enumerate(pg.items(), start=1):
    gno = None if g["named"] else g["gondola_no"]
    pg_rows.append((i, g["produk_id"], gno, g["lokasi"], g["tingkat"], NOW, NOW))
insert("product_gondola", ["id", "produk_id", "gondola_no", "lokasi", "tingkat", "created_at", "updated_at"],
       pg_rows)

w(f"-- so_gondola ({len(gond_rows)}) - tanpa selisih/gondola_key (generated)")
seen_rusak = set()
sg_rows = []
for i, g in enumerate(gond_rows, start=1):
    p = master_row = prod_by_id[g["produk_id"]]
    ru = None
    if g["produk_id"] not in seen_rusak:
        seen_rusak.add(g["produk_id"])
        ru = g["rusak_exp"]
    on_hand = None
    for r in master:
        if int(r[1]) == g["produk_id"]:
            on_hand = ival(r[7]); break
    sg_rows.append((i, g["tanggal"], None if g["named"] else g["gondola_no"], g["lokasi"], g["tingkat"], g["petugas"], g["produk_id"],
                    g["qty"], on_hand, g["exp"], ru, None, NOW, NOW, g["keterangan"]))
insert("so_gondola", ["id", "tanggal", "gondola_no", "gondola_lokasi", "tingkat", "petugas", "produk_id",
                      "qty_fisik", "stok_sistem", "expired", "rusak_exp", "catatan", "created_at",
                      "updated_at", "keterangan"], sg_rows)

w("-- sinkronkan sequence/identity ke id terbesar")
for t in ["daftar_supplier", "products", "sales", "sale_items", "returns", "stock_log", "karyawan",
          "product_gondola", "so_gondola"]:
    w(f"SELECT setval(pg_get_serial_sequence('public.{t}', 'id'), COALESCE((SELECT MAX(id) FROM public.{t}), 1));")
w("")
w("-- Kembalikan constraint (NOT VALID: data historis tidak divalidasi ulang).")
w("ALTER TABLE public.sale_items")
w("  ADD CONSTRAINT sale_items_subsidi_wajib_kk")
w("  CHECK ((not subsidi) or (no_kk is not null)) NOT VALID;")
w("")
w("ALTER TABLE public.stock_log")
w("  ADD CONSTRAINT stock_log_jenis_check")
w("  CHECK (jenis = ANY (ARRAY['TERIMA'::text, 'MUTASI'::text, 'OPNAME'::text])) NOT VALID;")
w("")
w("COMMIT;")

open(OUT, "w", encoding="utf-8").write("\n".join(out) + "\n")

print("produk:", len(products), "| sales:", len(active_notas), "| sale_items:", len(item_rows),
      "| returns:", len(returns), "| stock_log:", len(stock_log), "| so_gondola:", len(gond_rows),
      "| product_gondola:", len(pg), "| karyawan:", len(karyawan), "| supplier:", len(sups))
print("nota batal:", sorted(cancelled), "| nota campur:", mixed)
print("total penjualan aktif (hitung ulang):", int(total_sales))
