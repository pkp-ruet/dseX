"use client";

import Link from "@/components/ui/Link";
import { forYouCounts, type ForYou, type ForYouItem } from "@/lib/api";
import type { Lang } from "@/context/LangContext";
import { t } from "@/lib/home-copy";
import { changePct, changeTone, money } from "@/lib/formatters";
import { trackEvent } from "@/lib/track";
import OwnerMark from "@/components/home/personalized/OwnerMark";
import Skeleton from "@/components/ui/Skeleton";
import { StockRank } from "@/components/ui/StockRow";
import { IconArrowRight, IconSparkle } from "@/components/ui/icons";
import { FREE_DISCOVER_ROWS } from "@/lib/free-share";

/** The page that holds the whole list and every pick's reasons. */
export const PICKS_PATH = "/discover";
const TILES = 3;

/** Kinds tied to the reader's own shares: their fit word reads clay. */
const OWN_KINDS = new Set(["add_more", "watched", "upgrade", "similar", "style", "asked", "new_area"]);

/**
 * Since 2026-11-08 "Discover" (was "Picked for you") is a list of companies to explore, not
 * a buy list: strong companies the reader doesn't own or follow yet, at any
 * price, never one on today's Buy List (the card above it with the market).
 * No price word on the tiles, quiet rank numbers, and the lead says "not a
 * buy list".
 *
 * "Picked for you" on the dashboard (2026-11-05, user: "dashboard only show
 * top 3 in a single row with only some keyword and a link to full page"):
 * three tiles in one row from 768px, three compact rows on phones (user,
 * same day: "mobile view needs scrolling … if 3 row looks better do it"),
 * each = rank, company, price, the fit word and two or three keywords; every tile and the footer
 * open `/discover`, where each pick is argued in full. The home bundle
 * carries only these three items (`counts` describes the whole list).
 *
 * Open for every reader since 2026-11-08 (user: "Open list, lock depth";
 * it was Premium with locked tiles 2026-11-01 → 11-08): the three tiles
 * show to everyone; on the page a free reader gets the top
 * FREE_DISCOVER_ROWS with why each fits them, Premium the rest of the list
 * and the full case under each company.
 */
export default function ForYouCard({
  data,
  loading,
  premium,
  name,
  held,
  watched,
  lang = "en",
}: {
  data: ForYou | null | undefined;
  loading: boolean;
  premium: boolean;
  /** The reader's display name; the headline uses the first word of it. */
  name?: string | null;
  held: Set<string>;
  watched: Set<string>;
  lang?: Lang;
}) {
  const bn = lang === "bn";
  const counts = data ? forYouCounts(data) : null;
  const n = counts?.total ?? 0;

  const eyebrow = (
    <p className="fy-eyebrow">
      <IconSparkle size={14} />
      {t(lang, "forYouEyebrow")}
    </p>
  );

  if (!data || !counts) {
    if (!loading) return null;
    return (
      <section className="soft-card fy" aria-busy="true">
        <div className="fy-top">{eyebrow}</div>
        <ul className="fy-tiles">
          {[0, 1, 2].map((k) => (
            <li key={k} className="fy-tile-li">
              <div className="fy-skel">
                <Skeleton width="70%" height={16} />
                <Skeleton width="45%" height={12} />
                <Skeleton width="80%" height={22} />
              </div>
            </li>
          ))}
        </ul>
      </section>
    );
  }
  if (n === 0) return null;

  const first = (name ?? "").trim().split(/\s+/)[0] || "";
  const personal = data.mode === "personal";
  const top = data.items.slice(0, TILES);
  const k = Math.min(TILES, n);

  const title = t(lang, first ? "forYouTilesHeadName" : "forYouTilesHead", { name: first, k });
  const lead = t(lang, personal ? "forYouTilesLeadPersonal" : "forYouTilesLeadGeneric", { passed: data.funnel.passed });

  const href = (code?: string) => (code ? `${PICKS_PATH}#pick-${code}` : PICKS_PATH);
  const onTap = (code?: string) => {
    trackEvent("picks_tile_tap", { code: code ?? "all", plan: premium ? "premium" : "free" });
  };

  return (
    <section className={`soft-card fy ${bn ? "font-bn" : ""}`} lang={bn ? "bn" : undefined} aria-labelledby="fy-title">
      <div className="fy-top">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          {eyebrow}
          {counts.new > 0 && (
            <span className="text-xs font-semibold text-positive">{t(lang, "forYouNewToday", { n: counts.new })}</span>
          )}
        </div>
        <div className="fy-headline">
          <div className="min-w-0">
            <h3 id="fy-title" className="fy-title">
              {title}
            </h3>
            <p className="fy-lead">{lead}</p>
          </div>
          <Link prefetch={false} href={href()} onClick={() => onTap()} className="fy-all">
            {t(lang, "forYouSeeAllShort", { n })}
            <IconArrowRight size={14} />
          </Link>
        </div>
      </div>

      <ol className="fy-tiles">
        {top.map((it, i) => (
          <Tile key={it.code} it={it} rank={i + 1} href={href(it.code)} onTap={() => onTap(it.code)} held={held} watched={watched} lang={lang} />
        ))}
      </ol>

      <Link prefetch={false} href={href()} onClick={() => onTap()} className="fy-foot">
        {premium ? t(lang, "forYouSeeAll", { n }) : t(lang, "forYouFreeCta", { k: Math.min(FREE_DISCOVER_ROWS, n) })}
        <IconArrowRight size={16} />
      </Link>
    </section>
  );
}

