import Link from "next/link";
import { getTier, TIER_VAR } from "@/lib/constants";
import { STORY_META, type StoryStock } from "@/lib/home-stories";
import SignalChip from "@/components/ui/SignalChip";
import TierPill from "@/components/ui/TierPill";

function fmtPrice(n: number | null | undefined): string {
  return n == null ? "--" : n.toFixed(2);
}

function fmtPct(n: number | null | undefined): string {
  if (n == null) return "--";
  const v = Number.isInteger(n) ? String(n) : n.toFixed(1);
  return `${v}%`;
}

function fmtGrowth(n: number | null | undefined): string {
  if (n == null) return "--";
  return `${n > 0 ? "+" : ""}${Math.round(n)}%`;
}

/** One metric column. `on` tints it in the story's accent when this card owns it. */
function Metric({ value, label, on, color }: { value: string; label: string; on: boolean; color: string }) {
  return (
    <div className="min-w-0">
      <div
        className="text-[0.9rem] font-extrabold tabular-nums nums leading-none truncate"
        style={{ color: on ? color : "var(--text)" }}
      >
        {value}
      </div>
      <div className="mt-1 text-[0.68rem] font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)] truncate">
        {label}
      </div>
    </div>
  );
}

function StoryCard({ card, index }: { card: StoryStock; index: number }) {
  const { item, headline, highlight, reasonEn, reasonBn } = card;
  const story = STORY_META[card.key];
  const tier = getTier(item.score);
  const tierColor = TIER_VAR[tier];
  const isBuy = item.signal?.signal === "buy";

  const meta = [
    item.sector,
    item.market_category ? `Cat ${item.market_category}` : null,
    item.last_reported_year ? `FY${item.last_reported_year}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Link
      href={`/stock/${item.trading_code}`}
      prefetch={false}
      className="soft-card hover-lift group flex h-full flex-col overflow-hidden no-underline"
    >
      {/* Story eyebrow — says why this card exists before you read the stock */}
      <div
        className="flex items-center gap-2 px-4 py-2.5 border-b"
        style={{
          background: `color-mix(in srgb, ${story.color} 9%, transparent)`,
          borderColor: `color-mix(in srgb, ${story.color} 20%, transparent)`,
        }}
      >
        <span aria-hidden className="text-[0.8rem] leading-none" style={{ color: story.ink }}>
          {story.glyph}
        </span>
        <span
          className="text-[0.68rem] font-extrabold uppercase tracking-[0.14em]"
          style={{ color: story.ink }}
        >
          {story.label}
        </span>
        <span className="ml-auto text-[0.68rem] font-bold tabular-nums text-[var(--text-muted)]">
          {index + 1}/3
        </span>
      </div>

      <div className="flex flex-1 flex-col p-4">
        {/* Identity + score */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <span
              className="inline-flex items-center rounded-md border px-2 py-0.5 font-mono text-[0.8rem] font-extrabold tracking-[0.03em]"
              style={{
                color: tierColor,
                background: `color-mix(in srgb, ${tierColor} 11%, transparent)`,
                borderColor: `color-mix(in srgb, ${tierColor} 30%, transparent)`,
              }}
            >
              {item.trading_code}
            </span>
            <div
              className="mt-1.5 text-[0.78rem] font-semibold leading-snug text-[var(--text)] group-hover:underline underline-offset-2 decoration-dotted"
              style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}
            >
              {item.company_name ?? item.trading_code}
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div
              className="font-display text-[1.75rem] font-extrabold leading-none tabular-nums nums"
              style={{ color: tierColor }}
            >
              {item.score == null ? "--" : Math.round(item.score)}
            </div>
            <div className="mt-0.5 text-[0.68rem] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">
              / 100
            </div>
          </div>
        </div>

        {meta && (
          <div className="mt-2 truncate text-[0.68rem] font-medium text-[var(--text-muted)]">{meta}</div>
        )}

        <div className="my-3 border-t border-[var(--border)]" />

        {/* The story headline — built from this card's own number, so it is
            always different from the other two cards. */}
        <p className="text-[0.9rem] font-bold leading-snug text-[var(--text)]">{headline}</p>

        {/* Verdict — Buy chip when the signal says so, else the tier grade.
            Never empty, never invented. */}
        <div className="mt-3 flex items-start gap-2">
          <span className="shrink-0">
            {isBuy ? (
              <SignalChip signal="buy" strength={item.signal?.strength ?? "normal"} />
            ) : (
              <TierPill tier={tier} />
            )}
          </span>
          {reasonEn && (
            <span className="text-[0.72rem] leading-snug text-[var(--text-muted)]">{reasonEn}</span>
          )}
        </div>

        {reasonBn && (
          <p lang="bn" className="font-bn mt-1.5 text-[0.72rem] leading-relaxed text-[var(--text-muted)]">
            {reasonBn}
          </p>
        )}

        {/* Same three columns on every card, in the same order — read one card,
            you can compare all three. Only the story's own metric is tinted. */}
        <div className="mt-auto grid grid-cols-3 gap-2 pt-4">
          <Metric value={`৳${fmtPrice(item.ltp)}`} label="Price" on={false} color={story.color} />
          <Metric
            value={fmtPct(item.div_yield_pct)}
            label="Cash a year"
            on={highlight === "yield"}
            color={story.color}
          />
          <Metric
            value={fmtGrowth(item.eps_yoy_pct)}
            label="Earnings"
            on={highlight === "growth"}
            color={story.color}
          />
        </div>
      </div>

      <div
        className="border-t border-[var(--border)] px-4 py-2.5 text-[0.72rem] font-bold text-[var(--primary-ink)] transition-colors group-hover:bg-[var(--surface-2)]"
        aria-hidden
      >
        See the full breakdown →
      </div>
    </Link>
  );
}

/**
 * "Three stocks worth knowing today" — sits directly above the rankings promo
 * on the logged-out homepage. Where the ranking table shows the shape of the
 * data, this shows what the data actually says: one card per reason to care.
 *
 * Server component; runs off the homepage's existing /api/scores payload.
 */
export default function ThreeStoriesSection({
  cards,
  totalCount,
}: {
  cards: StoryStock[];
  totalCount: number;
}) {
  if (cards.length === 0) return null;

  return (
    <section aria-labelledby="three-stories-title">
      <span className="inline-flex items-center gap-2 rounded-full bg-[color-mix(in_srgb,var(--tier-excellent)_11%,transparent)] px-3.5 py-1 text-[0.7rem] font-extrabold uppercase tracking-[0.14em] text-[var(--tier-excellent)]">
        Today&apos;s standouts
      </span>
      <h2
        id="three-stories-title"
        className="font-display mt-3 text-[clamp(1.7rem,5vw,2.6rem)] font-extrabold leading-[1.1] tracking-tight text-[var(--text)]"
      >
        Three stocks worth knowing today
      </h2>
      <p className="mt-2.5 max-w-2xl text-[0.95rem] leading-relaxed text-[var(--text-muted)]">
        Picked from all {totalCount} companies on the exchange — one that is the strongest overall, one
        that pays the most cash, one whose earnings are growing fastest. Updated every trading day.
      </p>
      <p lang="bn" className="font-bn mt-1.5 max-w-2xl text-[0.95rem] leading-relaxed text-[var(--text)]">
        {totalCount}টি কোম্পানি থেকে বাছাই করা — একটি সবচেয়ে মজবুত, একটি নগদ লভ্যাংশে সেরা, একটি সবচেয়ে দ্রুত
        বাড়ছে। প্রতিদিন আপডেট।
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-5">
        {cards.map((card, i) => (
          <StoryCard key={card.item.trading_code} card={card} index={i} />
        ))}
      </div>
    </section>
  );
}
