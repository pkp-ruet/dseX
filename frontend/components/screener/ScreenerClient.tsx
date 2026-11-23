"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import Button from "@/components/ui/Button";
import Sheet from "@/components/ui/Sheet";
import EmptyState from "@/components/ui/EmptyState";
import {
  IconActivity, IconArrowDown, IconArrowUp, IconBell, IconBlocks, IconBriefcase, IconCalendar, IconCheck,
  IconCheckCircle, IconChevronDown, IconClose, IconCoin, IconCrown, IconGift, IconList, IconPie, IconTag, IconTarget,
  IconTrendDown, IconTrendUp, IconTrophy, IconWallet,
} from "@/components/ui/icons";
import PageGate from "@/components/premium/PageGate";
import { PageLockScope } from "@/components/premium/LockScope";
import { showLimitNotice } from "@/components/premium/LimitNotice";
import { PersonalCodesProvider, usePersonalCodesCtx } from "@/components/market-analysis/PersonalCodes";
import { T } from "@/components/i18n/T";
import ScreenerList, { PAGE } from "./ScreenerList";
import ScreenerPremium, { SCREENER_ANCHOR } from "./ScreenerPremium";
import AlmostThere from "./AlmostThere";
import ListLeft from "./ListLeft";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/context/LangContext";
import { usePremium, isLimitError } from "@/lib/premium";
import { useUrlParams, useUrlSync } from "@/lib/use-url-state";
import { toast } from "@/lib/toast";
import { trackEvent } from "@/lib/track";
import { formatDate } from "@/lib/formatters";
import {
  DEFAULT_SORT, applyScreen, cell, decodeFilters, encodeFilters, figureWords, isScreenWatch, keyHead, keyOf,
  listScreens, matchGoal, matches, mergeFilters, nearMisses, passes, rowReason, screenWatchName, screenWatchSpec,
  stripSafety, unpackRows, valueWords, withSafety, type Bi, type ScreenerRow,
} from "@/lib/screener";
import {
  apiCreateCustomList, apiGetCustomLists, apiUpdateCustomList,
  type SavedCustomList, type ScreenerFilter, type ScreenerReady, type ScreenerSpec, type ScreenerUniverse,
} from "@/lib/api";

type Order = { sort: string; dir: "asc" | "desc" };

/** One icon per list, so the tiles can be told apart at a glance. */
const LIST_ICON: Record<string, ComponentType<{ size?: number }>> = {
  strong_cheap: IconTag,
  low_pe: IconTarget,
  below_book: IconWallet,
  big_steady: IconBlocks,
  biggest: IconTrophy,
  most_traded: IconActivity,
  steady_dividends: IconCoin,
  high_dividend: IconGift,
  dividend_soon: IconCalendar,
  profit_growing: IconTrendUp,
  no_loans: IconCheckCircle,
  owners_hold: IconPie,
  owners_buying: IconBriefcase,
  near_high: IconArrowUp,
  near_low: IconArrowDown,
  strong_near_low: IconTrendDown,
};

/** A price dropdown choice as a filter. */
const priceFilter = (p: { min: number | null; max: number | null }): ScreenerFilter => ({
  key: "price", ...(p.min != null ? { min: p.min } : {}), ...(p.max != null ? { max: p.max } : {}),
});

/** Where a tapped row is remembered, so coming back from its stock page reopens the same list at it. */
const BACK_KEY = "dsex.scr.back";

/** Visible copy as both languages, so the server HTML needs no re-render to switch. */
const tt = (en: string, bn: string) => <T en={en} bn={bn} />;

/**
 * The stock screener (`/screener`; Premium since 2026-11-14).
 *
 * 2026-11-24 (user: "instead of show a table at bottom … instant popping up
 * the list", then "yes build it. also dont use previous table. design a new
 * table with relevant key information which look clean and easy to read"):
 *
 * - **The page** is the 16 lists as tiles ("Pick a list"), "How we pick each
 *   list" and "See every share". No filters, no result and (since
 *   2026-11-24, user: "remove saved screen from screener") no saved-screen
 *   strip or section on the page itself: Watch in the pop-up is the one way
 *   to keep an eye on a list, and a tile wears a bell while any form of it is
 *   watched. A watched screen still opens from its alert (`?list=<id>`).
 * - **A tap opens the list in a pop-up** (`Sheet size="xl"`: nearly the whole
 *   phone screen, ≈ 880px on desktop): the list's line, then a sticky bar with
 *   the Sector and Share price dropdowns (each choice with its count), the
 *   order (members) and Watch (one tap, named for what is shown), then the
 *   shares (`ScreenerList`: #, company + why, price, the list's key figure),
 *   "Left this week", "Almost there" and "How we pick" folded at the end.
 *   A reader without Premium gets the count and the one Premium card there.
 * - **The back button closes it**: opening pushes a history entry
 *   (`scrSheet`), closing goes back, and a back press just closes it. The list
 *   and its sector / price live in the URL, so coming back from a stock page
 *   reopens the same list at the same row (`BACK_KEY`).
 *
 * Every list is Premium (2026-11-24, "Lock them too"); "See every share" by
 * sector and price is public figures, open to everyone. The safety rules (no
 * Z, ৳10 lakh a day) are always on. Every company's figures arrive with the
 * page (`GET /api/screener`), so nothing waits on a request.
 *
 * 2026-11-24 (user: "Build 1, 2 and 3" of the ideas to make it worth paying
 * for): (1) a reader without Premium sees a list's first rows masked — every
 * figure and reason, the company a grey bar — and a Premium card that says
 * what is hidden in counts; (2) the reader's own shares wear H / ★ in a list,
 * a line names them ("Your shares on this list"; a count without Premium),
 * and "Check my shares" shows, for each share they own or follow, the lists
 * it is on and the one thing it misses on the closest others (Premium; free
 * readers get the counts); (3) a member taps a row for its quick look.
 */
