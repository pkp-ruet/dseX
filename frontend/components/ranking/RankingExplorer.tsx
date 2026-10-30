"use client";

import { useEffect, useMemo, useState } from "react";
import { useUrlParams, useUrlSync } from "@/lib/use-url-state";
import { TIER_LABELS, TIER_LABELS_BN, TIER_VAR, type TierKey } from "@/lib/constants";
import { T } from "@/components/i18n/T";
import { useLang } from "@/context/LangContext";
import { sectorBn } from "@/lib/bn";
import Chip from "@/components/ui/Chip";
import { IconCrown } from "@/components/ui/icons";
import { usePremium } from "@/lib/premium";
import { trackEvent } from "@/lib/track";
import FullRankTable, {
  type RankSort,
  type RankSortCol,
  type RankedItem,
  type RankedRow,
} from "@/components/ranking/FullRankTable";
import YourRankingSheet from "@/components/ranking/YourRankingSheet";
import {
  DEFAULT_WEIGHTS,
  bestValueKey,
  customScore,
  isDefault,
  readWeights,
  saveWeights,
  type Weights,
} from "@/components/ranking/weights";


const TIERS_ORDER: TierKey[] = ["excellent", "good", "average", "weak"];

const SORT_COLS: RankSortCol[] = ["rank", "name", "value", "growth", "dividend", "best"];
const DEFAULT_SORT: RankSort = { col: "rank", dir: "asc" };
/** The page's one Premium card (`PageQuestions`). */
const PREMIUM_ANCHOR = "rk-premium";

/** Phone sort menu — the column headers are hidden below 640px. `<option>`
 *  holds plain text only, so the menu reads the language through `useLang()`. */
const SORT_OPTIONS: { value: string; label: string; labelBn: string }[] = [
  { value: "rank-asc", label: "Score: strongest first", labelBn: "স্কোর: সবচেয়ে শক্ত আগে" },
  { value: "rank-desc", label: "Score: weakest first", labelBn: "স্কোর: সবচেয়ে দুর্বল আগে" },
  // Premium (2026-10-31): good companies at a low price first.
  { value: "best-desc", label: "Best value: good company, low price", labelBn: "সেরা দাম: ভালো কোম্পানি, কম দাম" },
  { value: "value-desc", label: "Price today: best value first", labelBn: "আজকের দাম: সবচেয়ে ভালো দাম আগে" },
  { value: "growth-desc", label: "Profit growth: highest first", labelBn: "মুনাফা বৃদ্ধি: বেশি আগে" },
  { value: "dividend-desc", label: "Dividend: highest first", labelBn: "ডিভিডেন্ড: বেশি আগে" },
  { value: "name-asc", label: "Name: A to Z", labelBn: "নাম: A থেকে Z" },
];

interface Props {
  items: RankedItem[];
  counts: Record<string, number>;
  total: number;
  sectors: string[];
}

/** The number a sortable column orders by; null always sorts last. */
function sortValue(row: RankedRow, col: RankSortCol): number | string | null {
  const i = row.item;
  switch (col) {
    case "rank":
      return row.rank;
    case "name":
      return (i.company_name ?? i.trading_code).toUpperCase();
    case "value":
      return i.p4_val ?? null;
    case "growth":
      return i.eps_yoy_pct ?? null;
    case "dividend":
      return i.div_yield_pct ?? null;
    case "best":
      return null; // ordered by `bestValueKey` below
  }
}

