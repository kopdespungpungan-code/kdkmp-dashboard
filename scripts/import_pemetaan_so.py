#!/usr/bin/env python3
"""
Impor pemetaan produk -> gondola/lokasi dari sheet petugas di
"DATABASE POS KDKMP PUNGPUNGAN.xlsx".

Menghasilkan file SQL: supabase/seed_product_gondola.sql

Cara pakai (dari folder kdkmp-dashboard):
    py -3 scripts/import_pemetaan_so.py

Struktur sheet petugas (mis. "VYRDA (1-12)"):
    baris 5 = header: No | Gondola/Lokasi | Tingkat | Nama Barang | Qty Fisik | ...
    baris 6+ = data. Kolom Gondola/Lokasi HANYA terisi di baris pertama
    tiap grup, jadi nilainya di-forward-fill ke baris berikutnya.

Catatan: kolom Tingkat di Excel mengulang 1..N untuk tiap gondola,
kadang sampai 6. Baris tanpa nama barang dilewati.
"""

from __future__ import annotations

import sys
from pathlib import Path

try:
    import openpyxl
except ImportError:
    sys.exit("openpyxl belum terpasang. Jalankan: py -3 -m pip install openpyxl")

ROOT = Path(__file__).resolve().parent.parent
XLSX = ROOT / "supabase" / "seed" / "DATABASE POS KDKMP PUNGPUNGAN.xlsx"
OUT = ROOT / "supabase" / "seed_product_gondola.sql"

# sheet -> petugas (label harus sama dengan src/lib/petugas.ts)
SHEETS: list[tuple[str, str]] = [
    ("VYRDA (1-12)", "Vyrda Ayu Lestari"),
    ("PANDU (13-24)", "Pandu"),
    ("RISTA (25-36)", "Rista"),
    ("DEDIK (37-48)", "Dedik"),
    ("IMEL (49-60)", "Imel"),
    ("LIA (DEPAN-BELAKANG)", "Lia Agustina"),
]

HEADER_ROW = 5
COL_WILAYAH = 1   # B: Gondola (angka) atau Lokasi (teks)
COL_TINGKAT = 2   # C
COL_NAMA = 3      # D


def bersih(nilai) -> str:
    return "" if nilai is None else str(nilai).strip()


def esc(teks: str) -> str:
    return teks.replace("'", "''")


def baca_sheet(ws) -> tuple[list[tuple[str, int, str]], list[int]]:
    """Kembalikan (daftar (wilayah, tingkat, nama), daftar baris tanpa nama)."""
    hasil: list[tuple[str, int, str]] = []
    dilewati: list[int] = []
    wilayah_sekarang = ""

    for idx, row in enumerate(ws.iter_rows(min_row=HEADER_ROW + 1, values_only=True), start=HEADER_ROW + 1):
        def kolom(i: int):
            return row[i] if i < len(row) else None

        raw_wilayah, raw_tingkat, raw_nama = kolom(COL_WILAYAH), kolom(COL_TINGKAT), kolom(COL_NAMA)

        # Forward-fill wilayah: hanya terisi di baris pertama tiap grup
        w = bersih(raw_wilayah)
        if w:
            wilayah_sekarang = w

        nama = bersih(raw_nama)
        if not nama:
            continue
        if not wilayah_sekarang:
            dilewati.append(idx)
            continue

        try:
            tingkat = int(float(bersih(raw_tingkat))) if bersih(raw_tingkat) else 1
        except ValueError:
            tingkat = 1

        hasil.append((wilayah_sekarang, max(1, tingkat), nama))

    return hasil, dilewati


