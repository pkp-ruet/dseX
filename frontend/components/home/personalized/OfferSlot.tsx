"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Button from "@/components/ui/Button";
import Link from "@/components/ui/Link";
import type { Lang } from "@/context/LangContext";
import { useAuth } from "@/context/AuthContext";
import { usePremium } from "@/lib/premium";
import {
  apiDismissOffer,
  apiPremiumBannerEvent,
  type MorningBrief,
  type PortfolioWatchEvent,
  type PremiumBannerAction,
  type WeekWatch,
} from "@/lib/api";
import { AUTH_USER_UPDATED_EVENT, setStoredUser } from "@/lib/auth";
import { OWN_OFFER_PLAN, PAID_PLANS } from "@/lib/premium-plans";
import { REPORTS, reportStat, type ReportSlug, type ResearchSummary } from "@/lib/research-reports";
import { useInstallPrompt, showInstallBanner } from "@/lib/install";
import { BLOG_TO_LEARN } from "@/lib/i18n-pairs";
import { savePremiumContext } from "@/lib/premium-context";
import { toast } from "@/lib/toast";
import { trackEvent } from "@/lib/track";
import {
  IconBook,
  IconCap,
  IconCheck,
  IconChevronRight,
  IconCrown,
  IconDownload,
  IconGift,
  IconStar,
  IconSun,
} from "@/components/ui/icons";

type Bi = { en: string; bn: string };
type Tone = "gold" | "clay" | "plain";

interface Slide {
  id: string;
  tone: Tone;
  node: ReactNode;
  /** Fired once, the first time at least 60% of the slide is on screen. */
  onSeen?: () => void;
}

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

/** The research report a Premium reader's slide shows: the first with today's figure. */
const RESEARCH_ORDER: ReportSlug[] = ["results-season", "risk-register", "dividends-you-can-count-on"];

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
 * - a free reader with shares: what the watcher noticed on their shares this
 *   week (counts and kinds, never the meaning), then one Premium pitch (the
 *   ৳99 month while it is open, else the Premium banner — never both);
 * - a Premium reader: today's 9 AM brief, then one research report's figure;
 * - a brand-new account: three beginner guides, then "follow a share".
 */
