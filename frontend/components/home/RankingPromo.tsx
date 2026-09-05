import { type ScoreItem } from "@/lib/api";
import { TIER_LABELS, TIER_SCORE_LABELS, TIER_VAR, type TierKey } from "@/lib/constants";
import LiveRankingPreview from "@/components/home/LiveRankingPreview";
import Button from "@/components/ui/Button";

const TIER_ORDER: TierKey[] = ["excellent", "good", "average", "weak"];

/**
 * Rankings hub promo — sits right under the live market band. Explains the
 * ranking page in plain words, previews the tier system and the current top
 * stocks, and links to /dsestockranking. Server component (SEO-safe copy +
 * internal link); wrapped in <Reveal> at the page level.
 */
export default function RankingPromo({
  items,
  totalCount,
}: {
  items: ScoreItem[];
  totalCount: number;
}) {
  const roundedCount = Math.max(50, Math.floor(totalCount / 50) * 50);

  return (
    <section aria-labelledby="ranking-promo-title">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10 items-center">
        <div className="order-2 md:order-1 flex flex-col">
          <span className="inline-flex self-start items-center gap-2 rounded-full bg-[color-mix(in_srgb,var(--watch)_12%,transparent)] px-3.5 py-1 text-[0.7rem] font-extrabold uppercase tracking-[0.14em] text-[var(--warm-ink)]">
            Rankings
          </span>
          <h2
            id="ranking-promo-title"
            className="font-display mt-3 text-[clamp(1.7rem,5vw,2.6rem)] font-extrabold tracking-tight text-[var(--text)] leading-[1.1]"
          >
            Every DSE stock, ranked by real strength
          </h2>
          <p className="mt-2.5 text-[0.95rem] leading-relaxed text-[var(--text-muted)]">
            We score all {roundedCount}+ companies from 0 to 100 on their fundamentals and line them up
            strongest-first — sorted into clear tiers, updated every trading day.
          </p>
          <p lang="bn" className="font-bn mt-1.5 text-[0.95rem] leading-relaxed text-[var(--text)]">
            {roundedCount}+ কোম্পানিকে ০–১০০ স্কোরে সাজানো — সবচেয়ে মজবুতগুলো আগে, প্রতিদিন আপডেট।
          </p>

          {/* Tier legend — a preview of how the ranking page groups stocks */}
          <ul className="mt-4 grid grid-cols-2 gap-2">
            {TIER_ORDER.map((t) => (
              <li
                key={t}
                className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5"
              >
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: TIER_VAR[t] }} />
                <span className="text-[0.8rem] font-bold text-[var(--text)]">{TIER_LABELS[t]}</span>
                <span className="ml-auto text-[0.68rem] font-semibold tabular-nums text-[var(--text-muted)]">
                  {TIER_SCORE_LABELS[t].replace("Score ", "")}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-5">
            <Button href="/dsestockranking" variant="primary" size="sm">
              See the full rankings →
            </Button>
          </div>
        </div>

        <div className="order-1 md:order-2 w-full md:max-w-[420px] mx-auto md:ml-auto">
          <LiveRankingPreview items={items.slice(0, 6)} totalCount={totalCount} />
        </div>
      </div>
    </section>
  );
}
