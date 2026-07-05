import Link from "next/link";
import type { FeaturedListEntry } from "@/lib/featured-lists";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

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
      <Card padding="none" className="rounded-2xl p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-3">
          <span aria-hidden="true">⭐</span>
          <h2 className="text-sm font-bold uppercase tracking-[0.12em]" style={{ color: "var(--text-muted)" }}>
            Featured in our stock lists
          </h2>
        </div>

        <div className="flex flex-wrap gap-2">
          {shown.map(({ def, rank }) => (
            <Link
              key={def.slug}
              prefetch={false}
              href={`/stock-insights/${def.slug}`}
              className="inline-flex items-center gap-2 text-sm font-semibold px-3 py-1.5 rounded-full transition-colors"
              style={{
                color: "var(--primary)",
                background: "color-mix(in srgb, var(--primary) 8%, transparent)",
                border: "1px solid color-mix(in srgb, var(--primary) 25%, transparent)",
              }}
            >
              <span aria-hidden="true">{def.icon}</span>
              <span style={{ color: "var(--text)" }}>{def.shortName}</span>
              <span
                className="tabular-nums nums text-xs font-bold px-1.5 py-0.5 rounded-full"
                style={{ color: "var(--primary)", background: "color-mix(in srgb, var(--primary) 12%, transparent)" }}
              >
                #{rank}
              </span>
            </Link>
          ))}

          {extra > 0 && (
            <Button variant="ghost" size="sm" href="/stock-insights" className="rounded-full">
              +{extra} more
            </Button>
          )}
        </div>
      </Card>
    </section>
  );
}
