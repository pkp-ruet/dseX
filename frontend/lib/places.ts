/**
 * THE map of the app (2026-11-20, the app-map plan
 * https://claude.ai/artifact/MUgUUziXftVp1gmXDQoMUm). Every page belongs to
 * one of four places, each answering one reader question:
 *
 *   Market     "What happened?"        Market today · Results · Calendar · Sectors
 *   Find       "What should I look at?" Buy List · All companies · Screener · Compare · Research
 *   My shares  "How are my shares?"    Portfolio · Watchlist · Updates · Watch rules · For you
 *   Learn                              Guides and blog · How we score
 *
 * The menu (Navbar), the footer, the bottom bar, the place pages
 * (/market, /find, /my), the back link above inner pages, the home's
 * "See more" and the search shortcuts all read this file, so a page has ONE
 * name everywhere. Plain data (no React), so server components can import it.
 * A new page goes into a place here, never straight into a menu.
 */

export type Bi = { en: string; bn: string };
export type PlaceKey = "market" | "find" | "mine" | "learn";

export interface PlacePage {
  key: string;
  href: string;
  /** The Bengali reader's door when it differs (Learn: the Bangla blog). */
  hrefBn?: string;
  name: Bi;
  /** One line on what the page does (menu row, place page). */
  line: Bi;
  /** The reader's question, as the place page asks it. */
  ask: Bi;
  /** Menu / place-page icon name (Navbar `MenuIcon`). */
  icon: string;
  /** Most of the page is Premium: a small gold crown after the name. */
  premium?: boolean;
  /** Other paths that belong to this page (sub-pages, folded pages). */
  paths?: string[];
}

export interface Place {
  key: PlaceKey;
  /** The place page the bottom tab opens (Learn has none: it opens its hub). */
  href: string;
  name: Bi;
  question: Bi;
  pages: PlacePage[];
}

