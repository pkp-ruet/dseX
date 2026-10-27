import type {
  CorporateActionEvent,
  DividendsUpcoming,
  LatestResultRow,
  MarketIndexData,
  MarketMood,
  MarketMoversData,
  MarketUnusualStock,
  NearExtremesData,
  PortfolioHolding,
  PortfolioSignalEvent,
  PortfolioWatchEvent,
  PriceAlert,
  ScoreItem,
  ScreenerSaved,
  WatchlistNewsItem,
  WeekWatch,
} from "@/lib/api";
import type { Lang } from "@/context/LangContext";
import { bdGroup, changePct, companyShort, formatDate, money } from "@/lib/formatters";
import { bnDate } from "@/lib/bn";
import { recordDateInfo } from "@/lib/dividend-dates";
import { RESULT_LEVEL } from "@/lib/results";
import { classifyNews } from "@/lib/news-kind";
import { getTier, TIER_LABELS, TIER_LABELS_BN, TIER_THRESHOLDS } from "@/lib/constants";

/**
 * The dashboard's stories (2026-10-28, user decision: "replace Your stocks
 * today and This week with stories like social media"). A row of rings under
 * the greeting: one "Today" ring for the reader's day, then one ring per stock
 * that has something to say. Each ring opens a run of frames, ONE fact a
 * frame — a small label, a short headline, one big number, one sentence on
 * what it means, at most two number rows and one button.
 *
 * Not to be confused with `lib/home-stories.ts` — the logged-out landing's
 * "three stocks worth knowing" cards.
 *
 * Pure builders only: `StoriesRow` / `StoryViewer` render them, and
 * `PersonalizedHome` feeds them from data the home bundle already loaded.
 * Every frame id is stable for the day, so "seen" survives a reload.
 */

export type StoryTone = "positive" | "negative" | "neutral";

export type FrameKind =
  | "day"
  | "now"
  | "target"
  | "signal"
  | "screen"
  | "results"
  | "grade"
  | "category"
  | "move"
  | "volume"
  | "high"
  | "low"
  | "dividend"
  | "news"
  | "locked"
  | "market"
  | "mover"
  | "money"
  | "ask"
  | "more";

export interface StoryLink {
  label: string;
  href: string;
}

export interface StoryFrame {
  /** Stable for the day — the key for "seen". */
  id: string;
  kind: FrameKind;
  /** The small line above the headline ("Quarterly results"). */
  label: string;
  headline: string;
  big?: { text: string; tone?: StoryTone; caption?: string };
  /** A Buy / Buy more / Sell chip instead of a big number. */
  chip?: "buy" | "buy_more" | "sell";
  /** Rose / same / fell counts as one bar. */
  bar?: { up: number; flat: number; down: number };
  /** Up to three counts side by side ("Right now"). */
  counts?: { value: string; label: string; tone?: StoryTone }[];
  sentence?: string;
  rows?: { label: string; value: string; tone?: StoryTone }[];
  cta?: StoryLink;
  /** A second button (the "add your stocks" frame). */
  cta2?: StoryLink;
  /** "today", "27 Oct 2026" — beside the story's name in the header. */
  when?: string;
  tone: StoryTone;
  /** Premium only: the facts stay hidden, the count and kinds are free. */
  locked?: boolean;
  /** Locked frames: the reader's stakes, handed to /premium on tap. */
  stakes?: string[];
  /** Locked frames: the kinds of update behind the lock (for the "more" ring). */
  lockedKinds?: FrameKind[];
}

export type StoryIcon = "sun" | "chart" | "flame" | "coin" | "plus" | "list" | "crown";

export interface Story {
  id: string;
  kind: "today" | "stock" | "screens" | "market" | "ask" | "more";
  code?: string;
  /** Header line 1: company name, "Your day" … */
  name: string;
  /** Header line 2: "In your portfolio", "On your watchlist" … */
  sub: string;
  /** Inside the ring for a stock: today's change. Others show `icon`. */
  inner?: { text: string; tone: StoryTone };
  icon?: StoryIcon;
  owner?: "portfolio" | "watchlist";
  /** Under the ring: the ticker, or a word. */
  label: string;
  /** Ring colour while unseen: good news, worth a look, or a plain update. */
  tone: StoryTone;
  /** Lower comes first. */
  rank: number;
  frames: StoryFrame[];
}

/** Which update leads: a frame's rank orders frames inside a story, and a
 *  story's best rank orders the row. */
const RANK: Partial<Record<FrameKind, number>> = {
  target: 0,
  signal: 1,
  screen: 2,
  results: 2,
  grade: 3,
  category: 3,
  move: 4,
  volume: 5,
  high: 6,
  low: 6,
  dividend: 7,
  news: 8,
  locked: 9,
};

const MOVE_PCT = 3; // a ±3% day is a big move
const NEAR_TARGET_PCT = 3; // an armed price alert within 3% of the price
const DAY_MS = 24 * 60 * 60 * 1000;
const TRIGGER_RECENCY_MS = 2 * DAY_MS; // a hit target stays a story for ~2 days
const SIGNAL_RECENCY_MS = 3 * DAY_MS; // a Buy more / Sell flip for ~3 days
const NEWS_DAYS = 7;
const MAX_NEWS = 5;
/** Open frames per stock (a free reader's locked frame comes on top). */
const MAX_FRAMES = 4;
const MAX_STOCK_STORIES = 12;

/** What the weekly watcher calls an event, as the frame kind it overlaps. */
const WATCH_KIND: Record<PortfolioWatchEvent["kind"], FrameKind> = {
  record: "dividend",
  results: "results",
  grade: "grade",
  category: "category",
  drop: "move",
  low52: "low",
};

const WATCH_LABEL: Record<PortfolioWatchEvent["kind"], [string, string]> = {
  record: ["Record date", "রেকর্ড ডেট"],
  results: ["Quarterly results", "ত্রৈমাসিক ফল"],
  grade: ["Grade change", "গ্রেড বদল"],
  category: ["Category change", "ক্যাটাগরি বদল"],
  drop: ["Big fall", "বড় পতন"],
  low52: ["Yearly low", "বছরের সর্বনিম্ন"],
};

// Where one watcher event opens on the stock page (same as its push).
const WATCH_ANCHOR: Partial<Record<PortfolioWatchEvent["kind"], string>> = {
  results: "#results",
  grade: "#score-history",
  record: "#dividends",
};

const KIND_WORDS: Partial<Record<FrameKind, { en: [string, string]; bn: string }>> = {
  target: { en: ["price alert", "price alerts"], bn: "প্রাইস অ্যালার্ট" },
  signal: { en: ["signal change", "signal changes"], bn: "সংকেত বদল" },
  screen: { en: ["saved screen update", "saved screen updates"], bn: "স্ক্রিনের আপডেট" },
  results: { en: ["quarterly result", "quarterly results"], bn: "ত্রৈমাসিক ফল" },
  grade: { en: ["grade change", "grade changes"], bn: "গ্রেড বদল" },
  category: { en: ["category change", "category changes"], bn: "ক্যাটাগরি বদল" },
  move: { en: ["big move", "big moves"], bn: "বড় ওঠানামা" },
  volume: { en: ["busy trading day", "busy trading days"], bn: "বেশি লেনদেন" },
  high: { en: ["yearly high", "yearly highs"], bn: "বছরের সর্বোচ্চ দাম" },
  low: { en: ["yearly low", "yearly lows"], bn: "বছরের সর্বনিম্ন দাম" },
  dividend: { en: ["dividend", "dividends"], bn: "ডিভিডেন্ড" },
  news: { en: ["news item", "news items"], bn: "খবর" },
};

type L = (en: string, bn: string) => string;

