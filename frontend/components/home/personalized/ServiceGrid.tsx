"use client";

import { useState, type ComponentType } from "react";
import Link from "@/components/ui/Link";
import Sheet from "@/components/ui/Sheet";
import type { Lang } from "@/context/LangContext";
import {
  IconActivity,
  IconBell,
  IconBook,
  IconCap,
  IconChat,
  IconChevronDown,
  IconChevronRight,
  IconClipboardCheck,
  IconCoin,
  IconCompare,
  IconCompass,
  IconCrown,
  IconFileText,
  IconInfo,
  IconList,
  IconPen,
  IconPie,
  IconTrophy,
  IconTune,
} from "@/components/ui/icons";

type Bi = { en: string; bn: string };

interface Service {
  key: string;
  href: string;
  Icon: ComponentType<{ size?: number }>;
  /** Short forms of the menu names (Navbar `NAV_GROUPS`), so a reader learns one word. */
  name: Bi;
  /** One line for "What is each one?". */
  line: Bi;
  /** Premium page: a crown for readers without Premium. */
  premium?: boolean;
}

/** The first eight, shown to everyone. */
const FIRST: Service[] = [
  {
    key: "market", href: "/dse-today", Icon: IconActivity,
    name: { en: "Market today", bn: "আজকের বাজার" },
    line: { en: "How the market did today, in plain words.", bn: "আজ বাজার কেমন গেল, সহজ কথায়।" },
  },
  {
    key: "buylist", href: "/buy-list", Icon: IconClipboardCheck, premium: true,
    name: { en: "Buy List", bn: "কেনার তালিকা" },
    line: { en: "The few shares we would buy today, and why.", bn: "আজ আমরা যে কয়টি শেয়ার কিনতাম, আর কেন।" },
  },
  {
    key: "screener", href: "/screener", Icon: IconTune, premium: true,
    name: { en: "Screener", bn: "স্ক্রিনার" },
    line: { en: "Find the shares that fit what you want.", bn: "আপনার চাওয়ার সাথে মেলে এমন শেয়ার খুঁজুন।" },
  },
  {
    key: "compare", href: "/compare-stocks", Icon: IconCompare,
    name: { en: "Compare", bn: "তুলনা" },
    line: { en: "Put a few shares side by side.", bn: "কয়েকটি শেয়ার পাশাপাশি দেখুন।" },
  },
  {
    key: "ranking", href: "/dsestockranking", Icon: IconTrophy,
    name: { en: "Ranking", bn: "র‍্যাঙ্কিং" },
    line: { en: "The strongest companies on the DSE.", bn: "ডিএসইর সবচেয়ে শক্তিশালী কোম্পানি।" },
  },
  {
    key: "dividends", href: "/dividend-calendar", Icon: IconCoin, premium: true,
    name: { en: "Dividends", bn: "ডিভিডেন্ড" },
    line: { en: "Every dividend coming, and the last day to buy.", bn: "আসন্ন সব ডিভিডেন্ড আর কেনার শেষ দিন।" },
  },
  {
    key: "results", href: "/results", Icon: IconFileText,
    name: { en: "Results", bn: "আর্থিক ফল" },
    line: { en: "Every company's latest results.", bn: "প্রতিটি কোম্পানির সর্বশেষ আর্থিক ফল।" },
  },
  {
    key: "discover", href: "/discover", Icon: IconCompass,
    name: { en: "Discover", bn: "খুঁজে দেখুন" },
    line: { en: "Companies matched to your shares, to explore.", bn: "আপনার শেয়ারের সাথে মিলিয়ে বাছাই করা কোম্পানি।" },
  },
];

/** "See more" opens these eight in place. */
const MORE: Service[] = [
  {
    key: "research", href: "/stock-insights", Icon: IconBook, premium: true,
    name: { en: "Research", bn: "গবেষণা" },
    line: { en: "Our reports on the whole market.", bn: "পুরো বাজার নিয়ে আমাদের রিপোর্ট।" },
  },
  {
    key: "sectors", href: "/sectors", Icon: IconPie,
    name: { en: "Sectors", bn: "সেক্টর" },
    line: { en: "How each sector is doing.", bn: "প্রতিটি সেক্টর কেমন চলছে।" },
  },
  {
    key: "stocks", href: "/stocks", Icon: IconList,
    name: { en: "All stocks", bn: "সব শেয়ার" },
    line: { en: "Every DSE share in one list.", bn: "ডিএসইর সব শেয়ার এক তালিকায়।" },
  },
  {
    key: "ai", href: "/assistant", Icon: IconChat,
    name: { en: "TopStock AI", bn: "টপস্টক এআই" },
    line: { en: "Ask anything about a share.", bn: "যেকোনো শেয়ার নিয়ে প্রশ্ন করুন।" },
  },
  {
    key: "alerts", href: "/alerts", Icon: IconBell,
    name: { en: "Price alerts", bn: "প্রাইস অ্যালার্ট" },
    line: { en: "We tell you when a share reaches your price.", bn: "শেয়ার আপনার দামে পৌঁছালে আমরা জানাব।" },
  },
  {
    key: "guides", href: "/learn", Icon: IconCap,
    name: { en: "Guides", bn: "গাইড" },
    line: { en: "Short guides for beginners.", bn: "নতুনদের জন্য ছোট গাইড।" },
  },
  {
    key: "blog", href: "/blog", Icon: IconPen,
    name: { en: "Bangla blog", bn: "বাংলা ব্লগ" },
    line: { en: "Guides in everyday Bengali.", bn: "সহজ বাংলায় লেখা গাইড।" },
  },
  {
    key: "premium", href: "/premium", Icon: IconCrown,
    name: { en: "Premium", bn: "প্রিমিয়াম" },
    line: { en: "What Premium adds, and the price.", bn: "প্রিমিয়ামে কী পাবেন, আর দাম।" },
  },
];

