import Link from "next/link";
import type { FeaturedListEntry } from "@/lib/featured-lists";
import Button from "@/components/ui/Button";
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

  // One quiet line (2026-10-29 calm pass): no card, no star, neutral chips —
  // colour on this page is kept for meaning.
  return (
    <section className="mb-8 flex flex-wrap items-center gap-2" aria-labelledby="featured-in-t">
      <h2 id="featured-in-t" className="mr-1 text-sm font-semibold text-text-muted">
        <T en="In our lists" bn="আমাদের তালিকায়" />
      </h2>
      {shown.map(({ def, rank }) => (
        <Link
          key={def.slug}
          prefetch={false}
          href={`/stock-insights/${def.slug}`}
          className="inline-flex min-h-10 items-center gap-2 rounded-full border border-border bg-surface px-3 text-sm font-semibold text-text-main hover:border-text-muted active:opacity-70"
        >
          <T en={def.shortName} bn={NAME_BN[def.apiKey] ?? def.shortName} />
          <span className="tabular-nums nums text-xs font-bold text-text-muted">#{rank}</span>
        </Link>
      ))}
      {extra > 0 && (
        <Button variant="quiet" size="sm" href="/stock-insights" className="rounded-full">
          <T en={`+${extra} more`} bn={`আরও ${extra}টি`} />
        </Button>
      )}
    </section>
  );
}