export const PLACES: Place[] = [
  {
    key: "market",
    href: "/market",
    name: { en: "Market", bn: "বাজার" },
    question: { en: "What happened in the market?", bn: "বাজারে কী হলো?" },
    pages: [
      {
        key: "today",
        href: "/dse-today",
        name: { en: "Market today", bn: "আজকের বাজার" },
        line: { en: "Mood, index, movers and company notices", bn: "বাজারের মেজাজ, সূচক, দামের ওঠানামা আর কোম্পানির ঘোষণা" },
        ask: { en: "How did the market do today?", bn: "আজ বাজার কেমন গেল?" },
        icon: "today",
        paths: ["/dse-trending-stocks", "/dse-popular-stocks", "/todays-news"],
      },
      {
        key: "results",
        href: "/results",
        name: { en: "Results", bn: "আর্থিক ফল" },
        line: { en: "Each company's latest profit", bn: "প্রতিটি কোম্পানির সর্বশেষ মুনাফা" },
        ask: { en: "Who made more profit?", bn: "কার মুনাফা বাড়ল?" },
        icon: "results",
      },
      {
        key: "calendar",
        href: "/dividend-calendar",
        name: { en: "Calendar", bn: "ক্যালেন্ডার" },
        line: { en: "Dividends, results meetings and AGMs", bn: "ডিভিডেন্ড, আর্থিক ফলের সভা আর এজিএম" },
        ask: { en: "What dates are coming?", bn: "সামনে কোন তারিখগুলো?" },
        icon: "dividend",
        premium: true,
      },
      {
        key: "sectors",
        href: "/sectors",
        name: { en: "Sectors", bn: "সেক্টর" },
        line: { en: "Whole industries side by side", bn: "পুরো সেক্টর পাশাপাশি" },
        ask: { en: "Which industries are doing well?", bn: "কোন সেক্টর ভালো করছে?" },
        icon: "sectors",
        paths: ["/sector"],
      },
    ],
  },
  {
    key: "find",
    href: "/find",
    name: { en: "Find", bn: "খুঁজুন" },
    question: { en: "What should I look at?", bn: "কোন শেয়ার দেখব?" },
    pages: [
      {
        key: "buylist",
        href: "/buy-list",
        name: { en: "Buy List", bn: "কেনার তালিকা" },
        line: { en: "What we would buy today, the same for everyone", bn: "আজ আমরা যা কিনতাম, সবার জন্য একই" },
        ask: { en: "What would we buy today?", bn: "আজ আমরা কী কিনতাম?" },
        icon: "buylist",
        premium: true,
      },
      {
        key: "builder",
        href: "/portfolio-builder",
        name: { en: "Portfolio builder", bn: "পোর্টফোলিও বানান" },
        line: { en: "A whole portfolio for your money, first plan free", bn: "আপনার টাকায় পুরো পোর্টফোলিও, প্রথমটি ফ্রি" },
        ask: { en: "How should I invest my money?", bn: "আমার টাকা কীভাবে বিনিয়োগ করব?" },
        icon: "builder",
      },
      {
        key: "companies",
        href: "/dsestockranking",
        name: { en: "All companies", bn: "সব কোম্পানি" },
        line: { en: "Every company, strongest first or A to Z", bn: "সব কোম্পানি, সবচেয়ে শক্তিশালী আগে বা A থেকে Z" },
        ask: { en: "Which companies are the strongest?", bn: "কোন কোম্পানিগুলো সবচেয়ে শক্তিশালী?" },
        icon: "rankings",
        paths: ["/stocks"],
      },
      {
        key: "screener",
        href: "/screener",
        name: { en: "Screener", bn: "স্ক্রিনার" },
        line: { en: "Shares that fit what you want", bn: "আপনার চাওয়ার সাথে মেলে এমন শেয়ার" },
        ask: { en: "Which shares fit what I want?", bn: "কোন শেয়ার আমার চাওয়ার সাথে মেলে?" },
        icon: "find",
        premium: true,
      },
      {
        key: "compare",
        href: "/compare-stocks",
        name: { en: "Compare", bn: "তুলনা" },
        line: { en: "Put shares side by side", bn: "শেয়ার পাশাপাশি মিলিয়ে দেখুন" },
        ask: { en: "Which of these is stronger?", bn: "এগুলোর মধ্যে কোনটা শক্তিশালী?" },
        icon: "compare",
      },
      {
        key: "research",
        href: "/stock-insights",
        name: { en: "Research", bn: "গবেষণা" },
        line: { en: "Six reports on the whole market", bn: "পুরো বাজার নিয়ে ছয়টি রিপোর্ট" },
        ask: { en: "Who is in trouble, who pays well?", bn: "কে সমস্যায়, কে ভালো ডিভিডেন্ড দেয়?" },
        icon: "lists",
        premium: true,
      },
    ],
  },
  {
    key: "mine",
    href: "/my",
    name: { en: "My shares", bn: "আমার শেয়ার" },
    question: { en: "How are my shares?", bn: "আমার শেয়ারগুলো কেমন আছে?" },
    pages: [
      {
        key: "portfolio",
        href: "/portfolio",
        name: { en: "Portfolio", bn: "পোর্টফোলিও" },
        line: { en: "Your money, your shares and your check", bn: "আপনার টাকা, শেয়ার আর পোর্টফোলিও যাচাই" },
        ask: { en: "How is my money doing?", bn: "আমার টাকা কেমন আছে?" },
        icon: "portfolio",
        paths: ["/sample-portfolio"],
      },
      {
        key: "watchlist",
        href: "/watchlist",
        name: { en: "Watchlist", bn: "ওয়াচলিস্ট" },
        line: { en: "The shares you follow", bn: "যে শেয়ারগুলো আপনি অনুসরণ করেন" },
        ask: { en: "How are the shares I follow?", bn: "যেগুলো অনুসরণ করি সেগুলো কেমন?" },
        icon: "watchlist",
      },
      {
        key: "updates",
        href: "/notifications",
        name: { en: "Updates", bn: "আপডেট" },
        line: { en: "News and dates on your shares", bn: "আপনার শেয়ারের খবর আর তারিখ" },
        ask: { en: "What's new on my shares?", bn: "আমার শেয়ারে নতুন কী?" },
        icon: "updates",
      },
      {
        key: "rules",
        href: "/watch-rules",
        name: { en: "Watch rules", bn: "নজরের নিয়ম" },
        line: { en: "Choose what we tell you, and your price alerts", bn: "কী জানাব তা বেছে নিন, আর আপনার প্রাইস অ্যালার্ট" },
        ask: { en: "What do I want to hear about?", bn: "কোন খবর জানতে চাই?" },
        icon: "rules",
        paths: ["/alerts"],
      },
      {
        key: "foryou",
        href: "/for-you",
        name: { en: "For you", bn: "আপনার জন্য" },
        line: { en: "Companies like the ones you hold", bn: "আপনার শেয়ারের মতো কোম্পানি" },
        ask: { en: "What else should I watch?", bn: "আর কোনগুলো নজরে রাখব?" },
        icon: "picks",
        premium: true,
      },
    ],
  },
  {
    key: "learn",
    href: "/learn",
    name: { en: "Learn", bn: "শিখুন" },
    question: { en: "How does the market work?", bn: "শেয়ার বাজার কীভাবে চলে?" },
    pages: [
      {
        key: "guides",
        href: "/learn",
        hrefBn: "/blog",
        name: { en: "Guides and blog", bn: "গাইড ও ব্লগ" },
        line: { en: "Short guides for beginners", bn: "নতুনদের জন্য ছোট গাইড" },
        ask: { en: "Where do I start?", bn: "কোথা থেকে শুরু করব?" },
        icon: "blog",
        paths: ["/blog"],
      },
      {
        key: "about",
        href: "/about",
        name: { en: "How we score", bn: "আমরা কীভাবে স্কোর করি" },
        line: { en: "The checks behind the grade", bn: "গ্রেডের পেছনের যাচাই" },
        ask: { en: "How do you grade a company?", bn: "কোম্পানির গ্রেড কীভাবে দেন?" },
        icon: "about",
      },
    ],
  },
];

/** The three places with a bottom tab and a place page. */
export const TAB_PLACES = PLACES.filter((p) => p.key !== "learn");

export function placeByKey(key: PlaceKey): Place {
  return PLACES.find((p) => p.key === key)!;
}

const under = (pathname: string, path: string) =>
  pathname === path || pathname.startsWith(path + "/");

/**
 * Which place (and page) a path belongs to. The stock page belongs to no
 * place: every place leads to it. Place pages themselves return `page: null`.
 */
export function placeOf(pathname: string): { place: Place; page: PlacePage | null } | null {
  for (const place of PLACES) {
    if (place.href === pathname && place.key !== "learn") return { place, page: null };
    for (const page of place.pages) {
      const paths = [page.href, ...(page.hrefBn ? [page.hrefBn] : []), ...(page.paths ?? [])];
      if (paths.some((p) => under(pathname, p))) return { place, page };
    }
  }
  return null;
}

/** Every page, flat (search shortcuts, the home's "See more"). */
export const ALL_PAGES: (PlacePage & { place: PlaceKey })[] = PLACES.flatMap((pl) =>
  pl.pages.map((p) => ({ ...p, place: pl.key })),
);

export function pageByKey(key: string): PlacePage {
  const p = ALL_PAGES.find((x) => x.key === key);
  if (!p) throw new Error(`No page ${key} in lib/places.ts`);
  return p;
}
