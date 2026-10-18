"use client";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Row = { label: string; omzet: number; hariIni: boolean };

const rp = (n: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
const singkat = (n: number) => (n >= 1_000_000 ? `${+(n / 1_000_000).toFixed(1)} jt` : n >= 1000 ? `${Math.round(n / 1000)} rb` : String(n));

export default function OmzetChart({ data }: { data: Row[] }) {
  return (
    <div className="h-64 w-full" role="img" aria-label="Grafik batang omzet harian 14 hari terakhir">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="#d9dcd6" />
          <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: "#1b2430" }} tick={{ fontSize: 11, fill: "#667085" }} interval="preserveStartEnd" />
          <YAxis tickLine={false} axisLine={false} width={48} tick={{ fontSize: 11, fill: "#667085" }} tickFormatter={singkat} />
          <Tooltip
            cursor={{ fill: "#eef0eb" }}
            formatter={(v) => [rp(Number(v)), "Omzet"]}
            contentStyle={{ borderRadius: 4, border: "1px solid #d9dcd6", fontSize: 13 }}
          />
          <Bar
            dataKey="omzet"
            radius={[2, 2, 0, 0]}
            shape={(props: { x?: number; y?: number; width?: number; height?: number; payload?: Row }) => (
              <rect x={props.x} y={props.y} width={props.width} height={props.height} rx={2} fill={props.payload?.hariIni ? "#b3202a" : "#1b2430"} />
            )}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
