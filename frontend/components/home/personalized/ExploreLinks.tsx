"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import type { Lang } from "@/context/LangContext";
import { t } from "@/lib/home-copy";
import {
  IconArrowRight,
  IconBook,
  IconCoin,
  IconGrid,
  IconHeart,
  IconList,
  IconNews,
  IconRocket,
  IconSparkle,
  IconTrendUp,
  IconTrophy,
} from "@/components/home/personalized/DashIcons";
import { ACC, accVars } from "@/components/home/personalized/accents";

interface Row {
  href: string;
  icon: ReactNode;
  /** [English, Bengali] */
  label: [string, string];
  sub: [string, string];
  /** Always Bengali (the destination is Bengali). */
  bnOnly?: boolean;
  /** Decorative tile colour — ten identical clay squares read as a grey list. */
  acc: string;
}

/** In order of how often a typical reader needs them. The first `INITIAL`
 *  show on a phone; the rest sit behind "More". */
const ROWS: Row[] = [
  {
    href: "/dsestockranking",
    icon: <IconTrophy size={18} />,
    label: ["Stock Rankings", "সেরা শেয়ারের তালিকা"],
    sub: ["Every company scored, best first", "সব কোম্পানির নম্বর, সেরাটা আগে"],
    acc: ACC.gold,
  },
  {
    href: "/share-bazar",
    icon: <IconNews size={18} />,
    label: ["Today's market, in Bengali", "আজকের শেয়ার বাজার"],
    sub: ["The whole day as a short Bengali read", "আজকের বাজার সহজ বাংলায়"],
    acc: ACC.navy,
  },
  {
    href: "/dividend-calendar",
    icon: <IconCoin size={18} />,
    label: ["Who pays cash soon", "কে কবে ডিভিডেন্ড দিচ্ছে"],
    sub: ["Record dates and cash per share", "রেকর্ড ডেট আর শেয়ারপ্রতি টাকা"],
    acc: ACC.gold,
  },
  {
    href: "/assistant",
    icon: <IconSparkle size={18} />,
    label: ["Ask TopStock AI", "TopStock AI-কে প্রশ্ন করুন"],
    sub: ["Any question about any stock", "যে কোনো শেয়ার নিয়ে যে কোনো প্রশ্ন"],
    acc: ACC.clay,
  },
  {
    href: "/dse-popular-stocks",
    icon: <IconHeart size={18} />,
    label: ["What others are looking at", "অন্যরা কী দেখছে"],
    sub: ["Most viewed stocks this week", "এই সপ্তাহে সবচেয়ে বেশি দেখা শেয়ার"],
    acc: ACC.steel,
  },
  {
    href: "/market-analysis",
    icon: <IconTrendUp size={18} />,
    label: ["Market Analysis", "বাজার বিশ্লেষণ"],
    sub: ["Up or down, cheap or pricey — in plain words", "উপরে না নিচে, সস্তা না দামি — সহজ কথায়"],
    acc: ACC.steel,
  },
  {
    href: "/dse-trending-stocks",
    icon: <IconRocket size={18} />,
    label: ["Trending stocks", "আলোচিত শেয়ার"],
    sub: ["Biggest 7-day gainers", "গত 7 দিনে সবচেয়ে বেড়েছে"],
    acc: ACC.clay,
  },
  {
    href: "/stock-insights",
    icon: <IconList size={18} />,
    label: ["Ready-made lists", "তৈরি তালিকা"],
    sub: ["Dividends, growth, big companies and more", "ডিভিডেন্ড, বৃদ্ধি, বড় কোম্পানি আর অন্যান্য"],
    acc: ACC.navy,
  },
  {
    href: "/stocks",
    icon: <IconGrid size={18} />,
    label: ["Browse Stocks", "সব শেয়ার"],
    sub: ["Every DSE stock, A–Z", "ডিএসই-র সব শেয়ার, A–Z"],
    acc: ACC.steel,
  },
  {
    href: "/blog",
    icon: <IconBook size={18} />,
    label: ["বাংলা ব্লগ", "বাংলা ব্লগ"],
    sub: ["সহজ ভাষায় শেয়ার বাজার", "সহজ ভাষায় শেয়ার বাজার"],
    acc: ACC.clay,
    bnOnly: true,
  },
];

const INITIAL = 5;

/** Flat "where else to look" rows closing the Explore aside — one tappable row
 *  per page, no preview tables (the full pages are one tap away). Five show;
 *  the rest open on "More". Bengali rows carry lang="bn" + .font-bn. */
export default function ExploreLinks({ lang = "en" }: { lang?: Lang }) {
  const [open, setOpen] = useState(false);
  const bn = lang === "bn";
  const shown = open ? ROWS : ROWS.slice(0, INITIAL);
  return (
    <nav aria-label={t(lang, "exploreMarket")} className="flex flex-col gap-2">
      {shown.map((r) => {
        const isBn = bn || r.bnOnly;
        return (
          <Link
            key={r.href}
            prefetch={false}
            href={r.href}
            lang={isBn ? "bn" : undefined}
            style={accVars(r.acc)}
            // Kept as Tailwind utilities, NOT .acc-card: that class sets
            // `background` in plain CSS, which would beat `active:bg-*` here.
            className={`flex items-center gap-3 rounded-xl border border-[color-mix(in_srgb,var(--acc)_22%,var(--border))] bg-[var(--surface)] px-3 py-3 transition-colors hover:bg-[var(--surface-2)] active:bg-[var(--surface-2)]${isBn ? " font-bn" : ""}`}
          >
            <span
              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg"
              style={{ ...accVars(r.acc), color: "var(--acc)", background: "color-mix(in srgb, var(--acc) 13%, transparent)" }}
              aria-hidden
            >
              {r.icon}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[0.9rem] font-bold leading-tight text-[var(--text)]">{bn ? r.label[1] : r.label[0]}</span>
              <span className="block truncate text-[0.75rem] text-[var(--text-muted)]">{bn ? r.sub[1] : r.sub[0]}</span>
            </span>
            <span className="shrink-0" style={{ color: "var(--acc, var(--primary))" }} aria-hidden>
              <IconArrowRight size={14} />
            </span>
          </Link>
        );
      })}
      {ROWS.length > INITIAL && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className={`btn-quiet btn-sm btn-block${bn ? " font-bn" : ""}`}
          lang={bn ? "bn" : undefined}
        >
          {open ? t(lang, "seeFewer") : `${t(lang, "seeMore")} (${ROWS.length - INITIAL})`}
        </button>
      )}
    </nav>
  );
}
