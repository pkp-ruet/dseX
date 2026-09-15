import type {
  ScoreItem,
  NearExtremesData,
  DividendsUpcoming,
  PortfolioHolding,
  MarketIndexData,
  MarketMood,
} from "@/lib/api";
import type { Lang } from "@/context/LangContext";
import { bdGroup } from "@/lib/formatters";
import { bnDate } from "@/lib/bn";

/** One coloured run of the Daily Brief sentence. */
export interface BriefSegment {
  text: string;
  tone?: "pos" | "neg" | "accent";
  /** Optional destination — the renderer turns the run into a link. */
  href?: string;
}

const MARKET_HREF = "/market-analysis";
const MARKET_HREF_BN = "/share-bazar";

/** Segment tone for the backend mood's tone word. */
function moodTone(tone: MarketMood["tone"]): BriefSegment["tone"] {
  if (tone === "up") return "pos";
  if (tone === "down" || tone === "weak") return "neg";
  return "accent";
}

/** Everyday-Bengali mood words keyed by the backend tone (labels are English). */
const MOOD_BN: Record<MarketMood["tone"], string> = {
  up: "উপরের দিকে",
  down: "নিচের দিকে",
  weak: "দুর্বল",
  steady: "স্থির",
};

function relDays(date: Date, bn: boolean): string {
  const days = Math.ceil((date.getTime() - Date.now()) / 86_400_000);
  if (bn) {
    if (days <= 0) return "আজ";
    if (days === 1) return "আগামীকাল";
    if (days <= 14) return `${days} দিন পরে`;
    return `${bnDate(date.toISOString().slice(0, 10))} তারিখে`;
  }
  if (days <= 0) return "today";
  if (days === 1) return "tomorrow";
  if (days <= 14) return `in ${days} days`;
  return `on ${date.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`;
}

interface DivPick {
  code: string;
  date: Date | null;
  kind: "record" | "declaration";
}

function nextDividend(dividends: DividendsUpcoming | null, universe: Set<string>): DivPick | null {
  if (!dividends) return null;
  const picks: DivPick[] = [];
  const parse = (raw: string | null | undefined): Date | null => {
    if (!raw) return null;
    const t = new Date(raw);
    return Number.isNaN(t.getTime()) ? null : t;
  };
  for (const d of dividends.upcoming_record_dates ?? []) {
    if (universe.has(d.trading_code.toUpperCase())) {
      picks.push({ code: d.trading_code, date: parse(d.record_date), kind: "record" });
    }
  }
  for (const d of dividends.upcoming_declarations ?? []) {
    if (universe.has(d.trading_code.toUpperCase())) {
      picks.push({ code: d.trading_code, date: parse(d.projected_date), kind: "declaration" });
    }
  }
  if (picks.length === 0) return null;
  picks.sort((a, b) => (a.date?.getTime() ?? Infinity) - (b.date?.getTime() ?? Infinity));
  return picks[0];
}

/**
 * Compose the one-line "daily brief" — the sentence at the top of the
 * dashboard — from data already loaded on the home page. Two short clauses:
 *   1. a lead read (portfolio money → your stocks' breadth → whole-market mood), and
 *   2. one highlight (nearest dividend when it is this week → biggest mover →
 *      52-week extreme → any dividend).
 *
 * `lang` picks English or everyday Bengali (Western digits either way).
 * `when` = "today" during/after a trading session, "last" before the open or
 * on a non-trading day — the prices are then the previous close, and saying
 * "today" at 9 AM would be wrong.
 *
 * Returns coloured segments so the renderer can emphasise the money/ticker.
 */