function lFor(lang: Lang): L {
  return (en, bn) => (lang === "bn" ? bn : en);
}

function dateFor(lang: Lang): (iso: string | null | undefined) => string {
  return (iso) => {
    if (!iso) return "";
    return lang === "bn" ? bnDate(iso) : formatDate(iso);
  };
}

function toneOf(v: number | null | undefined): StoryTone {
  if (v == null || v === 0 || Number.isNaN(v)) return "neutral";
  return v > 0 ? "positive" : "negative";
}

function plural(n: number, one: string, many: string): string {
  return n === 1 ? one : many;
}

/** "2 quarterly results and 1 record date" / "2টি ত্রৈমাসিক ফল ও 1টি ডিভিডেন্ড". */
export function kindsPhrase(kinds: FrameKind[], lang: Lang): string {
  const counts = new Map<FrameKind, number>();
  for (const k of kinds) if (KIND_WORDS[k]) counts.set(k, (counts.get(k) ?? 0) + 1);
  const parts = Array.from(counts.entries())
    .sort((a, b) => (RANK[a[0]] ?? 9) - (RANK[b[0]] ?? 9))
    .map(([k, n]) => {
      const w = KIND_WORDS[k]!;
      return lang === "bn" ? `${n}টি ${w.bn}` : `${n} ${w.en[n === 1 ? 0 : 1]}`;
    });
  if (parts.length <= 1) return parts[0] ?? "";
  const joiner = lang === "bn" ? " ও " : " and ";
  return `${parts.slice(0, -1).join(", ")}${joiner}${parts[parts.length - 1]}`;
}

function gradeText(score: number | null | undefined, lang: Lang): string {
  if (score == null) return "--";
  const k = getTier(score);
  return `${lang === "bn" ? TIER_LABELS_BN[k] : TIER_LABELS[k]} · ${Math.round(score)}`;
}

/** Codes as one short line: "GP, BATBC, SQURPHARMA…". */
function codeList(codes: string[], max = 4): string {
  return codes.slice(0, max).join(", ") + (codes.length > max ? "…" : "");
}

