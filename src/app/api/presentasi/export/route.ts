import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { addDays, angka, rupiah, tglPanjang, todayWIB } from "@/lib/format";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

type Period = "daily" | "weekly" | "monthly";

function periodeRange(period: Period, baseDate: string): { mulai: string; selesai: string; label: string } {
  const [y, m, d] = baseDate.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  if (period === "daily") {
    return { mulai: baseDate, selesai: baseDate, label: `Harian ${baseDate}` };
  }
  if (period === "weekly") {
    const hari = date.getUTCDay();
    const sejakSenin = (hari + 6) % 7;
    const mulaiDate = new Date(Date.UTC(y, m - 1, d - sejakSenin));
    const selesaiDate = new Date(mulaiDate.getTime() + 6 * 24 * 60 * 60 * 1000);
    const fmt = (dt: Date) => dt.toISOString().slice(0, 10);
    return { mulai: fmt(mulaiDate), selesai: fmt(selesaiDate), label: `Mingguan ${fmt(mulaiDate)} s.d. ${fmt(selesaiDate)}` };
  }
  // monthly
  const mulaiDate = new Date(Date.UTC(y, m - 1, 1));
  const selesaiDate = new Date(Date.UTC(y, m, 0));
  const fmt = (dt: Date) => dt.toISOString().slice(0, 10);
  return { mulai: fmt(mulaiDate), selesai: fmt(selesaiDate), label: `Bulanan ${baseDate.slice(0, 7)}` };
}

