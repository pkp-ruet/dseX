import Link from "next/link";
import type { FeaturedListEntry } from "@/lib/featured-lists";

interface Props {
  entries: FeaturedListEntry[];
  max?: number;
}

export default function FeaturedInStrip({ entries, max = 5 }: Props) {
  if (!entries.length) return null;

  const shown = entries.slice(0, max);
  const extra = entries.length - shown.length;

  return (
    <section className="mb-8">
      <div
        className="rounded-2xl p-4 sm:p-5"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <div className="flex items-center gap-2 mb-3">
          <span aria-hidden="true">⭐</span>
          <h2 className="text-sm font-bold uppercase tracking-[0.12em]" style={{ color: "var(--text-muted)" }}>
            Featured in our picks
          </h2>
        </div>

        <div className="flex flex-wrap gap-2">
          {shown.map(({ def, rank }) => (
            <Link
              key={def.slug}
              href={`/stock-insights/${def.slug}`}
              className="inline-flex items-center gap-2 text-sm font-semibold px-3 py-1.5 rounded-full transition-colors"
              style={{
                color: "var(--primary)",
                background: "rgba(37,99,235,0.08)",
                border: "1px solid rgba(37,99,235,0.25)",
              }}
            >
              <span aria-hidden="true">{def.icon}</span>
              <span style={{ color: "var(--text)" }}>{def.shortName}</span>
              <span
                className="tabular-nums text-xs font-bold px-1.5 py-0.5 rounded-full"
                style={{ color: "var(--primary)", background: "rgba(37,99,235,0.12)" }}
              >
                #{rank}
              </span>
            </Link>
          ))}

          {extra > 0 && (
            <Link
              href="/stock-insights"
              className="inline-flex items-center text-sm font-semibold px-3 py-1.5 rounded-full"
              style={{
                color: "var(--text-muted)",
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
              }}
            >
              +{extra} more
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