function trimBody(body: string, max = 170): string {
  const s = body.replace(/\s+/g, " ").trim();
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), max - 20))}…`;
}

/** The watcher's titles start with the code; inside that stock's story the
 *  code is already in the header. */
function dropCode(title: string, code: string): string {
  const t = title.startsWith(`${code} `) ? title.slice(code.length + 1) : title;
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export interface StoryInput {
  lang: Lang;
  premium: boolean;
  /** "last" before the open / on a closed day — the moves are the last session's. */
  when: "today" | "last";
  /** Dhaka date, YYYY-MM-DD — scopes the day's frame ids. */
  todayIso: string;
  holdings: PortfolioHolding[];
  watchlist: string[];
  priceMap: Map<string, ScoreItem>;
  /** The portfolio's move today (the Today story's first frame). */
  todayMove: { delta: number; pct: number } | null;
  marketIndex: MarketIndexData | null;
  alerts: PriceAlert[];
  signalEvents: PortfolioSignalEvent[];
  results: LatestResultRow[];
  unusual: MarketUnusualStock[];
  extremes: NearExtremesData | null;
  dividends: DividendsUpcoming | null;
  dividendCash: CorporateActionEvent[];
  news: WatchlistNewsItem[];
  week: WeekWatch | null;
  /** Premium readers' saved screens as of the last daily check. */
  savedScreens: ScreenerSaved[];
}

/**
 * The reader's stories: "Today" first, then the stocks with something to say,
 * most important first (a price alert, a signal flip, results, a grade or
 * category change, a big move, busy trading, a yearly high / low, a dividend,
 * news). Holdings come before watchlist stocks at the same rank. Quiet stocks
 * get no ring.
 *
 * What the weekly watcher caught goes into the same stock's story (skipped
 * when today's frames already say it). A free reader gets the week's free
 * event open and the rest as ONE locked frame per stock — the count and the
 * kinds are free, the facts are Premium. Capping the number of stories for a
 * free reader is `capStories`' job.
 */
export function buildStories(i: StoryInput): Story[] {
  const { lang, priceMap } = i;
  const L = lFor(lang);
  const day = dateFor(lang);
  const today = i.when === "today";
  const dayWord = today ? L("today", "আজ") : L("last trading day", "শেষ লেনদেনের দিন");

  const qty = new Map<string, number>();
  const ownSig = new Map<string, PortfolioHolding["signal"]>();
  for (const h of i.holdings) {
    const c = h.trading_code.toUpperCase();
    qty.set(c, (qty.get(c) ?? 0) + h.qty);
    if (h.signal) ownSig.set(c, h.signal);
  }
  const held = new Set(qty.keys());
  const watched = new Set(i.watchlist.map((c) => c.toUpperCase()));
  const watchOnly = Array.from(watched).filter((c) => !held.has(c));
  const universe = new Set<string>([...held, ...watched]);

  // A holding's own overlay wins (Buy more / Sell for the owner); a watched
  // stock reads the canonical signal.
  const sigOf = (code: string): "buy" | "buy_more" | "sell" | "none" => {
    const mine = ownSig.get(code)?.signal;
    if (mine && mine !== "none") return mine;
    return priceMap.get(code)?.signal?.signal ?? "none";
  };
  const signalLine = (code: string): string | undefined => {
    const s = sigOf(code);
    if (s === "buy") return L("It has a Buy signal today.", "আজ এতে কেনার সংকেত আছে।");
    if (s === "buy_more") return L("For you it is marked Buy more today.", "আজ আপনার জন্য এতে আরও কেনার সংকেত।");
    if (s === "sell") return L("It is marked Sell today.", "আজ এতে বিক্রির সংকেত।");
    return undefined;
  };
  const stockLink = (code: string, anchor = ""): StoryLink => ({
    label: L("See the stock", "শেয়ারটি দেখুন"),
    href: `/stock/${encodeURIComponent(code)}${anchor}`,
  });

  const byCode = new Map<string, StoryFrame[]>();
  const add = (code: string, f: StoryFrame) => {
    const c = code.toUpperCase();
    if (!universe.has(c)) return;
    const list = byCode.get(c) ?? [];
    list.push(f);
    byCode.set(c, list);
  };
  const has = (code: string, kind: FrameKind) => (byCode.get(code.toUpperCase()) ?? []).some((f) => f.kind === kind);

  const now = Date.now();

  // ── Price alerts: a target hit in the last two days, or an armed one within 3%.
  for (const a of i.alerts) {
    const code = a.trading_code.toUpperCase();
    const s = priceMap.get(code);
    const target = money(a.target_price);
    if (a.triggered_at) {
      const t = Date.parse(a.triggered_at);
      if (Number.isNaN(t) || now - t > TRIGGER_RECENCY_MS) continue;
      add(code, {
        id: `pa:${a.id}`,
        kind: "target",
        label: L("Price alert", "প্রাইস অ্যালার্ট"),
        headline: L(`Reached your ${target} alert`, `আপনার ${target} অ্যালার্টে পৌঁছেছে`),
        big: { text: money(a.triggered_price ?? s?.ltp), caption: L("price when it got there", "পৌঁছানোর সময়ের দাম") },
        sentence: `${L(`You asked us to tell you at ${target}.`, `আপনি ${target}-এ জানাতে বলেছিলেন।`)} ${
          signalLine(code) ?? L("Take a look before you decide.", "সিদ্ধান্তের আগে একবার দেখে নিন।")
        }`,
        rows: [
          { label: L("Grade", "গ্রেড"), value: gradeText(s?.score, lang) },
          { label: L("Price now", "এখনকার দাম"), value: money(s?.ltp) },
        ],
        cta: stockLink(code),
        when: day(a.triggered_at),
        tone: a.direction === "above" ? "positive" : "negative",
      });
      continue;
    }
    if (!a.is_active || !(a.target_price > 0)) continue;
    const ltp = s?.ltp;
    if (ltp == null || ltp <= 0) continue;
    const gap = a.direction === "above" ? (a.target_price - ltp) / a.target_price : (ltp - a.target_price) / a.target_price;
    if (gap <= 0 || gap * 100 > NEAR_TARGET_PCT) continue;
    const gapStr = `${(gap * 100).toFixed(1)}%`;
    add(code, {
      id: `pn:${a.id}:${i.todayIso}`,
      kind: "target",
      label: L("Price alert", "প্রাইস অ্যালার্ট"),
      headline: L(`${gapStr} from your ${target} alert`, `আপনার ${target} অ্যালার্ট থেকে ${gapStr} দূরে`),
      big: { text: money(ltp), caption: L("price now", "এখনকার দাম") },
      sentence: L(
        `Your alert goes off when it reaches ${target}. We'll tell you the same day.`,
        `দাম ${target}-এ পৌঁছালে আপনার অ্যালার্ট বাজবে। সেদিনই আমরা জানাব।`,
      ),
      rows: [{ label: L("Grade", "গ্রেড"), value: gradeText(s?.score, lang) }],
      cta: stockLink(code),
      when: dayWord,
      tone: "neutral",
    });
  }

  // ── Buy more / Sell flips on holdings (server-detected, end of day).
  for (const ev of i.signalEvents) {
    if (!ev.changed_at || ev.signal === "none") continue;
    const t = Date.parse(ev.changed_at);
    if (Number.isNaN(t) || now - t > SIGNAL_RECENCY_MS) continue;
    const code = ev.trading_code.toUpperCase();
    const own = ownSig.get(code);
    const reason = own && own.signal === ev.signal ? (lang === "bn" ? own.reason_bn : own.reason_en) || null : null;
    const sell = ev.signal === "sell";
    const s = priceMap.get(code);
    add(code, {
      id: `sg:${code}:${ev.changed_at}`,
      kind: "signal",
      label: L("Signal changed", "সংকেত বদলেছে"),
      headline: sell ? L("Now marked Sell", "এখন বিক্রির সংকেত") : L("Now marked Buy more", "এখন আরও কেনার সংকেত"),
      chip: sell ? "sell" : "buy_more",
      sentence:
        reason ??
        (sell
          ? L("It is a good time to take another look at this one.", "শেয়ারটি আরেকবার ভেবে দেখার সময়।")
          : L("A strong company at a low price.", "শক্তিশালী কোম্পানি, এখন দামও কম।")),
      rows: [
        { label: L("Grade", "গ্রেড"), value: gradeText(s?.score, lang) },
        { label: L("Price now", "এখনকার দাম"), value: money(s?.ltp) },
      ],
      cta: { label: L("Read why", "কারণ পড়ুন"), href: `/stock/${encodeURIComponent(code)}#ch-verdict` },
      when: day(ev.changed_at),
      tone: sell ? "negative" : "positive",
    });
  }

  // ── New quarterly results (posted in the last three weeks).
  for (const r of i.results) {
    const code = r.code.toUpperCase();
    if (has(code, "results")) continue;
    const level = RESULT_LEVEL[r.level];
    const tone: StoryTone = r.level === "good" ? "positive" : r.level === "bad" ? "negative" : "neutral";
    add(code, {
      id: `rs:${code}:${r.post_date}`,
      kind: "results",
      label: L("Quarterly results", "ত্রৈমাসিক ফল"),
      headline: lang === "bn" ? r.headline_bn : r.headline_en,
      big:
        r.eps_yoy_pct != null
          ? { text: changePct(r.eps_yoy_pct, 0), tone: toneOf(r.eps_yoy_pct), caption: L("profit against last year", "গত বছরের তুলনায় মুনাফা") }
          : undefined,
      sentence: (lang === "bn" ? r.profit_bn : r.profit_en) ?? undefined,
      rows: [{ label: L("Overall", "সব মিলিয়ে"), value: lang === "bn" ? level.shortBn : level.short, tone }],
      cta: { label: L("Open the results", "ফলটি দেখুন"), href: `/stock/${encodeURIComponent(code)}#results` },
      when: day(r.post_date),
      tone,
    });
  }

  // ── Big moves (±3%), with unusual trading folded in; busy trading alone gets its own frame.
  const unusual = new Map<string, MarketUnusualStock>();
  for (const u of i.unusual) if (u.volume_ratio > 1) unusual.set(u.trading_code.toUpperCase(), u);
  for (const code of universe) {
    const s = priceMap.get(code);
    const pct = s?.change_pct;
    const u = unusual.get(code);
    if (s && pct != null && Math.abs(pct) >= MOVE_PCT) {
      const up = pct > 0;
      const abs = Math.abs(pct).toFixed(1);
      const rows: NonNullable<StoryFrame["rows"]> = [{ label: L("Price now", "এখনকার দাম"), value: money(s.ltp) }];
      const q = qty.get(code);
      if (q && s.ltp != null) {
        const delta = q * (s.ltp - s.ltp / (1 + pct / 100));
        rows.push({
          label: L(`On your ${bdGroup(q)} shares`, `আপনার ${bdGroup(q)}টি শেয়ারে`),
          value: `${delta >= 0 ? "+" : "−"}৳${bdGroup(Math.abs(delta))}`,
          tone: toneOf(delta),
        });
      }
      add(code, {
        id: `mv:${code}:${i.todayIso}`,
        kind: "move",
        label: L("Big move", "বড় ওঠানামা"),
        headline: today
          ? L(`${up ? "Rose" : "Fell"} ${abs}% today`, `আজ ${abs}% ${up ? "বেড়েছে" : "কমেছে"}`)
          : L(`${up ? "Rose" : "Fell"} ${abs}% on the last trading day`, `শেষ লেনদেনের দিনে ${abs}% ${up ? "বেড়েছে" : "কমেছে"}`),
        big: { text: changePct(pct, 1), tone: toneOf(pct), caption: dayWord },
        sentence: u
          ? L(
              `It traded ${u.volume_ratio.toFixed(1)} times its usual amount, so many people were ${up ? "buying" : "selling"}.`,
              `স্বাভাবিকের ${u.volume_ratio.toFixed(1)} গুণ লেনদেন হয়েছে, অনেকেই ${up ? "কিনছিলেন" : "বিক্রি করছিলেন"}।`,
            )
          : up
            ? L("A big rise in one day. It is worth checking what is behind it.", "একদিনে বড় উত্থান। পেছনের কারণটা দেখে নেওয়া ভালো।")
            : L("A big fall in one day. It is worth checking the news before you act.", "একদিনে বড় পতন। কিছু করার আগে খবর দেখে নেওয়া ভালো।"),
        rows,
        cta: stockLink(code),
        when: dayWord,
        tone: toneOf(pct),
      });
    } else if (u) {
      const x = u.volume_ratio.toFixed(1);
      add(code, {
        id: `vo:${code}:${i.todayIso}`,
        kind: "volume",
        label: L("Busy trading", "বেশি লেনদেন"),
        headline: L(`Traded ${x} times its usual amount`, `স্বাভাবিকের ${x} গুণ লেনদেন`),
        big: { text: `${x}×`, caption: L("its usual trading", "স্বাভাবিক লেনদেনের") },
        sentence: L(
          "Many more people than usual traded it. That often follows news, so check the stock page.",
          "স্বাভাবিকের চেয়ে অনেক বেশি লেনদেন হয়েছে। এর পেছনে প্রায়ই খবর থাকে, তাই শেয়ারের পেজ দেখে নিন।",
        ),
        rows: [
          { label: dayWord.charAt(0).toUpperCase() + dayWord.slice(1), value: changePct(u.change_pct ?? s?.change_pct), tone: toneOf(u.change_pct) },
          { label: L("Price now", "এখনকার দাম"), value: money(s?.ltp ?? u.last_price) },
        ],
        cta: stockLink(code),
        when: dayWord,
        tone: toneOf(u.change_pct),
      });
    }
  }

  // ── Near a yearly high / low.
  const extremeSeen = new Set<string>();
  for (const [side, list] of [
    ["high", i.extremes?.near_high ?? []],
    ["low", i.extremes?.near_low ?? []],
  ] as const) {
    for (const e of list) {
      const code = e.trading_code.toUpperCase();
      if (!universe.has(code) || extremeSeen.has(code)) continue;
      extremeSeen.add(code);
      const high = side === "high";
      const mark = high ? e.w52_high : e.w52_low;
      add(code, {
        id: `${high ? "hi" : "lo"}:${code}:${i.todayIso}`,
        kind: high ? "high" : "low",
        label: high ? L("Yearly high", "বছরের সর্বোচ্চ") : L("Yearly low", "বছরের সর্বনিম্ন"),
        headline: high
          ? L("Close to its highest price this year", "এ বছরের সর্বোচ্চ দামের কাছে")
          : L("Close to its lowest price this year", "এ বছরের সর্বনিম্ন দামের কাছে"),
        big: { text: money(e.ltp), caption: L("price now", "এখনকার দাম") },
        sentence: high
          ? L("It is trading near the top of this year's range.", "দাম এখন এ বছরের সীমার ওপরের দিকে।")
          : L(
              "It is trading near the bottom of this year's range. A low price is a reason to look again, not a reason to buy on its own.",
              "দাম এখন এ বছরের সীমার নিচের দিকে। কম দাম আবার দেখার কারণ, শুধু এ কারণে কেনা ঠিক নয়।",
            ),
        rows:
          mark != null
            ? [{ label: high ? L("This year's high", "এ বছরের সর্বোচ্চ") : L("This year's low", "এ বছরের সর্বনিম্ন"), value: money(mark) }]
            : undefined,
        cta: stockLink(code),
        when: dayWord,
        tone: high ? "positive" : "negative",
      });
    }
  }

  // ── Dividends: the cash on the reader's own shares where the calendar knows
  //    it, else the plain declaration / record date.
  const cashByCode = new Map<string, CorporateActionEvent>();
  for (const e of i.dividendCash) {
    const c = e.trading_code.toUpperCase();
    if (!cashByCode.has(c)) cashByCode.set(c, e);
  }
  const divLink = (code: string): StoryLink => ({
    label: L("See the dividend", "ডিভিডেন্ড দেখুন"),
    href: `/stock/${encodeURIComponent(code)}#dividends`,
  });
  for (const [code, e] of cashByCode) {
    if (!e.record_date) continue;
    const info = recordDateInfo(e.record_date);
    const daysLeft = info?.recordDaysLeft ?? e.record_days_left;
    if (daysLeft != null && daysLeft < 0) continue;
    const q = qty.get(code);
    const rdRow = {
      label: L("Record date", "রেকর্ড ডেট"),
      value: `${day(e.record_date)}${daysLeft != null ? (lang === "bn" ? ` · ${daysLeft} দিন বাকি` : ` · ${daysLeft} ${plural(daysLeft, "day", "days")}`) : ""}`,
    };
    const cps = e.cash_per_share;
    if (cps != null && cps > 0) {
      const cpsStr = money(cps);
      if (q) {
        const payout = Math.round(q * cps);
        add(code, {
          id: `dv:${code}:${e.record_date}`,
          kind: "dividend",
          label: L("Money coming", "ডিভিডেন্ড আসছে"),
          headline: L(`৳${bdGroup(payout)} coming to you`, `আপনি ৳${bdGroup(payout)} ডিভিডেন্ড পাবেন`),
          big: { text: `৳${bdGroup(payout)}`, tone: "positive", caption: L("cash dividend, before tax", "নগদ ডিভিডেন্ড, করের আগে") },
          sentence: L(
            `${cpsStr} a share on your ${bdGroup(q)} shares. Keep them until the record date to get it.`,
            `আপনার ${bdGroup(q)}টি শেয়ারে শেয়ারপ্রতি ${cpsStr}। পেতে হলে রেকর্ড ডেট পর্যন্ত শেয়ার রাখুন।`,
          ),
          rows: [rdRow, ...(e.yield_pct != null ? [{ label: L("Of today's price", "আজকের দামের"), value: `${e.yield_pct.toFixed(1)}%` }] : [])],
          cta: divLink(code),
          when: day(e.declaration_date) || undefined,
          tone: "positive",
        });
      } else {
        add(code, {
          id: `dv:${code}:${e.record_date}`,
          kind: "dividend",
          label: L("Money coming", "ডিভিডেন্ড আসছে"),
          headline: L(`Pays ${cpsStr} a share in cash`, `শেয়ারপ্রতি ${cpsStr} নগদ ডিভিডেন্ড`),
          big:
            e.yield_pct != null
              ? { text: `${e.yield_pct.toFixed(1)}%`, tone: "positive", caption: L("of today's price, before tax", "আজকের দামের, করের আগে") }
              : { text: cpsStr, tone: "positive", caption: L("a share", "শেয়ারপ্রতি") },
          sentence: L(
            "Buy by the date below to get it. Shares bought later miss this payment.",
            "নিচের তারিখের মধ্যে কিনলে এই ডিভিডেন্ড পাবেন। পরে কিনলে পাবেন না।",
          ),
          rows: [rdRow, ...(e.buy_by ? [{ label: L("Buy by", "কেনার শেষ দিন"), value: day(e.buy_by) }] : [])],
          cta: divLink(code),
          when: day(e.declaration_date) || undefined,
          tone: "positive",
        });
      }
    } else if (e.stock_pct != null && e.stock_pct > 0) {
      const newShares = q ? Math.floor((q * e.stock_pct) / 100) : 0;
      add(code, {
        id: `dv:${code}:${e.record_date}`,
        kind: "dividend",
        label: L("Bonus shares", "বোনাস শেয়ার"),
        headline: L(`Giving ${e.stock_pct}% bonus shares`, `${e.stock_pct}% বোনাস শেয়ার দিচ্ছে`),
        big: { text: `${e.stock_pct}%`, caption: L("bonus shares", "বোনাস শেয়ার") },
        sentence: newShares
          ? L(
              `About ${bdGroup(newShares)} new shares on your ${bdGroup(q!)}. The price drops to match, so your money stays the same.`,
              `আপনার ${bdGroup(q!)}টি শেয়ারে প্রায় ${bdGroup(newShares)}টি নতুন শেয়ার। দামও সেই অনুপাতে কমে, তাই আপনার টাকা একই থাকে।`,
            )
          : L(
              "Every holder on the record date gets new shares. The price drops to match.",
              "রেকর্ড ডেটে যাদের হাতে শেয়ার থাকবে, তারা নতুন শেয়ার পাবেন। দামও সেই অনুপাতে কমে।",
            ),
        rows: [rdRow],
        cta: divLink(code),
        when: day(e.declaration_date) || undefined,
        tone: "neutral",
      });
    }
  }
  for (const d of i.dividends?.upcoming_declarations ?? []) {
    const code = d.trading_code.toUpperCase();
    if (has(code, "dividend")) continue;
    const pct = d.dividend_pct != null ? `${d.dividend_pct}% ` : "";
    add(code, {
      id: `dd:${code}:${d.record_date ?? ""}`,
      kind: "dividend",
      label: L("Dividend declared", "ডিভিডেন্ড ঘোষণা"),
      headline: L(`Declared a ${pct}dividend`, `${pct}ডিভিডেন্ড ঘোষণা করেছে`),
      sentence: d.record_date
        ? L(
            `Hold the shares on ${day(d.record_date)}, the record date, to get it.`,
            `পেতে হলে রেকর্ড ডেট ${day(d.record_date)} তারিখে শেয়ার হাতে রাখুন।`,
          )
        : L("The record date isn't set yet. We'll show it here when DSE posts it.", "রেকর্ড ডেট এখনো ঠিক হয়নি। ডিএসই জানালে এখানে দেখাব।"),
      cta: divLink(code),
      tone: "neutral",
    });
  }
  for (const d of i.dividends?.upcoming_record_dates ?? []) {
    const code = d.trading_code.toUpperCase();
    if (has(code, "dividend") || !d.record_date) continue;
    const info = recordDateInfo(d.record_date);
    if (info && info.recordDaysLeft < 0) continue;
    add(code, {
      id: `dr:${code}:${d.record_date}`,
      kind: "dividend",
      label: L("Record date", "রেকর্ড ডেট"),
      headline: L(`Record date on ${day(d.record_date)}`, `রেকর্ড ডেট ${day(d.record_date)}`),
      big: info ? { text: `${info.recordDaysLeft}`, caption: L(plural(info.recordDaysLeft, "day left", "days left"), "দিন বাকি") } : undefined,
      sentence: L("Hold the shares on that day to get the dividend.", "ডিভিডেন্ড পেতে সেদিন শেয়ার হাতে রাখুন।"),
      cta: divLink(code),
      tone: "neutral",
    });
  }

  // ── What the weekly watcher caught (grade / category changes are only here).
  if (i.week && i.week.total > 0) {
    const freeIds = new Set([...(i.week.free_items ?? []), ...i.week.items.filter((e) => e.free)].map((e) => e.id));
    const items = [...(i.week.free_items ?? []), ...i.week.items];
    const done = new Set<string>();
    const lockedByCode = new Map<string, PortfolioWatchEvent[]>();
    for (const e of items) {
      if (done.has(e.id)) continue;
      done.add(e.id);
      const code = e.code.toUpperCase();
      const kind = WATCH_KIND[e.kind];
      if (has(code, kind)) continue;
      if (!i.premium && !freeIds.has(e.id)) {
        lockedByCode.set(code, [...(lockedByCode.get(code) ?? []), e]);
        continue;
      }
      add(code, {
        id: `ww:${e.id}`,
        kind,
        label: L(...WATCH_LABEL[e.kind]),
        headline: dropCode(lang === "bn" ? e.title_bn : e.title_en, e.code),
        sentence: lang === "bn" ? e.body_bn : e.body_en,
        cta: stockLink(e.code, WATCH_ANCHOR[e.kind]),
        when: day(e.day),
        tone: e.level === "good" ? "positive" : e.level === "bad" ? "negative" : "neutral",
      });
    }
    for (const [code, evs] of lockedByCode) {
      const n = evs.length;
      const kinds = evs.map((e) => WATCH_KIND[e.kind]);
      add(code, {
        id: `wl:${code}:${evs.map((e) => e.id).join(",")}`,
        kind: "locked",
        label: L("This week", "এই সপ্তাহে"),
        headline: L(
          `${n} more ${plural(n, "thing", "things")} on ${code} this week`,
          `এই সপ্তাহে ${code}-এ আরও ${n}টি বিষয়`,
        ),
        sentence: `${kindsPhrase(kinds, lang)}${L(".", "।")} ${L(
          "Premium shows what happened and why, and sends it to your phone the same day.",
          "প্রিমিয়ামে দেখবেন কী হয়েছে ও কেন, আর একই দিনে ফোনে নোটিফিকেশন যাবে।",
        )}`,
        cta: { label: L("See Premium", "প্রিমিয়াম দেখুন"), href: "/premium" },
        tone: "neutral",
        locked: true,
        lockedKinds: kinds,
        stakes: [
          L(`${n} more ${plural(n, "thing", "things")} on ${code} this week`, `এই সপ্তাহে ${code}-এ আরও ${n}টি বিষয়`),
          L("Premium also sends them to your phone the same day", "প্রিমিয়ামে একই দিনে ফোনে নোটিফিকেশন যায়"),
        ],
      });
    }
  }

  // ── News from the last seven days: the newest per stock, results /
  //    dividend headlines skipped when their own frame is there.
  const cutoff = now - NEWS_DAYS * DAY_MS;
  let newsN = 0;
  const newsCodes = new Set<string>();
  for (const n of i.news) {
    if (newsN >= MAX_NEWS) break;
    const code = n.trading_code.toUpperCase();
    if (!universe.has(code) || newsCodes.has(code)) continue;
    const ts = Date.parse(n.post_date);
    if (!Number.isNaN(ts) && ts < cutoff) continue;
    const kind = classifyNews(n.title);
    if (kind.key === "earnings" && has(code, "results")) continue;
    if ((kind.key === "dividend" || kind.key === "record") && has(code, "dividend")) continue;
    newsCodes.add(code);
    newsN += 1;
    add(code, {
      id: `nw:${code}:${n.post_date}:${n.title.slice(0, 40)}`,
      kind: "news",
      label: `${L("News", "খবর")} · ${lang === "bn" ? kind.labelBn : kind.label}`,
      headline: n.title,
      sentence: n.body ? trimBody(n.body) : undefined,
      cta: { label: L("Read the news", "খবরটি পড়ুন"), href: `/stock/${encodeURIComponent(code)}#news` },
      when: Number.isNaN(ts) ? undefined : day(n.post_date),
      tone: "neutral",
    });
  }

  // ── One story per stock with something to say.
  const stories: Story[] = [];
  for (const [code, list] of byCode) {
    const sorted = list
      .map((f, k) => ({ f, k }))
      .sort((a, b) => (RANK[a.f.kind] ?? 9) - (RANK[b.f.kind] ?? 9) || a.k - b.k)
      .map((x) => x.f);
    const open = sorted.filter((f) => !f.locked).slice(0, MAX_FRAMES);
    const locked = sorted.find((f) => f.locked);
    const frames = locked ? [...open, locked] : open;
    if (!frames.length) continue;
    const s = priceMap.get(code);
    const lead = frames[0];
    const owner = held.has(code) ? "portfolio" : "watchlist";
    stories.push({
      id: `s:${code}`,
      kind: "stock",
      code,
      name: companyShort(s?.company_name) || code,
      sub: owner === "portfolio" ? L("In your portfolio", "আপনার পোর্টফোলিওতে") : L("On your watchlist", "আপনার ওয়াচলিস্টে"),
      inner: s?.change_pct != null ? { text: changePct(s.change_pct, 1), tone: toneOf(s.change_pct) } : undefined,
      owner,
      label: code,
      tone: lead.tone,
      rank: (RANK[lead.kind] ?? 9) * 10 + (owner === "portfolio" ? 0 : 1),
      frames,
    });
  }

  // ── New names on the reader's saved screens (Premium — re-checked daily).
  const screenFrames: StoryFrame[] = i.savedScreens
    .filter((sc) => sc.new_today.length > 0)
    .map((sc): StoryFrame => {
      const n = sc.new_today.length;
      return {
        id: `sc:${sc.id}:${sc.checked_on ?? i.todayIso}`,
        kind: "screen",
        label: L("Saved screen", "সেভ করা স্ক্রিন"),
        headline: L(`${n} new on "${sc.name}"`, `"${sc.name}" স্ক্রিনে নতুন ${n}টি শেয়ার`),
        big: { text: `${n}`, caption: L(plural(n, "stock joined", "stocks joined"), "নতুন শেয়ার") },
        sentence: sc.new_today
          .slice(0, 3)
          .map((x) => companyShort(x.name) || x.code)
          .join(", ") + (n > 3 ? "…" : ""),
        rows: sc.passed != null ? [{ label: L("Passing now", "এখন পাস করছে"), value: `${sc.passed}` }] : undefined,
        cta: { label: L("Open the screen", "স্ক্রিনটি খুলুন"), href: `/screener?tab=saved&list=${encodeURIComponent(sc.id)}` },
        when: sc.checked_on ? day(sc.checked_on) : undefined,
        tone: "neutral",
      };
    });
  if (screenFrames.length) {
    stories.push({
      id: "screens",
      kind: "screens",
      name: L("Your screens", "আপনার স্ক্রিন"),
      sub: L("Checked every day", "প্রতিদিন যাচাই হয়"),
      icon: "list",
      label: L("Screens", "স্ক্রিন"),
      tone: "neutral",
      rank: (RANK.screen ?? 2) * 10 + 2,
      frames: screenFrames.slice(0, MAX_FRAMES),
    });
  }

  stories.sort((a, b) => {
    if (a.rank !== b.rank) return a.rank - b.rank;
    const ca = Math.abs(priceMap.get(a.code ?? "")?.change_pct ?? 0);
    const cb = Math.abs(priceMap.get(b.code ?? "")?.change_pct ?? 0);
    return cb - ca;
  });

  const todayStory = buildTodayStory(i, { held, watchOnly, universe, sigOf, L, dayWord });
  const out = stories.slice(0, MAX_STOCK_STORIES);
  return todayStory ? [todayStory, ...out] : out;
}

