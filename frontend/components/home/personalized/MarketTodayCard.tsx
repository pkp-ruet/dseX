import Link from "next/link";
import type {
  MarketIndexData,
  DividendsUpcoming,
  MarketQuality,
  MarketQuestion,
  MarketMood,
  MarketSinceYesterday,
  MarketStats,
  MarketHistory,
} from "@/lib/api";
import type { Lang } from "@/context/LangContext";
import { signed } from "@/lib/formatters";
import { t } from "@/lib/home-copy";
import DashHeader from "@/components/home/personalized/DashHeader";
import { IconChevron } from "@/components/home/personalized/DashIcons";

const MARKET_HREF = "/market-analysis";
/** The Bengali daily article — the front door in বাংলা mode. */
const MARKET_HREF_BN = "/share-bazar";

function num(v: number | null | undefined, d = 2): string {
  if (v == null) return "--";
  return v.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
}

const MOOD_COLOR: Record<MarketMood["tone"], string> = {
  up: "var(--positive)",
  down: "var(--negative)",
  weak: "var(--warm-ink)",
  steady: "var(--text)",
};

/**
 * The card's headline. Prefers the Market Analysis page's own verdict (the
 * backend mood — four bands, not just today's breadth) so the dashboard and the
 * page never disagree. Falls back to a plain breadth read while the bundle is
 * still loading or when it failed.
 */
function headline(
  mood: MarketMood | null | undefined,
  index: MarketIndexData | null,
  lang: Lang,
): { text: string; color: string } {
  if (mood?.tone) {
    const key = mood.tone === "up" ? "moodUp" : mood.tone === "down" ? "moodDown" : mood.tone === "weak" ? "moodWeak" : "moodSteady";
    return { text: t(lang, key), color: MOOD_COLOR[mood.tone] ?? "var(--text)" };
  }
  const up = index?.up_count ?? null;
  const down = index?.down_count ?? null;
  if (up == null || down == null || up + down === 0) {
    return { text: t(lang, "moodFallback"), color: "var(--text)" };
  }
  const bn = lang === "bn";
  const ratio = up / (up + down);
  if (ratio >= 0.58) return { text: bn ? "আজ বাজারে ক্রেতারা এগিয়ে।" : "Buyers are in control today.", color: "var(--positive)" };
  if (ratio <= 0.42) return { text: bn ? "আজ বাজারে বিক্রেতারা এগিয়ে।" : "Sellers are in control today.", color: "var(--negative)" };
  return { text: bn ? "আজ বাজার মিশ্র, সমান-সমান।" : "An even, mixed market today.", color: "var(--text)" };
}

/** One "since yesterday" sentence — the freshest hook the page has, so it's
 *  the line that earns the tap through. Breadth rank first, then the healthy
 *  count, then the index move. Null when there is nothing to say. */
function sinceLine(
  since: MarketSinceYesterday | null | undefined,
  stats: MarketStats | null | undefined,
  lang: Lang,
): string | null {
  if (!since) return null;
  const bn = lang === "bn";
  const br = since.breadth_rank;
  if (br && br.of >= 3) {
    const more = br.better_than >= br.of / 2;
    if (bn) {
      return more
        ? `আজ যত শেয়ার বেড়েছে, গত ${br.of} দিনের ${br.better_than} দিনের চেয়ে বেশি।`
        : `আজ যত শেয়ার বেড়েছে, গত ${br.of} দিনের ${br.of - br.better_than} দিনের চেয়ে কম।`;
    }
    return more
      ? `More shares rose today than on ${br.better_than} of the last ${br.of} days.`
      : `Fewer shares rose today than on ${br.of - br.better_than} of the last ${br.of} days.`;
  }
  if (since.healthy_delta) {
    const n = Math.abs(since.healthy_delta);
    const more = since.healthy_delta > 0;
    if (bn) return `গতকালের চেয়ে ${n}টি কোম্পানি ${more ? "বেশি" : "কম"} ভালো অবস্থায়।`;
    return `${n} ${n === 1 ? "company" : "companies"} ${more ? "more" : "fewer"} look healthy than yesterday.`;
  }
  const chg = stats?.dsex_change_pct;
  if (chg != null && Math.abs(chg) >= 0.05) {
    if (bn) return `বাজার গতকালের চেয়ে ${Math.abs(chg).toFixed(1)}% ${chg > 0 ? "উপরে" : "নিচে"}।`;
    return `The index is ${chg > 0 ? "up" : "down"} ${Math.abs(chg).toFixed(1)}% since yesterday.`;
  }
  return null;
}

