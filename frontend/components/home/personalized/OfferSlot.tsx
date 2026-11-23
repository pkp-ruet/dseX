"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Button from "@/components/ui/Button";
import Link from "@/components/ui/Link";
import type { Lang } from "@/context/LangContext";
import { useAuth } from "@/context/AuthContext";
import { FREE_LIMITS, usePremium } from "@/lib/premium";
import {
  apiDismissOffer,
  apiPremiumBannerEvent,
  type LatestResultRow,
  type MorningBrief,
  type PortfolioHolding,
  type PortfolioWatchEvent,
  type PremiumBannerAction,
  type ScoreItem,
  type ScreenerSaved,
  type UpcomingResult,
  type WeekWatch,
} from "@/lib/api";
import { portfolioGlance } from "@/lib/home-portfolio";
import { AUTH_USER_UPDATED_EVENT, setStoredUser, type AuthUser } from "@/lib/auth";
import { BUY_LIST_ANCHOR, type BuyListHome } from "@/lib/buy-list";
import { WATCH_ANCHOR } from "@/lib/dash-stories";
import { bstDateStr } from "@/lib/market-hours";
import { OWN_OFFER_PLAN, PAID_PLANS, planByKey } from "@/lib/premium-plans";
import { REPORTS, reportStat, type ResearchSummary } from "@/lib/research-reports";
import { dayShort } from "@/components/dividend-calendar/dates";
import { useInstallPrompt, showInstallBanner } from "@/lib/install";
import {
  canShowPushPromptByHistory,
  dismissPushPromptForever,
  getPermission,
  isIOS,
  isPushSupported,
  isStandalone,
  snoozePushPrompt,
  subscribeToPush,
} from "@/lib/push";
import { BLOG_TO_LEARN } from "@/lib/i18n-pairs";
import { savePremiumContext } from "@/lib/premium-context";
import { toast } from "@/lib/toast";
import { Carousel, type Slide, type SlideTone as Tone } from "@/components/home/personalized/SlotCarousel";
import { trackEvent } from "@/lib/track";
import { loadWatchRules } from "@/components/watch-rules/store";
import {
  IconAlert,
  IconBell,
  IconBook,
  IconBriefcase,
  IconBulb,
  IconCalendar,
  IconCap,
  IconCheck,
  IconChevronRight,
  IconClipboardCheck,
  IconCompare,
  IconCrown,
  IconDownload,
  IconGift,
  IconMoon,
  IconStar,
  IconEye,
  IconBlocks,
  IconSun,
  IconTune,
} from "@/components/ui/icons";

type Bi = { en: string; bn: string };


// ── Keys kept from the banners the slot replaced, so a choice made there still holds ──
/** The Premium banner's "Maybe later" (7 days) / "Not interested" (60 days), per account. */
const premKey = (uid: string) => `dsex.premiumBanner.${uid}`;
const PREM_LATER_DAYS = 7;
const PREM_NEVER_DAYS = 60;
const DAY_MS = 86_400_000;
/** The old setup card: "Not now" for this visit, "Don't show again" for good. */
const SETUP_SKIP_KEY = "dsex.setup.skip";
const SETUP_HIDE_KEY = "dsex.setup.hidden";
/** The old install card on the home page. */
const INSTALL_KEY = "dsex.install.home.dismissed";
// "Not now" on the watch-rules slide: back after 14 days.
const RULES_KEY = "dsex.home.rulesSlide";
const RULES_SNOOZE_MS = 14 * 86400000;
// "Not now" on the portfolio-builder slide (2026-11-23): back after 14 days.
const BUILDER_KEY = "dsex.home.builderSlide";

const YEAR = PAID_PLANS.find((p) => p.key === "yearly") ?? PAID_PLANS[PAID_PLANS.length - 1];

/** The watcher's kinds in words, for the free reader's "this week" slide. */
const WATCH_WORDS: Record<PortfolioWatchEvent["kind"], { en: [string, string]; bn: string }> = {
  record: { en: ["record date", "record dates"], bn: "রেকর্ড ডেট" },
  results: { en: ["results report", "results reports"], bn: "আর্থিক ফল" },
  grade: { en: ["grade change", "grade changes"], bn: "গ্রেড বদল" },
  category: { en: ["category change", "category changes"], bn: "ক্যাটাগরি বদল" },
  drop: { en: ["big fall", "big falls"], bn: "বড় দরপতন" },
  low52: { en: ["yearly low", "yearly lows"], bn: "বছরের সর্বনিম্ন দাম" },
  red_flag: { en: ["new warning", "new warnings"], bn: "নতুন সতর্কতা" },
  answer: { en: ["change in our answer", "changes in our answer"], bn: "আমাদের উত্তরে বদল" },
  buylist: { en: ["Buy List change", "Buy List changes"], bn: "কেনার তালিকায় বদল" },
  breakeven: { en: ["share back to your price", "shares back to your price"], bn: "কেনা দামে ফেরা" },
};

// ── Premium slides (2026-11-18) ───────────────────────────────────────────
/** A member sees at most this many slides. */
const MAX_PREMIUM_SLIDES = 5;
/** "After the close" leaves out our answer and the Buy List: those are
 *  signals, which stay on the stock page and the portfolio (2026-11-01). */
const AFTER_CLOSE_SKIP = new Set<PortfolioWatchEvent["kind"]>(["answer", "buylist"]);
/** A close older than this many calendar days is no longer news (Thu → Sun). */
const AFTER_CLOSE_DAYS = 3;
/** "Results to look for": meetings on the reader's shares in the next week. */
const RESULTS_DAYS = 7;
/** "Get more from Premium" shows in a member's first month. */
const NEW_MEMBER_DAYS = 30;
/** The tips a member has tapped or skipped, per account. */
const tipsKey = (uid: string) => `dsex.premiumTips.${uid}`;

