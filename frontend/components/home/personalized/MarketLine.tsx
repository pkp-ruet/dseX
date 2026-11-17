import Link from "@/components/ui/Link";
import type { MarketHistory, MarketIndexData, MarketMood } from "@/lib/api";
import type { Lang } from "@/context/LangContext";
import { signed } from "@/lib/formatters";
import { t } from "@/lib/home-copy";
import { IconChevronRight } from "@/components/ui/icons";

/** THE market page, both languages. */
const MARKET_HREF = "/dse-today";

type Tone = MarketMood["tone"];

/** The market page's own mood word (the backend's), so the two never disagree;
 *  a plain breadth read stands in while it loads or when it failed. */
function moodWord(mood: MarketMood | null | undefined, index: MarketIndexData | null, lang: Lang): { text: string; tone: Tone } {
  const bn = lang === "bn";
  if (mood?.tone) {
    const raw = (bn ? mood.label_bn : mood.label) || mood.label || "";
    const label = raw && !bn ? raw.charAt(0).toLowerCase() + raw.slice(1) : raw;
    if (label) return { text: t(lang, "marketMood", { mood: label }), tone: mood.tone };
  }
  const up = index?.up_count ?? 0;
  const down = index?.down_count ?? 0;
  if (up + down === 0) return { text: t(lang, "marketToday"), tone: "steady" };
  const ratio = up / (up + down);
  if (ratio >= 0.58) return { text: t(lang, "moodUp"), tone: "up" };
  if (ratio <= 0.42) return { text: t(lang, "moodDown"), tone: "down" };
  return { text: t(lang, "moodSteady"), tone: "steady" };
}

const DOT: Record<Tone, string> = {
  up: "hm-mkt-dot--up",
  down: "hm-mkt-dot--down",
  weak: "hm-mkt-dot--weak",
  steady: "hm-mkt-dot--steady",
};

/** DSEX over the last ~3 months as a small line. The line is neutral ink and
 *  only the end dot takes today's colour: a red line beside "going up" (the
 *  period fell, today rose) read as a contradiction (2026-11-17). */
function Sparkline({ history, todayUp }: { history: MarketHistory | null | undefined; todayUp: boolean | null }) {
  const pts = (history?.index ?? []).filter((p) => p.dsex != null).slice(-60) as { date: string; dsex: number }[];
  if (pts.length < 2) return null;
  const W = 72;
  const H = 28;
  const min = Math.min(...pts.map((p) => p.dsex));
  const max = Math.max(...pts.map((p) => p.dsex));
  const span = max - min || 1;
  const xy = pts.map((p, i) => [(i / (pts.length - 1)) * (W - 4) + 2, H - 3 - ((p.dsex - min) / span) * (H - 8)]);
  const line = xy.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const [ex, ey] = xy[xy.length - 1];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="hm-spark text-text-main" aria-hidden>
      <polyline points={line} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      <circle
        cx={ex}
        cy={ey}
        r="3"
        className={todayUp == null ? "fill-current" : todayUp ? "fill-positive" : "fill-negative"}
      />
    </svg>
  );
}

/**
 * The market in one line (2026-11-17, the bKash-style home; replaced the
 * market card): the mood, DSEX and its move, how many shares rose and fell,
 * a small trend line, and one tap to the market page.
 */
export default function MarketLine({
  index,
  mood,
  history,
  lang,
}: {
  index: MarketIndexData | null;
  mood?: MarketMood | null;
  history?: MarketHistory | null;
  lang: Lang;
}) {
  const bn = lang === "bn";
  const word = moodWord(mood, index, lang);
  const chg = index?.dsex_change ?? null;
  const chgPct = index?.dsex_change_pct ?? null;
  const up = (chg ?? 0) >= 0;
  const dsex =
    index?.dsex != null ? index.dsex.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "--";
  const rose = index?.up_count;
  const fell = index?.down_count;

  return (
    <Link href={MARKET_HREF} className={`hm-mkt ${bn ? "font-bn" : ""}`} lang={bn ? "bn" : undefined} data-card="market">
      <span className={`hm-mkt-dot ${DOT[word.tone]}`} aria-hidden />
      <span className="hm-mkt-txt">
        <span className="hm-mkt-t1">{word.text}</span>
        <span className="hm-mkt-t2 nums">
          {bn ? "ডিএসইএক্স" : "DSEX"} {dsex}{" "}
          {chg != null && (
            <span className={up ? "text-positive" : "text-negative"}>
              {up ? "▲" : "▼"} {signed(chg)}
              {chgPct != null && ` (${signed(chgPct)}%)`}
            </span>
          )}
        </span>
        {rose != null && fell != null && rose + fell > 0 && (
          <span className="hm-mkt-t3 nums">
            {bn ? `${rose}টির দাম বেড়েছে · ${fell}টির কমেছে` : `${rose} rose · ${fell} fell`}
          </span>
        )}
      </span>
      <Sparkline history={history} todayUp={chg == null ? null : up} />
      <span className="hm-chev" aria-hidden>
        <IconChevronRight size={18} />
      </span>
    </Link>
  );
}