function scrollToPremium() {
  document.getElementById(PREMIUM_ANCHOR)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export default function RankingExplorer({ items, counts, total, sectors }: Props) {
  const [query, setQuery] = useState("");
  const [sector, setSector] = useState("all");
  // Empty = every grade shown. Picking chips narrows to just those grades.
  const [picked, setPicked] = useState<Set<TierKey>>(() => new Set());
  const [sort, setSort] = useState<RankSort>(DEFAULT_SORT);
  const { lang } = useLang();
  const bn = lang === "bn";
  const L = (en: string, b: string) => (bn ? b : en);
  const { isPremium, isLoading, state } = usePremium();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const premium = mounted && isPremium;

  // "Your own ranking" (Premium, 2026-10-31): the reader's weights, kept in this browser.
  const [weights, setWeights] = useState<Weights>(DEFAULT_WEIGHTS);
  const [sheetOpen, setSheetOpen] = useState(false);
  useEffect(() => {
    const saved = readWeights();
    if (saved) setWeights(saved);
  }, []);
  const ownRanking = premium && !isDefault(weights);

  // ---- URL ⇄ state: ?q=…&sector=…&tiers=excellent,good&sort=growth&dir=desc ----
  // Defaults render on the server; the query string is applied once after
  // mount, then every change is mirrored back so the view is linkable.
  // `sort=best` (Premium) is applied only once the plan is known.
  const urlParams = useUrlParams();
  const [urlReady, setUrlReady] = useState(false);
  useEffect(() => {
    if (!urlParams || isLoading) return;
    const q = urlParams.get("q");
    if (q) setQuery(q);
    const sec = urlParams.get("sector");
    if (sec && sectors.includes(sec)) setSector(sec);
    const tiers = urlParams.get("tiers");
    if (tiers) {
      const chosen = tiers
        .split(",")
        .filter((t): t is TierKey => (TIERS_ORDER as string[]).includes(t));
      if (chosen.length > 0 && chosen.length < TIERS_ORDER.length) setPicked(new Set(chosen));
    }
    const col = urlParams.get("sort");
    if (col && (SORT_COLS as string[]).includes(col) && (col !== "best" || isPremium)) {
      setSort({ col: col as RankSortCol, dir: urlParams.get("dir") === "asc" ? "asc" : "desc" });
    }
    setUrlReady(true);
  }, [urlParams, sectors, isLoading, isPremium]);
  const isDefaultSort = sort.col === DEFAULT_SORT.col && sort.dir === DEFAULT_SORT.dir;
  useUrlSync(
    {
      q: query.trim() || null,
      sector: sector === "all" ? null : sector,
      tiers: picked.size === 0 ? null : TIERS_ORDER.filter((t) => picked.has(t)).join(","),
      sort: isDefaultSort ? null : sort.col,
      dir: isDefaultSort ? null : sort.dir,
    },
    urlReady
  );

  // Assign each company its stable global rank once (tier order → by score),
  // or — with the reader's own weights — by their score, in one flat list.
  const ranked = useMemo<RankedRow[]>(() => {
    if (ownRanking) {
      return items
        .map((item) => ({ item, s: customScore(item, weights) }))
        .sort((a, b) => (b.s ?? -1) - (a.s ?? -1) || a.item.trading_code.localeCompare(b.item.trading_code))
        .map((x, k) => ({ item: x.item, rank: k + 1 }));
    }
    const rows: RankedRow[] = [];
    let rank = 1;
    for (const tier of TIERS_ORDER) {
      for (const item of items.filter((i) => i.tier === tier)) {
        rows.push({ item, rank: rank++ });
      }
    }
    return rows;
  }, [items, ownRanking, weights]);

  const filtered = useMemo<RankedRow[]>(() => {
    const q = query.trim().toUpperCase();
    const rows = ranked.filter(({ item }) => {
      if (picked.size > 0 && !picked.has(item.tier)) return false;
      if (sector !== "all" && item.sector !== sector) return false;
      if (q) {
        const code = item.trading_code.toUpperCase();
        const name = (item.company_name ?? "").toUpperCase();
        if (!code.includes(q) && !name.includes(q)) return false;
      }
      return true;
    });
    if (isDefaultSort) return rows;
    if (sort.col === "best") {
      return [...rows].sort((a, b) => {
        const ka = bestValueKey(a.item);
        const kb = bestValueKey(b.item);
        return kb[0] - ka[0] || kb[1] - ka[1] || kb[2] - ka[2] || a.rank - b.rank;
      });
    }
    const sign = sort.dir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const va = sortValue(a, sort.col);
      const vb = sortValue(b, sort.col);
      if (va == null && vb == null) return a.rank - b.rank;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (va === vb) return a.rank - b.rank;
      return (va < vb ? -1 : 1) * sign;
    });
  }, [ranked, query, sector, picked, sort, isDefaultSort]);

  const toggleTier = (tier: TierKey) => {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(tier)) next.delete(tier);
      else next.add(tier);
      // Every grade picked is the same as none picked — keep the URL clean.
      return next.size === TIERS_ORDER.length ? new Set() : next;
    });
  };

  // First tap on a column sorts its natural way (names A–Z, numbers high
  // first, rank strongest first); a second tap flips it.
  const onSort = (col: RankSortCol) => {
    setSort((prev) =>
      prev.col === col
        ? { col, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { col, dir: col === "rank" || col === "name" ? "asc" : "desc" }
    );
  };

  const viewCounts: Partial<Record<TierKey, number>> = {};
  for (const { item } of filtered) viewCounts[item.tier] = (viewCounts[item.tier] ?? 0) + 1;

  const isFiltered =
    query.trim() !== "" || sector !== "all" || picked.size > 0 || !isDefaultSort;

  const reset = () => {
    setQuery("");
    setSector("all");
    setPicked(new Set());
    setSort(DEFAULT_SORT);
  };

  // A free reader's tap on a Premium choice goes to the page's Premium card.
  const toPremium = (lock: string) => {
    trackEvent("premium_lock_tap", { area: "rankings", lock, state });
    scrollToPremium();
  };

  const applyWeights = (w: Weights) => {
    setWeights(w);
    saveWeights(w);
    trackEvent("rank_weights", { custom: isDefault(w) ? "no" : "yes" });
  };

  return (
    <div className="rk-explorer">
      <div className="rk-filters">
        <div className="rk-filter-row">
          <div className="rk-chips" role="group" aria-label={L("Filter by grade", "গ্রেড অনুযায়ী বাছুন")}>
            {TIERS_ORDER.map((tier) => (
              <Chip
                key={tier}
                active={picked.has(tier)}
                onClick={() => toggleTier(tier)}
                icon={<span className="rk-dot" style={{ background: TIER_VAR[tier] }} />}
                aria-label={L(
                  `${TIER_LABELS[tier]}: ${counts[tier] ?? 0} companies`,
                  `${TIER_LABELS_BN[tier]}: ${counts[tier] ?? 0}টি কোম্পানি`,
                )}
              >
                <T en={TIER_LABELS[tier]} bn={TIER_LABELS_BN[tier]} />
                <span className="nums font-normal">{counts[tier] ?? 0}</span>
              </Chip>
            ))}
          </div>

          <div className="rk-search">
            <svg className="rk-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
              <path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <input
              id="rank-search"
              type="search"
              className="rk-search-input"
              placeholder={L("Search company or code", "কোম্পানি বা কোড খুঁজুন")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label={L("Search companies", "কোম্পানি খুঁজুন")}
            />
          </div>

          <select
            className="rk-select"
            value={sector}
            onChange={(e) => setSector(e.target.value)}
            aria-label={L("Filter by sector", "সেক্টর অনুযায়ী বাছুন")}
          >
            <option value="all">{L("All sectors", "সব সেক্টর")}</option>
            {sectors.map((s) => (
              <option key={s} value={s}>
                {bn ? sectorBn(s) : s}
              </option>
            ))}
          </select>

          <select
            className="rk-select rk-sort-select"
            value={`${sort.col}-${sort.dir}`}
            onChange={(e) => {
              const [col, dir] = e.target.value.split("-");
              if (col === "best" && !premium) {
                toPremium("rankings-best-value");
                return;
              }
              setSort({ col: col as RankSortCol, dir: dir === "asc" ? "asc" : "desc" });
            }}
            aria-label={L("Sort by", "সাজানোর ক্রম")}
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {(bn ? o.labelBn : o.label) +
                  (o.value === "best-desc" && !premium ? L(" · Premium", " · প্রিমিয়াম") : "")}
              </option>
            ))}
          </select>

          {/* Desktop's way to the best-value order (phones use the sort menu). */}
          <button
            type="button"
            className={`rk-own-btn rk-best-btn${sort.col === "best" ? " is-on" : ""}`}
            aria-pressed={sort.col === "best"}
            onClick={() => {
              if (!premium) {
                toPremium("rankings-best-value");
                return;
              }
              setSort(sort.col === "best" ? DEFAULT_SORT : { col: "best", dir: "desc" });
            }}
          >
            <IconCrown size={14} />
            <T en="Best value first" bn="সেরা দাম আগে" />
          </button>

          <button
            type="button"
            className={`rk-own-btn${ownRanking ? " is-on" : ""}`}
            onClick={() => {
              setSheetOpen(true);
              if (!premium) trackEvent("premium_lock_view", { area: "rankings", lock: "rankings-own", state });
            }}
          >
            <IconCrown size={14} />
            <T en="Your own ranking" bn="নিজের র‍্যাঙ্কিং" />
          </button>
        </div>

        {/* How the market splits across the four grades — a key, not a control */}
        <div className="rk-split-row">
          <div className="rk-split" aria-hidden>
            {TIERS_ORDER.map((tier) => (
              <span
                key={tier}
                className={`rk-split-seg${picked.size > 0 && !picked.has(tier) ? " is-dim" : ""}`}
                style={{ flexGrow: counts[tier] ?? 0, background: TIER_VAR[tier] }}
              />
            ))}
          </div>
          <span className="rk-showing nums">
            <T
              en={
                <>
                  Showing <strong>{filtered.length}</strong> of {total}
                </>
              }
              bn={
                <>
                  {total}টির মধ্যে <strong>{filtered.length}</strong>টি দেখানো হচ্ছে
                </>
              }
            />
          </span>
          {isFiltered && (
            <button type="button" className="rk-reset" onClick={reset}>
              <T en="Reset" bn="আগের মতো করুন" />
            </button>
          )}
        </div>

        {ownRanking && (
          <p className="rk-own-note">
            <T
              en="Ranked by your own weights. The grades and scores are still ours."
              bn="আপনার নিজের ভার অনুযায়ী সাজানো। গ্রেড আর স্কোর আমাদেরই।"
            />
            <button type="button" className="rk-reset" onClick={() => applyWeights(DEFAULT_WEIGHTS)}>
              <T en="Use our ranking" bn="আমাদের র‍্যাঙ্কিং দেখুন" />
            </button>
          </p>
        )}
      </div>

      {/* The whole ranking is free (2026-10-29: facts are free). Premium adds
          (2026-10-31) the best-value order, your own ranking, and in each row's
          quick view a year of rank, the signal's reason and rank alerts — all
          named by the page's one Premium card, `#rk-premium`. */}
      <FullRankTable
        rows={filtered}
        grouped={isDefaultSort && !ownRanking}
        sort={sort}
        onSort={onSort}
        groupCounts={viewCounts}
      />

      <YourRankingSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        weights={weights}
        onApply={applyWeights}
        locked={!premium}
        onPremium={() => {
          setSheetOpen(false);
          toPremium("rankings-own");
        }}
      />
    </div>
  );
}
