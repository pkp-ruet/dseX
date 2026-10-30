import Link from "next/link";
import { T } from "@/components/i18n/T";
import SectionHead from "@/components/i18n/SectionHead";
import MoverTabs from "@/components/landing/MoverTabs";
import { bnDate } from "@/lib/bn";
import { changePct, changeTone, formatDate } from "@/lib/formatters";
import type { MarketMood, MarketMoversData, MarketStateData } from "@/lib/api";

/**
 * Block 4 — today on the DSE, as ONE card (2026-10-31; it was six cards: the
 * sector map, movers, news, the Bangla snapshot, turning points and three
 * standout stocks). Left: the day in a sentence, DSEX with its line, and how
 * many shares rose and fell. Right: the biggest moves. Links out to the two
 * pages that hold the rest.
 */

const MOOD_BN: Record<MarketMood["tone"], string> = {
  up: "আজ বাজার চাঙা, বেশির ভাগ শেয়ারের দাম বাড়ছে।",
  down: "আজ বাজার নিচের দিকে। তাড়াহুড়া না করাই ভালো।",
  weak: "বাজার কিছুটা দুর্বল। ভালো কোম্পানি বেছে নেওয়ার সময়।",
  steady: "আজ বাজার শান্ত। ধীরে-সুস্থে দেখে নিন।",
};

/** The mood as weather: up = sun, steady = sun behind a cloud, weak = cloud, down = rain. */
function Weather({ tone }: { tone: MarketMood["tone"] }) {
  return (
    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0 text-gold-ink">
      {tone === "up" ? (
        <>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </>
      ) : tone === "steady" ? (
        <>
          <path d="M8 3v1.5M3.8 4.8l1 1M2 9h1.5M12.2 4.8l-1 1" />
          <path d="M5.2 11.5A3.5 3.5 0 0 1 11 7.2" />
          <path d="M18 20H10a4 4 0 1 1 .9-7.9A5 5 0 0 1 20.6 14 3 3 0 0 1 18 20z" />
        </>
      ) : tone === "down" ? (
        <>
          <path d="M17.5 15H8a5 5 0 1 1 1.1-9.9A6 6 0 0 1 20.5 8 3.5 3.5 0 0 1 17.5 15z" />
          <path d="M8 18l-1 3M12 18l-1 3M16 18l-1 3" />
        </>
      ) : (
        <path d="M17.5 19H8a5 5 0 1 1 1.1-9.9A6 6 0 0 1 20.5 12 3.5 3.5 0 0 1 17.5 19z" />
      )}
    </svg>
  );
}

