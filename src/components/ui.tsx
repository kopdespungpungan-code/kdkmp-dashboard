import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export { Badge };

export function PageHeader({ title, sub, action }: { title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b-2 border-border pb-3">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
        {sub && <p className="mt-0.5 text-sm text-muted-foreground">{sub}</p>}
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

export function Alert({
  children,
  tone = "info",
}: {
  children: React.ReactNode;
  tone?: "info" | "merah" | "kuning" | "hijau";
}) {
  const gaya = {
    info: "border-primary/40 bg-accent text-accent-foreground",
    merah: "border-merah/40 bg-merah-muda text-merah-tua",
    kuning: "border-kuning/40 bg-kuning-muda text-kuning",
    hijau: "border-hijau/40 bg-hijau-muda text-hijau",
  }[tone];
  return <div role="alert" className={`mb-4 rounded border px-3 py-2 text-sm ${gaya}`}>{children}</div>;
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">{children}</p>;
}

export function LinkButton({ href, children, primary }: { href: string; children: React.ReactNode; primary?: boolean }) {
  return (
    <Link href={href} className={`btn ${primary ? "btn-primary" : ""}`}>
      {children}
    </Link>
  );
}