export function buildDailyBrief(opts: {
  holdings: PortfolioHolding[];
  codes: string[];
  priceMap: Map<string, ScoreItem>;
  todayMove: { delta: number; pct: number } | null;
  extremes: NearExtremesData | null;
  dividends: DividendsUpcoming | null;
  marketIndex: MarketIndexData | null;
  /** The market-analysis page's own verdict, so the brief never disagrees with it. */
  marketMood?: MarketMood | null;
  lang?: Lang;
  when?: "today" | "last";
}): BriefSegment[] {
  const { holdings, codes, priceMap, todayMove, extremes, dividends, marketIndex, marketMood } = opts;
  const bn = opts.lang === "bn";
  const last = opts.when === "last";
  const marketHref = bn ? MARKET_HREF_BN : MARKET_HREF;

  // "today" / "in the last session" — one word pair, used everywhere below.
  const T = bn ? (last ? "গত লেনদেনে" : "আজ") : last ? "in the last session" : "today";

  const held = new Set(holdings.map((h) => h.trading_code.toUpperCase()));
  const universe = new Set([...held, ...codes.map((c) => c.toUpperCase())]);
  const seg: BriefSegment[] = [];

  // ── 1. Lead read ──────────────────────────────────────────────────────────
  if (todayMove && held.size > 0 && Math.abs(todayMove.delta) >= 1) {
    const up = todayMove.delta >= 0;
    const amt = `৳${bdGroup(Math.abs(todayMove.delta))}`;
    if (bn) {
      seg.push(
        { text: `${T} আপনার শেয়ারগুলো ` },
        { text: `${amt} ${up ? "বেড়েছে" : "কমেছে"}`, tone: up ? "pos" : "neg" },
        { text: "।" },
      );
    } else {
      seg.push(
        { text: "Your holdings are " },
        { text: `${up ? "up" : "down"} ${amt}`, tone: up ? "pos" : "neg" },
        { text: ` ${T}.` },
      );
    }
  } else {
    const withChg = Array.from(universe)
      .map((c) => priceMap.get(c))
      .filter((s): s is ScoreItem => !!s && s.change_pct != null);
    if (withChg.length > 0) {
      const up = withChg.filter((s) => (s.change_pct as number) > 0).length;
      const total = withChg.length;
      const ratio = up / total;
      if (bn) {
        if (ratio >= 0.6) {
          seg.push({ text: `আপনার ${total}টির মধ্যে ${up}টি শেয়ার ${T} ` }, { text: "বেড়েছে", tone: "pos" }, { text: "।" });
        } else if (ratio <= 0.4) {
          seg.push(
            { text: `আপনার ${total}টির মধ্যে মাত্র ${up}টি ${T} ` },
            { text: "বেড়েছে", tone: up === 0 ? "neg" : undefined },
            { text: "।" },
          );
        } else {
          seg.push({ text: `আপনার ${total}টি শেয়ার ${T} মিশ্র অবস্থায়।` });
        }
      } else if (ratio >= 0.6) {
        seg.push({ text: `${up} of your ${total} stocks are ` }, { text: "up", tone: "pos" }, { text: ` ${T}.` });
      } else if (ratio <= 0.4) {
        seg.push(
          { text: `Only ${up} of your ${total} stocks are ` },
          { text: "up", tone: up === 0 ? "neg" : undefined },
          { text: ` ${T}.` },
        );
      } else {
        seg.push({ text: `Your ${total} stocks are mixed ${T}.` });
      }
    } else if (marketMood?.label) {
      // Whole-market read — the same verdict the Market Analysis page shows,
      // linked there so the reader can see why.
      if (bn) {
        seg.push(
          { text: `${T} বাজার ` },
          { text: MOOD_BN[marketMood.tone] ?? marketMood.label, tone: moodTone(marketMood.tone), href: marketHref },
          { text: "।" },
        );
      } else {
        seg.push(
          { text: "The market is " },
          { text: marketMood.label.toLowerCase(), tone: moodTone(marketMood.tone), href: marketHref },
          { text: ` ${T}.` },
        );
      }
    } else {
      const u = marketIndex?.up_count ?? null;
      const d = marketIndex?.down_count ?? null;
      if (u != null && d != null && u + d > 0) {
        const r = u / (u + d);
        if (bn) {
          if (r >= 0.58) seg.push({ text: `${T} বাজারে ` }, { text: "ক্রেতারা এগিয়ে", tone: "pos", href: marketHref }, { text: "।" });
          else if (r <= 0.42) seg.push({ text: `${T} বাজারে ` }, { text: "বিক্রেতারা এগিয়ে", tone: "neg", href: marketHref }, { text: "।" });
          else seg.push({ text: `${T} বাজার ` }, { text: "সমান-সমান", tone: "accent", href: marketHref }, { text: "।" });
        } else if (r >= 0.58) {
          seg.push({ text: "Buyers are " }, { text: "in control", tone: "pos", href: marketHref }, { text: ` across the market ${T}.` });
        } else if (r <= 0.42) {
          seg.push({ text: "Sellers are " }, { text: "in control", tone: "neg", href: marketHref }, { text: ` across the market ${T}.` });
        } else {
          seg.push({ text: "The market is " }, { text: "evenly split", tone: "accent", href: marketHref }, { text: ` ${T}.` });
        }
      } else if (bn) {
        seg.push({ text: "আজকের বাজার " }, { text: "এক নজরে", tone: "accent", href: marketHref }, { text: "।" });
      } else {
        seg.push({ text: "Here is " }, { text: "your market at a glance", tone: "accent", href: marketHref }, { text: "." });
      }
    }
  }

  // ── 2. One highlight ──────────────────────────────────────────────────────
  // A dividend inside the next week is the one thing the reader can act on,
  // so it beats a price move when both exist.
  const div = nextDividend(dividends, universe);
  const divSoon = div?.date ? div.date.getTime() - Date.now() <= 7 * 86_400_000 : false;

  const pushDividend = (d: DivPick) => {
    const rel = d.date ? relDays(d.date, bn) : null;
    seg.push({ text: " " }, { text: d.code, tone: "accent", href: `/stock/${d.code}` });
    if (bn) {
      seg.push({
        text: rel
          ? d.kind === "record"
            ? `-এর ডিভিডেন্ড রেকর্ড ডেট ${rel}।`
            : `-এর ডিভিডেন্ড ঘোষণা আসতে পারে ${rel}।`
          : "-এর ডিভিডেন্ড আসছে।",
      });
    } else {
      seg.push({
        text: rel
          ? ` ${d.kind === "record" ? "records its dividend" : "is expected to declare a dividend"} ${rel}.`
          : " has a dividend coming up.",
      });
    }
  };

  if (div && divSoon) {
    pushDividend(div);
    return seg;
  }

  const movers = Array.from(universe)
    .map((c) => priceMap.get(c))
    .filter((s): s is ScoreItem => !!s && s.change_pct != null && Math.abs(s.change_pct as number) >= 3)
    .sort((a, b) => Math.abs(b.change_pct as number) - Math.abs(a.change_pct as number));

  if (movers.length > 0) {
    const m = movers[0];
    const chg = m.change_pct as number;
    const up = chg >= 0;
    seg.push({ text: " " }, { text: m.trading_code, tone: "accent", href: `/stock/${m.trading_code}` });
    if (bn) {
      if (up) seg.push({ text: " সবচেয়ে এগিয়ে, " }, { text: `+${chg.toFixed(1)}%`, tone: "pos" }, { text: "।" });
      else seg.push({ text: " " }, { text: `${Math.abs(chg).toFixed(1)}% কমেছে`, tone: "neg" }, { text: "।" });
    } else if (up) {
      seg.push({ text: " is leading, " }, { text: `+${chg.toFixed(1)}%`, tone: "pos" }, { text: "." });
    } else {
      seg.push({ text: " is down " }, { text: `${Math.abs(chg).toFixed(1)}%`, tone: "neg" }, { text: "." });
    }
    return seg;
  }

  const nearHigh = (extremes?.near_high ?? []).find((e) => universe.has(e.trading_code.toUpperCase()));
  const nearLow = (extremes?.near_low ?? []).find((e) => universe.has(e.trading_code.toUpperCase()));
  if (nearHigh) {
    seg.push({ text: " " }, { text: nearHigh.trading_code, tone: "accent", href: `/stock/${nearHigh.trading_code}` });
    if (bn) seg.push({ text: " " }, { text: "বছরের সর্বোচ্চ দামের", tone: "pos" }, { text: " কাছে।" });
    else seg.push({ text: " is near a " }, { text: "52-week high", tone: "pos" }, { text: "." });
    return seg;
  }
  if (nearLow) {
    seg.push({ text: " " }, { text: nearLow.trading_code, tone: "accent", href: `/stock/${nearLow.trading_code}` });
    if (bn) seg.push({ text: " " }, { text: "বছরের সর্বনিম্ন দামের", tone: "neg" }, { text: " কাছে।" });
    else seg.push({ text: " is near a " }, { text: "52-week low", tone: "neg" }, { text: "." });
    return seg;
  }

  if (div) pushDividend(div);

  return seg;
}