interface DayStats {
  n: number;
  up: number;
  down: number;
  flat: number;
  best: ScoreItem | null;
  worst: ScoreItem | null;
}

function dayStats(codes: Iterable<string>, priceMap: Map<string, ScoreItem>): DayStats {
  const priced = Array.from(codes)
    .map((c) => priceMap.get(c))
    .filter((s): s is ScoreItem => !!s && s.change_pct != null)
    .sort((a, b) => (b.change_pct ?? 0) - (a.change_pct ?? 0));
  const top = priced[0];
  const bottom = priced[priced.length - 1];
  return {
    n: priced.length,
    up: priced.filter((s) => (s.change_pct ?? 0) > 0).length,
    down: priced.filter((s) => (s.change_pct ?? 0) < 0).length,
    flat: priced.filter((s) => s.change_pct === 0).length,
    best: top && (top.change_pct ?? 0) > 0 ? top : null,
    worst: bottom && (bottom.change_pct ?? 0) < 0 ? bottom : null,
  };
}

/** "Today": the reader's day (portfolio, then watchlist), then where their
 *  stocks stand right now — Buy / Sell / grade counts. */
function buildTodayStory(
  i: StoryInput,
  ctx: {
    held: Set<string>;
    watchOnly: string[];
    universe: Set<string>;
    sigOf: (code: string) => "buy" | "buy_more" | "sell" | "none";
    L: L;
    dayWord: string;
  },
): Story | null {
  const { lang, priceMap, todayIso } = i;
  const { L, dayWord } = ctx;
  const today = i.when === "today";
  const frames: StoryFrame[] = [];

  const extremesRows = (d: DayStats): StoryFrame["rows"] => {
    const rows: NonNullable<StoryFrame["rows"]> = [];
    if (d.best) rows.push({ label: L("Rose most", "সবচেয়ে বেশি বেড়েছে"), value: `${d.best.trading_code} ${changePct(d.best.change_pct)}`, tone: "positive" });
    if (d.worst) rows.push({ label: L("Fell most", "সবচেয়ে বেশি কমেছে"), value: `${d.worst.trading_code} ${changePct(d.worst.change_pct)}`, tone: "negative" });
    return rows.length ? rows : undefined;
  };
  const dsexLine = (): string => {
    const p = i.marketIndex?.dsex_change_pct;
    if (p == null) return "";
    const abs = `${Math.abs(p).toFixed(2)}%`;
    if (p === 0) return L(" The DSEX did not move.", " DSEX একই জায়গায় ছিল।");
    return p > 0 ? L(` The DSEX rose ${abs}.`, ` DSEX ${abs} বেড়েছে।`) : L(` The DSEX fell ${abs}.`, ` DSEX ${abs} কমেছে।`);
  };
  const dayTone = (d: DayStats): StoryTone => (d.up > d.down ? "positive" : d.down > d.up ? "negative" : "neutral");

  const p = dayStats(ctx.held, priceMap);
  if (p.n > 0) {
    const m = i.todayMove;
    const moneyLine =
      m && Math.abs(m.delta) >= 1
        ? m.delta >= 0
          ? L(
              `Your portfolio gained ৳${bdGroup(m.delta)} (${changePct(m.pct)}).`,
              `আপনার পোর্টফোলিও ৳${bdGroup(m.delta)} বেড়েছে (${changePct(m.pct)})।`,
            )
          : L(
              `Your portfolio lost ৳${bdGroup(Math.abs(m.delta))} (${changePct(m.pct)}).`,
              `আপনার পোর্টফোলিও ৳${bdGroup(Math.abs(m.delta))} কমেছে (${changePct(m.pct)})।`,
            )
        : L("Your portfolio barely moved.", "আপনার পোর্টফোলিও প্রায় একই আছে।");
    frames.push({
      id: `day:p:${todayIso}`,
      kind: "day",
      label: L("Your portfolio", "আপনার পোর্টফোলিও"),
      headline: today
        ? L(`${p.up} of your ${p.n} stocks rose today`, `আজ আপনার ${p.n}টি শেয়ারের ${p.up}টির দাম বেড়েছে`)
        : L(`${p.up} of your ${p.n} stocks rose on the last trading day`, `শেষ লেনদেনের দিনে আপনার ${p.n}টি শেয়ারের ${p.up}টির দাম বেড়েছে`),
      bar: { up: p.up, flat: p.flat, down: p.down },
      sentence: `${moneyLine}${dsexLine()}`,
      rows: extremesRows(p),
      cta: { label: L("See your portfolio", "পোর্টফোলিও দেখুন"), href: "/portfolio" },
      when: dayWord,
      tone: dayTone(p),
    });
  }

  const w = dayStats(ctx.watchOnly, priceMap);
  if (w.n > 0) {
    frames.push({
      id: `day:w:${todayIso}`,
      kind: "day",
      label: L("Your watchlist", "আপনার ওয়াচলিস্ট"),
      headline: today
        ? L(`${w.up} of the ${w.n} stocks you follow rose today`, `আজ ওয়াচলিস্টের ${w.n}টি শেয়ারের ${w.up}টির দাম বেড়েছে`)
        : L(
            `${w.up} of the ${w.n} stocks you follow rose on the last trading day`,
            `শেষ লেনদেনের দিনে ওয়াচলিস্টের ${w.n}টি শেয়ারের ${w.up}টির দাম বেড়েছে`,
          ),
      bar: { up: w.up, flat: w.flat, down: w.down },
      sentence: p.n > 0 ? undefined : dsexLine().trim() || undefined,
      rows: extremesRows(w),
      cta: { label: L("See your watchlist", "ওয়াচলিস্ট দেখুন"), href: "/watchlist" },
      when: dayWord,
      tone: dayTone(w),
    });
  }

  // Right now: Buy (Buy more on a holding) / Sell, and grades.
  const items = Array.from(ctx.universe)
    .map((c) => priceMap.get(c))
    .filter((s): s is ScoreItem => !!s);
  const buy: string[] = [];
  const sell: string[] = [];
  for (const s of items) {
    const sig = ctx.sigOf(s.trading_code.toUpperCase());
    if (sig === "buy" || sig === "buy_more") buy.push(s.trading_code);
    else if (sig === "sell") sell.push(s.trading_code);
  }
  const scored = items.filter((s) => s.score != null);
  const good = scored.filter((s) => (s.score ?? 0) >= TIER_THRESHOLDS.GOOD).length;
  const weak = scored.filter((s) => (s.score ?? 0) < TIER_THRESHOLDS.AVERAGE).length;
  if (scored.length > 0) {
    const b = buy.length;
    const sl = sell.length;
    const headline =
      b && sl
        ? L(
            `${b} ${plural(b, "has", "have")} a Buy signal, ${sl} ${plural(sl, "is", "are")} marked Sell`,
            `${b}টিতে কেনার সংকেত, ${sl}টিতে বিক্রির সংকেত`,
          )
        : b
          ? L(`${b} of your stocks ${plural(b, "has", "have")} a Buy signal`, `আপনার ${b}টি শেয়ারে কেনার সংকেত`)
          : sl
            ? L(`${sl} of your stocks ${plural(sl, "is", "are")} marked Sell`, `আপনার ${sl}টি শেয়ারে বিক্রির সংকেত`)
            : L("No Buy or Sell signal on your stocks", "আপনার শেয়ারে কেনা বা বিক্রির সংকেত নেই");
    const rows: NonNullable<StoryFrame["rows"]> = [];
    if (b) rows.push({ label: L("Buy", "কেনা"), value: codeList(buy), tone: "positive" });
    if (sl) rows.push({ label: L("Sell", "বিক্রি"), value: codeList(sell), tone: "negative" });
    frames.push({
      id: `now:${todayIso}:${b}:${sl}:${good}`,
      kind: "now",
      label: L("Right now", "এই মুহূর্তে"),
      headline,
      counts: [
        { value: `${b}`, label: L("Buy", "কেনা"), tone: b ? "positive" : "neutral" },
        { value: `${sl}`, label: L("Sell", "বিক্রি"), tone: sl ? "negative" : "neutral" },
        { value: `${good}/${scored.length}`, label: L("Good or better", "ভালো বা তার বেশি") },
      ],
      sentence:
        L(
          `${good} of ${scored.length} are graded Good or better.`,
          `${scored.length}টির মধ্যে ${good}টির গ্রেড ভালো বা তার চেয়ে বেশি।`,
        ) + (weak ? L(` ${weak} ${plural(weak, "is", "are")} Weak.`, ` ${weak}টি দুর্বল।`) : ""),
      rows: rows.length ? rows : undefined,
      cta: ctx.held.size
        ? { label: L("See your analysis", "বিশ্লেষণ দেখুন"), href: "/portfolio#pf-analysis" }
        : { label: L("See your watchlist", "ওয়াচলিস্ট দেখুন"), href: "/watchlist" },
      when: dayWord,
      tone: sl ? "negative" : b ? "positive" : "neutral",
    });
  }

  if (!frames.length) return null;
  return {
    id: "today",
    kind: "today",
    name: L("Your day", "আপনার দিন"),
    sub: L("All your stocks", "আপনার সব শেয়ার"),
    icon: "sun",
    label: L("Today", "আজ"),
    tone: "neutral",
    rank: -1,
    frames,
  };
}

