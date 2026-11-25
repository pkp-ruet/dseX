/**
 * THE map of the app (2026-11-20, the app-map plan
 * https://claude.ai/artifact/MUgUUziXftVp1gmXDQoMUm). Every page belongs to
 * one of four places, each answering one reader question:
 *
 *   Market     "What happened?"         Market today · Calendar · Sectors
 *   Lists      "Which shares to look at?" Lists (/lists): the Buy List, All companies,
 *                                       Results, For you and the research reports open
 *                                       from it
 *   My shares  "How are my shares?"     My shares (/my) · Portfolio · Portfolio builder · Updates
 *   Learn                               Guides and blog · How we score
 *
 * The two tools (2026-11-25, "Compare and Builder Homes",
 * https://claude.ai/artifact/CJhx3MYvMxSpJSkiiHWzH4): they sat in the Lists
 * menu as if they were lists. The Portfolio builder makes a portfolio, so it
 * lives in My shares beside Portfolio. Compare works on shares wherever they
 * are, so like a share's page it belongs to no place (`everyPlace`): no tab
 * lights on it, its back link goes to the place the reader came from, the
 * menu shows it once under the search field, and it opens from a share's
 * page, every list, My shares and search ("GP vs ROBI"). It stays listed
 * under Lists here so the footer, the home's explore card, search and the
 * admin areas still find it.
 *
 * Lists (2026-11-25, step 4 of the simplify review): Find became Lists. Every
 * list of shares opens from one page (/lists) and in one view
 * (components/lists/ListView.tsx); the list pages keep their own addresses
 * (search finds them) but leave the menus (`menu: false`): they stay in the
 * map so the back link, the lit tab, the search shortcuts and the admin areas
 * still know them.
 *
 * The menu (Navbar), the footer, the bottom bar, the place pages
 * (/market, /lists, /my), the back link above inner pages, the guest home's
 * "New here?" and the search shortcuts all read this file, so a page has ONE
 * name everywhere. Plain data (no React), so server components can import it.
 * A new page goes into a place here, never straight into a menu.
 */

export type Bi = { en: string; bn: string };
export type PlaceKey = "market" | "lists" | "mine" | "learn";

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
  /** false: in the map (back link, lit tab, search, admin) but not in the
   *  menu, the footer or a place page's doors: the lists that open from /lists. */
  menu?: boolean;
  /** A tool reached where it is needed (Compare, the portfolio builder). */
  tool?: boolean;
  /** Belongs to every place, like a share's page (Compare): `placeOf` skips
   *  it, so no tab lights and the back link points to the place the reader
   *  came from. It stays in a place's `pages` for the footer and search. */
  everyPlace?: boolean;
}

export interface Place {
  key: PlaceKey;
  /** The place page the bottom tab opens (Learn has none: it opens its hub). */
  href: string;
  name: Bi;
  question: Bi;
  /** "Go to Lists" / "তালিকায় যান" (PlaceNext). */
  go: Bi;
  pages: PlacePage[];
}