export default function OfferSlot({
  lang,
  brandNew,
  hasWatchlist,
  hasPortfolio,
  week,
  brief,
  research,
}: {
  lang: Lang;
  brandNew: boolean;
  hasWatchlist: boolean;
  hasPortfolio: boolean;
  week: WeekWatch | null | undefined;
  brief: MorningBrief | null | undefined;
  research: ResearchSummary | null | undefined;
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
  const [isPhone, setIsPhone] = useState(false);
  const [offerClosed, setOfferClosed] = useState(false);
  const [starters, setStarters] = useState<StarterRow[]>([]);
  const offerSeen = useRef(false);

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
    const mq = window.matchMedia("(max-width: 639px)");
    const sync = () => setIsPhone(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    setReady(true);
    return () => mq.removeEventListener("change", sync);
  }, [uid]);

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

  // ── The slides ─────────────────────────────────────────────────────────
  const eyebrow = (icon: ReactNode, text: string) => (
    <p className="hm-sl-eye">
      {icon}
      {text}
    </p>
  );

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

  // Premium reader: today's 9 AM brief.
  let briefSlide: Slide | null = null;
  const briefItems = isPremium ? brief?.items ?? [] : [];
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

  // Premium reader: one research report's figure.
  let researchSlide: Slide | null = null;
  if (isPremium && research) {
    for (const slug of RESEARCH_ORDER) {
      const stat = reportStat(slug, research);
      const def = REPORTS.find((r) => r.slug === slug);
      if (!stat || !def) continue;
      researchSlide = {
        id: "research",
        tone: "plain",
        node: (
          <>
            {eyebrow(<IconBook size={14} />, bn ? "প্রিমিয়াম গবেষণা" : "Premium research")}
            <h3 className="hm-sl-title">{pick(def.title)}</h3>
            <p className="hm-sl-body">
              <b className="nums">{pick(stat.value)}</b> {pick(stat.label)}
            </p>
            <div className="hm-sl-acts">
              <Button href={`/stock-insights/${slug}`}>{bn ? "রিপোর্ট পড়ুন" : "Read the report"}</Button>
            </div>
          </>
        ),
      };
      break;
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
            {!hasPortfolio && (
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

  const pitch = offerSlide ?? premSlide;
  const order: (Slide | null)[] = isPremium
    ? [briefSlide, researchSlide, setupSlide, installSlide]
    : brandNew
      ? [startSlide, setupSlide, pitch, installSlide]
      : [weekSlide, pitch, setupSlide, installSlide];
  const slides = ready ? order.filter((s): s is Slide => s !== null) : [];

  return <Carousel slides={slides} lang={lang} />;
}

/** The swipeable row: scroll-snap, dots, arrows from 1024px, a "seen" event per slide. */
function Carousel({ slides, lang }: { slides: Slide[]; lang: Lang }) {
  const bn = lang === "bn";
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const seen = useRef(new Set<string>());
  const handlers = useRef(new Map<string, () => void>());
  handlers.current = new Map(slides.filter((s) => s.onSeen).map((s) => [s.id, s.onSeen!]));
  const ids = slides.map((s) => s.id).join("|");

  useEffect(() => {
    const el = trackRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const id = (e.target as HTMLElement).dataset.slide ?? "";
          if (!id || seen.current.has(id)) continue;
          seen.current.add(id);
          handlers.current.get(id)?.();
        }
      },
      { root: el, threshold: 0.6 },
    );
    Array.from(el.children).forEach((c) => io.observe(c));
    return () => io.disconnect();
  }, [ids]);

  useEffect(() => {
    setActive((a) => Math.min(a, Math.max(0, slides.length - 1)));
  }, [slides.length]);

  if (slides.length === 0) return null;

  const onScroll = () => {
    const el = trackRef.current;
    if (!el) return;
    const kids = Array.from(el.children) as HTMLElement[];
    let best = 0;
    let dist = Infinity;
    kids.forEach((k, i) => {
      const d = Math.abs(k.offsetLeft - el.scrollLeft);
      if (d < dist) {
        dist = d;
        best = i;
      }
    });
    setActive(best);
  };

  const go = (i: number) => {
    const el = trackRef.current;
    const kid = el?.children[i] as HTMLElement | undefined;
    if (!el || !kid) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ left: kid.offsetLeft, behavior: reduce ? "auto" : "smooth" });
  };

  const n = slides.length;
  return (
    <section
      className={`hm-slot ${bn ? "font-bn" : ""}`}
      lang={bn ? "bn" : undefined}
      aria-label={bn ? "অফার ও খবর" : "Offers and news"}
      data-card="slot"
    >
      <div className="hm-track" ref={trackRef} onScroll={onScroll}>
        {slides.map((s, i) => (
          <article
            key={s.id}
            data-slide={s.id}
            data-card={`slide-${s.id}`}
            className={`hm-slide hm-slide--${s.tone}`}
            aria-roledescription={bn ? "স্লাইড" : "slide"}
            aria-label={`${i + 1} / ${n}`}
          >
            {s.node}
          </article>
        ))}
      </div>
      {n > 1 && (
        <div className="hm-slot-foot">
          <div className="hm-dots" aria-hidden>
            {slides.map((s, i) => (
              <span key={s.id} className="hm-dot" data-on={i === active ? "" : undefined} />
            ))}
          </div>
          <div className="hm-arrows">
            <button
              type="button"
              className="hm-arrow hm-arrow--prev"
              onClick={() => go(active - 1)}
              disabled={active === 0}
              aria-label={bn ? "আগেরটি" : "Previous"}
            >
              <IconChevronRight size={18} />
            </button>
            <button
              type="button"
              className="hm-arrow"
              onClick={() => go(active + 1)}
              disabled={active >= n - 1}
              aria-label={bn ? "পরেরটি" : "Next"}
            >
              <IconChevronRight size={18} />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