export async function GET(req: Request) {
  try {
    const sb = await createClient();
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) return NextResponse.json({ error: "Belum login" }, { status: 401 });

    const url = new URL(req.url);
    const period = (url.searchParams.get("period") ?? "daily") as Period;
    const format = url.searchParams.get("format") ?? "xlsx";
    const baseDate = url.searchParams.get("date") ?? todayWIB();

    if (!["daily", "weekly", "monthly"].includes(period)) {
      return NextResponse.json({ error: "Period tidak valid" }, { status: 400 });
    }
    if (!["xlsx", "docx", "pdf"].includes(format)) {
      return NextResponse.json({ error: "Format tidak valid" }, { status: 400 });
    }

    const { mulai, selesai, label } = periodeRange(period, baseDate);

    // Fetch data
    const [ring, harian, laris, perhatian, terakhir, kkMinggu] = await Promise.all([
      sb.from("v_ringkasan_stok").select("*").single(),
      sb.from("v_omzet_harian").select("*").gte("tanggal", mulai).lte("tanggal", selesai).order("tanggal"),
      sb.from("v_terlaris_30hari").select("*").limit(10),
      sb.from("v_perlu_perhatian").select("*").limit(50),
      sb.from("v_total_invoice").select("*").gte("tanggal", mulai).lte("tanggal", selesai).order("tanggal", { ascending: false }).limit(50),
      sb.from("sale_kk").select("no_kk, tanggal").gte("tanggal", mulai).lte("tanggal", selesai),
    ]);

    const r = (ring.data ?? {}) as any;
    const rows = (harian.data ?? []) as any[];
    const omzet = rows.reduce((a: number, b: any) => a + Number(b.omzet ?? 0), 0);
    const nota = rows.reduce((a: number, b: any) => a + Number(b.nota ?? 0), 0);
    const pcs = rows.reduce((a: number, b: any) => a + Number(b.pcs ?? 0), 0);
    const kkUnik = new Set((kkMinggu.data ?? []).map((x: any) => x.no_kk)).size;
    const larisRows = (laris.data ?? []) as any[];
    const perhatianRows = (perhatian.data ?? []) as any[];
    const invoiceRows = (terakhir.data ?? []) as any[];

    const judul = `Laporan Penjualan ${label} — KDKMP Pungpungan`;
    const subJudul = `Periode: ${mulai} s.d. ${selesai} · Digenerate ${new Date().toLocaleString("id-ID")}`;

    if (format === "xlsx") {
      const XLSX = await import("xlsx");
      const wb = XLSX.utils.book_new();

      // Sheet 1: Ringkasan
      const ringkasanData = [
        ["Laporan Penjualan — KDKMP Pungpungan"],
        [judul],
        [subJudul],
        [],
        ["Metrik", "Nilai"],
        ["Omzet", omzet],
        ["Jumlah Nota", nota],
        ["Barang Terjual (pcs)", pcs],
        ["Jenis Produk", r.jenis_produk ?? 0],
        ["Total Stok", r.total_stok ?? 0],
        ["Stok Menipis", r.menipis ?? 0],
        ["Stok Habis", r.habis ?? 0],
        ["Hampir Expired", r.hampir_expired ?? 0],
        ["KK Subsidi (unik)", kkUnik],
      ];
      const ws1 = XLSX.utils.aoa_to_sheet(ringkasanData);
      ws1["!cols"] = [{ wch: 30 }, { wch: 20 }];
      XLSX.utils.book_append_sheet(wb, ws1, "Ringkasan");

      // Sheet 2: Omzet Harian
      const harianData = [["Tanggal", "Nota", "Pcs", "Omzet"]];
      rows.forEach((row: any) => {
        harianData.push([row.tanggal, Number(row.nota ?? 0), Number(row.pcs ?? 0), Number(row.omzet ?? 0)]);
      });
      const ws2 = XLSX.utils.aoa_to_sheet(harianData);
      ws2["!cols"] = [{ wch: 14 }, { wch: 8 }, { wch: 10 }, { wch: 16 }];
      XLSX.utils.book_append_sheet(wb, ws2, "Omzet Harian");

      // Sheet 3: Top Produk
      const produkData = [["#", "Produk", "Pcs", "Omzet"]];
      larisRows.forEach((p: any, i: number) => {
        produkData.push([i + 1, p.item, Number(p.pcs ?? 0), Number(p.omzet ?? 0)]);
      });
      const ws3 = XLSX.utils.aoa_to_sheet(produkData);
      ws3["!cols"] = [{ wch: 4 }, { wch: 40 }, { wch: 10 }, { wch: 16 }];
      XLSX.utils.book_append_sheet(wb, ws3, "Top Produk");

      // Sheet 4: Nota
      const notaData = [["No. Nota", "Tanggal", "Kasir", "Pcs", "Total"]];
      invoiceRows.forEach((inv: any) => {
        notaData.push([inv.invoice_no, inv.tanggal, inv.kasir ?? "-", Number(inv.pcs ?? 0), Number(inv.total ?? 0)]);
      });
      const ws4 = XLSX.utils.aoa_to_sheet(notaData);
      ws4["!cols"] = [{ wch: 14 }, { wch: 22 }, { wch: 16 }, { wch: 8 }, { wch: 16 }];
      XLSX.utils.book_append_sheet(wb, ws4, "Nota");

      // Sheet 5: Stok Kritis
      const stokData = [["Produk", "Toko", "Gudang", "Total", "Min", "Expired", "Status"]];
      perhatianRows.forEach((p: any) => {
        stokData.push([
          p.item,
          Number(p.stok_toko ?? 0),
          Number(p.stok_gudang ?? 0),
          Number(p.stok_total ?? 0),
          p.stok_min ?? 0,
          p.expired_terdekat ?? "-",
          Number(p.stok_total ?? 0) <= 0 ? "Habis" : "Menipis",
        ]);
      });
      const ws5 = XLSX.utils.aoa_to_sheet(stokData);
      ws5["!cols"] = [{ wch: 30 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 6 }, { wch: 12 }, { wch: 10 }];
      XLSX.utils.book_append_sheet(wb, ws5, "Stok Kritis");

      const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
      return new NextResponse(new Uint8Array(buf), {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="laporan-penjualan-${period}-${baseDate}.xlsx"`,
        },
      });
    }

    if (format === "docx") {
      const { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, HeadingLevel, AlignmentType } = await import("docx");
      const doc = new Document({
        sections: [
          {
            children: [
              new Paragraph({ text: "Laporan Penjualan — KDKMP Pungpungan", heading: HeadingLevel.TITLE }),
              new Paragraph({ text: judul, heading: HeadingLevel.HEADING_1 }),
              new Paragraph({ text: subJudul, style: "IntenseQuote" }),
              new Paragraph({ text: "" }),
              new Paragraph({ text: "Ringkasan KPI", heading: HeadingLevel.HEADING_2 }),
              new Table({
                rows: [
                  new TableRow({ children: [new TableCell({ children: [new Paragraph("Metrik")] }), new TableCell({ children: [new Paragraph("Nilai")] })] }),
                  new TableRow({ children: [new TableCell({ children: [new Paragraph("Omzet")] }), new TableCell({ children: [new Paragraph(rupiah(omzet))] })] }),
                  new TableRow({ children: [new TableCell({ children: [new Paragraph("Jumlah Nota")] }), new TableCell({ children: [new Paragraph(angka(nota))] })] }),
                  new TableRow({ children: [new TableCell({ children: [new Paragraph("Barang Terjual (pcs)")] }), new TableCell({ children: [new Paragraph(angka(pcs))] })] }),
                  new TableRow({ children: [new TableCell({ children: [new Paragraph("Jenis Produk")] }), new TableCell({ children: [new Paragraph(angka(r.jenis_produk ?? 0))] })] }),
                  new TableRow({ children: [new TableCell({ children: [new Paragraph("Total Stok")] }), new TableCell({ children: [new Paragraph(angka(r.total_stok ?? 0))] })] }),
                  new TableRow({ children: [new TableCell({ children: [new Paragraph("Stok Menipis")] }), new TableCell({ children: [new Paragraph(angka(r.menipis ?? 0))] })] }),
                  new TableRow({ children: [new TableCell({ children: [new Paragraph("Stok Habis")] }), new TableCell({ children: [new Paragraph(angka(r.habis ?? 0))] })] }),
                  new TableRow({ children: [new TableCell({ children: [new Paragraph("Hampir Expired")] }), new TableCell({ children: [new Paragraph(angka(r.hampir_expired ?? 0))] })] }),
                  new TableRow({ children: [new TableCell({ children: [new Paragraph("KK Subsidi (unik)")] }), new TableCell({ children: [new Paragraph(angka(kkUnik))] })] }),
                ],
              }),
              new Paragraph({ text: "" }),
              new Paragraph({ text: "Top 10 Produk Terlaris", heading: HeadingLevel.HEADING_2 }),
              new Table({
                rows: [
                  new TableRow({ children: [new TableCell({ children: [new Paragraph("#")] }), new TableCell({ children: [new Paragraph("Produk")] }), new TableCell({ children: [new Paragraph("Pcs")] }), new TableCell({ children: [new Paragraph("Omzet")] })] }),
                  ...larisRows.map((p: any, i: number) =>
                    new TableRow({ children: [new TableCell({ children: [new Paragraph(String(i + 1))] }), new TableCell({ children: [new Paragraph(p.item)] }), new TableCell({ children: [new Paragraph(angka(Number(p.pcs ?? 0)))] }), new TableCell({ children: [new Paragraph(rupiah(Number(p.omzet ?? 0)))] })] })
                  ),
                ],
              }),
              new Paragraph({ text: "" }),
              new Paragraph({ text: "Omzet Harian", heading: HeadingLevel.HEADING_2 }),
              new Table({
                rows: [
                  new TableRow({ children: [new TableCell({ children: [new Paragraph("Tanggal")] }), new TableCell({ children: [new Paragraph("Nota")] }), new TableCell({ children: [new Paragraph("Pcs")] }), new TableCell({ children: [new Paragraph("Omzet")] })] }),
                  ...rows.map((row: any) =>
                    new TableRow({ children: [new TableCell({ children: [new Paragraph(row.tanggal)] }), new TableCell({ children: [new Paragraph(angka(Number(row.nota ?? 0)))] }), new TableCell({ children: [new Paragraph(angka(Number(row.pcs ?? 0)))] }), new TableCell({ children: [new Paragraph(rupiah(Number(row.omzet ?? 0)))] })] })
                  ),
                ],
              }),
              new Paragraph({ text: "" }),
              new Paragraph({ text: "Stok Kritis", heading: HeadingLevel.HEADING_2 }),
              new Table({
                rows: [
                  new TableRow({ children: [new TableCell({ children: [new Paragraph("Produk")] }), new TableCell({ children: [new Paragraph("Toko")] }), new TableCell({ children: [new Paragraph("Gudang")] }), new TableCell({ children: [new Paragraph("Total")] }), new TableCell({ children: [new Paragraph("Min")] }), new TableCell({ children: [new Paragraph("Expired")] }), new TableCell({ children: [new Paragraph("Status")] })] }),
                  ...perhatianRows.map((p: any) =>
                    new TableRow({ children: [new TableCell({ children: [new Paragraph(p.item)] }), new TableCell({ children: [new Paragraph(angka(Number(p.stok_toko ?? 0)))] }), new TableCell({ children: [new Paragraph(angka(Number(p.stok_gudang ?? 0)))] }), new TableCell({ children: [new Paragraph(angka(Number(p.stok_total ?? 0)))] }), new TableCell({ children: [new Paragraph(String(p.stok_min ?? 0))] }), new TableCell({ children: [new Paragraph(p.expired_terdekat ?? "-")] }), new TableCell({ children: [new Paragraph(Number(p.stok_total ?? 0) <= 0 ? "Habis" : "Menipis")] })] })
                  ),
                ],
              }),
              new Paragraph({ text: "" }),
              new Paragraph({ text: "10 Nota Terakhir", heading: HeadingLevel.HEADING_2 }),
              new Table({
                rows: [
                  new TableRow({ children: [new TableCell({ children: [new Paragraph("No. Nota")] }), new TableCell({ children: [new Paragraph("Tanggal")] }), new TableCell({ children: [new Paragraph("Kasir")] }), new TableCell({ children: [new Paragraph("Pcs")] }), new TableCell({ children: [new Paragraph("Total")] })] }),
                  ...invoiceRows.map((inv: any) =>
                    new TableRow({ children: [new TableCell({ children: [new Paragraph(inv.invoice_no)] }), new TableCell({ children: [new Paragraph(inv.tanggal)] }), new TableCell({ children: [new Paragraph(inv.kasir ?? "-")] }), new TableCell({ children: [new Paragraph(angka(Number(inv.pcs ?? 0)))] }), new TableCell({ children: [new Paragraph(rupiah(Number(inv.total ?? 0)))] })] })
                  ),
                ],
              }),
              new Paragraph({ text: "" }),
              new Paragraph({ text: `Diperbarui: ${new Date().toLocaleString("id-ID")}`, style: "IntenseQuote" }),
            ],
          },
        ],
      });

      const buf = await Packer.toBuffer(doc);
      return new NextResponse(new Uint8Array(buf), {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "Content-Disposition": `attachment; filename="laporan-penjualan-${period}-${baseDate}.docx"`,
        },
      });
    }

    if (format === "pdf") {
      const { jsPDF } = await import("jspdf");
      const { autoTable } = await import("jspdf-autotable");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

      pdf.setFontSize(16);
      pdf.text("Laporan Penjualan — KDKMP Pungpungan", 14, 18);
      pdf.setFontSize(12);
      pdf.text(judul, 14, 26);
      pdf.setFontSize(9);
      pdf.text(subJudul, 14, 32);

      let y = 40;
      pdf.setFontSize(12);
      pdf.text("Ringkasan KPI", 14, y);
      y += 6;
      autoTable(pdf, {
        startY: y,
        head: [["Metrik", "Nilai"]],
        body: [
          ["Omzet", rupiah(omzet)],
          ["Jumlah Nota", angka(nota)],
          ["Barang Terjual (pcs)", angka(pcs)],
          ["Jenis Produk", angka(r.jenis_produk ?? 0)],
          ["Total Stok", angka(r.total_stok ?? 0)],
          ["Stok Menipis", angka(r.menipis ?? 0)],
          ["Stok Habis", angka(r.habis ?? 0)],
          ["Hampir Expired", angka(r.hampir_expired ?? 0)],
          ["KK Subsidi (unik)", angka(kkUnik)],
        ],
        styles: { fontSize: 9 },
        headStyles: { fillColor: [190, 30, 45] },
      });
      y = (pdf as any).lastAutoTable.finalY + 8;

      pdf.text("Top 10 Produk Terlaris", 14, y);
      y += 6;
      autoTable(pdf, {
        startY: y,
        head: [["#", "Produk", "Pcs", "Omzet"]],
        body: larisRows.map((p: any, i: number) => [String(i + 1), p.item, angka(Number(p.pcs ?? 0)), rupiah(Number(p.omzet ?? 0))]),
        styles: { fontSize: 9 },
        headStyles: { fillColor: [190, 30, 45] },
      });
      y = (pdf as any).lastAutoTable.finalY + 8;

      if (y > 250) { pdf.addPage(); y = 18; }
      pdf.text("Omzet Harian", 14, y);
      y += 6;
      autoTable(pdf, {
        startY: y,
        head: [["Tanggal", "Nota", "Pcs", "Omzet"]],
        body: rows.map((row: any) => [row.tanggal, angka(Number(row.nota ?? 0)), angka(Number(row.pcs ?? 0)), rupiah(Number(row.omzet ?? 0))]),
        styles: { fontSize: 9 },
        headStyles: { fillColor: [190, 30, 45] },
      });
      y = (pdf as any).lastAutoTable.finalY + 8;

      if (y > 250) { pdf.addPage(); y = 18; }
      pdf.text("Stok Kritis", 14, y);
      y += 6;
      autoTable(pdf, {
        startY: y,
        head: [["Produk", "Toko", "Gudang", "Total", "Min", "Expired", "Status"]],
        body: perhatianRows.map((p: any) => [
          p.item,
          angka(Number(p.stok_toko ?? 0)),
          angka(Number(p.stok_gudang ?? 0)),
          angka(Number(p.stok_total ?? 0)),
          String(p.stok_min ?? 0),
          p.expired_terdekat ?? "-",
          Number(p.stok_total ?? 0) <= 0 ? "Habis" : "Menipis",
        ]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [190, 30, 45] },
      });
      y = (pdf as any).lastAutoTable.finalY + 8;

      if (y > 250) { pdf.addPage(); y = 18; }
      pdf.text("10 Nota Terakhir", 14, y);
      y += 6;
      autoTable(pdf, {
        startY: y,
        head: [["No. Nota", "Tanggal", "Kasir", "Pcs", "Total"]],
        body: invoiceRows.map((inv: any) => [inv.invoice_no, inv.tanggal, inv.kasir ?? "-", angka(Number(inv.pcs ?? 0)), rupiah(Number(inv.total ?? 0))]),
        styles: { fontSize: 9 },
        headStyles: { fillColor: [190, 30, 45] },
      });

      pdf.setFontSize(8);
      pdf.text(`Diperbarui: ${new Date().toLocaleString("id-ID")}`, 14, (pdf as any).lastAutoTable.finalY + 8);

      const buf = pdf.output("arraybuffer");
      return new NextResponse(new Uint8Array(buf), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="laporan-penjualan-${period}-${baseDate}.pdf"`,
        },
      });
    }

    return NextResponse.json({ error: "Format tidak didukung" }, { status: 400 });
  } catch (e: any) {
    console.error("[presentasi-export]", e);
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  }
}