export const PLACES: Place[] = [
  {
    key: "market",
    href: "/market",
    name: { en: "Market", bn: "বাজার" },
    question: { en: "What happened in the market?", bn: "বাজারে কী হলো?" },
    go: { en: "Go to Market", bn: "বাজারে যান" },
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
    key: "lists",
    href: "/lists",
    name: { en: "Lists", bn: "তালিকা" },
    question: { en: "Which shares should I look at?", bn: "কোন শেয়ারগুলো দেখব?" },
    go: { en: "Go to Lists", bn: "তালিকায় যান" },
    pages: [
      {
        key: "lists",
        href: "/lists",
        name: { en: "Lists", bn: "তালিকা" },
        line: { en: "Our picks, and lists by what you want from a share", bn: "আমাদের বাছাই, আর শেয়ারে আপনি যা চান সেই অনুযায়ী তালিকা" },
        ask: { en: "Which shares should I look at?", bn: "কোন শেয়ারগুলো দেখব?" },
        icon: "lists",
        // The screener and the Find doors page folded into it (2026-11-25).
        paths: ["/find", "/screener", "/my-lists", "/stock-recommendation"],
      },
      {
        key: "buylist",
        href: "/buy-list",
        name: { en: "Buy List", bn: "কেনার তালিকা" },
        line: { en: "What we would buy today, the same for everyone", bn: "আজ আমরা যা কিনতাম, সবার জন্য একই" },
        ask: { en: "What would we buy today?", bn: "আজ আমরা কী কিনতাম?" },
        icon: "buylist",
        premium: true,
        menu: false,
      },
      {
        key: "companies",
        href: "/dsestockranking",
        name: { en: "All companies", bn: "সব কোম্পানি" },
        line: { en: "Every company, strongest first or A to Z", bn: "সব কোম্পানি, সবচেয়ে শক্তিশালী আগে বা A থেকে Z" },
        ask: { en: "Which companies are the strongest?", bn: "কোন কোম্পানিগুলো সবচেয়ে শক্তিশালী?" },
        icon: "rankings",
        paths: ["/stocks"],
        menu: false,
      },
      {
        key: "results",
        href: "/results",
        name: { en: "Results", bn: "আর্থিক ফল" },
        line: { en: "Each company's latest profit", bn: "প্রতিটি কোম্পানির সর্বশেষ মুনাফা" },
        ask: { en: "Who made more profit?", bn: "কার মুনাফা বাড়ল?" },
        icon: "results",
        menu: false,
      },
      {
        key: "foryou",
        href: "/for-you",
        name: { en: "For you", bn: "আপনার জন্য" },
        line: { en: "Companies like the ones you hold", bn: "আপনার শেয়ারের মতো কোম্পানি" },
        ask: { en: "What else should I look at?", bn: "আর কোনগুলো দেখব?" },
        icon: "picks",
        premium: true,
        menu: false,
      },
      {
        key: "research",
        href: "/lists#research",
        name: { en: "Research", bn: "গবেষণা" },
        line: { en: "Six reports on the whole market", bn: "পুরো বাজার নিয়ে ছয়টি রিপোর্ট" },
        ask: { en: "Who is in trouble, who pays well?", bn: "কে সমস্যায়, কে ভালো ডিভিডেন্ড দেয়?" },
        icon: "browse",
        premium: true,
        paths: ["/stock-insights"],
        menu: false,
      },
      {
        key: "compare",
        href: "/compare-stocks",
        name: { en: "Compare", bn: "তুলনা" },
        line: { en: "Put shares side by side", bn: "শেয়ার পাশাপাশি মিলিয়ে দেখুন" },
        ask: { en: "Which of these is stronger?", bn: "এগুলোর মধ্যে কোনটা শক্তিশালী?" },
        icon: "compare",
        tool: true,
        // Every place leads to it, like a share's page: out of the Lists menu
        // group (the menu shows it under search), no lit tab, a back link to
        // where the reader came from.
        menu: false,
        everyPlace: true,
      },
    ],
  },
  {
    key: "mine",
    href: "/my",
    name: { en: "My shares", bn: "আমার শেয়ার" },
    question: { en: "How are my shares?", bn: "আমার শেয়ারগুলো কেমন আছে?" },
    go: { en: "Go to My shares", bn: "আমার শেয়ারে যান" },
    pages: [
      {
        // My shares (2026-11-25): what is happening on every share the reader
        // owns or watches (New · Coming up · Nothing new), the same row for
        // both, no money; the watchlist page, Watch rules and the price alerts
        // folded into it, the money is on Portfolio.
        key: "shares",
        href: "/my",
        name: { en: "My shares", bn: "আমার শেয়ার" },
        line: { en: "What's new and what's coming on the shares you own and watch", bn: "আপনার কেনা আর নজরে রাখা শেয়ারে নতুন কী, সামনে কী" },
        ask: { en: "What is happening with my shares?", bn: "আমার শেয়ারগুলোতে কী হচ্ছে?" },
        icon: "watchlist",
        paths: ["/watchlist", "/watch-rules", "/alerts"],
      },
      {
        key: "portfolio",
        href: "/portfolio",
        name: { en: "Portfolio", bn: "পোর্টফোলিও" },
        line: { en: "Your money, your check and what to do", bn: "আপনার টাকা, পোর্টফোলিও যাচাই আর কী করবেন" },
        ask: { en: "How is my money doing?", bn: "আমার টাকা কেমন আছে?" },
        icon: "portfolio",
        paths: ["/sample-portfolio"],
      },
      {
        // The builder makes a portfolio, so it sits beside Portfolio
        // (2026-11-25; it was a "tool" in the Lists menu).
        key: "builder",
        href: "/portfolio-builder",
        name: { en: "Portfolio builder", bn: "পোর্টফোলিও বানান" },
        line: { en: "A whole portfolio for your money, first plan free", bn: "আপনার টাকায় পুরো পোর্টফোলিও, প্রথমটি ফ্রি" },
        ask: { en: "How should I invest my money?", bn: "আমার টাকা কীভাবে বিনিয়োগ করব?" },
        icon: "builder",
        tool: true,
      },
      {
        key: "updates",
        href: "/notifications",
        name: { en: "Updates", bn: "আপডেট" },
        line: { en: "News and dates on your shares", bn: "আপনার শেয়ারের খবর আর তারিখ" },
        ask: { en: "What's new on my shares?", bn: "আমার শেয়ারে নতুন কী?" },
        icon: "updates",
      },
    ],
  },
  {
    key: "learn",
    href: "/learn",
    name: { en: "Learn", bn: "শিখুন" },
    question: { en: "How does the market work?", bn: "শেয়ার বাজার কীভাবে চলে?" },
    go: { en: "Go to Learn", bn: "শিখুন-এ যান" },
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
 * Which place (and page) a path belongs to. The stock page and Compare belong
 * to no place: every place leads to them. Place pages themselves return
 * `page: null`.
 */
export function placeOf(pathname: string): { place: Place; page: PlacePage | null } | null {
  for (const place of PLACES) {
    if (place.href === pathname && place.key !== "learn") return { place, page: null };
    for (const page of place.pages) {
      if (page.everyPlace) continue;
      const paths = [page.href, ...(page.hrefBn ? [page.hrefBn] : []), ...(page.paths ?? [])];
      if (paths.some((p) => under(pathname, p))) return { place, page };
    }
  }
  return null;
}

/** A share's page and Compare: every place leads to them, so the back link
 *  points to the place the reader last came from. */
export function inEveryPlace(pathname: string): boolean {
  if (pathname.startsWith("/stock/")) return true;
  return PLACES.some((pl) => pl.pages.some((p) => p.everyPlace && under(pathname, p.href)));
}

/** The pages a menu, the footer or a place page lists (not the lists that open from /lists). */
export function menuPages(place: Place): PlacePage[] {
  return place.pages.filter((p) => p.menu !== false);
}

/** Every page, flat (search shortcuts, admin areas). */
export const ALL_PAGES: (PlacePage & { place: PlaceKey })[] = PLACES.flatMap((pl) =>
  pl.pages.map((p) => ({ ...p, place: pl.key })),
);

export function pageByKey(key: string): PlacePage {
  const p = ALL_PAGES.find((x) => x.key === key);
  if (!p) throw new Error(`No page ${key} in lib/places.ts`);
  return p;
}