type TipId = "screen" | "reminder" | "compare" | "portfolio";
/** One Premium tool a new member hasn't used yet, one at a time, in this order. */
const TIPS: { id: TipId; Icon: typeof IconTune; title: Bi; body: Bi; href: string; cta: Bi }[] = [
  {
    id: "screen",
    Icon: IconTune,
    title: { en: "Save a screen, and we watch it for you", bn: "একটি স্ক্রিন সেভ করুন, আমরা নজর রাখব" },
    body: {
      en: "Pick a list or your own filters in the screener and save it. When a share joins after a close, we tell you the same evening.",
      bn: "স্ক্রিনারে একটি তালিকা বা নিজের ফিল্টার বেছে সেভ করুন। বাজার বন্ধের পর নতুন কোনো শেয়ার যোগ হলে সেদিন সন্ধ্যায়ই জানাব।",
    },
    href: "/screener",
    cta: { en: "Open the screener", bn: "স্ক্রিনার খুলুন" },
  },
  {
    id: "reminder",
    Icon: IconBell,
    title: { en: "Never miss a last day to buy", bn: "কেনার শেষ দিন আর মিস হবে না" },
    body: {
      en: "Open a company in the dividend calendar and tap “Remind me on the last day to buy”. That morning, it is in your 9 AM brief.",
      bn: "ডিভিডেন্ড ক্যালেন্ডারে কোনো কোম্পানি খুলে “কেনার শেষ দিনে মনে করিয়ে দিন” চাপুন। সেদিন সকাল 9টার ব্রিফে এটি থাকবে।",
    },
    href: "/dividend-calendar#record-dates",
    cta: { en: "Open the dividend calendar", bn: "ডিভিডেন্ড ক্যালেন্ডার খুলুন" },
  },
  {
    id: "compare",
    Icon: IconCompare,
    title: { en: "Compare up to 10 shares side by side", bn: "পাশাপাশি 10টি পর্যন্ত শেয়ার তুলনা করুন" },
    body: {
      en: "Put the shares you are choosing between on one page, with our analysis of each one next to the others.",
      bn: "যেসব শেয়ারের মধ্যে বাছাই করছেন, সেগুলো এক পেজে রাখুন, পাশাপাশি প্রতিটির ওপর আমাদের বিশ্লেষণসহ।",
    },
    href: "/compare-stocks",
    cta: { en: "Compare shares", bn: "শেয়ার তুলনা করুন" },
  },
  {
    id: "portfolio",
    Icon: IconBriefcase,
    title: { en: "Keep more than one portfolio", bn: "একাধিক পোর্টফোলিও রাখুন" },
    body: {
      en: "Keep a family member's shares or a second account apart from your own, up to 6 portfolios in all.",
      bn: "পরিবারের কারও শেয়ার বা আরেকটি অ্যাকাউন্ট নিজেরটা থেকে আলাদা রাখুন, সব মিলিয়ে 6টি পর্যন্ত পোর্টফোলিও।",
    },
    href: "/portfolio",
    cta: { en: "Open your portfolio", bn: "পোর্টফোলিও খুলুন" },
  },
];

/** Days from ISO date `b` to ISO date `a` (both YYYY-MM-DD). */
function isoDays(a: string, b: string): number {
  const at = (s: string) => Date.UTC(Number(s.slice(0, 4)), Number(s.slice(5, 7)) - 1, Number(s.slice(8, 10)));
  return Math.round((at(a) - at(b)) / DAY_MS);
}

/** In the member's first month? Worked out from the plan they bought (no
 *  start date is stored), so a renewal bought early counts a little longer.
 *  Premium given by an admin, and admins, always count. */
function inFirstMonth(user: AuthUser | null | undefined): boolean {
  if (!user) return false;
  if (user.is_admin) return true;
  if (!user.premium_until) return false;
  const plan = planByKey(user.paid_plan);
  if (!plan) return true;
  const start = Date.parse(user.premium_until) - plan.days * DAY_MS;
  return Number.isFinite(start) && Date.now() - start < NEW_MEMBER_DAYS * DAY_MS;
}

/** What to look for in one coming report, as one plain sentence. */
function lookFor(m: UpcomingResult): Bi | null {
  if (m.better_above != null && m.weaker_below != null) {
    const b = `৳${m.better_above.toFixed(2)}`;
    const w = `৳${m.weaker_below.toFixed(2)}`;
    return {
      en: `Better if it earns ${b} a share or more, weaker under ${w}.`,
      bn: `শেয়ারপ্রতি আয় ${b} বা বেশি হলে ভালো, ${w}-এর কম হলে দুর্বল।`,
    };
  }
  const en = m.expect_en[m.expect_en.length - 1];
  if (!en) return null;
  return { en, bn: m.expect_bn[m.expect_bn.length - 1] || en };
}

const whenWords = (m: UpcomingResult): Bi =>
  m.days === 0 ? { en: "today", bn: "আজ" } : m.days === 1 ? { en: "tomorrow", bn: "আগামীকাল" } : dayShort(m.date);

type StarterRow = { href: string; title: string };
type Source = { slug: string; title: string; categoryId?: string };

/** The three beginner reads in the reader's language (was LearnCard's brand-new list). */
function pickStarters(posts: readonly Source[], guides: readonly Source[], lang: Lang): StarterRow[] {
  const starters = posts.filter((p) => p.categoryId === "getting-started").slice(0, 3);
  if (lang === "bn") return starters.map((p) => ({ href: `/blog/${p.slug}`, title: p.title }));
  const bySlug = new Map(guides.map((g) => [g.slug, g]));
  const paired = starters
    .map((p) => bySlug.get(BLOG_TO_LEARN[p.slug] ?? ""))
    .filter((g): g is Source => !!g);
  return (paired.length ? paired : guides.slice(0, 3)).map((g) => ({ href: `/learn/${g.slug}`, title: g.title }));
}

function readFlag(get: () => string | null): boolean {
  try {
    return !!get();
  } catch {
    return false;
  }
}

/**
 * The home page's ONE offer slot (2026-11-17, the bKash-style home). Every
 * promotion and nudge that used to stack on the home page shares it: the
 * reader's own ৳99 month (was `OfferBanner`), the Premium banner (was
 * `PremiumBanner`, same "Maybe later" / "Not interested" and the same admin
 * count), the install card and the "follow a share" setup step. Swipe only,
 * never moving by itself; the next slide peeks out so a reader sees there is
 * more, and dots under it say how many.
 *
 * What each reader sees first:
 * - every free reader: **the portfolio check** first (2026-11-18, user: "our
 *   most used premium feature"): with a portfolio, "We checked your 8 shares:
 *   grade C" and up to three counted findings (`lib/home-portfolio.ts`: weak
 *   companies, shares in a loss, too much in one place, too few shares — no
 *   names, no taka, no advice) → the portfolio page's Premium card; without
 *   one, "Get your portfolio checked every day" → add your shares;
 * - then, with shares: today's free pick from the Buy List (one slide that
 *   gives), what the watcher noticed on their shares this week (counts and
 *   kinds, never the meaning), one Premium pitch (the ৳99 month while it is
 *   open, else the Premium banner — never both), "turn on notifications";
 * - a Premium reader (2026-11-18, at most 5): today's 9 AM brief and "After
 *   the close" (what the watcher found on their shares at the last close;
 *   it leads once today's close is in), what to look for in their results
 *   this week, one research report's figure (a different report each day),
 *   one Premium tool they haven't used yet in their first month, then
 *   "turn on notifications" / "follow a share";
 * - a brand-new account, free or Premium: three beginner guides, then
 *   "follow a share" (a free reader gets the portfolio slide first).
 *
 * "Turn on notifications" replaced the floating `PushOptInPrompt` card on the
 * home page (it still floats on every other page): same rules, same keys — it
 * shows while the browser can still ask, "Turn on" asks once, "Not now"
 * snoozes it.
 */