/**
 * A free reader opens the first `max` stories (in the importance order, so
 * watching never changes which ones are open); the rest become ONE Premium
 * ring that says how many more there are and what kinds. Premium readers
 * pass `max = Infinity`.
 */
export function capStories(stories: Story[], max: number, lang: Lang, todayIso: string): Story[] {
  if (stories.length <= max) return stories;
  const L = lFor(lang);
  const shown = stories.slice(0, max);
  const rest = stories.slice(max);
  const n = rest.length;
  const kinds = rest.flatMap((s) => s.frames.flatMap((f) => (f.locked ? f.lockedKinds ?? [] : [f.kind])));
  const phrase = kindsPhrase(kinds, lang);
  const codes = rest.filter((s) => s.code).length;
  const headline = L(`${n} more ${plural(n, "story", "stories")} on your stocks`, `আপনার শেয়ারে আরও ${n}টি স্টোরি`);
  const more: Story = {
    id: "more",
    kind: "more",
    name: L("More stories", "আরও স্টোরি"),
    sub: L("With Premium", "প্রিমিয়ামে"),
    icon: "crown",
    label: L(`${n} more`, `আরও ${n}টি`),
    tone: "neutral",
    rank: 999,
    frames: [
      {
        id: `more:${todayIso}:${n}`,
        kind: "more",
        label: "Premium",
        headline,
        big: { text: `+${n}`, caption: codes ? L(`on ${codes} of your stocks`, `আপনার ${codes}টি শেয়ারে`) : undefined },
        sentence: `${phrase ? `${phrase}${L(".", "।")} ` : ""}${L(
          "Premium opens every story, every day, and sends the important ones to your phone.",
          "প্রিমিয়ামে প্রতিদিন সব স্টোরি খোলা, আর জরুরিগুলো ফোনে নোটিফিকেশন হিসেবে যায়।",
        )}`,
        cta: { label: L("See Premium", "প্রিমিয়াম দেখুন"), href: "/premium" },
        tone: "neutral",
        locked: true,
        lockedKinds: kinds,
        stakes: [
          headline,
          ...(phrase ? [phrase] : []),
          L("Premium also sends the important ones to your phone", "প্রিমিয়ামে জরুরিগুলো ফোনে নোটিফিকেশন হিসেবে যায়"),
        ],
      },
    ],
  };
  return [...shown, more];
}