function Tile({
  it,
  rank,
  href,
  onTap,
  held,
  watched,
  lang,
}: {
  it: ForYouItem;
  rank: number;
  href: string;
  onTap: () => void;
  held: Set<string>;
  watched: Set<string>;
  lang: Lang;
}) {
  const bn = lang === "bn";
  const own = OWN_KINDS.has(it.kind);
  // The group and price words, then the one figure that stands out. A
  // backend from before the keywords sends none: fall back to the old points.
  const words = it.keywords?.length
    ? it.keywords.map((w) => ({ text: bn ? w.bn : w.en, tone: w.tone }))
    : (it.points ?? []).slice(0, 2).map((p) => ({ text: bn ? p.bn : p.en, tone: "neutral" as const }));
  // One set of parts, placed by CSS: a compact row on phones (rank · name ·
  // price, then ticker · fit word, then the keywords), a tile from 768px.
  return (
    <li className="fy-tile-li">
      <Link prefetch={false} href={href} onClick={onTap} className="fy-tile">
        <span className="fy-tile-rank">
          <StockRank n={rank} />
        </span>
        <span className="fy-tile-name">{it.name || it.code}</span>
        <span className="fy-tile-meta">
          <span className="fy-tile-code">
            {it.code}
            <OwnerMark code={it.code} held={held} watched={watched} lang={lang} />
          </span>
          <span className="fy-dot" aria-hidden="true">·</span>
          <span className={`fy-fit ${own ? "fy-fit--own" : ""}`}>{bn ? it.tag_bn : it.tag_en}</span>
          {it.new && <span className="fy-new">{t(lang, "forYouNew")}</span>}
        </span>
        <span className="fy-tile-price">
          <span className="nums font-semibold text-text-main">{money(it.price)}</span>
          {it.change_pct != null && <span className={`nums ${changeTone(it.change_pct)}`}>{changePct(it.change_pct)}</span>}
        </span>
        {words.length > 0 && (
          <span className="fy-words">
            {words.map((w) => (
              <span key={w.text} className={`fy-word ${w.tone === "good" ? "fy-word--good" : ""}`}>
                {w.text}
              </span>
            ))}
          </span>
        )}
      </Link>
    </li>
  );
}
