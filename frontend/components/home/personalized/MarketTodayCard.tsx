import type { MarketIndexData, MarketMood, MarketHistory } from "@/lib/api";
import type { Lang } from "@/context/LangContext";
import { croreShares, crore, signed } from "@/lib/formatters";
import { croreBn } from "@/lib/bn";
import { t } from "@/lib/home-copy";
import DashHeader from "@/components/home/personalized/DashHeader";
import Button from "@/components/ui/Button";
import Stat from "@/components/ui/Stat";
import { IconChevron } from "@/components/home/personalized/DashIcons";

/** THE market page, both languages (2026-11-05: /market-analysis and the
 *  Bengali /share-bazar merged into it). */
const MARKET_HREF = "/dse-today";

function num(v: number | null | undefined, d = 2): string {
  if (v == null) return "--";
  return v.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
}

const MOOD_TONE: Record<MarketMood["tone"], string> = {
  up: "text-positive",
  down: "text-negative",
  weak: "text-watch",
  steady: "text-text-main",
};

const MOOD_DOT: Record<MarketMood["tone"], string> = {
  up: "bg-positive",
  down: "bg-negative",
  weak: "bg-watch",
  steady: "bg-text-main",
};

/** The mood word and its sentence: the market page's own verdict (the backend
 *  mood), so the dashboard and the page never disagree. A plain breadth read
 *  stands in while the bundle is loading or when it failed. */
function moodRead(
  mood: MarketMood | null | undefined,
  index: MarketIndexData | null,
  lang: Lang,
): { label: string | null; sentence: string; tone: MarketMood["tone"] } {
  const bn = lang === "bn";
  if (mood?.tone) {
    const raw = (bn ? mood.label_bn : mood.label) || mood.label || null;
    // "Market mood: going up", as the market page says it.
    const label = raw && !bn ? raw.charAt(0).toLowerCase() + raw.slice(1) : raw;
    const sentence = (bn ? mood.sentence_bn : mood.sentence) || mood.sentence;
    const key = mood.tone === "up" ? "moodUp" : mood.tone === "down" ? "moodDown" : mood.tone === "weak" ? "moodWeak" : "moodSteady";
    return { label, sentence: sentence || t(lang, key), tone: mood.tone };
  }
  const up = index?.up_count ?? 0;
  const down = index?.down_count ?? 0;
  if (up + down === 0) return { label: null, sentence: t(lang, "moodFallback"), tone: "steady" };
  const ratio = up / (up + down);
  if (ratio >= 0.58) return { label: null, sentence: t(lang, "moodUp"), tone: "up" };
  if (ratio <= 0.42) return { label: null, sentence: t(lang, "moodDown"), tone: "down" };
  return { label: null, sentence: t(lang, "moodSteady"), tone: "steady" };
}

