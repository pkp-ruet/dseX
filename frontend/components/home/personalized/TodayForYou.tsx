"use client";

import { type ComponentType } from "react";
import Link from "@/components/ui/Link";
import type { Lang } from "@/context/LangContext";
import { forYouCounts, type ForYou, type RankingsToday, type ScoreItem } from "@/lib/api";
import type { BuyListHome } from "@/lib/buy-list";
import {
  IconChevronRight,
  IconClipboardCheck,
  IconCompass,
  IconCrown,
  IconTrophy,
} from "@/components/ui/icons";

type Bi = { en: string; bn: string };

/** "SQURPHARMA, EBL, NCCBANK +7". */
function names(codes: string[], total: number, n = 3): string {
  const shown = codes.slice(0, n);
  const rest = total - shown.length;
  return shown.join(", ") + (rest > 0 ? ` +${rest}` : "");
}

/** One summary row. Every row has the same parts, in the same places. */
interface SumRow {
  key: string;
  href: string;
  Icon: ComponentType<{ size?: number }>;
  title: Bi;
  /** A Premium page: a crown on the icon for readers without Premium (as on the icon grid). */
  premiumPage: boolean;
  /** "2 new" beside the title; 0 = none. */
  fresh: number;
  /** The big number on the right, and what it counts ("৳4,073" for money). */
  value: number | string;
  unit: Bi;
  /** One plain line (two at most): the names, or what Premium adds. */
  caption: Bi;
}

/**
 * "Today for you" (2026-11-17, the simple home; since 2026-11-20 block 6 of
 * the six-block home, the app map): three rows into Find and My shares, one
 * shape each — icon (crown on a Premium page for a reader without Premium) ·
 * title (+ a gold "N new") · one caption · a big number with what it counts ·
 * chevron. Today's Buy List · For you · Strongest companies. The dates, the
 * results and the dividends coming to the reader moved to "On your shares"
 * (`OnYourShares`) and the portfolio; the ranking block became the third row.
 * A free reader's caption says what is free and that the rest is Premium, in
 * words; a Premium reader's names the shares. No chips, no lock lines.
 */