function IndexStat({ label, value, change }: { label: string; value: number | null; change: number | null }) {
  const up = (change ?? 0) >= 0;
  const color = change == null ? "var(--text-muted)" : up ? "var(--positive)" : "var(--negative)";
  return (
    <div className="flex min-w-0 flex-col">
      <span className="text-[0.68rem] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">{label}</span>
      <span className="text-[1.02rem] font-extrabold tabular-nums text-[var(--text)] leading-tight sm:text-xl">{num(value)}</span>
      <span className="text-xs font-semibold tabular-nums" style={{ color }}>
        {change == null ? "--" : `${up ? "▲" : "▼"} ${signed(change)}`}
      </span>
    </div>
  );
}

function Tile({
  href,
  value,
  valueColor,
  label,
}: {
  href: string;
  value: string;
  valueColor: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      prefetch={false}
      className="flex flex-col rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 transition hover:border-[color-mix(in_srgb,var(--primary)_40%,var(--border))] hover:shadow-sm active:bg-[var(--surface-2)]"
    >
      <span className="font-display text-xl font-extrabold tabular-nums nums leading-none" style={{ color: valueColor }}>
        {value}
      </span>
      <span className="mt-1 text-[0.75rem] font-semibold text-[var(--text-muted)] leading-tight">{label}</span>
    </Link>
  );
}

/** "Cheap" / "Expensive" / "About normal" from the backend, in the reader's language. */
function cheapWord(a: string | undefined, lang: Lang): string {
  if (!a) return "—";
  const k = a.toLowerCase();
  if (k === "cheap") return t(lang, "cheapCheap");
  if (k === "expensive") return t(lang, "cheapExpensive");
  if (k === "about normal") return t(lang, "cheapNormal");
  return a;
}