def main() -> int:
    if not XLSX.exists():
        sys.exit(f"File Excel tidak ditemukan: {XLSX}")

    wb = openpyxl.load_workbook(XLSX, data_only=True, read_only=True)

    baris_sql: list[str] = []
    nama_unik: dict[str, int] = {}
    total = 0
    laporan: list[str] = []

    for sheet, petugas in SHEETS:
        if sheet not in wb.sheetnames:
            laporan.append(f"  ! Sheet '{sheet}' tidak ada, dilewati.")
            continue

        data, dilewati = baca_sheet(wb[sheet])
        for wilayah, tingkat, nama in data:
            nama_unik[nama] = nama_unik.get(nama, 0) + 1

            # Angka -> gondola_no, teks -> lokasi.
            # Cast eksplisit supaya Postgres bisa menyimpulkan tipe kolom di VALUES
            # (campuran null dan integer / kosong dan teks itu ambigu).
            if wilayah.replace(",", ".").replace(".", "", 1).isdigit():
                nomor = int(float(wilayah.replace(",", ".")))
                kolom_no, kolom_lokasi = str(nomor), "''::text"
                label = f"Gondola {nomor}"
            else:
                kolom_no, kolom_lokasi = "null::integer", f"'{esc(wilayah)}'::text"
                label = wilayah

            baris_sql.append(
                f"  ('{esc(nama)}'::text, {kolom_no}, {kolom_lokasi}, {tingkat})"
            )
            total += 1

        laporan.append(
            f"  {sheet:26s} -> {len(data):3d} baris terpetakan"
            + (f" ({len(dilewati)} dilewati tanpa wilayah)" if dilewati else "")
        )

    if not baris_sql:
        sys.exit("Tidak ada data yang bisa dipetakan.")

    sql = [
        "-- =====================================================================",
        "-- SEED PEMETAAN PRODUK -> GONDOLA (dibuat otomatis)",
        f"-- Sumber: {XLSX.name}",
        "-- Jalankan SETELAH supabase/product_gondola.sql",
        "-- =====================================================================",
        "",
        "-- Kosongkan dulu supaya skrip ini aman dijalankan ulang",
        "truncate table product_gondola restart identity;",
        "",
        "-- (produk_id, gondola_no, lokasi, tingkat)",
        "-- Ditulis sebagai join ke products: nama yang tidak ketemu otomatis terlewat,",
        "-- sehingga satu nama yang salah tidak menggagalkan seluruh insert.",
        "insert into product_gondola (produk_id, gondola_no, lokasi, tingkat)",
        "select p.id, v.gondola_no, v.lokasi, v.tingkat",
        "from (values",
        ",\n".join(baris_sql),
        ") as v(item, gondola_no, lokasi, tingkat)",
        "join products p on p.item = v.item;",        "",
        "-- Barang di Excel yang tidak ketemu di tabel products (perlu dicek manual).",
        "-- Dibandingkan langsung ke products, jadi tidak bergantung pada isi product_gondola.",
        "select x.item as nama_di_excel",
        "from (values",
    ]

    semua_nama = ",\n".join(f"  ('{esc(n)}'::text)" for n in sorted(nama_unik))
    sql.append(semua_nama)

    sql += [
        ") as x(item)",
        "where not exists (select 1 from products p where p.item = x.item)",
        "order by 1;",        "",
        "-- Cek: baris pemetaan yang produk_id-nya null (nama tidak ketemu saat insert)",
        "select count(*) as pemetaan_tanpa_produk from product_gondola where produk_id is null;",
        "",
        "notify pgrst, 'reload schema';",
        "",
    ]

    OUT.write_text("\n".join(sql), encoding="utf-8")

    print("Selesai.")
    print("\n".join(laporan))
    print(f"\n  Total baris pemetaan : {total}")
    print(f"  Nama produk unik     : {len(nama_unik)}")
    print(f"  Ditulis ke           : {OUT.relative_to(ROOT)}")
    print("\nLangkah berikutnya:")
    print("  1. Jalankan supabase/product_gondola.sql di Supabase SQL Editor")
    print("  2. Jalankan supabase/seed_product_gondola.sql")
    print("  3. Periksa query terakhir: nama barang yang tidak ketemu di products")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