export default function ScreenerClient({ data }: { data: ScreenerUniverse }) {
  return (
    <PersonalCodesProvider>
      <ScreenerInner data={data} />
    </PersonalCodesProvider>
  );
}

/** How many masked rows a reader without Premium sees before the card. */
const MASKED_ROWS = 5;

function ScreenerInner({ data }: { data: ScreenerUniverse }) {
  const { isLoggedIn, isLoading: authLoading } = useAuth();
  const { isPremium } = usePremium();
  const { bn } = useLang();
  const t = useCallback((en: string, b: string) => (bn ? b : en), [bn]);

  const rows = useMemo(() => unpackRows(data), [data]);
  const defs = useMemo(() => new Map(data.filters.map((f) => [f.key, f] as const)), [data]);
  const ranges = useMemo(() => data.filters.filter((f) => f.kind === "range"), [data]);
  // The order menu: every range on the filter menu, plus our score.
  const orders = useMemo(() => ranges.filter((f) => f.menu !== false || f.key === "score"), [ranges]);
  /** Every list with a tile, in the backend's order. */
  const cards = useMemo(() => listScreens(data.ready), [data.ready]);
  const goalById = useMemo(() => new Map(cards.map((g) => [g.id, g] as const)), [cards]);

  // --- What the pop-up shows ------------------------------------------------
  const [listId, setListId] = useState<string | null>(null);
  /** "See every share": the pop-up with no list, by sector and price. */
  const [every, setEvery] = useState(false);
  const [own, setOwn] = useState<ScreenerFilter[]>([]);
  const [order, setOrder] = useState<Order | null>(null);
  const [limit, setLimit] = useState(PAGE);
  /** A row to bring back into view once the pop-up has drawn it. */
  const [backTo, setBackTo] = useState<string | null>(null);
  const [howOpen, setHowOpen] = useState(false);
  const [saved, setSaved] = useState<SavedCustomList[] | null>(null);
  const [watchBusy, setWatchBusy] = useState(false);
  /** "Check my shares": the reader's shares against every list. */
  const [mineOpen, setMineOpen] = useState(false);
  const personal = usePersonalCodesCtx();
  const open = listId != null || every;
  const list = listId ? goalById.get(listId) : undefined;

  const viewKey = `${listId ?? ""}|${every ? "all" : ""}|${encodeFilters(own)}|${order?.sort ?? ""}`;

  // --- Opening and closing, with the back button --------------------------
  const clearSheet = useCallback(() => {
    setListId(null);
    setEvery(false);
    setOwn([]);
    setOrder(null);
    setLimit(PAGE);
  }, []);
  /** A history entry for the open pop-up, so the phone's back button closes it. */
  const pushSheet = () => {
    if (window.history.state?.scrSheet) return;
    window.history.pushState({ ...window.history.state, scrSheet: 1 }, "");
  };
  const closeSheet = () => {
    if (window.history.state?.scrSheet) window.history.back();   // popstate below clears it
    else {
      clearSheet();
      setMineOpen(false);
    }
  };
  useEffect(() => {
    const onPop = () => {
      if (window.history.state?.scrSheet) return;
      clearSheet();
      setMineOpen(false);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [clearSheet]);

  const openList = (id: string) => {
    pushSheet();
    setMineOpen(false);
    setListId(id);
    setEvery(false);
    setOwn([]);
    setOrder(null);
    setLimit(PAGE);
    trackEvent("screener_list", { id });
  };
  const openMine = () => {
    pushSheet();
    setMineOpen(true);
    trackEvent("screener_mine", { state: isPremium ? "premium" : "free", shares: myCodes.length });
  };
  const openEvery = () => {
    pushSheet();
    setListId(null);
    setEvery(true);
    setOwn([]);
    setOrder(null);
    setLimit(PAGE);
    trackEvent("screener_list", { id: "every" });
  };
  /** A saved screen in the pop-up, as it was made. `push` false when the URL opened it. */
  function openSaved(l: SavedCustomList, push = true) {
    const raw = (l.legacy ? l.filters_spec : l.spec) as ScreenerSpec | undefined;
    if (!raw) return;
    if (push) pushSheet();
    const savedLists = (raw.lists ?? []).filter((id) => goalById.has(id));
    let id: string | null = null;
    let ownF: ScreenerFilter[] = [];
    if ((raw.lists || raw.own) && savedLists.length <= 1) {
      id = savedLists[0] ?? null;
      ownF = raw.own ?? [];
    } else {
      const hit = matchGoal(raw, cards);
      if (hit) {
        id = hit.goal.id;
        ownF = hit.refine;
      } else {
        ownF = stripSafety(raw.filters).filters;
      }
    }
    setListId(id);
    setEvery(id == null);
    setOwn(ownF);
    setOrder(raw.sort && raw.sort !== DEFAULT_SORT ? { sort: raw.sort, dir: raw.dir } : null);
    setLimit(PAGE);
    if (l.dropped?.length) {
      toast({
        message: t(
          `This screen was made in the old screener. ${l.dropped.map((d) => d.en).join(", ")} has no filter here, so it was left out.`,
          `স্ক্রিনটি পুরোনো স্ক্রিনারে বানানো। ${l.dropped.map((d) => d.bn).join(", ")}-এর কোনো ফিল্টার এখানে নেই, তাই বাদ গেছে।`,
        ),
        tone: "neutral",
      });
    }
  }

  // URL → state, once after mount: `ready` = the list (a ready-made screen
  // from before 2026-11-14 opens as its filters), `f` = sector / price (or a
  // link's other filters, as chips), `all=1` = every share, `sort` / `dir` =
  // the order (opens every share without a list), `list=<id>` (the daily
  // push, the Updates row) opens that watched screen. No history entry is
  // pushed for a pop-up the URL opened.
  const params = useUrlParams();
  useEffect(() => {
    if (!params) return;
    const ids = (params.get("ready") ?? "").split(",").filter(Boolean);
    const hit = ids.find((id) => goalById.has(id));
    let opened = false;
    if (hit) {
      setListId(hit);
      opened = true;
    }
    const old = ids.length === 1 && !hit ? data.ready.find((r) => r.id === ids[0]) : undefined;
    if (old) {
      setOwn(stripSafety(old.spec.filters).filters);
      setOrder({ sort: old.spec.sort, dir: old.spec.dir });
      setEvery(true);
      opened = true;
    }
    const f = params.get("f");
    if (f) setOwn(stripSafety(decodeFilters(f, defs)).filters);
    const sort = params.get("sort");
    if (sort && (sort === "name" || ranges.some((r) => r.key === sort))) {
      setOrder({ sort, dir: params.get("dir") === "asc" ? "asc" : "desc" });
      if (!hit) setEvery(true);
      opened = true;
    }
    if (params.get("all") === "1" && !hit) {
      setEvery(true);
      opened = true;
    }
    if (f && !opened) setEvery(true);
  }, [params, goalById, data.ready, defs, ranges]);

  // Back from a stock page: the same list, scrolled to the row that was tapped.
  useEffect(() => {
    if (!params || !open) return;
    try {
      const raw = sessionStorage.getItem(BACK_KEY);
      if (!raw) return;
      const b = JSON.parse(raw) as { key: string; code: string; limit: number };
      sessionStorage.removeItem(BACK_KEY);
      if (b.key !== viewKey) return;
      setLimit(Math.max(PAGE, b.limit));
      setBackTo(b.code);
    } catch { /* storage blocked: start at the top */ }
    // Only once, when the URL has opened the pop-up.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, open]);
  useEffect(() => {
    if (!backTo) return;
    const id = window.setTimeout(() => {
      document.getElementById(`scl-${backTo}`)?.scrollIntoView({ block: "center" });
      setBackTo(null);
    }, 80);
    return () => window.clearTimeout(id);
  }, [backTo]);
  const rememberRow = (code: string) => {
    try { sessionStorage.setItem(BACK_KEY, JSON.stringify({ key: viewKey, code, limit })); } catch { /* fine */ }
  };

  useUrlSync(
    {
      ready: listId,
      all: every && !listId ? "1" : null,
      f: own.length ? encodeFilters(own) : null,
      sort: order ? order.sort : null,
      dir: order ? order.dir : null,
    },
    params !== null,
  );

  const loadSaved = useCallback(() => {
    if (!isLoggedIn) return;
    apiGetCustomLists().then((r) => setSaved(r.lists)).catch(() => setSaved([]));
  }, [isLoggedIn]);
  useEffect(() => {
    if (!authLoading && isLoggedIn) loadSaved();
  }, [authLoading, isLoggedIn, loadSaved]);
  const openedSaved = useRef(false);
  useEffect(() => {
    if (openedSaved.current || !saved || !params) return;
    openedSaved.current = true;
    const hit = saved.find((l) => l.id === params.get("list"));
    if (hit) openSaved(hit, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saved, params]);

  // --- The shares ---------------------------------------------------------
  const listRules = useCallback((id: string | null) => (id ? goalById.get(id)?.spec.filters ?? [] : []), [goalById]);
  /** The list's rules + sector / price, merged (no safety rules). */
  const shownFilters = useMemo(() => mergeFilters([...listRules(listId), ...own]), [listRules, listId, own]);
  const sortNow: Order = order ?? (list ? { sort: list.spec.sort, dir: list.spec.dir } : { sort: DEFAULT_SORT, dir: "desc" });
  const effective: ScreenerSpec = useMemo(
    () => ({ v: 2, filters: withSafety(shownFilters), sort: sortNow.sort, dir: sortNow.dir }),
    [shownFilters, sortNow.sort, sortNow.dir],
  );
  const result = useMemo(() => (open ? applyScreen(rows, effective) : []), [open, rows, effective]);
  const near = useMemo(
    () => (open && shownFilters.length ? nearMisses(rows, effective) : []),
    [open, rows, effective, shownFilters.length],
  );
  const countOf = useCallback(
    (id: string | null, ownFilters: ScreenerFilter[]) =>
      applyScreen(rows, { v: 2, filters: withSafety(mergeFilters([...listRules(id), ...ownFilters])), sort: "name", dir: "asc" }).length,
    [rows, listRules],
  );
  /** Each tile's count: the list as it is (safety rules on). */
  const listCounts = useMemo(() => new Map(cards.map((g) => [g.id, countOf(g.id, [])] as const)), [cards, countOf]);

  // --- What changed this week (2026-11-23) --------------------------------
  const changes = useMemo(() => data.changes ?? {}, [data.changes]);
  const rowByCode = useMemo(() => new Map(rows.map((r) => [r.code, r] as const)), [rows]);
  const listNew = useMemo(
    () => new Map(cards.map((g) => {
      const joined = changes[g.id]?.joined ?? [];
      if (!joined.length) return [g.id, 0] as const;
      const fs = withSafety(g.spec.filters);
      return [g.id, joined.filter((c) => { const r = rowByCode.get(c); return !!r && matches(r.v, fs); }).length] as const;
    })),
    [cards, changes, rowByCode],
  );
  const listChange = listId ? changes[listId] : undefined;
  const newCodes = useMemo(() => new Set(listChange?.joined ?? []), [listChange]);
  const resultCodes = useMemo(() => new Set(result.map((r) => r.code)), [result]);
  const newInResult = useMemo(() => result.filter((r) => newCodes.has(r.code)).length, [result, newCodes]);
  const leftNow = useMemo(() => (listChange?.left ?? []).filter((x) => !resultCodes.has(x.code)), [listChange, resultCodes]);

  // --- Sector and share price, inside the pop-up --------------------------
  const priceDef = defs.get("price");
  const sectorDef = defs.get("sector");
  const sectorF = own.find((f) => f.key === "sector");
  const priceF = own.find((f) => f.key === "price");
  const sectorValue = sectorF?.in?.length === 1 ? sectorF.in[0] : "";
  const pricePresets = useMemo(() => priceDef?.presets ?? [], [priceDef]);
  const priceIndex = priceF
    ? pricePresets.findIndex((p) => (p.min ?? null) === (priceF.min ?? null) && (p.max ?? null) === (priceF.max ?? null))
    : -1;
  /** Filters the two dropdowns can't show (a saved screen's or a link's): removable chips. */
  const extra = own.filter((f) => !(f === sectorF && sectorValue) && !(f === priceF && priceIndex >= 0));
  const sectorCounts = useMemo(() => {
    if (!open) return { all: 0, by: new Map<string, number>() };
    const base = own.filter((f) => f.key !== "sector");
    return {
      all: countOf(listId, base),
      by: new Map((sectorDef?.options ?? []).map((o) => [o.value, countOf(listId, [...base, { key: "sector", in: [o.value] }])] as const)),
    };
  }, [open, own, countOf, listId, sectorDef]);
  const priceCounts = useMemo(() => {
    if (!open) return { all: 0, by: [] as number[] };
    const base = own.filter((f) => f.key !== "price");
    return { all: countOf(listId, base), by: pricePresets.map((p) => countOf(listId, [...base, priceFilter(p)])) };
  }, [open, own, countOf, listId, pricePresets]);
  const setOwnFilter = (key: string, f: ScreenerFilter | null) => {
    setOwn((xs) => {
      const i = xs.findIndex((x) => x.key === key);
      if (f && i >= 0) return xs.map((x, j) => (j === i ? f : x));
      if (f) return [...xs, f];
      return xs.filter((x) => x.key !== key);
    });
    setLimit(PAGE);
  };
  const pickSector = (v: string) => {
    setOwnFilter("sector", v ? { key: "sector", in: [v] } : null);
    trackEvent("screener_narrow", { key: "sector", value: v || "all" });
  };
  const pickPrice = (v: string) => {
    const p = v === "" ? null : pricePresets[Number(v)];
    setOwnFilter("price", p ? priceFilter(p) : null);
    trackEvent("screener_narrow", { key: "price", value: p ? p.en : "all" });
  };
  const sortBy = (key: string) => {
    const d = defs.get(key);
    const first: "asc" | "desc" = key === "name" ? "asc" : d && !d.high_good ? "asc" : "desc";
    setOrder({ sort: key, dir: sortNow.sort === key ? (sortNow.dir === "asc" ? "desc" : "asc") : first });
    setLimit(PAGE);
  };

  // --- The reader's own shares (2026-11-24) -------------------------------
  /** Shares they own, then shares they follow (owned first, each once). */
  const myCodes = useMemo(() => {
    const out = [...personal.portfolio].map((c) => c.toUpperCase());
    for (const c of personal.watchlist) if (!out.includes(c.toUpperCase())) out.push(c.toUpperCase());
    return out;
  }, [personal]);
  const ownedSet = useMemo(() => new Set([...personal.portfolio].map((c) => c.toUpperCase())), [personal]);
  const mineInResult = useMemo(() => result.filter((r) => myCodes.includes(r.code)), [result, myCodes]);
  /** Each of their graded shares against every list: on it, or missing it by one thing. */
  const myLists = useMemo(() => {
    if (!mineOpen) return [];
    return myCodes.map((code) => {
      const r = rowByCode.get(code);
      if (!r) return { code, row: null, on: [] as ScreenerReady[], near: [] as { g: ScreenerReady; f: ScreenerFilter }[] };
      const on: ScreenerReady[] = [];
      const near: { g: ScreenerReady; f: ScreenerFilter }[] = [];
      for (const g of cards) {
        const fs = withSafety(g.spec.filters);
        const failed = fs.filter((f) => !passes(r.v, f));
        if (!failed.length) on.push(g);
        else if (failed.length === 1) near.push({ g, f: failed[0] });
      }
      return { code, row: r, on, near: near.slice(0, 2) };
    });
  }, [mineOpen, myCodes, rowByCode, cards]);
  const mineOnAny = useMemo(() => {
    let n = 0;
    for (const code of myCodes) {
      const r = rowByCode.get(code);
      if (r && cards.some((g) => matches(r.v, withSafety(g.spec.filters)))) n++;
    }
    return n;
  }, [myCodes, rowByCode, cards]);

  // Every list is Premium (2026-11-24, "Lock them too"); every share by sector
  // and price alone is public figures, open to everyone.
  const judged = listId != null || own.some((f) => defs.get(f.key)?.ours);
  const keyFig = keyOf(list, order?.sort ?? null, defs);
  const reasonOf = useCallback(
    (r: ScreenerRow) => rowReason(r, shownFilters, defs, list, keyFig),
    [shownFilters, defs, list, keyFig],
  );

  /** What the masked rows hide, in counts and figures — never a name. */
  const hiddenFacts = useMemo<Bi[]>(() => {
    if (!open || !result.length) return [];
    const out: Bi[] = [];
    const bySector = new Map<string, number>();
    for (const r of result) if (typeof r.v.sector === "string") bySector.set(r.v.sector, (bySector.get(r.v.sector) ?? 0) + 1);
    const top = [...bySector.entries()].sort((a, b) => b[1] - a[1])[0];
    if (top && top[1] >= 2 && result.length >= 3 && !sectorValue) {
      const sbn = sectorDef?.options.find((o) => o.value === top[0])?.bn ?? top[0];
      out.push({ en: `${top[1]} of the ${result.length} are in ${top[0]}`, bn: `${result.length}টির মধ্যে ${top[1]}টি ${sbn} সেক্টরের` });
    }
    const d = defs.get(keyFig);
    const v0 = result[0].v[keyFig];
    if (d && v0 != null) {
      const h = keyHead(keyFig, d);
      out.push({ en: `The first one: ${h.en} ${cell(v0, d)}`, bn: `প্রথমটি: ${h.bn} ${cell(v0, d, true)}` });
    }
    if (mineInResult.length) {
      const m = mineInResult.length;
      out.push({ en: `${m} ${m === 1 ? "is a share" : "are shares"} you own or follow`, bn: `${m}টি আপনার নিজের বা নজরে রাখা শেয়ার` });
    }
    return out;
  }, [open, result, sectorValue, sectorDef, defs, keyFig, mineInResult]);

  // --- Watch: one tap saves what the pop-up shows -------------------------
  const watchOf = (ids: string[], ownF: ScreenerFilter[]) =>
    (saved ?? []).find((l) => !l.legacy && isScreenWatch(l.spec, ids, ownF));
  const shownIds = listId ? [listId] : [];
  const canWatch = listId != null || own.length > 0;
  const watchDoc = canWatch ? watchOf(shownIds, own) : undefined;
  const watching = isPremium && !!watchDoc?.alerts;
  const watchName = screenWatchName(list, own, defs, bn);
  /** The order box: members, with more than one share to sort. */
  const showSort = isPremium && result.length > 1;
  /** Lists the reader watches in any form (a tile's bell). */
  const watchedLists = useMemo(() => new Set(
    (saved ?? []).filter((l) => !l.legacy && l.alerts).flatMap((l) => (l.spec as ScreenerSpec).lists ?? []),
  ), [saved]);

  function saveFailed(err: unknown) {
    if (isLimitError(err, "custom_lists")) {
      showLimitNotice("custom_lists");
      return;
    }
    const msg = (err as Error)?.message ?? "";
    toast({
      message: msg === "too_many_lists"
        ? t("You can keep 10 screens. Delete one to add another.", "সর্বোচ্চ 10টি স্ক্রিন রাখা যায়। নতুন যোগ করতে একটি মুছুন।")
        : t("We couldn't save it. Please try again.", "সেভ হয়নি। আবার চেষ্টা করুন।"),
      tone: "error",
    });
  }

  const watch = async () => {
    trackEvent("screener_watch", { id: listId ?? "every", state: isPremium ? "premium" : isLoggedIn ? "free" : "guest" });
    if (!isPremium) {
      showLimitNotice("custom_lists");
      return;
    }
    const doc = watchOf(shownIds, own);
    setWatchBusy(true);
    try {
      if (doc) {
        await apiUpdateCustomList(doc.id, { alerts: true });
        setSaved((xs) => xs?.map((x) => (x.id === doc.id ? { ...x, alerts: true } : x)) ?? xs);
      } else {
        await apiCreateCustomList(watchName, screenWatchSpec(list, own), true);
        loadSaved();
      }
      toast({
        message: t(`Watching “${watchName}”. After every close we tell you when a share joins it.`,
                   `“${watchName}” নজরে রাখা হলো। প্রতিদিন বাজার বন্ধের পর কোনো শেয়ার যোগ হলে জানাব।`),
        tone: "success",
      });
    } catch (err) {
      saveFailed(err);
    } finally {
      setWatchBusy(false);
    }
  };
  const unwatch = async (doc: SavedCustomList) => {
    setWatchBusy(true);
    try {
      await apiUpdateCustomList(doc.id, { alerts: false });
      setSaved((xs) => xs?.map((x) => (x.id === doc.id ? { ...x, alerts: false } : x)) ?? xs);
      trackEvent("screener_unwatch", { id: listId ?? "every" });
      toast({
        message: t(`Stopped watching “${doc.name}”.`, `“${doc.name}” থেকে নজর সরানো হলো।`),
        tone: "neutral",
        action: {
          label: <T en="Undo" bn="ফিরিয়ে আনুন" />,
          onClick: () => {
            apiUpdateCustomList(doc.id, { alerts: true })
              .then(() => setSaved((xs) => xs?.map((x) => (x.id === doc.id ? { ...x, alerts: true } : x)) ?? xs))
              .catch(() => {});
          },
        },
      });
    } catch {
      toast({ message: t("We couldn't change that. Please try again.", "বদলানো যায়নি। আবার চেষ্টা করুন।"), tone: "error" });
    } finally {
      setWatchBusy(false);
    }
  };

  const n = result.length;
  const label = (en: string, b: string, c: number) => `${t(en, b)} (${c})`;
  const sheetTitle = list ? tt(list.title_en, list.title_bn) : tt("Every share", "সব শেয়ার");
  const sheetSub = (
    <span className="nums">
      {tt(`${n} ${n === 1 ? "share" : "shares"}`, `${n}টি শেয়ার`)}
      {newInResult > 0 && (
        <span className="scl-sub-new">{tt(` · ${newInResult} new this week`, ` · এ সপ্তাহে ${newInResult}টি নতুন`)}</span>
      )}
      {data.as_of && tt(` · after the close on ${formatDate(data.as_of)}`, ` · ${formatDate(data.as_of)}-এর ক্লোজিংয়ের পর`)}
    </span>
  );
  const shares = (
    <ScreenerList
      rows={result}
      keyFig={keyFig}
      defs={defs}
      limit={limit}
      onMore={() => setLimit((x) => x + PAGE)}
      reasonOf={shownFilters.length ? reasonOf : undefined}
      newCodes={newCodes}
      onOpen={rememberRow}
      peek={isPremium}
    />
  );
  /** A reader without Premium: the first rows as they are, the companies hidden, then the card. */
  const maskedPreview = (
    <div className="space-y-4">
      <ScreenerList
        rows={result}
        keyFig={keyFig}
        defs={defs}
        limit={MASKED_ROWS}
        reasonOf={shownFilters.length ? reasonOf : undefined}
        newCodes={newCodes}
        masked
      />
      {n > MASKED_ROWS && (
        <p className="scl-more-n nums">
          {tt(`And ${n - MASKED_ROWS} more ${n - MASKED_ROWS === 1 ? "share" : "shares"} on this list`,
              `এই তালিকায় আরও ${n - MASKED_ROWS}টি শেয়ার`)}
        </p>
      )}
      <ScreenerPremium count={n} goal={listId} joined={newInResult} facts={hiddenFacts} />
    </div>
  );

  return (
    <PageLockScope anchor={SCREENER_ANCHOR}>
      <div className="space-y-8">
        {/* The page: the lists. A tap opens one in the pop-up. */}
        <section className="scr-builder" aria-labelledby="scr-q">
          <div className="scr-part">
            <div className="scr-part-head">
              <h2 id="scr-q" className="scr-label scr-label--lists">
                {tt("Pick a list", "একটি তালিকা বাছুন")}
                {!isPremium && (
                  <span className="scr-sub-pro"><IconCrown size={12} />{tt("Premium", "প্রিমিয়াম")}</span>
                )}
              </h2>
            </div>
            <div className="scr-tiles">
              {cards.map((g) => {
                const c = listCounts.get(g.id) ?? 0;
                const fresh = listNew.get(g.id) ?? 0;
                const watched = isPremium && watchedLists.has(g.id);
                const Icon = LIST_ICON[g.id] ?? IconList;
                return (
                  <button
                    key={g.id}
                    type="button"
                    className="scr-tile"
                    aria-haspopup="dialog"
                    onClick={() => openList(g.id)}
                  >
                    <span className="scr-tile-ic" aria-hidden="true"><Icon size={16} /></span>
                    <span className="scr-tile-name">{tt(g.title_en, g.title_bn)}</span>
                    <span className={`scr-tile-n nums${c === 0 ? " is-zero" : ""}`}>
                      <b>{c}</b>
                      {tt(c === 1 ? " share" : " shares", "টি শেয়ার")}
                      {watched && (
                        <span className="scr-tile-watch" title={t("You watch this list", "এই তালিকা আপনার নজরে")}>
                          <IconBell size={14} />
                          <span className="sr-only">{t("You watch this list", "এই তালিকা আপনার নজরে")}</span>
                        </span>
                      )}
                    </span>
                    {fresh > 0 && (
                      <span className="scr-tile-new nums">
                        {tt(`${fresh} new this week`, `এ সপ্তাহে ${fresh}টি নতুন`)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="scr-links">
              <button type="button" className="scr-link" onClick={() => setHowOpen(true)}>
                {tt("How we pick each list", "প্রতিটি তালিকা কীভাবে বাছাই করি")}
              </button>
              <button type="button" className="scr-link" onClick={openEvery} aria-haspopup="dialog">
                {tt("See every share by sector and price", "সেক্টর ও দাম দিয়ে সব শেয়ার দেখুন")}
              </button>
            </div>
            {myCodes.length > 0 && (
              <button type="button" className="scr-mine-btn" onClick={openMine} aria-haspopup="dialog">
                <span className="scr-mine-t">{tt("Check my shares", "আমার শেয়ার যাচাই করুন")}</span>
                <span className="scr-mine-n nums">
                  {tt(`${mineOnAny} of your ${myCodes.length} shares are on our lists`,
                      `আপনার ${myCodes.length}টির মধ্যে ${mineOnAny}টি শেয়ার আমাদের তালিকায় আছে`)}
                </span>
              </button>
            )}
          </div>
        </section>

        {/* How we pick each list (from the page) */}
        <Sheet open={howOpen} onClose={() => setHowOpen(false)} title={tt("How we pick each list", "প্রতিটি তালিকা কীভাবে বাছাই করি")}>
          <div className="space-y-4">
            <dl className="scr-how-list">
              {cards.map((g) => (
                <div key={g.id}>
                  <dt>{tt(g.title_en, g.title_bn)}</dt>
                  <dd>
                    {g.spec.filters.map((f) => {
                      const d = defs.get(f.key);
                      if (!d) return null;
                      const w = valueWords(f, d);
                      return <span key={f.key}>{tt(`${d.name_en}: ${w.en}`, `${d.name_bn}: ${w.bn}`)}</span>;
                    })}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="text-sm text-text-main">
              {tt("Every list also leaves out Z-category shares and shares that trade under ৳10 lakh a day.",
                  "প্রতিটি তালিকা থেকে Z ক্যাটাগরির শেয়ার আর দিনে ৳10 লাখের কম লেনদেন হওয়া শেয়ারও বাদ থাকে।")}
            </p>
          </div>
        </Sheet>

        {/* Check my shares: each share the reader owns or follows against every list */}
        <Sheet
          open={mineOpen}
          onClose={closeSheet}
          size="xl"
          title={tt("Your shares in our lists", "আমাদের তালিকায় আপনার শেয়ার")}
          subtitle={tt(`${mineOnAny} of your ${myCodes.length} shares are on at least one list`,
                       `আপনার ${myCodes.length}টির মধ্যে ${mineOnAny}টি অন্তত একটি তালিকায় আছে`)}
        >
          {isPremium ? (
            <ul className="scm-list">
              {myLists.map(({ code, row, on, near }) => (
                <li key={code} className="scm-row">
                  <div className="scm-head">
                    <span className="scm-name">{row?.name ?? code}</span>
                    <span className="scm-code">{code}</span>
                    <span className="scm-tag">{ownedSet.has(code) ? tt("You own it", "আপনার আছে") : tt("You follow it", "নজরে রেখেছেন")}</span>
                  </div>
                  {!row ? (
                    <p className="scm-none">{tt("We don't check this share: it has no grade or hardly trades.",
                                                "এই শেয়ারটি আমরা যাচাই করি না: এর গ্রেড নেই বা লেনদেন প্রায় হয় না।")}</p>
                  ) : (
                    <>
                      {on.length > 0 ? (
                        <div className="scm-on">
                          <span className="scm-label">{tt(`On ${on.length} ${on.length === 1 ? "list" : "lists"}:`, `${on.length}টি তালিকায় আছে:`)}</span>
                          {on.map((g) => (
                            <button key={g.id} type="button" className="scm-chip" onClick={() => openList(g.id)}>
                              {tt(g.title_en, g.title_bn)}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="scm-none">{tt("Not on any of our lists today.", "আজ আমাদের কোনো তালিকায় নেই।")}</p>
                      )}
                      {near.map(({ g, f }) => {
                        const d = defs.get(f.key);
                        if (!d) return null;
                        const now = figureWords(row.v[f.key] ?? null, d);
                        const need = valueWords(f, d);
                        return (
                          <p key={g.id} className="scm-near">
                            {tt(`Close to “${g.title_en}”: ${d.short_en} is ${now.en} (it needs ${need.en}).`,
                                `“${g.title_bn}”-এর কাছাকাছি: ${d.short_bn} এখন ${now.bn} (দরকার ${need.bn})।`)}
                          </p>
                        );
                      })}
                    </>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <div className="space-y-4">
              <p className="scl-blurb">
                {tt(`${mineOnAny} of the ${myCodes.length} shares you own or follow are on at least one of our lists today.`,
                    `আপনার নিজের বা নজরে রাখা ${myCodes.length}টি শেয়ারের মধ্যে ${mineOnAny}টি আজ অন্তত একটি তালিকায় আছে।`)}
              </p>
              <ScreenerPremium count={myCodes.length} variant="mine" />
            </div>
          )}
        </Sheet>

        {/* The list, in its pop-up */}
        <Sheet open={open} onClose={closeSheet} size="xl" title={sheetTitle} subtitle={sheetSub}>
          <div className="scl-wrap">
            {/* The list's line, and Watch for what the pop-up shows */}
            <div className="scl-top">
              <p className="scl-blurb">
                {list
                  ? tt(list.blurb_en, list.blurb_bn)
                  : tt("Every share we check, biggest first. Narrow it by sector or price.",
                       "আমরা যাচাই করি এমন সব শেয়ার, বড়টি আগে। সেক্টর বা দাম দিয়ে আরও বাছাই করুন।")}
              </p>
              {canWatch && (watching && watchDoc ? (
                <Button variant="quiet" size="sm" active onClick={() => unwatch(watchDoc)} disabled={watchBusy}
                  aria-label={t(`Watching “${watchName}”. Tap to stop.`, `“${watchName}” নজরে আছে। বন্ধ করতে চাপুন।`)}>
                  <IconCheck size={16} />
                  {tt("Watching", "নজরে আছে")}
                </Button>
              ) : (
                <Button variant="quiet" size="sm" onClick={watch} disabled={watchBusy}>
                  <IconBell size={16} />
                  {tt("Watch", "নজর রাখুন")}
                  {!isPremium && <span className="text-gold-ink" aria-hidden="true"><IconCrown size={14} /></span>}
                </Button>
              ))}
            </div>
            {list && mineInResult.length > 0 && (
              isPremium ? (
                <p className="scl-mine">
                  {tt("Your shares on this list: ", "এই তালিকায় আপনার শেয়ার: ")}
                  {mineInResult.map((r, i) => (
                    <span key={r.code}>
                      {i > 0 && " · "}
                      <b>{r.code}</b>
                      {ownedSet.has(r.code) ? tt(" (you own it)", " (আপনার আছে)") : tt(" (you follow it)", " (নজরে রেখেছেন)")}
                    </span>
                  ))}
                </p>
              ) : (
                <p className="scl-mine">
                  {tt(`${mineInResult.length} of the shares you own or follow ${mineInResult.length === 1 ? "is" : "are"} on this list. Premium shows which.`,
                      `আপনার নিজের বা নজরে রাখা ${mineInResult.length}টি শেয়ার এই তালিকায় আছে। কোনগুলো, তা প্রিমিয়ামে দেখবেন।`)}
                </p>
              )
            )}

            {/* Sector, price and order: three identical boxes that stay in sight while the shares scroll */}
            <div className="scl-bar">
              <div className={`scl-controls${showSort ? " scl-controls--3" : ""}`}>
                {sectorDef && (
                  <label className="scl-ctl" htmlFor="scl-sector">
                    <span className="scl-ctl-l">{tt("Sector", "সেক্টর")}</span>
                    <select id="scl-sector" className="scl-ctl-s" value={sectorValue} onChange={(e) => pickSector(e.target.value)}>
                      <option value="">{label("All sectors", "সব সেক্টর", sectorCounts.all)}</option>
                      {sectorDef.options.map((o) => (
                        <option key={o.value} value={o.value}>{label(o.en, o.bn, sectorCounts.by.get(o.value) ?? 0)}</option>
                      ))}
                    </select>
                    <span className="scl-ctl-chev" aria-hidden="true"><IconChevronDown size={16} /></span>
                  </label>
                )}
                {priceDef && (
                  <label className="scl-ctl" htmlFor="scl-price">
                    <span className="scl-ctl-l">{tt("Share price", "শেয়ারের দাম")}</span>
                    <select id="scl-price" className="scl-ctl-s" value={priceIndex >= 0 ? String(priceIndex) : ""}
                      onChange={(e) => pickPrice(e.target.value)}>
                      <option value="">{label("Any price", "যেকোনো দাম", priceCounts.all)}</option>
                      {pricePresets.map((pr, i) => (
                        <option key={pr.en} value={String(i)}>{label(pr.en, pr.bn, priceCounts.by[i] ?? 0)}</option>
                      ))}
                    </select>
                    <span className="scl-ctl-chev" aria-hidden="true"><IconChevronDown size={16} /></span>
                  </label>
                )}
                {showSort && (
                  <label className="scl-ctl scl-ctl--sort" htmlFor="scl-sort">
                    <span className="scl-ctl-l">{tt("Sort by", "ক্রম")}</span>
                    <select id="scl-sort" className="scl-ctl-s" value={sortNow.sort} onChange={(e) => sortBy(e.target.value)}>
                      <option value="name">{t("Company, A to Z", "কোম্পানি, নাম অনুযায়ী")}</option>
                      {orders.map((r) => (
                        <option key={r.key} value={r.key}>{t(r.short_en, r.short_bn)}</option>
                      ))}
                    </select>
                    <span className="scl-ctl-chev" aria-hidden="true"><IconChevronDown size={16} /></span>
                  </label>
                )}
              </div>
            </div>

            {/* Filters a saved screen or a link brought that the dropdowns can't show */}
            {extra.length > 0 && (
              <div className="scr-extra">
                <p className="scr-note">{tt("Also in this screen:", "এই স্ক্রিনে আরও আছে:")}</p>
                <ul className="scr-chips">
                  {extra.map((f) => {
                    const d = defs.get(f.key);
                    if (!d) return null;
                    const w = valueWords(f, d);
                    return (
                      <li key={f.key} className="scr-chip">
                        <span className="scr-chip-main">
                          <span className="font-normal">{tt(d.short_en, d.short_bn)}:</span>
                          <span>{tt(w.en, w.bn)}</span>
                        </span>
                        <button type="button" className="scr-chip-x" onClick={() => setOwnFilter(f.key, null)}
                          aria-label={t(`Remove ${d.short_en}`, `${d.short_bn} বাদ দিন`)}>
                          <IconClose size={14} />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {n === 0 ? (
              <EmptyState
                title={tt("No share fits right now", "এই মুহূর্তে কোনো শেয়ার মেলেনি")}
                message={tt("Try another sector or price, or another list.", "অন্য সেক্টর বা দাম, অথবা অন্য তালিকা বাছুন।")}
              />
            ) : judged ? (
              <PageGate anchor={SCREENER_ANCHOR} promo={maskedPreview}>
                <div className="space-y-5">
                  {shares}
                  <ListLeft left={leftNow} />
                  <AlmostThere near={near} defs={defs} />
                </div>
              </PageGate>
            ) : (
              <div className="space-y-5">
                {shares}
                {isPremium && <AlmostThere near={near} defs={defs} />}
              </div>
            )}

            <details className="scl-how">
              <summary>{tt("How we pick this list", "এই তালিকা কীভাবে বাছাই করি")}</summary>
              <ul>
                {(list?.spec.filters ?? []).map((f) => {
                  const d = defs.get(f.key);
                  if (!d) return null;
                  const w = valueWords(f, d);
                  return <li key={f.key}>{tt(`${d.name_en}: ${w.en}`, `${d.name_bn}: ${w.bn}`)}</li>;
                })}
                <li>
                  {tt("We leave out Z-category shares and shares that trade under ৳10 lakh a day.",
                      "Z ক্যাটাগরির শেয়ার আর দিনে ৳10 লাখের কম লেনদেন হওয়া শেয়ার বাদ থাকে।")}
                </li>
              </ul>
            </details>
            <p className="scl-note">
              {tt("A list is a starting point for your own research, not advice to buy.",
                  "তালিকা আপনার নিজের যাচাইয়ের শুরু মাত্র, কেনার পরামর্শ নয়।")}
            </p>
          </div>
        </Sheet>
      </div>
    </PageLockScope>
  );
}
