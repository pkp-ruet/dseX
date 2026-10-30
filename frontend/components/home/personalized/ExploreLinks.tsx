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
  /** Decorative tile colour — ten identical clay squares read as a grey list. */
  acc: string;
}

/** In order of how often a typical reader needs them. The first `INITIAL`
 *  show on a phone; the rest sit behind "More". */
const ROWS: Row[] = [
  {
    href: "/dsestockranking",
    icon: <IconTrophy size={18} />,
    label: ["Company ranking", "কোম্পানির র‍্যাঙ্কিং"],
    sub: ["Every company scored, the strongest first", "প্রতিটি কোম্পানির স্কোর, সবচেয়ে শক্তটি আগে"],
    acc: ACC.gold,
  },
  {
    href: "/share-bazar",
    icon: <IconNews size={18} />,
    label: ["Today's market in Bangla", "আজকের শেয়ার বাজার"],
    sub: ["The whole day as a short report in Bengali", "পুরো দিনের বাজার, ছোট একটি প্রতিবেদনে"],
    acc: ACC.navy,
  },
  {
    href: "/dividend-calendar",
    icon: <IconCoin size={18} />,
    label: ["Who pays a dividend soon", "কে শিগগির ডিভিডেন্ড দিচ্ছে"],
    sub: ["Record dates and cash per share", "রেকর্ড ডেট আর শেয়ারপ্রতি নগদ"],
    acc: ACC.gold,
  },
  {
    href: "/assistant",
    icon: <IconSparkle size={18} />,
    label: ["Ask TopStock AI", "TopStock AI-কে প্রশ্ন করুন"],
    sub: ["Ask any question about any share", "যেকোনো শেয়ার নিয়ে যেকোনো প্রশ্ন করুন"],
    acc: ACC.clay,
  },
  {
    href: "/dse-popular-stocks",
    icon: <IconHeart size={18} />,
    label: ["What other readers are looking at", "অন্য পাঠকেরা যা দেখছেন"],
    sub: ["The most viewed shares this week", "এ সপ্তাহে সবচেয়ে বেশি দেখা শেয়ার"],
    acc: ACC.steel,
  },
  {
    href: "/market-analysis",
    icon: <IconTrendUp size={18} />,
    label: ["Market analysis", "বাজার বিশ্লেষণ"],
    sub: ["Is the market up or down, cheap or expensive?", "বাজার বাড়ছে না কমছে, দাম কম না বেশি"],
    acc: ACC.steel,
  },
  {
    href: "/dse-trending-stocks",
    icon: <IconRocket size={18} />,
    label: ["Trending stocks", "আলোচিত শেয়ার"],
    sub: ["The biggest rises over 7 days", "গত 7 দিনে সবচেয়ে বেশি বেড়েছে"],
    acc: ACC.clay,
  },
  {
    href: "/stock-insights",
    icon: <IconList size={18} />,
    label: ["Stock lists", "শেয়ারের তালিকা"],
    sub: ["Dividends, big companies and more", "ডিভিডেন্ড, বড় কোম্পানি আর আরও তালিকা"],
    acc: ACC.navy,
  },
  {
    href: "/stocks",
    icon: <IconGrid size={18} />,
    label: ["All stocks", "সব শেয়ার"],
    sub: ["Every DSE share, A to Z", "DSE-এর সব শেয়ার, A থেকে Z"],
    acc: ACC.steel,
  },
  {
    href: "/blog",
    icon: <IconBook size={18} />,
    label: ["Bangla blog", "বাংলা ব্লগ"],
    sub: ["Beginner guides in Bengali", "সহজ ভাষায় শেয়ার বাজারের গাইড"],
    acc: ACC.clay,
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
        const isBn = bn;
        return (
          <Link
            key={r.href}
            prefetch={false}
            href={r.href}
            lang={isBn ? "bn" : undefined}
            style={accVars(r.acc)}
            // Kept as Tailwind utilities, NOT .acc-card: that class sets
            // `background` in plain CSS, which would beat `active:bg-*` here.
            className={`flex items-center gap-3 rounded-xl border border-[color-mix(in_srgb,var(--acc)_22%,var(--border))] bg-surface px-3 py-3 transition-colors hover:bg-surface-2 active:bg-surface-2${isBn ? " font-bn" : ""}`}
          >
            <span
              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg"
              style={{ ...accVars(r.acc), color: "var(--acc)", background: "color-mix(in srgb, var(--acc) 13%, transparent)" }}
              aria-hidden
            >
              {r.icon}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold leading-tight text-text-main">{bn ? r.label[1] : r.label[0]}</span>
              <span className="block truncate text-xs text-text-muted">{bn ? r.sub[1] : r.sub[0]}</span>
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