/**
 * For a reader with no stocks yet: two or three stories about the market
 * (the mood, the day's movers, record dates coming up), then one that asks
 * them to add a watchlist or a portfolio to get stories on their own stocks.
 */
export function buildStarterStories(i: {
  lang: Lang;
  when: "today" | "last";
  todayIso: string;
  mood: MarketMood | null;
  marketIndex: MarketIndexData | null;
  movers: MarketMoversData | null;
  recordDates: CorporateActionEvent[];
}): Story[] {
  const { lang, todayIso } = i;
  const L = lFor(lang);
  const day = dateFor(lang);
  const dayWord = i.when === "today" ? L("today", "আজ") : L("last trading day", "শেষ লেনদেনের দিন");
  const out: Story[] = [];

  // 1 — The market today: mood, DSEX, how many rose and fell.
  const mi = i.marketIndex;
  if (i.mood || mi) {
    const up = mi?.up_count ?? 0;
    const down = mi?.down_count ?? 0;
    const flat = mi?.neutral_count ?? 0;
    const rows: NonNullable<StoryFrame["rows"]> = [];
    if (mi?.dsex != null) rows.push({ label: "DSEX", value: bdGroup(mi.dsex) });
    if (mi?.total_value_mn != null) {
      const crore = mi.total_value_mn / 10;
      rows.push({ label: L("Traded", "লেনদেন"), value: L(`৳${bdGroup(crore)} crore`, `৳${bdGroup(crore)} কোটি`) });
    }
    out.push({
      id: "m:market",
      kind: "market",
      name: L("The market today", "আজকের বাজার"),
      sub: L("Dhaka Stock Exchange", "ঢাকা স্টক এক্সচেঞ্জ"),
      icon: "chart",
      label: L("Market", "বাজার"),
      tone: "neutral",
      rank: 0,
      frames: [
        {
          id: `m:mood:${todayIso}`,
          kind: "market",
          label: i.mood ? (lang === "bn" ? i.mood.label_bn ?? i.mood.label : i.mood.label) : L("The market", "বাজার"),
          headline: i.mood
            ? (lang === "bn" ? i.mood.sentence_bn : null) ?? i.mood.sentence
            : L("How the market did", "বাজার কেমন গেল"),
          big:
            mi?.dsex_change_pct != null
              ? { text: changePct(mi.dsex_change_pct), tone: toneOf(mi.dsex_change_pct), caption: L(`DSEX, ${dayWord}`, `DSEX, ${dayWord}`) }
              : undefined,
          bar: up + down + flat > 0 ? { up, flat, down } : undefined,
          sentence:
            up + down > 0
              ? L(`${up} companies rose and ${down} fell.`, `${up}টি কোম্পানির দাম বেড়েছে, ${down}টির কমেছে।`)
              : undefined,
          rows: rows.length ? rows : undefined,
          cta: { label: L("Read the market", "বাজার বিশ্লেষণ দেখুন"), href: "/market-analysis" },
          when: dayWord,
          tone: toneOf(mi?.dsex_change_pct),
        },
      ],
    });
  }

  // 2 — The day's movers: biggest rise, biggest fall, most traded.
  const mv = i.movers;
  const moverFrames: StoryFrame[] = [];
  const g = mv?.gainers?.[0];
  const lo = mv?.losers?.[0];
  const mt = mv?.most_traded?.[0];
  const moverFrame = (m: NonNullable<typeof g>, kind: "up" | "down" | "traded"): StoryFrame => {
    const name = companyShort(m.company_name) || m.trading_code;
    const crore = m.value_mn != null ? m.value_mn / 10 : null;
    return {
      id: `m:${kind}:${m.trading_code}:${todayIso}`,
      kind: "mover",
      label:
        kind === "up"
          ? L("Rose most", "সবচেয়ে বেশি বেড়েছে")
          : kind === "down"
            ? L("Fell most", "সবচেয়ে বেশি কমেছে")
            : L("Traded most", "সবচেয়ে বেশি লেনদেন"),
      headline: `${name} · ${m.trading_code}`,
      big:
        kind === "traded" && crore != null
          ? { text: L(`৳${crore.toFixed(1)} crore`, `৳${crore.toFixed(1)} কোটি`), caption: L("traded", "লেনদেন") }
          : { text: changePct(m.change_pct, 1), tone: toneOf(m.change_pct), caption: dayWord },
      sentence:
        kind === "up"
          ? L("The biggest rise on DSE. A rise this big is worth checking before you follow it.", "ডিএসইতে সবচেয়ে বড় উত্থান। এত বড় উত্থানের পেছনে কী আছে, আগে দেখে নিন।")
          : kind === "down"
            ? L("The biggest fall on DSE. Check the news before you read anything into it.", "ডিএসইতে সবচেয়ে বড় পতন। কিছু ভাবার আগে খবর দেখে নিন।")
            : L("More money changed hands here than in any other share.", "অন্য যেকোনো শেয়ারের চেয়ে এখানে বেশি টাকার লেনদেন হয়েছে।"),
      rows: [
        { label: L("Price now", "এখনকার দাম"), value: money(m.ltp) },
        ...(kind === "traded" ? [{ label: dayWord.charAt(0).toUpperCase() + dayWord.slice(1), value: changePct(m.change_pct), tone: toneOf(m.change_pct) }] : []),
      ],
      cta: { label: L("See the stock", "শেয়ারটি দেখুন"), href: `/stock/${encodeURIComponent(m.trading_code)}` },
      when: dayWord,
      tone: kind === "traded" ? "neutral" : toneOf(m.change_pct),
    };
  };
  if (g) moverFrames.push(moverFrame(g, "up"));
  if (lo) moverFrames.push(moverFrame(lo, "down"));
  if (mt) moverFrames.push(moverFrame(mt, "traded"));
  if (moverFrames.length) {
    out.push({
      id: "m:movers",
      kind: "market",
      name: L("Today's movers", "আজকের ওঠানামা"),
      sub: L("Across DSE", "পুরো ডিএসই"),
      icon: "flame",
      label: L("Movers", "ওঠানামা"),
      tone: "neutral",
      rank: 1,
      frames: moverFrames,
    });
  }

  // 3 — Cash dividends with a record date coming up.
  const cash = i.recordDates
    .filter((e) => e.record_date && (e.cash_per_share ?? 0) > 0)
    .filter((e) => (recordDateInfo(e.record_date)?.recordDaysLeft ?? e.record_days_left ?? 0) >= 0)
    .sort((a, b) => (a.record_days_left ?? 99) - (b.record_days_left ?? 99))
    .slice(0, 2);
  if (cash.length) {
    out.push({
      id: "m:money",
      kind: "market",
      name: L("Money coming", "ডিভিডেন্ড আসছে"),
      sub: L("Record dates soon", "সামনের রেকর্ড ডেট"),
      icon: "coin",
      label: L("Dividends", "ডিভিডেন্ড"),
      tone: "neutral",
      rank: 2,
      frames: cash.map((e): StoryFrame => {
        const name = companyShort(e.company_name) || e.trading_code;
        const left = recordDateInfo(e.record_date)?.recordDaysLeft ?? e.record_days_left;
        return {
          id: `m:div:${e.trading_code}:${e.record_date}`,
          kind: "money",
          label: L("Record date soon", "রেকর্ড ডেট সামনে"),
          headline: L(`${name} pays ${money(e.cash_per_share)} a share`, `${name} শেয়ারপ্রতি ${money(e.cash_per_share)} ডিভিডেন্ড দেবে`),
          big:
            e.yield_pct != null
              ? { text: `${e.yield_pct.toFixed(1)}%`, tone: "positive", caption: L("of today's price, before tax", "আজকের দামের, করের আগে") }
              : undefined,
          sentence: L(
            "Buy by the date below to get it. Shares bought later miss this payment.",
            "নিচের তারিখের মধ্যে কিনলে এই ডিভিডেন্ড পাবেন। পরে কিনলে পাবেন না।",
          ),
          rows: [
            {
              label: L("Record date", "রেকর্ড ডেট"),
              value: `${day(e.record_date)}${left != null ? (lang === "bn" ? ` · ${left} দিন বাকি` : ` · ${left} ${plural(left, "day", "days")}`) : ""}`,
            },
            ...(e.buy_by ? [{ label: L("Buy by", "কেনার শেষ দিন"), value: day(e.buy_by) }] : []),
          ],
          cta: { label: L("See the calendar", "ক্যালেন্ডার দেখুন"), href: "/dividend-calendar" },
          tone: "positive",
        };
      }),
    });
  }

  // 4 — The ask: add stocks to get stories on them.
  out.push({
    id: "m:start",
    kind: "ask",
    name: L("Your stocks", "আপনার শেয়ার"),
    sub: L("Get your own stories", "নিজের স্টোরি পান"),
    icon: "plus",
    label: L("Start", "শুরু করুন"),
    tone: "neutral",
    rank: 9,
    frames: [
      {
        id: "m:ask",
        kind: "ask",
        label: L("Stories on your stocks", "আপনার শেয়ারের স্টোরি"),
        headline: L("Follow stocks to get stories on them", "শেয়ার ফলো করুন, তাদের নিয়ে স্টোরি পান"),
        sentence: L(
          "Add stocks to your watchlist or your portfolio. Every day we tell you what changed on them: big moves, results, dividends and signals.",
          "ওয়াচলিস্ট বা পোর্টফোলিওতে শেয়ার যোগ করুন। প্রতিদিন আমরা জানাব কী বদলেছে: বড় ওঠানামা, ফল, ডিভিডেন্ড আর সংকেত।",
        ),
        cta: { label: L("Build a watchlist", "ওয়াচলিস্ট বানান"), href: "/watchlist" },
        cta2: { label: L("Add your portfolio", "পোর্টফোলিও যোগ করুন"), href: "/portfolio" },
        tone: "neutral",
      },
    ],
  });

  return out;
}