/** DSEX over the stored history as a small line, plus the change over it. */
function Sparkline({ history, label }: { history: MarketHistory | null | undefined; label: string }) {
  const pts = (history?.index ?? []).filter((p) => p.dsex != null) as { date: string; dsex: number }[];
  if (pts.length < 2) return null;
  const first = pts[0].dsex;
  const last = pts[pts.length - 1].dsex;
  const chg = first > 0 ? ((last - first) / first) * 100 : 0;
  const up = last >= first;
  const color = up ? "var(--positive)" : "var(--negative)";
  const W = 120;
  const H = 32;
  const min = Math.min(...pts.map((p) => p.dsex));
  const max = Math.max(...pts.map((p) => p.dsex));
  const span = max - min || 1;
  const path = pts
    .map((p, i) => {
      const x = (i / (pts.length - 1)) * W;
      const y = H - 2 - ((p.dsex - min) / span) * (H - 4);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <div className="mt-3 flex items-center gap-3">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-8 w-28 shrink-0" preserveAspectRatio="none" aria-hidden>
        <polyline points={path} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
      <span className="min-w-0">
        <span className="block text-[0.68rem] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">{label}</span>
        <span className="block text-[0.9rem] font-extrabold tabular-nums nums leading-tight" style={{ color }}>
          {up ? "▲" : "▼"} {Math.abs(chg).toFixed(1)}%
        </span>
      </span>
    </div>
  );
}

/**
 * One "Market today" card for the logged-in home — the front door to
 * `/market-analysis` (or, in বাংলা mode, to the Bengali daily article at
 * `/share-bazar`):
 *
 *  • the headline is the backend mood (the page's own verdict), not a local
 *    breadth guess — the two can no longer disagree;
 *  • a DSEX sparkline over the stored history under the headline;
 *  • the ONE header link goes to the full picture; the index row is the link
 *    to DSE Today, where those numbers live;
 *  • a "Since yesterday" line under the tiles changes daily and links through.
 */
export default function MarketTodayCard({
  index,
  dividends,
  mood,
  since,
  stats,
  quality,
  cheap,
  history,
  lang = "en",
}: {
  index: MarketIndexData | null;
  dividends?: DividendsUpcoming | null;
  /** The market-analysis verdict (from /api/market/state). */
  mood?: MarketMood | null;
  /** What changed vs the previous trading day (from /api/market/state). */
  since?: MarketSinceYesterday | null;
  stats?: MarketStats | null;
  /** Strong/good/total company-quality buckets (from /api/market/state). */
  quality?: MarketQuality | null;
  /** The "Are shares cheap or expensive?" Q&A row (from /api/market/state). */
  cheap?: MarketQuestion | null;
  /** DSEX history for the sparkline (from /api/market/state). */
  history?: MarketHistory | null;
  lang?: Lang;
}) {
  const bn = lang === "bn";
  const marketHref = bn ? MARKET_HREF_BN : MARKET_HREF;
  const head = headline(mood, index, lang);
  const line = sinceLine(since, stats, lang);

  const up = index?.up_count ?? 0;
  const down = index?.down_count ?? 0;
  const flat = index?.neutral_count ?? 0;
  const breadthTotal = up + down + flat;

  // Are shares cheap? Reuse the market-analysis page's own answer.
  const cheapColor =
    cheap?.tone === "pos" ? "var(--positive)" : cheap?.tone === "neg" ? "var(--negative)" : "var(--text)";
  const cheapValue = cheapWord(cheap?.a, lang);
  const cheapLabel = !bn && cheap?.extra ? cheap.extra : t(lang, "sharePricesVsUsual");

  // How many companies look healthy = strong + good, of those scored. Always
  // green — it's a count of healthy companies, never shown in red.
  const total = quality?.total ?? 0;
  const healthy = total > 0 ? quality!.strong + quality!.good : null;
  const healthyColor = healthy == null ? "var(--text)" : "var(--positive)";

  // Unique companies with a dividend declaration or record date coming up.
  const divCount = new Set(
    [
      ...(dividends?.upcoming_declarations ?? []),
      ...(dividends?.upcoming_record_dates ?? []),
    ].map((d) => d.trading_code.toUpperCase()),
  ).size;

  const turn = index?.turnover_change_pct ?? null;
  const turnStr = turn == null ? "—" : `${turn >= 0 ? "↑" : "↓"} ${Math.abs(turn).toFixed(0)}%`;
  const turnColor = turn == null ? "var(--text)" : turn >= 0 ? "var(--positive)" : "var(--negative)";

  return (
    <section className={`soft-card overflow-hidden ${bn ? "font-bn" : ""}`} lang={bn ? "bn" : undefined}>
      <DashHeader title={t(lang, "marketToday")} href={marketHref} linkLabel={t(lang, "fullPicture")} />

      <div className="px-4 sm:px-5 py-4">
        <h3
          className="font-display text-lg sm:text-xl font-extrabold tracking-tight leading-tight"
          style={{ color: head.color }}
        >
          {head.text}
        </h3>

        <Sparkline history={history} label={t(lang, "thisYear")} />

        {/* gap-2 + a slightly smaller level on a phone: three 4-digit indices
            need ~80px each, and gap-4 left exactly that on a 360px screen. */}
        {index && (
          <Link
            href="/dse-today"
            prefetch={false}
            aria-label="Today's index levels on DSE Today"
            className="mt-3.5 -mx-2 grid grid-cols-3 gap-2 rounded-xl px-2 py-1.5 transition-colors hover:bg-[var(--surface-2)] active:bg-[var(--surface-2)] sm:gap-4"
          >
            <IndexStat label="DSEX" value={index.dsex} change={index.dsex_change} />
            <IndexStat label="DSES" value={index.dses} change={index.dses_change} />
            <IndexStat label="DS30" value={index.ds30} change={index.ds30_change} />
          </Link>
        )}

        {breadthTotal > 0 && (
          <div className="mt-4">
            <div className="flex h-2 w-full rounded-full overflow-hidden bg-[var(--surface-2)]">
              <span className="h-full bg-[var(--positive)]" style={{ width: `${(up / breadthTotal) * 100}%` }} />
              <span className="h-full bg-[var(--text-muted)]" style={{ width: `${(flat / breadthTotal) * 100}%` }} />
              <span className="h-full bg-[var(--negative)]" style={{ width: `${(down / breadthTotal) * 100}%` }} />
            </div>
            <div className="mt-2 flex items-center justify-between text-xs font-semibold tabular-nums">
              <span className="text-[var(--positive)]">{t(lang, "advancing", { n: up })}</span>
              <span className="text-[var(--text-muted)]">{t(lang, "unchanged", { n: flat })}</span>
              <span className="text-[var(--negative)]">{t(lang, "declining", { n: down })}</span>
            </div>
          </div>
        )}

        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <Tile href={marketHref} value={cheapValue} valueColor={cheapColor} label={cheapLabel} />
          <Tile
            href={marketHref}
            value={healthy != null ? String(healthy) : "—"}
            valueColor={healthyColor}
            label={total > 0 ? t(lang, "lookHealthy", { total }) : t(lang, "companiesHealthy")}
          />
          <Tile href="/dividend-calendar" value={String(divCount)} valueColor="var(--watch)" label={t(lang, "dividendsComingUp")} />
          <Tile href="/dse-today" value={turnStr} valueColor={turnColor} label={t(lang, "turnoverVsLastDay")} />
        </div>

        {line && (
          <Link
            href={marketHref}
            prefetch={false}
            className="mt-3 flex items-center gap-2.5 rounded-xl bg-[var(--surface-2)] px-3 py-2.5 transition-colors hover:bg-[color-mix(in_srgb,var(--primary)_10%,var(--surface-2))] active:opacity-80"
          >
            <span className="shrink-0 rounded-full border border-[var(--border)] bg-[var(--surface)] px-2 py-0.5 text-[0.68rem] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">
              {t(lang, "sinceYesterday")}
            </span>
            <span className="min-w-0 flex-1 text-[0.75rem] font-semibold leading-snug text-[var(--text)]">{line}</span>
            <span className="shrink-0 text-[var(--primary)]" aria-hidden>
              <IconChevron size={14} />
            </span>
          </Link>
        )}
      </div>
    </section>
  );
}