export default function OfferSlot({
  lang,
  brandNew,
  hasWatchlist,
  hasPortfolio,
  week,
  brief,
  research,
  buyList,
  holdings,
  priceMap,
  resultsSoon,
  newResults,
  savedScreens,
}: {
  lang: Lang;
  brandNew: boolean;
  hasWatchlist: boolean;
  hasPortfolio: boolean;
  /** The main portfolio: null while unknown, [] once we know there is none. */
  holdings: PortfolioHolding[] | null;
  priceMap: Map<string, ScoreItem>;
  week: WeekWatch | null | undefined;
  brief: MorningBrief | null | undefined;
  research: ResearchSummary | null | undefined;
  /** The bundle's Buy List summary: its free pick of the day opens a free reader's slot. */
  buyList?: BuyListHome | null;
  /** Results meetings on the reader's shares (Premium: what to look for). */
  resultsSoon?: UpcomingResult[];
  /** Reports already out on the reader's shares: a meeting with one is done. */
  newResults?: LatestResultRow[];
  /** Saved screens: undefined while the bundle loads, null when unknown. */
  savedScreens?: ScreenerSaved[] | null;
}) {
  const bn = lang === "bn";
  const pick = (b: Bi) => (bn ? b.bn : b.en);
  const { user, isLoggedIn, isLoading } = useAuth();
  const { isPremium } = usePremium();
  const { canInstall, installed, ios, promptInstall } = useInstallPrompt();

  // Storage reads happen after mount, so the slot paints once with the right slides.
  const [ready, setReady] = useState(false);
  const [premHidden, setPremHidden] = useState(true);
  const [setupHidden, setSetupHidden] = useState(true);
  const [installHidden, setInstallHidden] = useState(true);
  const [rulesHidden, setRulesHidden] = useState(true);
  const [builderHidden, setBuilderHidden] = useState(true);
  // How many rules the reader has (null until read).
  const [ruleCount, setRuleCount] = useState<number | null>(null);
  const [isPhone, setIsPhone] = useState(false);
  const [offerClosed, setOfferClosed] = useState(false);
  const [starters, setStarters] = useState<StarterRow[]>([]);
  // "prompt": the browser can still ask; "ios": an iPhone that must add the site
  // to the home screen first; null: nothing to ask (or asked before).
  const [pushMode, setPushMode] = useState<"prompt" | "ios" | null>(null);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushFailed, setPushFailed] = useState(false);
  // Premium tips already tapped or skipped (null until read).
  const [tipsDone, setTipsDone] = useState<TipId[] | null>(null);
  const offerSeen = useRef(false);
  const todayIso = bstDateStr();

  const uid = user?.user_id ?? "";
  const offer = isLoggedIn && !isPremium ? user?.offer ?? null : null;
  // The Premium banner never shows with the ৳99 month, nor after it in the same visit.
  if (offer?.banner) offerSeen.current = true;

  useEffect(() => {
    try {
      const raw = uid ? localStorage.getItem(premKey(uid)) : null;
      const until = raw ? (JSON.parse(raw) as { until?: number }).until ?? 0 : 0;
      setPremHidden(until > Date.now());
    } catch {
      setPremHidden(false);
    }
    setSetupHidden(
      readFlag(() => (localStorage.getItem(SETUP_HIDE_KEY) === "1" ? "1" : null)) ||
        readFlag(() => (sessionStorage.getItem(SETUP_SKIP_KEY) === "1" ? "1" : null)),
    );
    setInstallHidden(readFlag(() => localStorage.getItem(INSTALL_KEY)));
    try {
      const at = Number(localStorage.getItem(RULES_KEY) || 0);
      setRulesHidden(at > 0 && Date.now() - at < RULES_SNOOZE_MS);
    } catch {
      setRulesHidden(false);
    }
    try {
      const at = Number(localStorage.getItem(BUILDER_KEY) || 0);
      setBuilderHidden(at > 0 && Date.now() - at < RULES_SNOOZE_MS);
    } catch {
      setBuilderHidden(false);
    }
    try {
      const raw = uid ? localStorage.getItem(tipsKey(uid)) : null;
      const list = raw ? (JSON.parse(raw) as unknown) : [];
      setTipsDone(Array.isArray(list) ? (list.filter((x) => typeof x === "string") as TipId[]) : []);
    } catch {
      setTipsDone([]);
    }
    // The same gate as the floating PushOptInPrompt.
    if (canShowPushPromptByHistory()) {
      if (isPushSupported() && getPermission() === "default") setPushMode("prompt");
      else if (isIOS() && !isStandalone()) setPushMode("ios");
    }
    const mq = window.matchMedia("(max-width: 639px)");
    const sync = () => setIsPhone(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    setReady(true);
    return () => mq.removeEventListener("change", sync);
  }, [uid]);

  useEffect(() => {
    if (!isLoggedIn) return;
    let alive = true;
    loadWatchRules().then((st) => alive && st && setRuleCount(st.rules.length));
    return () => {
      alive = false;
    };
  }, [isLoggedIn]);

  // The beginner reads carry every article body (~260 KB): load them only for
  // a brand-new account, on demand, like the old Learn card did.
  useEffect(() => {
    if (!brandNew) return;
    let alive = true;
    Promise.all([import("@/lib/blog-bn"), import("@/lib/guides")])
      .then(([{ BLOG_POSTS }, { GUIDES }]) => {
        if (alive) setStarters(pickStarters(BLOG_POSTS, GUIDES, lang));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [brandNew, lang]);

  // A free reader's portfolio check, counted from what the page already has.
  const freeReader = isLoggedIn && !isPremium;
  const glance = useMemo(
    () => (freeReader && holdings && holdings.length > 0 ? portfolioGlance(holdings, priceMap) : null),
    [freeReader, holdings, priceMap],
  );

  // ── The slides ─────────────────────────────────────────────────────────
  const eyebrow = (icon: ReactNode, text: string) => (
    <p className="hm-sl-eye">
      {icon}
      {text}
    </p>
  );

  // Free reader: the portfolio check first (the most used Premium feature).
  let portfolioSlide: Slide | null = null;
  const pfEyebrow = eyebrow(<IconCrown size={14} />, bn ? "প্রিমিয়াম · আপনার পোর্টফোলিও যাচাই" : "Premium · your portfolio check");
  if (freeReader && glance) {
    const n = glance.findings.length;
    const shares = glance.shares;
    portfolioSlide = {
      id: "portfolio",
      tone: "gold",
      onSeen: () => trackEvent("premium_lock_view", { area: "home", lock: "home-portfolio", findings: n }),
      node: (
        <>
          {pfEyebrow}
          <h3 className="hm-sl-title">
            {bn
              ? `আপনার ${shares}টি শেয়ার যাচাই করেছি: গ্রেড ${glance.grade}`
              : `We checked your ${shares} ${shares === 1 ? "share" : "shares"}: grade ${glance.grade}`}
          </h3>
          {n > 0 ? (
            <>
              <ul className="hm-sl-list">
                {glance.findings.map((f) => (
                  <li key={f.en}>
                    <IconAlert size={16} />
                    <span>{pick(f)}</span>
                  </li>
                ))}
              </ul>
              <p className="hm-sl-small">
                {bn
                  ? "কোন শেয়ার, কেন, আর প্রতিটির বেলায় কী করবেন, প্রিমিয়াম দেখায়।"
                  : "Premium shows you which shares, why, and what to do about each."}
              </p>
            </>
          ) : (
            <p className="hm-sl-body">
              {bn
                ? "এক নজরে চোখে পড়ার মতো কিছু নেই। পুরো যাচাই প্রতিটি শেয়ার দেখে বলে কোনটা রাখবেন, কোনটা ঠিক করবেন।"
                : "Nothing stands out at a glance. The full check goes through every share and tells you what to keep and what to fix."}
            </p>
          )}
          <div className="hm-sl-acts">
            <Button
              href="/portfolio?src=home-portfolio#pf-premium"
              onClick={() => trackEvent("premium_lock_tap", { area: "home", lock: "home-portfolio", findings: n })}
            >
              {bn ? "পুরো যাচাই দেখুন" : "See my full check"}
            </Button>
          </div>
        </>
      ),
    };
  } else if (freeReader && holdings && holdings.length === 0) {
    portfolioSlide = {
      id: "portfolio",
      tone: "gold",
      onSeen: () => trackEvent("premium_lock_view", { area: "home", lock: "home-portfolio-add" }),
      node: (
        <>
          {pfEyebrow}
          <h3 className="hm-sl-title">
            {bn ? "প্রতিদিন আপনার পোর্টফোলিও যাচাই করান" : "Get your portfolio checked every day"}
          </h3>
          <p className="hm-sl-body">
            {bn
              ? "আপনার শেয়ারগুলো যোগ করুন। পোর্টফোলিওর গ্রেড ফ্রি, আর কোন শেয়ার রাখবেন, ঠিক করবেন বা বদলাবেন, প্রিমিয়াম বলে।"
              : "Add the shares you own. The grade is free, and Premium tells you which shares to keep, fix or switch."}
          </p>
          <div className="hm-sl-acts">
            <Button
              href="/portfolio?src=home-portfolio"
              onClick={() => trackEvent("premium_lock_tap", { area: "home", lock: "home-portfolio-add" })}
            >
              {bn ? "আপনার শেয়ার যোগ করুন" : "Add your shares"}
            </Button>
          </div>
        </>
      ),
    };
  }

  // Free reader with shares: what the watcher noticed this week.
  let weekSlide: Slide | null = null;
  if (!isPremium && !brandNew && week && week.total > 0) {
    const kinds = week.kinds.filter((k) => WATCH_WORDS[k.kind]).slice(0, 3);
    const chip = (k: { kind: PortfolioWatchEvent["kind"]; count: number }) => {
      const w = WATCH_WORDS[k.kind];
      return bn ? `${k.count}টি ${w.bn}` : `${k.count} ${w.en[k.count === 1 ? 0 : 1]}`;
    };
    const shares = week.codes.length;
    weekSlide = {
      id: "week",
      tone: "gold",
      onSeen: () => trackEvent("premium_lock_view", { area: "home", lock: "home-week" }),
      node: (
        <>
          {eyebrow(<IconCrown size={14} />, bn ? "প্রিমিয়াম · আপনার শেয়ারে" : "Premium · on your shares")}
          <h3 className="hm-sl-title">
            {bn
              ? `এই সপ্তাহে আপনার ${shares}টি শেয়ারে ${week.total}টি বিষয় চোখে পড়েছে`
              : `This week we noticed ${week.total} ${week.total === 1 ? "thing" : "things"} on ${shares} of your shares`}
          </h3>
          {kinds.length > 0 && (
            <p className="hm-chips">
              {kinds.map((k) => (
                <span key={k.kind} className="hm-chip">
                  {chip(k)}
                </span>
              ))}
            </p>
          )}
          <p className="hm-sl-body">
            {bn
              ? "প্রিমিয়াম একই দিনে জানায়, সাথে প্রতিটির মানে কী।"
              : "Premium tells you the same day, and what each one means."}
          </p>
          <div className="hm-sl-acts">
            <Button
              href="/premium?src=home-week"
              onClick={() => {
                trackEvent("premium_lock_tap", { area: "home", lock: "home-week" });
                savePremiumContext({
                  from: "home",
                  label: bn ? "আপনার শেয়ারে এই সপ্তাহের খবর" : "What we noticed on your shares this week",
                  stakes: kinds.map(chip),
                });
              }}
            >
              {bn ? "প্রিমিয়াম দেখুন" : "See Premium"}
            </Button>
          </div>
        </>
      ),
    };
  }

  // The reader's own ৳99 month.
  const dismissOffer = (action: "never" | "later") => {
    setOfferClosed(true);
    trackEvent("offer_banner_tap", { action, who: "free", where: "slot" });
    apiDismissOffer(action)
      .then(({ user: fresh }) => {
        setStoredUser(fresh);
        window.dispatchEvent(new CustomEvent(AUTH_USER_UPDATED_EVENT));
      })
      .catch(() => {});
  };
  let offerSlide: Slide | null = null;
  if (!isLoading && offer?.banner && !offerClosed) {
    const amount = offer.amount ?? OWN_OFFER_PLAN.amount;
    const was = offer.list_amount ?? OWN_OFFER_PLAN.listAmount ?? 199;
    offerSlide = {
      id: "offer",
      tone: "clay",
      onSeen: () => trackEvent("offer_banner_view", { who: "free", where: "slot" }),
      node: (
        <>
          {eyebrow(<IconGift size={14} />, bn ? "শুধু আপনার জন্য অফার" : "Your own offer")}
          <h3 className="hm-sl-title">{bn ? `এক মাসের প্রিমিয়াম ৳${amount}-এ` : `One month of Premium for ৳${amount}`}</h3>
          <p className="hm-sl-price">
            <b className="nums">৳{amount}</b>
            <s className="nums">
              <span className="sr-only">{bn ? "আগের দাম " : "Regular price "}</span>৳{was}
            </s>
          </p>
          <p className="hm-sl-body">
            {bn ? "প্রতি অ্যাকাউন্টে একবার। নিজে থেকে নবায়ন হয় না।" : "Once per account. Nothing renews by itself."}
          </p>
          <div className="hm-sl-acts">
            <Button
              href="/premium?plan=offer&src=offer-banner#pay"
              onClick={() => trackEvent("offer_banner_tap", { action: "pay", who: "free", where: "slot" })}
            >
              {bn ? `৳${amount} দিয়ে শুরু করুন` : `Start for ৳${amount}`}
            </Button>
            <button type="button" className="hm-sl-link" onClick={() => dismissOffer("later")}>
              {bn ? "পরে মনে করিয়ে দিন" : "Remind me later"}
            </button>
            <button type="button" className="hm-sl-link" onClick={() => dismissOffer("never")}>
              {bn ? "আগ্রহ নেই" : "Not interested"}
            </button>
          </div>
        </>
      ),
    };
  }

  // The Premium banner, as a slide (same keys, same admin count).
  const premTap = (action: Exclude<PremiumBannerAction, "view">) => {
    trackEvent("premium_banner_tap", { action, where: "home" });
    apiPremiumBannerEvent(action);
  };
  const closePrem = (how: "later" | "never") => {
    premTap(how);
    const days = how === "never" ? PREM_NEVER_DAYS : PREM_LATER_DAYS;
    try {
      localStorage.setItem(premKey(uid), JSON.stringify({ until: Date.now() + days * DAY_MS, how }));
    } catch {}
    setPremHidden(true);
    if (how === "never") {
      toast({
        message: bn ? "ঠিক আছে। আগামী দুই মাস এটি আর দেখাব না।" : "Okay. We won't show this for the next two months.",
      });
    }
  };
  let premSlide: Slide | null = null;
  if (!isLoading && isLoggedIn && uid && !isPremium && !user?.is_admin && !offerSeen.current && !premHidden) {
    const perMonth = Math.round(YEAR.amount / 12);
    const ticks: Bi[] = [
      { en: "Full analysis of every share", bn: "প্রতিটি শেয়ারের পুরো বিশ্লেষণ" },
      { en: "Today's Buy List", bn: "আজকের কেনার তালিকা" },
      { en: "Your portfolio checked every day", bn: "প্রতিদিন আপনার পোর্টফোলিও যাচাই" },
    ];
    premSlide = {
      id: "premium",
      tone: "gold",
      onSeen: () => {
        trackEvent("premium_banner_view", { where: "home" });
        apiPremiumBannerEvent("view");
      },
      node: (
        <>
          {eyebrow(<IconCrown size={14} />, bn ? "TopStockBD প্রিমিয়াম" : "TopStockBD Premium")}
          <h3 className="hm-sl-title">
            {bn ? "কোন শেয়ার কিনবেন, কোনটা রাখবেন, জেনে নিন।" : "Know which shares to buy, and which to keep."}
          </h3>
          <ul className="hm-sl-list">
            {ticks.map((x) => (
              <li key={x.en}>
                <IconCheck size={16} />
                <span>{pick(x)}</span>
              </li>
            ))}
          </ul>
          <p className="hm-sl-small">
            {bn
              ? `মাসে প্রায় ৳${perMonth} থেকে। নিজে থেকে নবায়ন হয় না। `
              : `From about ৳${perMonth} a month. Nothing renews by itself. `}
            <Link href="/premium?src=home-banner" className="hm-sl-inline" onClick={() => premTap("more")}>
              {bn ? "প্রিমিয়ামে কী কী আছে দেখুন" : "See everything in Premium"}
            </Link>
          </p>
          <div className="hm-sl-acts">
            <Button href="/premium?plan=yearly&src=home-banner#pay" onClick={() => premTap("pay")}>
              {bn ? "প্রিমিয়াম নিন" : "Get Premium"}
            </Button>
            <button type="button" className="hm-sl-link" onClick={() => closePrem("later")}>
              {bn ? "পরে দেখব" : "Maybe later"}
            </button>
            <button type="button" className="hm-sl-link" onClick={() => closePrem("never")}>
              {bn ? "প্রিমিয়াম চাই না" : "Not interested"}
            </button>
          </div>
        </>
      ),
    };
  }

  // Premium reader: today's 9 AM brief (never an older day's).
  let briefSlide: Slide | null = null;
  const briefItems = isPremium && brief?.day === todayIso ? brief.items ?? [] : [];
  if (briefItems.length > 0) {
    const n = briefItems.length;
    briefSlide = {
      id: "brief",
      tone: "clay",
      node: (
        <>
          {eyebrow(<IconSun size={14} />, bn ? "বাজার খোলার আগে · সকাল 9টা" : "Before the bell · 9 AM")}
          <h3 className="hm-sl-title">
            {bn ? `আজ আপনার শেয়ারে ${n}টি বিষয়` : `${n} ${n === 1 ? "thing" : "things"} on your shares today`}
          </h3>
          <ul className="hm-sl-list">
            {briefItems.slice(0, 3).map((it, i) => (
              <li key={`${it.kind}-${it.code ?? i}`}>
                <span className="hm-sl-num nums" aria-hidden>
                  {i + 1}
                </span>
                <Link href={it.url} className="hm-sl-inline">
                  {bn ? it.title_bn : it.title_en}
                </Link>
              </li>
            ))}
          </ul>
          {n > 3 && (
            <div className="hm-sl-acts">
              <Button href="/notifications" variant="quiet">
                {bn ? `সব ${n}টি দেখুন` : `See all ${n}`}
              </Button>
            </div>
          )}
        </>
      ),
    };
  }

  // Premium reader: what the watcher found on their shares at the last close
  // (the evening twin of the brief, and of the "After the close" push).
  let afterSlide: Slide | null = null;
  let afterToday = false;
  if (isPremium && week?.items?.length) {
    const items = week.items.filter((e) => !AFTER_CLOSE_SKIP.has(e.kind) && /^\d{4}-\d{2}-\d{2}/.test(e.day ?? ""));
    const latest = items.reduce((m, e) => (e.day.slice(0, 10) > m ? e.day.slice(0, 10) : m), "");
    const age = latest ? isoDays(todayIso, latest) : Infinity;
    if (latest && age >= 0 && age <= AFTER_CLOSE_DAYS) {
      // Already worst first.
      const rows = items.filter((e) => e.day.slice(0, 10) === latest);
      const n = rows.length;
      const when = dayShort(latest);
      afterToday = age === 0;
      afterSlide = {
        id: "after-close",
        tone: "clay",
        node: (
          <>
            {eyebrow(
              <IconMoon size={14} />,
              afterToday
                ? bn
                  ? "আজ বাজার বন্ধের পর"
                  : "After today's close"
                : bn
                  ? `বাজার বন্ধের পর · ${when.bn}`
                  : `After the close · ${when.en}`,
            )}
            <h3 className="hm-sl-title">
              {bn ? `আপনার শেয়ারে ${n}টি বিষয়` : `${n} ${n === 1 ? "thing" : "things"} on your shares`}
            </h3>
            <ul className="hm-sl-list">
              {rows.slice(0, 3).map((e) => (
                <li key={e.id}>
                  <span className={`hm-sl-lvl hm-sl-lvl--${e.level}`} aria-hidden />
                  <Link
                    href={`/stock/${encodeURIComponent(e.code)}${WATCH_ANCHOR[e.kind] ?? ""}`}
                    className="hm-sl-inline"
                  >
                    {bn ? e.title_bn : e.title_en}
                  </Link>
                </li>
              ))}
            </ul>
            {n > 3 && (
              <div className="hm-sl-acts">
                <Button href="/notifications" variant="quiet">
                  {bn ? `সব ${n}টি দেখুন` : `See all ${n}`}
                </Button>
              </div>
            )}
          </>
        ),
      };
    }
  }

  // Premium reader: what to look for in this week's results on their shares.
  let resultsSlide: Slide | null = null;
  if (isPremium && resultsSoon?.length) {
    const out = (m: UpcomingResult) =>
      (newResults ?? []).some((r) => r.code.toUpperCase() === m.code.toUpperCase() && r.post_date >= m.date);
    const rows = resultsSoon
      .filter((m) => m.days >= 0 && m.days <= RESULTS_DAYS && !out(m))
      .map((m) => ({ m, line: lookFor(m) }))
      .filter((x): x is { m: UpcomingResult; line: Bi } => x.line !== null)
      .sort((a, b) => a.m.days - b.m.days);
    const n = rows.length;
    if (n > 0) {
      resultsSlide = {
        id: "results",
        tone: "plain",
        node: (
          <>
            {eyebrow(
              <IconCalendar size={14} />,
              bn ? `ফল আসছে · আপনার ${n}টি শেয়ার` : `Results coming · ${n} of your shares`,
            )}
            <h3 className="hm-sl-title">
              {n === 1
                ? bn
                  ? `${rows[0].m.code}-এর ফলে কী দেখবেন`
                  : `What to look for in ${rows[0].m.code}'s results`
                : bn
                  ? "এ সপ্তাহের ফলে কী দেখবেন"
                  : "What to look for in this week's results"}
            </h3>
            <ul className="hm-sl-list">
              {rows.slice(0, 3).map(({ m, line }) => (
                <li key={`${m.code}-${m.date}`}>
                  <IconCalendar size={16} />
                  <span className="hm-sl-two">
                    <span>
                      <Link href={`/stock/${encodeURIComponent(m.code)}`} className="hm-sl-inline">
                        {m.code}
                      </Link>
                      {` · ${pick(whenWords(m))} · ${bn ? m.label_bn : m.label_en}`}
                    </span>
                    <span className="hm-sl-small">{pick(line)}</span>
                  </span>
                </li>
              ))}
            </ul>
            <div className="hm-sl-acts">
              <Button href="/dividend-calendar#results-meetings" variant="quiet">
                {n > 3 ? (bn ? `সব ${n}টি দেখুন` : `See all ${n}`) : bn ? "যেসব ফল আসছে" : "All results coming up"}
              </Button>
            </div>
          </>
        ),
      };
    }
  }

  // Premium reader: one research report's figure, a different report each day.
  let researchSlide: Slide | null = null;
  if (isPremium && research) {
    const first = Math.max(0, isoDays(todayIso, "2026-01-01")) % REPORTS.length;
    for (let k = 0; k < REPORTS.length; k++) {
      const def = REPORTS[(first + k) % REPORTS.length];
      const stat = reportStat(def.slug, research);
      if (!stat) continue;
      researchSlide = {
        id: "research",
        tone: "plain",
        node: (
          <>
            {eyebrow(<IconBook size={14} />, bn ? "প্রিমিয়াম গবেষণা" : "Premium research")}
            <h3 className="hm-sl-title">{pick(def.title)}</h3>
            <p className="hm-sl-small">{pick(def.question)}</p>
            <p className="hm-sl-body">
              <b className="nums">{pick(stat.value)}</b> {pick(stat.label)}
            </p>
            <div className="hm-sl-acts">
              <Button href={`/stock-insights/${def.slug}`}>{bn ? "রিপোর্ট পড়ুন" : "Read the report"}</Button>
            </div>
          </>
        ),
      };
      break;
    }
  }

  // Premium reader, first month: one tool they haven't used yet. Tapping it
  // or skipping it moves on to the next tip on the next visit.
  let tipSlide: Slide | null = null;
  if (isPremium && tipsDone && savedScreens !== undefined && inFirstMonth(user)) {
    const tip = TIPS.find(
      (t) => !tipsDone.includes(t.id) && !(t.id === "screen" && (savedScreens === null || savedScreens.length > 0)),
    );
    if (tip) {
      const doneTip = (action: "open" | "skip") => {
        trackEvent("premium_tip_tap", { tip: tip.id, action });
        const next = [...tipsDone, tip.id];
        setTipsDone(next);
        try {
          localStorage.setItem(tipsKey(uid), JSON.stringify(next));
        } catch {}
      };
      tipSlide = {
        id: "tip",
        tone: "plain",
        onSeen: () => trackEvent("premium_tip_view", { tip: tip.id }),
        node: (
          <>
            {eyebrow(<IconBulb size={14} />, bn ? "প্রিমিয়ামের আরও সুবিধা" : "Get more from Premium")}
            <h3 className="hm-sl-title">{pick(tip.title)}</h3>
            <p className="hm-sl-body">{pick(tip.body)}</p>
            <div className="hm-sl-acts">
              <Button href={tip.href} onClick={() => doneTip("open")}>
                <tip.Icon size={16} />
                {pick(tip.cta)}
              </Button>
              <button type="button" className="hm-sl-link" onClick={() => doneTip("skip")}>
                {bn ? "এটা বাদ দিন" : "Skip this tip"}
              </button>
            </div>
          </>
        ),
      };
    }
  }

  // Brand-new account: three beginner reads.
  let startSlide: Slide | null = null;
  if (brandNew && starters.length > 0) {
    startSlide = {
      id: "start",
      tone: "clay",
      node: (
        <>
          {eyebrow(<IconCap size={14} />, bn ? "শেয়ারে নতুন?" : "New to shares?")}
          <h3 className="hm-sl-title">{bn ? "তিনটি ছোট লেখা দিয়ে শুরু করুন" : "Start with three short guides"}</h3>
          <ul className="hm-sl-list">
            {starters.map((r, i) => (
              <li key={r.href}>
                <span className="hm-sl-num nums" aria-hidden>
                  {i + 1}
                </span>
                <Link href={r.href} className="hm-sl-inline">
                  {r.title}
                </Link>
              </li>
            ))}
          </ul>
          <div className="hm-sl-acts">
            <Button href={bn ? "/blog" : "/learn"} variant="quiet">
              {bn ? "সব লেখা" : "All guides"}
            </Button>
          </div>
        </>
      ),
    };
  }

  // No watchlist yet: follow a share (was the setup card).
  let setupSlide: Slide | null = null;
  if (!hasWatchlist && !setupHidden) {
    setupSlide = {
      id: "setup",
      tone: "plain",
      node: (
        <>
          {eyebrow(<IconStar size={14} />, bn ? "প্রথম ধাপ" : "Your first step")}
          <h3 className="hm-sl-title">{bn ? "পছন্দের একটি শেয়ার ফলো করুন" : "Follow a share you care about"}</h3>
          <p className="hm-sl-body">
            {bn
              ? "এতে কিছু বদলালে আমরা জানাব: আর্থিক ফল, ডিভিডেন্ড, সতর্কতা।"
              : "We tell you when something changes on it: results, dividends, warnings."}
          </p>
          <div className="hm-sl-acts">
            <Button href="/watchlist">{bn ? "শেয়ার ফলো করুন" : "Follow a share"}</Button>
            {!hasPortfolio && !portfolioSlide && (
              <Button href="/portfolio" variant="quiet">
                {bn ? "পোর্টফোলিও যোগ করুন" : "Add my portfolio"}
              </Button>
            )}
            <button
              type="button"
              className="hm-sl-link"
              onClick={() => {
                try {
                  sessionStorage.setItem(SETUP_SKIP_KEY, "1");
                } catch {}
                setSetupHidden(true);
              }}
            >
              {bn ? "এখন না" : "Not now"}
            </button>
          </div>
        </>
      ),
    };
  }

  // A reader with shares and no watch rules: say the feature exists.
  let rulesSlide: Slide | null = null;
  if (ruleCount === 0 && !rulesHidden && (hasWatchlist || hasPortfolio)) {
    rulesSlide = {
      id: "rules",
      tone: "plain",
      onSeen: () => trackEvent("watch_rules_slide_view", { premium: isPremium ? 1 : 0 }),
      node: (
        <>
          {eyebrow(<IconEye size={14} />, bn ? "নজরের নিয়ম" : "Watch rules")}
          <h3 className="hm-sl-title">
            {bn ? "আপনার শেয়ার নিয়ে কী জানাব, আপনি বেছে নিন" : "Choose what we tell you about your shares"}
          </h3>
          <p className="hm-sl-body">
            {isPremium
              ? bn
                ? "গ্রেড নামলে, আর্থিক ফল এলে, ডিভিডেন্ড ঘোষণা হলে বা দাম বেশি পড়লে, সেদিন সন্ধ্যায়ই জানাই।"
                : "Its grade drops, results come out, a dividend is declared, a big fall: we tell you the same evening."
              : bn
                ? `গ্রেড নামলে, আর্থিক ফল এলে, ডিভিডেন্ড ঘোষণা হলে বা দাম বেশি পড়লে জানাই। ${FREE_LIMITS.alerts ?? 3}টি নিয়ম ফ্রি।`
                : `Its grade drops, results come out, a dividend is declared, a big fall: we tell you. ${FREE_LIMITS.alerts ?? 3} rules are free.`}
          </p>
          <div className="hm-sl-acts">
            <Button href="/watch-rules?src=home" onClick={() => trackEvent("watch_rules_prompt_tap", { from: "home-slide" })}>
              {bn ? "নিয়ম বেছে নিন" : "Set my rules"}
            </Button>
            <button
              type="button"
              className="hm-sl-link"
              onClick={() => {
                try {
                  localStorage.setItem(RULES_KEY, String(Date.now()));
                } catch {}
                setRulesHidden(true);
              }}
            >
              {bn ? "এখন না" : "Not now"}
            </button>
          </div>
        </>
      ),
    };
  }

  // The portfolio builder (2026-11-23), one card for every reader, worded for
  // where they are: no shares yet → build a portfolio; shares and a plan they
  // can still build → plan the new money ("start from my shares"); a plan
  // already built that they can't rebuild for free → their plan, watched
  // after every close. The first plan is free.
  let builderSlide: Slide | null = null;
  const builderBuilt = !!user?.builder?.free_used;
  const builderCanBuild = isPremium || !builderBuilt;
  const builderKind: "fresh" | "mine" | "plan" | null = builderHidden
    ? null
    : hasPortfolio && builderCanBuild
      ? "mine"
      : !hasPortfolio && !builderBuilt
        ? "fresh"
        : builderBuilt
          ? "plan"
          : null;
  if (builderKind) {
    const free = !isPremium && !builderBuilt;
    const copy = {
      fresh: {
        title: bn ? "বিনিয়োগের টাকা আছে?" : "Have money to invest?",
        body: bn
          ? `তিনটি প্রশ্নের উত্তর দিন, আমরা শক্তিশালী কোম্পানি দিয়ে পুরো পোর্টফোলিও বানিয়ে দেব: কোন শেয়ার, কতটি করে।${free ? " প্রথমটি ফ্রি।" : ""}`
          : `Answer three questions and we build a whole portfolio from strong companies: which shares, how many of each.${free ? " Your first plan is free." : ""}`,
        cta: bn ? "পোর্টফোলিও বানান" : "Build my portfolio",
        href: "/portfolio-builder?src=home",
      },
      mine: {
        title: bn ? "নতুন টাকা যোগ করবেন?" : "Have new money to add?",
        body: bn
          ? `কত টাকা বলুন, আমরা তা শক্তিশালী কোম্পানিতে ভাগ করে দেব, আপনার শেয়ার দেখে, যাতে কোনো শেয়ার বা ব্যবসা বেশি বড় না হয়।${free ? " প্রথম পরিকল্পনা ফ্রি।" : ""}`
          : `Tell us how much, and we split it across strong companies with your shares in mind, so no share or business gets too big.${free ? " Your first plan is free." : ""}`,
        cta: bn ? "নতুন টাকার পরিকল্পনা" : "Plan my new money",
        href: "/portfolio-builder?start=mine&src=home",
      },
      plan: {
        title: bn ? "আপনার পোর্টফোলিও পরিকল্পনা" : "Your portfolio plan",
        body: bn
          ? "প্রতিদিন বাজার বন্ধের পর আমরা পরিকল্পনার শেয়ারগুলো দেখি, আর কোনোটি কেনার দামে এলে বা বদলালে জানাই।"
          : "We check the shares in your plan after every close, and tell you when one reaches its price or something changes.",
        cta: bn ? "আমার পরিকল্পনা দেখুন" : "See my plan",
        href: "/portfolio-builder?src=home",
      },
    }[builderKind];
    builderSlide = {
      id: "builder",
      tone: "plain",
      onSeen: () => trackEvent("builder_slide_view", { premium: isPremium ? 1 : 0, kind: builderKind }),
      node: (
        <>
          {eyebrow(<IconBlocks size={14} />, bn ? "পোর্টফোলিও বানান" : "Portfolio builder")}
          <h3 className="hm-sl-title">{copy.title}</h3>
          <p className="hm-sl-body">{copy.body}</p>
          <div className="hm-sl-acts">
            <Button href={copy.href} onClick={() => trackEvent("builder_slide_tap", { premium: isPremium ? 1 : 0, kind: builderKind })}>
              {copy.cta}
            </Button>
            <button
              type="button"
              className="hm-sl-link"
              onClick={() => {
                try {
                  localStorage.setItem(BUILDER_KEY, String(Date.now()));
                } catch {}
                setBuilderHidden(true);
              }}
            >
              {bn ? "এখন না" : "Not now"}
            </button>
          </div>
        </>
      ),
    };
  }

  // Phones that can install the app (desktop has the navbar's Install button).
  let installSlide: Slide | null = null;
  if (isPhone && !installed && (canInstall || ios) && !installHidden) {
    const hideInstall = () => {
      setInstallHidden(true);
      try {
        localStorage.setItem(INSTALL_KEY, String(Date.now()));
      } catch {}
    };
    installSlide = {
      id: "install",
      tone: "plain",
      node: (
        <>
          {eyebrow(<IconDownload size={14} />, bn ? "অ্যাপ" : "App")}
          <h3 className="hm-sl-title">{bn ? "হোম স্ক্রিনে TopStockBD রাখুন" : "Put TopStockBD on your home screen"}</h3>
          <p className="hm-sl-body">{bn ? "অন্য অ্যাপের মতো এক ট্যাপে খোলে।" : "It opens in one tap, like any app."}</p>
          <div className="hm-sl-acts">
            <Button
              onClick={async () => {
                if (canInstall) {
                  const outcome = await promptInstall();
                  if (outcome === "accepted") hideInstall();
                } else {
                  showInstallBanner();
                }
              }}
            >
              {bn ? "ইনস্টল করুন" : "Install"}
            </Button>
            <button type="button" className="hm-sl-link" onClick={hideInstall}>
              {bn ? "এখন না" : "Not now"}
            </button>
          </div>
        </>
      ),
    };
  }

  // Free reader: today's free pick from the Buy List — the same share the
  // Buy List page opens for free, so the slot gives before it sells.
  let pickSlide: Slide | null = null;
  const freePick = !isPremium ? buyList?.free_pick ?? null : null;
  if (freePick && buyList) {
    const total = buyList.count;
    pickSlide = {
      id: "pick",
      tone: "clay",
      onSeen: () => trackEvent("home_free_pick_view", { code: freePick.code }),
      node: (
        <>
          {eyebrow(<IconClipboardCheck size={14} />, bn ? "আজ ফ্রি, কেনার তালিকা থেকে" : "Free today, from the Buy List")}
          <h3 className="hm-sl-title">
            {bn
              ? `আজকের কেনার তালিকার ${total}টির মধ্যে ${freePick.code} ${freePick.rank} নম্বরে`
              : `${freePick.code} is No. ${freePick.rank} of ${total} on today's Buy List`}
          </h3>
          {(freePick.why?.en || freePick.why?.bn) && <p className="hm-sl-body">{pick(freePick.why)}</p>}
          <div className="hm-sl-acts">
            <Button
              href={`/buy-list?src=home-pick#${BUY_LIST_ANCHOR}`}
              onClick={() => trackEvent("home_free_pick_tap", { code: freePick.code })}
            >
              {bn ? "কেন, পড়ুন" : "Read why"}
            </Button>
          </div>
        </>
      ),
    };
  }

  // Turn on notifications (replaced the floating card on this page).
  const hidePush = () => {
    snoozePushPrompt();
    setPushMode(null);
  };
  const enablePush = async () => {
    setPushBusy(true);
    setPushFailed(false);
    const ok = await subscribeToPush();
    setPushBusy(false);
    trackEvent("push_slide_tap", { ok: ok ? 1 : 0 });
    if (ok) {
      dismissPushPromptForever();
      setPushMode(null);
      toast({ message: bn ? "নোটিফিকেশন চালু হয়েছে।" : "Notifications are on." });
    } else {
      // Keep the slide so the reader can retry (a blocked browser, a failed save).
      setPushFailed(true);
    }
  };
  let pushSlide: Slide | null = null;
  if (pushMode && isLoggedIn && (hasWatchlist || hasPortfolio)) {
    pushSlide = {
      id: "push",
      tone: "plain",
      onSeen: () => trackEvent("push_slide_view", { mode: pushMode }),
      node:
        pushMode === "ios" ? (
          <>
            {eyebrow(<IconBell size={14} />, bn ? "নোটিফিকেশন" : "Notifications")}
            <h3 className="hm-sl-title">{bn ? "আইফোনে নোটিফিকেশন পান" : "Get notifications on your iPhone"}</h3>
            <p className="hm-sl-body">
              {bn
                ? "Share, তারপর Add to Home Screen চাপুন। এরপর সেখান থেকে TopStockBD খুলে নোটিফিকেশন চালু করুন।"
                : "Tap Share, then Add to Home Screen, and open TopStockBD from there. Then you can turn them on."}
            </p>
            <div className="hm-sl-acts">
              <button type="button" className="hm-sl-link" onClick={hidePush}>
                {bn ? "বুঝেছি" : "Got it"}
              </button>
            </div>
          </>
        ) : (
          <>
            {eyebrow(<IconBell size={14} />, bn ? "এই ফোনে নোটিফিকেশন বন্ধ" : "Notifications are off on this phone")}
            <h3 className="hm-sl-title">{bn ? "আপনার শেয়ারের নোটিফিকেশন চালু করুন" : "Turn on notifications for your shares"}</h3>
            <p className="hm-sl-body">
              {bn
                ? "আপনার প্রাইস অ্যালার্ট, ডিভিডেন্ড আর শেয়ারে কী বদলাল, এই ফোনেই। চাইলে যেকোনো সময় বন্ধ করতে পারবেন।"
                : "Your price alerts, dividends and what changed on your shares, on this phone. You can turn them off any time."}
            </p>
            {pushFailed && (
              <p className="hm-sl-small text-negative">
                {bn
                  ? "চালু করা যায়নি। ব্রাউজার আটকে দিলে এই সাইটের নোটিফিকেশন চালু করে আবার চেষ্টা করুন।"
                  : "We couldn't turn them on. If your browser blocked them, allow notifications for this site and try again."}
              </p>
            )}
            <div className="hm-sl-acts">
              <Button onClick={enablePush} disabled={pushBusy}>
                {pushBusy
                  ? bn
                    ? "চালু হচ্ছে…"
                    : "Turning on…"
                  : pushFailed
                    ? bn
                      ? "আবার চেষ্টা করুন"
                      : "Try again"
                    : bn
                      ? "চালু করুন"
                      : "Turn on"}
              </Button>
              <button type="button" className="hm-sl-link" onClick={hidePush} disabled={pushBusy}>
                {bn ? "এখন না" : "Not now"}
              </button>
            </div>
          </>
        ),
    };
  }

  const pitch = offerSlide ?? premSlide;
  // A member's day: the 9 AM brief leads until today's close is in, then the
  // after-close note does.
  const lead = afterToday ? [afterSlide, briefSlide] : [briefSlide, afterSlide];
  const order: (Slide | null)[] = isPremium
    ? brandNew
      ? [...lead, startSlide, builderSlide, setupSlide, rulesSlide, tipSlide, researchSlide, pushSlide, installSlide]
      : [...lead, resultsSlide, rulesSlide, builderSlide, researchSlide, tipSlide, pushSlide, setupSlide, installSlide]
    : brandNew
      ? [portfolioSlide, builderSlide, startSlide, setupSlide, rulesSlide, pickSlide, pitch, installSlide]
      : [portfolioSlide, pickSlide, builderSlide, weekSlide, rulesSlide, pitch, pushSlide, setupSlide, installSlide];
  // A free reader's first slide depends on the portfolio: wait until it is
  // known, so the portfolio slide never pops in ahead of the others.
  const waiting = freeReader && holdings === null;
  const slides =
    ready && !waiting
      ? order.filter((s): s is Slide => s !== null).slice(0, isPremium ? MAX_PREMIUM_SLIDES : undefined)
      : [];

  return <Carousel slides={slides} lang={lang} />;
}