/** DSEX over the last ~3 months as one line, coloured by which way it went. */
function Sparkline({ points }: { points: number[] }) {
  if (points.length < 5) return null;
  const lo = Math.min(...points);
  const hi = Math.max(...points);
  const span = hi - lo || 1;
  const w = 320;
  const h = 64;
  const d = points
    .map((v, i) => `${i === 0 ? "M" : "L"}${((i / (points.length - 1)) * w).toFixed(1)} ${(h - 4 - ((v - lo) / span) * (h - 8)).toFixed(1)}`)
    .join(" ");
  const up = points[points.length - 1] >= points[0];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none" aria-hidden className="mt-3 block">
      <path d={d} fill="none" stroke={up ? "var(--positive)" : "var(--negative)"} strokeWidth="2.5" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export default function MarketPulse({
  market,
  movers,
}: {
  market: MarketStateData | null;
  movers: MarketMoversData | null;
}) {
  const stats = market?.stats ?? null;
  const mood = market?.mood ?? null;
  const hasMovers =
    !!movers && (movers.gainers?.length ?? 0) + (movers.losers?.length ?? 0) + (movers.most_traded?.length ?? 0) > 0;
  if (!mood && !stats && !hasMovers) return null;

  const date = movers?.date ?? market?.date ?? null;
  const spark = (market?.history?.index ?? [])
    .slice(-66)
    .map((p) => p.dsex)
    .filter((v): v is number => v != null);
  const up = stats?.up ?? 0;
  const down = stats?.down ?? 0;
  const same = stats?.neutral ?? 0;
  const total = up + down + same;

  return (
    <section aria-labelledby="market-title">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SectionHead
          id="market-title"
          eyebrow={<T en="Live from the market" bn="বাজার থেকে সরাসরি" />}
          title={<T en="Today on the DSE" bn="আজকের ডিএসই" />}
        />
        <div className="flex flex-wrap gap-x-5">
          <Link href="/dse-today" className="inline-flex min-h-10 items-center text-sm font-semibold text-primary-ink hover:underline">
            <T en="Every price today →" bn="আজকের সব দাম →" />
          </Link>
          <Link href="/market-analysis" className="inline-flex min-h-10 items-center text-sm font-semibold text-primary-ink hover:underline">
            <T en="Market analysis →" bn="বাজার বিশ্লেষণ →" />
          </Link>
        </div>
      </div>

      <div className="soft-card mt-6 grid grid-cols-1 overflow-hidden md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="border-b border-border p-5 sm:p-7 md:border-b-0 md:border-r">
          {date && (
            <p className="text-sm font-semibold text-text-main">
              <T en={formatDate(date)} bn={bnDate(date) || formatDate(date)} />
            </p>
          )}
          {mood && (
            <div className="mt-3 flex items-start gap-3">
              <Weather tone={mood.tone} />
              <div className="min-w-0">
                <p className="text-xl font-bold leading-snug text-text-main">
                  <T en={mood.sentence} bn={mood.sentence_bn ?? MOOD_BN[mood.tone]} />
                </p>
                {(mood.sentence2 || mood.sentence2_bn) && (
                  <p className="mt-1.5 text-base leading-relaxed text-text-main">
                    <T en={mood.sentence2} bn={mood.sentence2_bn ?? mood.sentence2} />
                  </p>
                )}
              </div>
            </div>
          )}

          {stats?.dsex != null && (
            <div className="mt-6">
              <div className="flex flex-wrap items-baseline gap-x-3">
                <span className="text-sm font-semibold text-text-main">DSEX</span>
                <span className="text-3xl font-bold tracking-tight tabular-nums nums text-text-main">
                  {stats.dsex.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                </span>
                {stats.dsex_change_pct != null && (
                  <span className={`text-base font-bold tabular-nums nums ${changeTone(stats.dsex_change_pct)}`}>
                    {changePct(stats.dsex_change_pct)}
                  </span>
                )}
              </div>
              <Sparkline points={spark} />
            </div>
          )}

          {total > 0 && (
            <div className="mt-6">
              <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full" aria-hidden>
                <span className="bg-positive" style={{ width: `${(up / total) * 100}%` }} />
                <span className="bg-tier-average" style={{ width: `${(same / total) * 100}%` }} />
                <span className="bg-negative" style={{ width: `${(down / total) * 100}%` }} />
              </div>
              <div className="mt-2 flex justify-between gap-2 text-sm font-semibold text-text-main">
                <T en={`${up} rose`} bn={`${up}টি বেড়েছে`} />
                <T en={`${same} same`} bn={`${same}টি একই`} />
                <T en={`${down} fell`} bn={`${down}টি কমেছে`} />
              </div>
            </div>
          )}
        </div>

        <div className="p-5 sm:p-7">
          {hasMovers && movers ? (
            <MoverTabs movers={movers} />
          ) : (
            <p className="text-base text-text-main">
              <T en="Today's biggest moves will show here after the market opens." bn="বাজার খোলার পর আজকের বড় ওঠানামা এখানে দেখাবে।" />
            </p>
          )}
          <p className="mt-4 text-sm text-text-main">
            <T
              en="Prices are DSE’s official close. Grades are ours, from each company’s own accounts."
              bn="দাম ডিএসই-র অফিশিয়াল ক্লোজ। গ্রেড আমাদের, প্রতিটি কোম্পানির নিজের হিসাব থেকে।"
            />
          </p>
        </div>
      </div>
    </section>
  );
}
