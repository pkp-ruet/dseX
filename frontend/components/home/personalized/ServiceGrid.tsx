"use client";

import { useState, type ComponentType } from "react";
import Link from "@/components/ui/Link";
import Sheet from "@/components/ui/Sheet";
import type { Lang } from "@/context/LangContext";
import {
  IconChat,
  IconChevronDown,
  IconChevronRight,
  IconCrown,
  IconInfo,
} from "@/components/ui/icons";
import { PAGE_ICON } from "@/components/places/pageIcons";
import { PLACES, pageByKey, type Bi } from "@/lib/places";

interface Service {
  /** Analytics key (`data-card="icon-<key>"`) and badge key — kept from 2026-11-17. */
  key: string;
  href: string;
  /** The Bengali reader's door when it differs (Learn → the Bangla blog). */
  hrefBn?: string;
  Icon: ComponentType<{ size?: number }>;
  /** The page's one name from the map (lib/places.ts). */
  name: Bi;
  /** One line for "What is each one?". */
  line: Bi;
  /** Premium page: a crown for readers without Premium. */
  premium?: boolean;
}

/** A page of the map as a home icon (the old analytics key first). */
function fromMap(key: string, pageKey: string): Service {
  const p = pageByKey(pageKey);
  return {
    key,
    href: p.href,
    hrefBn: p.hrefBn,
    Icon: PAGE_ICON[pageKey] ?? IconInfo,
    name: p.name,
    line: p.line,
    premium: p.premium,
  };
}

/** The first eight, shown to everyone: the most used pages. */
const FIRST: Service[] = [
  fromMap("market", "today"),
  fromMap("buylist", "buylist"),
  fromMap("screener", "screener"),
  fromMap("compare", "compare"),
  fromMap("ranking", "companies"),
  fromMap("dividends", "calendar"),
  fromMap("results", "results"),
  fromMap("discover", "foryou"),
];

const AI: Service = {
  key: "ai", href: "/assistant", Icon: IconChat,
  name: { en: "TopStock AI", bn: "টপস্টক এআই" },
  line: { en: "Ask anything about a share.", bn: "যেকোনো শেয়ার নিয়ে প্রশ্ন করুন।" },
};
const PREMIUM: Service = {
  key: "premium", href: "/premium", Icon: IconCrown,
  name: { en: "Premium", bn: "প্রিমিয়াম" },
  line: { en: "What Premium adds, and the price.", bn: "প্রিমিয়ামে কী পাবেন, আর দাম।" },
};

/** "See more" opens these eight in place. */
const MORE: Service[] = [
  fromMap("research", "research"),
  fromMap("sectors", "sectors"),
  // 2026-11-23: the portfolio builder took Updates' place (the bell opens Updates).
  fromMap("builder", "builder"),
  fromMap("watchlist", "watchlist"),
  fromMap("portfolio", "portfolio"),
  AI,
  fromMap("guides", "guides"),
  PREMIUM,
];

const ALL = [...FIRST, ...MORE];

/** "What is each one?": every page under its place, then TopStock AI and Premium. */
const MAP_GROUPS: { key: string; name: Bi; href?: string; items: Service[] }[] = [
  ...PLACES.map((pl) => ({
    key: pl.key,
    name: pl.name,
    href: pl.key === "learn" ? undefined : pl.href,
    items: pl.pages.map((p) => fromMap(p.key, p.key)),
  })),
  { key: "more", name: { en: "More", bn: "আরও" }, items: [AI, PREMIUM] },
];

/**
 * "What you can do" (2026-11-17, the bKash-style home): eight icons with
 * one-or-two-word labels, "See more" for eight more, and "What is each one?"
 * for one line about every page. It replaced the dashboard's feature cards
 * (screener, compare, ranking, research, learn, explore links): the page
 * behind each icon explains itself and, where it is Premium, opens with its
 * own Premium card. Free readers see a crown on the Premium pages; members see
 * a thin gold ring on them instead (round 2, 2026-11-18: what they unlocked);
 * a small gold number shows what is new (the Buy List's joiners this week,
 * "For you"'s new picks today). "See more" and "What is each one?" sit side by
 * side on the card's bottom edge from the start. Every icon carries its own
 * `data-card` for the home tap tracking.
 */
export default function ServiceGrid({
  lang,
  premium,
  badges,
  listId = "hm-grid-list",
}: {
  lang: Lang;
  premium: boolean;
  /** The list's id (the guest home renders one grid per language). */
  listId?: string;
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
      <ul className="hm-grid-list" id={listId}>
        {shown.map((s) => {
          const n = badges[s.key] ?? 0;
          return (
            <li key={s.key} data-card={`icon-${s.key}`}>
              <Link href={bn && s.hrefBn ? s.hrefBn : s.href} className="hm-svc">
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
          aria-controls={listId}
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

      {/* The whole map, grouped by place (2026-11-20): the same groups and
          names as the menu, so the home teaches the map. */}
      <Sheet open={sheet} onClose={() => setSheet(false)} title={bn ? "কোনটা কী কাজের" : "What each one does"}>
        {MAP_GROUPS.map((g) => (
          <div key={g.key} className="hm-sheet-group">
            <p className="hm-sheet-place">
              {g.href ? (
                <Link href={g.href} onClick={() => setSheet(false)}>
                  {pick(g.name)}
                  <IconChevronRight size={14} />
                </Link>
              ) : (
                pick(g.name)
              )}
            </p>
            <ul className="hm-sheet-list">
          {g.items.map((s) => (
            <li key={s.key}>
              <Link href={bn && s.hrefBn ? s.hrefBn : s.href} className="hm-sheet-row" onClick={() => setSheet(false)}>
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
          </div>
        ))}
      </Sheet>
    </section>
  );
}
