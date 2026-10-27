import Link from "next/link";
import type { FeaturedListEntry } from "@/lib/featured-lists";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { IconStar } from "@/components/stock/StockIcons";
import { T } from "@/components/i18n/T";

/** Bengali names of the four free rankings (lib/stock-lists.ts). */
const NAME_BN: Record<string, string> = {
  top_dividend: "বেশি ডিভিডেন্ড দেওয়া শেয়ার",
  top_market_cap: "সবচেয়ে বড় কোম্পানি",
  top_volume: "সবচেয়ে বেশি লেনদেন",
  top_52w_return: "এক বছরে সবচেয়ে বেশি বেড়েছে",
};

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
          <span className="inline-flex" style={{ color: "var(--warm)" }}><IconStar size={14} /></span>
          <h2 className="text-sm font-bold text-text-muted">
            <T en="Featured in our stock lists" bn="আমাদের যেসব তালিকায় আছে" />
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
              <span className="text-text-main">
                <T en={def.shortName} bn={NAME_BN[def.apiKey] ?? def.shortName} />
              </span>
              <span
                className="tabular-nums nums text-xs font-bold px-1.5 py-0.5 rounded-full"
                style={{ color: "var(--primary)", background: "color-mix(in srgb, var(--primary) 12%, transparent)" }}
              >
                #{rank}
              </span>
            </Link>
          ))}

          {extra > 0 && (
            <Button variant="quiet" size="sm" href="/stock-insights" className="rounded-full">
              <T en={`+${extra} more`} bn={`আরও ${extra}টি`} />
            </Button>
          )}
        </div>
      </Card>
    </section>
  );
}