const ALL = [...FIRST, ...MORE];

/**
 * "What you can do" (2026-11-17, the bKash-style home): eight icons with
 * one-or-two-word labels, "See more" for eight more, and "What is each one?"
 * for one line about every page. It replaced the dashboard's feature cards
 * (screener, compare, ranking, research, learn, explore links): the page
 * behind each icon explains itself and, where it is Premium, opens with its
 * own Premium card. Free readers see a crown on the Premium pages; members see
 * a thin gold ring on them instead (round 2, 2026-11-18: what they unlocked);
 * a small gold number shows what is new (the Buy List's joiners this week,
 * Discover's new picks today). "See more" and "What is each one?" sit side by
 * side on the card's bottom edge from the start. Every icon carries its own
 * `data-card` for the home tap tracking.
 */
export default function ServiceGrid({
  lang,
  premium,
  badges,
}: {
  lang: Lang;
  premium: boolean;
  /** service key → how many new things to flag (0 / missing = no badge). */
  badges: Partial<Record<string, number>>;
}) {
  const bn = lang === "bn";
  const [more, setMore] = useState(false);
  const [sheet, setSheet] = useState(false);
  const pick = (b: Bi) => (bn ? b.bn : b.en);
  const shown = more ? ALL : FIRST;

  return (
    <section
      className={`hm-grid ${bn ? "font-bn" : ""}`}
      lang={bn ? "bn" : undefined}
      aria-label={bn ? "যা করতে পারেন" : "What you can do"}
    >
      <ul className="hm-grid-list" id="hm-grid-list">
        {shown.map((s) => {
          const n = badges[s.key] ?? 0;
          return (
            <li key={s.key} data-card={`icon-${s.key}`}>
              <Link href={s.href} className="hm-svc">
                <span className={`hm-svc-ic ${s.premium && premium ? "hm-svc-ic--member" : ""}`} aria-hidden>
                  <s.Icon size={24} />
                  {n > 0 && <span className="hm-badge nums">{n > 9 ? "9+" : n}</span>}
                  {s.premium && !premium && (
                    <span className="hm-crown">
                      <IconCrown size={11} />
                    </span>
                  )}
                </span>
                <span className="hm-svc-name">{pick(s.name)}</span>
                {(n > 0 || (s.premium && !premium)) && (
                  <span className="sr-only">
                    {n > 0 ? (bn ? ` · ${n}টি নতুন` : ` · ${n} new`) : ""}
                    {s.premium && !premium ? (bn ? " · প্রিমিয়াম" : " · Premium") : ""}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>

      {/* Two pills on the card's bottom edge: more icons, and one line about
          every page — from the start, since a new reader needs it most. */}
      <div className="hm-hang">
        <button
          type="button"
          className="hm-more"
          onClick={() => setMore((v) => !v)}
          aria-expanded={more}
          aria-controls="hm-grid-list"
        >
          {more ? (bn ? "কম দেখুন" : "See less") : bn ? "আরও দেখুন" : "See more"}
          <IconChevronDown size={16} />
        </button>
        <button
          type="button"
          className="hm-more hm-help"
          onClick={() => setSheet(true)}
          aria-label={bn ? "কোনটা কী কাজের?" : "What is each one?"}
        >
          <IconInfo size={16} />
          <span className="hm-help-txt">{bn ? "কোনটা কী কাজের?" : "What is each one?"}</span>
        </button>
      </div>

      <Sheet open={sheet} onClose={() => setSheet(false)} title={bn ? "কোনটা কী কাজের" : "What each one does"}>
        <ul className="hm-sheet-list">
          {ALL.map((s) => (
            <li key={s.key}>
              <Link href={s.href} className="hm-sheet-row" onClick={() => setSheet(false)}>
                <span className="hm-sheet-ic" aria-hidden>
                  <s.Icon size={20} />
                </span>
                <span className="min-w-0">
                  <span className="hm-sheet-name">
                    {pick(s.name)}
                    {s.premium && !premium && (
                      <span className="hm-crown-sm" title="Premium">
                        <IconCrown size={11} />
                      </span>
                    )}
                  </span>
                  <span className="hm-sheet-line">{pick(s.line)}</span>
                </span>
                <span className="text-primary-ink" aria-hidden>
                  <IconChevronRight size={16} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Sheet>
    </section>
  );
}