/** DSEX over the stored history as a small line. */
function Sparkline({ history }: { history: MarketHistory | null | undefined }) {
  const pts = (history?.index ?? []).filter((p) => p.dsex != null) as { date: string; dsex: number }[];
  if (pts.length < 2) return null;
  const up = pts[pts.length - 1].dsex >= pts[0].dsex;
  const W = 120;
  const H = 40;
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
    <svg viewBox={`0 0 ${W} ${H}`} className="h-10 w-28 shrink-0" preserveAspectRatio="none" aria-hidden>
      <polyline
        points={path}
        fill="none"
        stroke={up ? "var(--positive)" : "var(--negative)"}
        strokeWidth="1.8"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** "+12% vs the last day" under a trading figure. */
function vsLastDay(pct: number | null | undefined, lang: Lang): { text: string; tone: "positive" | "negative" } | null {
  if (pct == null || Number.isNaN(pct)) return null;
  return {
    text: t(lang, "vsLastDay", { pct: `${pct >= 0 ? "+" : "−"}${Math.abs(pct).toFixed(0)}%` }),
    tone: pct >= 0 ? "positive" : "negative",
  };
}

/**
 * THE market card on the logged-in home (2026-11-05, user: "keep only 1 card
 * … index, volume and value, market mood and link to today page"). Four
 * things, nothing else: the mood, the index, what traded, and one link to the
 * market page (`/dse-today`). Movers, the link tiles, the healthy / cheap /
 * dividend tiles and the "since yesterday" line left with that change.
 */
export default function MarketTodayCard({
  index,
  mood,
  history,
  lang = "en",
}: {
  index: MarketIndexData | null;
  /** The market page's verdict (from /api/market/state). */
  mood?: MarketMood | null;
  /** DSEX history for the sparkline (from /api/market/state). */
  history?: MarketHistory | null;
  lang?: Lang;
}) {
  const bn = lang === "bn";
  const read = moodRead(mood, index, lang);
  const chg = index?.dsex_change ?? null;
  const chgPct = index?.dsex_change_pct ?? null;
  const up = (chg ?? 0) >= 0;
  const chgTone = chg == null ? "text-text-main" : up ? "text-positive" : "text-negative";
  const value = vsLastDay(index?.turnover_change_pct, lang);
  const volume = vsLastDay(index?.volume_change_pct, lang);

  return (
    <section className={`soft-card overflow-hidden ${bn ? "font-bn" : ""}`} lang={bn ? "bn" : undefined}>
      <DashHeader title={t(lang, "marketToday")} />

      <div className="space-y-5 px-4 py-4 sm:px-5">
        {/* The mood */}
        <div>
          {read.label && (
            <span className={`inline-flex items-center gap-2 text-sm font-bold ${MOOD_TONE[read.tone]}`}>
              <span className={`h-2 w-2 rounded-full ${MOOD_DOT[read.tone]}`} aria-hidden />
              {t(lang, "marketMood", { mood: read.label })}
            </span>
          )}
          <p className="mt-1 text-base font-semibold leading-snug text-text-main">{read.sentence}</p>
        </div>

        <div className="grid gap-5 border-t border-border pt-4 md:grid-cols-2 md:gap-6">
          {/* The index */}
          <div className="min-w-0">
            <div className="flex items-end justify-between gap-3">
              <div className="min-w-0">
                <span className="text-xs font-semibold text-text-muted">DSEX</span>
                <div className="nums text-3xl font-bold leading-tight text-text-main">{num(index?.dsex)}</div>
                <span className={`nums text-sm font-semibold ${chgTone}`}>
                  {chg == null ? "--" : `${up ? "▲" : "▼"} ${signed(chg)}`}
                  {chgPct != null && ` (${signed(chgPct)}%)`}
                </span>
              </div>
              <Sparkline history={history} />
            </div>
            {index && (
              <div className="mt-3 flex gap-6 text-sm">
                {(
                  [
                    ["DSES", index.dses, index.dses_change],
                    ["DS30", index.ds30, index.ds30_change],
                  ] as const
                ).map(([name, v, c]) => (
                  <span key={name} className="nums">
                    <span className="font-semibold text-text-muted">{name}</span>{" "}
                    <span className="font-bold text-text-main">{num(v)}</span>{" "}
                    <span className={`font-semibold ${c == null ? "text-text-main" : c >= 0 ? "text-positive" : "text-negative"}`}>
                      {signed(c)}
                    </span>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* What traded */}
          <div className="grid grid-cols-2 gap-4 border-t border-border pt-4 md:border-l md:border-t-0 md:pl-6 md:pt-0">
            <Stat
              size="md"
              value={index?.total_value_mn != null ? (bn ? croreBn(index.total_value_mn) : crore(index.total_value_mn)) : "--"}
              label={t(lang, "valueTraded")}
              sub={value?.text}
              subTone={value?.tone ?? "muted"}
            />
            <Stat
              size="md"
              value={
                index?.total_volume != null
                  ? bn
                    ? croreShares(index.total_volume).replace(" Cr", " কোটি")
                    : croreShares(index.total_volume)
                  : "--"
              }
              label={t(lang, "sharesTraded")}
              sub={volume?.text}
              subTone={volume?.tone ?? "muted"}
            />
          </div>
        </div>

        <Button href={MARKET_HREF} variant="quiet" block>
          {t(lang, "seeMarketToday")}
          <IconChevron size={14} />
        </Button>
      </div>
    </section>
  );
}
