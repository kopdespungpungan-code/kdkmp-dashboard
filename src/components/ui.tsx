import Link from "next/link";
import type { Tone } from "@/lib/stok";

const tones: Record<Tone, string> = {
  merah: "bg-merah-muda text-merah-tua",
  kuning: "bg-kuning-muda text-kuning",
  hijau: "bg-hijau-muda text-hijau",
  abu: "bg-garis/50 text-redup",
};

export function Badge({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return <span className={`inline-block rounded px-1.5 py-0.5 text-xs font-semibold whitespace-nowrap ${tones[tone]}`}>{children}</span>;
}

export function PageHeader({ title, sub, action }: { title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b-2 border-ink pb-3">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
        {sub && <p className="mt-0.5 text-sm text-redup">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

export function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-bold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Alert({ children }: { children: React.ReactNode }) {
  return <div role="alert" className="mb-4 rounded border border-merah/40 bg-merah-muda px-3 py-2 text-sm text-merah-tua">{children}</div>;
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded border border-dashed border-garis px-4 py-8 text-center text-sm text-redup">{children}</p>;
}

export function LinkButton({ href, children, primary }: { href: string; children: React.ReactNode; primary?: boolean }) {
  return (
    <Link href={href} className={`btn ${primary ? "btn-primary" : ""}`}>
      {children}
    </Link>
  );
}