export default function TodayForYou({
  lang,
  premium,
  loading,
  buyList,
  forYou,
  stocks,
  moves,
}: {
  lang: Lang;
  premium: boolean;
  /** The bundle hasn't arrived yet (and no cached copy). */
  loading: boolean;
  buyList: BuyListHome | null | undefined;
  forYou: ForYou | null | undefined;
  /** Every scored company (`/api/scores`), for the strongest-companies row. */
  stocks: ScoreItem[];
  /** This week's rank moves (bundle `rank_moves`). */
  moves?: RankingsToday["moves"] | null;
}) {
  const bn = lang === "bn";
  const pick = (b: Bi) => (bn ? b.bn : b.en);
  const rows: SumRow[] = [];

  // 1 · Today's Buy List
  if (buyList) {
    const count = buyList.count;
    const free = buyList.free_pick?.code ?? null;
    rows.push({
      key: "buylist",
      href: "/buy-list",
      Icon: IconClipboardCheck,
      title: { en: "Today's Buy List", bn: "আজকের কেনার তালিকা" },
      premiumPage: true,
      fresh: buyList.week_joined,
      value: count,
      unit: { en: count === 1 ? "share" : "shares", bn: "শেয়ার" },
      caption:
        count === 0
          ? { en: "No share passed every question today", bn: "আজ কোনো শেয়ার সব প্রশ্নে পাস করেনি" }
          : premium
            ? { en: names(buyList.top.map((x) => x.code), count), bn: names(buyList.top.map((x) => x.code), count) }
            : free
              ? { en: `${free} is free today · the rest with Premium`, bn: `আজ ফ্রি: ${free} · বাকিগুলো প্রিমিয়ামে` }
              : { en: "The names come with Premium", bn: "নামগুলো প্রিমিয়ামে" },
    });
  }

  // 2 · For you ("Based on your shares", 2026-11-18): the count and the
  //     reader's own shares are free; the picked names are Premium. A reader
  //     with no shares yet gets the free starter list, named.
  if (forYou && forYou.items.length > 0) {
    const c = forYouCounts(forYou);
    const anchors = (forYou.groups ?? []).map((g) => g.anchor).filter((a): a is string => !!a);
    const starter = forYou.mode === "generic";
    const list = names(forYou.items.map((x) => x.code), c.total);
    rows.push({
      key: "discover",
      href: "/for-you",
      Icon: IconCompass,
      title: { en: "For you", bn: "আপনার জন্য" },
      premiumPage: !starter,
      fresh: c.new,
      value: c.total,
      unit: starter ? { en: "to start", bn: "শুরুর জন্য" } : { en: c.total === 1 ? "company" : "companies", bn: "কোম্পানি" },
      caption: starter
        ? { en: `Strong ones to start with: ${list}`, bn: `শুরু করার মতো: ${list}` }
        : premium
          ? { en: list, bn: list }
          : anchors.length > 0
            ? {
                en: `From ${anchors[0]}${anchors.length > 1 ? ` and ${anchors.length - 1} more` : ""} of your shares · names with Premium`,
                bn: `আপনার ${anchors[0]}${anchors.length > 1 ? ` ও আরও ${anchors.length - 1}টি` : ""} শেয়ার দেখে · নাম প্রিমিয়ামে`,
              }
            : { en: "Picked from your shares · names with Premium", bn: "আপনার শেয়ার দেখে বাছাই · নাম প্রিমিয়ামে" },
    });
  }

  // 3 · Strongest companies (the ranking, Find › All companies)
  const ranked = stocks
    .filter((x) => x.score != null)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || a.trading_code.localeCompare(b.trading_code));
  if (ranked.length > 0) {
    const climbers = moves?.places
      ? Object.values(moves.places).filter((v) => typeof v === "number" && v > 0).length
      : 0;
    rows.push({
      key: "ranking",
      href: "/dsestockranking",
      Icon: IconTrophy,
      title: { en: "Strongest companies", bn: "সবচেয়ে শক্তিশালী কোম্পানি" },
      premiumPage: false,
      fresh: 0,
      value: ranked.length,
      unit: { en: "ranked", bn: "র‍্যাঙ্ক করা" },
      caption: {
        en: `Top: ${names(ranked.map((x) => x.trading_code), ranked.length)}${climbers ? ` · ${climbers} climbed this week` : ""}`,
        bn: `শীর্ষে: ${names(ranked.map((x) => x.trading_code), ranked.length)}${climbers ? ` · এ সপ্তাহে ${climbers}টি উঠেছে` : ""}`,
      },
    });
  }

  if (rows.length === 0 && !loading) return null;

  const sumCard =
    rows.length > 0 ? (
      <ul className="hm-tcard hm-sum">
        {rows.map((r) => (
          <li key={r.key}>
            <Link href={r.href} className="hm-srow" data-card={`row-${r.key}`}>
              <span className="hm-srow-ic" aria-hidden>
                <r.Icon size={22} />
                {r.premiumPage && !premium && (
                  <span className="hm-crown">
                    <IconCrown size={11} />
                  </span>
                )}
              </span>
              <span className="hm-srow-txt">
                <span className="hm-srow-title">
                  {pick(r.title)}
                  {r.fresh > 0 && (
                    <span className="hm-new nums">{bn ? `${r.fresh}টি নতুন` : `${r.fresh} new`}</span>
                  )}
                  {r.premiumPage && !premium && <span className="sr-only">{bn ? " · প্রিমিয়াম" : " · Premium"}</span>}
                </span>
                <span className="hm-srow-cap">{pick(r.caption)}</span>
              </span>
              <span className="hm-srow-num">
                <b className="nums">{r.value}</b>
                <span>{pick(r.unit)}</span>
              </span>
              <span className="hm-chev" aria-hidden>
                <IconChevronRight size={16} />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    ) : loading ? (
      <ul className="hm-tcard hm-sum" aria-hidden>
        {[0, 1, 2].map((i) => (
          <li key={i}>
            <span className="hm-srow">
              <span className="hm-srow-ic animate-pulse" />
              <span className="grid gap-2">
                <span className="h-4 w-32 animate-pulse rounded-full bg-surface-2" />
                <span className="h-3 w-44 animate-pulse rounded-full bg-surface-2" />
              </span>
            </span>
          </li>
        ))}
      </ul>
    ) : null;

  return (
    <section className={`hm-today ${bn ? "font-bn" : ""}`} lang={bn ? "bn" : undefined}>
      <div className="hm-head">
        <h2 className="hm-head-h">{bn ? "আজ আপনার জন্য" : "Today for you"}</h2>
      </div>
      <div className="hm-today-grid">{sumCard}</div>
    </section>
  );
}
