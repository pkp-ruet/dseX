"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import Button from "@/components/ui/Button";
import Sheet from "@/components/ui/Sheet";
import EmptyState from "@/components/ui/EmptyState";
import Link from "@/components/ui/Link";
import {
  IconActivity, IconBell, IconBlocks, IconCheck, IconChevronRight, IconClose, IconCoin, IconCrown, IconList,
  IconPie, IconTag, IconTrendUp,
} from "@/components/ui/icons";
import { REPORT_ICON } from "@/components/research-reports/reportIcons";
import { PAGE_ICON } from "@/components/places/pageIcons";
import PageGate from "@/components/premium/PageGate";
import { PageLockScope } from "@/components/premium/LockScope";
import { showLimitNotice } from "@/components/premium/LimitNotice";
import { PersonalCodesProvider, usePersonalCodesCtx } from "@/components/market-analysis/PersonalCodes";
import { T } from "@/components/i18n/T";
import ScreenerList, { PAGE } from "./ScreenerList";
import ListBar from "@/components/lists/ListBar";
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
import { groupWants, wantOf, type Want, type WantIcon, type WantMore } from "@/lib/wants";
import { reportDef } from "@/lib/research-reports";
import { pageByKey } from "@/lib/places";

type Order = { sort: string; dir: "asc" | "desc" };

/** One icon per want, so the cards can be told apart at a glance. */
const WANT_ICON: Record<WantIcon, ComponentType<{ size?: number }>> = {
  cash: IconCoin,
  cheap: IconTag,
  growing: IconTrendUp,
  big: IconBlocks,
  owners: IconPie,
  range: IconActivity,
  more: IconList,
};

/** A link under a want's list: the report (or page) on the same subject. */
function moreLink(m: WantMore): { href: string; name: Bi; Icon: ComponentType<{ size?: number }>; premium: boolean } {
  if (m.kind === "report") {
    return { href: `/stock-insights/${m.slug}`, name: reportDef(m.slug).title, Icon: REPORT_ICON[m.slug], premium: true };
  }
  const p = pageByKey(m.key);
  return { href: p.href, name: p.name, Icon: PAGE_ICON[p.key] ?? IconList, premium: !!p.premium };
}

/** A price dropdown choice as a filter. */
const priceFilter = (p: { min: number | null; max: number | null }): ScreenerFilter => ({
  key: "price", ...(p.min != null ? { min: p.min } : {}), ...(p.max != null ? { max: p.max } : {}),
});

/** Where a tapped row is remembered, so coming back from its stock page reopens the same list at it. */
const BACK_KEY = "dsex.scr.back";

/** Visible copy as both languages, so the server HTML needs no re-render to switch. */
const tt = (en: string, bn: string) => <T en={en} bn={bn} />;

/**
 * The ready lists on `/lists` (the stock screener until 2026-11-25, when it
 * stopped being a page: step 4 of the simplify review folded /screener into
 * the Lists page, and its pop-up list became THE list view of the site —
 * `ListBar` + `ListRows`, shared with the Buy List, All companies, Results,
 * For you and the research reports). Premium since 2026-11-14.
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
 *
 * 2026-11-25 (user: "this page's main goal is help user to find their next
 * stock. how can we simplify this page", then "Yes, build it"): the 16 tiles
 * became six wants (`lib/wants.ts`: Pays good cash · Cheap for what it earns ·
 * Profit is growing · Big and steady · Owners believe in it · Near its 52-week
 * high or low). A want card opens its first list; the want's other lists are
 * chips in the list bar, and the report or page on the same subject sits
 * under the list ("More on this"). "How we pick each list" and "See every
 * share" left the page (each list has its own "How we pick"; All companies
 * has the same boxes). "Check my shares" left it too: it opens from My
 * shares (`/lists?mine=1`); `?all=1` and a saved screen still open every
 * share.
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
  /** The six wants, holding the lists the backend sends today. */
  const wants = useMemo(() => groupWants(cards.map((g) => g.id)), [cards]);

  // --- What the pop-up shows ------------------------------------------------
  const [listId, setListId] = useState<string | null>(null);
  /** "See every share": the pop-up with no list, by sector and price. */
  const [every, setEvery] = useState(false);
  const [own, setOwn] = useState<ScreenerFilter[]>([]);
  const [order, setOrder] = useState<Order | null>(null);
  const [limit, setLimit] = useState(PAGE);
  /** A row to bring back into view once the pop-up has drawn it. */
  const [backTo, setBackTo] = useState<string | null>(null);
  const [saved, setSaved] = useState<SavedCustomList[] | null>(null);
  const [watchBusy, setWatchBusy] = useState(false);
  /** "Check my shares": the reader's shares against every list. */
  const [mineOpen, setMineOpen] = useState(false);
  const personal = usePersonalCodesCtx();
  const open = listId != null || every;
  const list = listId ? goalById.get(listId) : undefined;
  const want: Want | undefined = wantOf(wants, listId);

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
  /** A want card: its first list, the others as chips in the bar. */
  const openWant = (w: Want) => {
    trackEvent("lists_want", { id: w.id });
    openList(w.lists[0]);
  };
  /** A chip in the bar: another list of the same want, keeping sector and price. */
  const switchList = (id: string) => {
    if (id === listId) return;
    setListId(id);
    setOrder(null);
    setLimit(PAGE);
    trackEvent("screener_list", { id, from: "chip" });
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
    // "Check my shares" opens from My shares (2026-11-25).
    if (params.get("mine") === "1" && !opened) {
      setMineOpen(true);
      trackEvent("screener_mine", { from: "link" });
    }
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
      mine: mineOpen ? "1" : null,
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
  // --- What changed this week (2026-11-23) --------------------------------
  const changes = useMemo(() => data.changes ?? {}, [data.changes]);
  const rowByCode = useMemo(() => new Map(rows.map((r) => [r.code, r] as const)), [rows]);
  /** Each list's newcomers this week that still pass it. */
  const listNew = useMemo(
    () => new Map(cards.map((g) => {
      const joined = changes[g.id]?.joined ?? [];
      if (!joined.length) return [g.id, [] as string[]] as const;
      const fs = withSafety(g.spec.filters);
      return [g.id, joined.filter((c) => { const r = rowByCode.get(c); return !!r && matches(r.v, fs); })] as const;
    })),
    [cards, changes, rowByCode],
  );
  /** A want card's "N new this week": each share once across its lists. */
  const wantNew = useMemo(
    () => new Map(wants.map((w) => [w.id, new Set(w.lists.flatMap((id) => listNew.get(id) ?? [])).size] as const)),
    [wants, listNew],
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
    if (!mineOpen) return 0;
    let n = 0;
    for (const code of myCodes) {
      const r = rowByCode.get(code);
      if (r && cards.some((g) => matches(r.v, withSafety(g.spec.filters)))) n++;
    }
    return n;
  }, [mineOpen, myCodes, rowByCode, cards]);

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
  // Opened through a want, the pop-up is named for the want; the list is its chip.
  const sheetTitle = want
    ? tt(want.name.en, want.name.bn)
    : list ? tt(list.title_en, list.title_bn) : tt("Every share", "সব শেয়ার");
  /** The want's lists as chips in the bar, each with what it shows with this sector and price. */
  const wantChips = want && want.lists.length > 1
    ? {
        value: listId ?? "",
        options: want.lists.map((id) => {
          const g = goalById.get(id);
          return { value: id, label: { en: g?.title_en ?? id, bn: g?.title_bn ?? id }, count: countOf(id, own) };
        }),
        onChange: switchList,
      }
    : null;
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
      <>
        {/* The six wants on /lists. A card opens its first list in the pop-up. */}
        <section className="ls-sec" id="wants" aria-labelledby="ls-want-h">
          <h2 id="ls-want-h" className="ls-h">
            {tt("What do you want from a share?", "শেয়ারে আপনি কী চান?")}
            {!isPremium && (
              <span className="ls-crown"><IconCrown size={12} />{tt("Premium", "প্রিমিয়াম")}</span>
            )}
          </h2>
          <ul className="ls-wants">
            {wants.map((w) => {
              const Icon = WANT_ICON[w.icon];
              const fresh = wantNew.get(w.id) ?? 0;
              const watched = isPremium && w.lists.some((id) => watchedLists.has(id));
              const titles = w.lists.map((id) => goalById.get(id)).filter((g): g is ScreenerReady => !!g);
              return (
                <li key={w.id}>
                  <button type="button" className="ls-want" aria-haspopup="dialog" onClick={() => openWant(w)} data-card={`lists-want-${w.id}`}>
                    <span className="ls-want-top">
                      <span className="ls-want-ic" aria-hidden="true"><Icon size={18} /></span>
                      {watched && (
                        <span className="ls-want-watch" title={t("You watch a list here", "এখানের একটি তালিকা আপনার নজরে")}>
                          <IconBell size={14} />
                          <span className="sr-only">{t("You watch a list here", "এখানের একটি তালিকা আপনার নজরে")}</span>
                        </span>
                      )}
                    </span>
                    <span className="ls-want-t">{tt(w.name.en, w.name.bn)}</span>
                    <span className="ls-want-l">
                      {tt(titles.map((g) => g.title_en).join(" · "), titles.map((g) => g.title_bn).join(" · "))}
                    </span>
                    {fresh > 0 && (
                      <span className="ls-want-new nums">{tt(`${fresh} new this week`, `এ সপ্তাহে ${fresh}টি নতুন`)}</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Check my shares: each share the reader owns or follows against every list */}
        <Sheet
          open={mineOpen}
          onClose={closeSheet}
          size="xl"
          title={tt("Your shares in our lists", "আমাদের তালিকায় আপনার শেয়ার")}
          subtitle={myCodes.length > 0
            ? tt(`${mineOnAny} of your ${myCodes.length} shares are on at least one list`,
                 `আপনার ${myCodes.length}টির মধ্যে ${mineOnAny}টি অন্তত একটি তালিকায় আছে`)
            : undefined}
        >
          {myCodes.length === 0 ? (
            <EmptyState
              title={tt("No shares to check yet", "যাচাই করার মতো শেয়ার এখনো নেই")}
              message={tt("Add the shares you own or watch on My shares, and this shows which of our lists each one is on.",
                          "আমার শেয়ারে আপনার কেনা বা নজরে রাখা শেয়ার যোগ করুন, তখন এখানে দেখবেন কোনটি আমাদের কোন তালিকায় আছে।")}
              actions={[{ href: "/my", label: tt("Go to My shares", "আমার শেয়ারে যান") }]}
            />
          ) : isPremium ? (
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

            {/* Sector, price and order: THE list bar, the same boxes as on every list */}
            <ListBar
              idPrefix="scl"
              chips={wantChips}
              sector={sectorDef ? {
                value: sectorValue,
                all: sectorCounts.all,
                options: sectorDef.options.map((o) => ({ value: o.value, label: { en: o.en, bn: o.bn }, count: sectorCounts.by.get(o.value) ?? 0 })),
                onChange: pickSector,
              } : null}
              price={priceDef ? {
                value: priceIndex >= 0 ? String(priceIndex) : "",
                all: priceCounts.all,
                options: pricePresets.map((pr, i) => ({ value: String(i), label: { en: pr.en, bn: pr.bn }, count: priceCounts.by[i] ?? 0 })),
                onChange: pickPrice,
              } : null}
              sort={showSort ? {
                value: sortNow.sort,
                options: [
                  { value: "name", label: { en: "Company, A to Z", bn: "কোম্পানি, নাম অনুযায়ী" } },
                  ...orders.map((r) => ({ value: r.key, label: { en: r.short_en, bn: r.short_bn } })),
                ],
                onChange: sortBy,
              } : null}
            />

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

            {/* More on this: the report or page on the same subject as the want */}
            {want && want.more.length > 0 && (
              <div className="ls-more">
                <p className="ls-more-h">{tt("More on this", "এ নিয়ে আরও")}</p>
                <ul className="ls-more-list">
                  {want.more.map((m) => {
                    const l = moreLink(m);
                    return (
                      <li key={l.href}>
                        <Link href={l.href} className="ls-more-a" data-card={`lists-more-${want.id}`}>
                          <span className={`ls-row-ic${l.premium ? " ls-row-ic--gold" : ""}`} aria-hidden="true"><l.Icon size={16} /></span>
                          <span className="ls-more-t">
                            {m.kind === "report" ? tt(`Our report: ${l.name.en}`, `আমাদের রিপোর্ট: ${l.name.bn}`) : tt(l.name.en, l.name.bn)}
                          </span>
                          <span className="ls-row-go" aria-hidden="true"><IconChevronRight size={16} /></span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            <details className="scl-how">
              <summary>
                {list && want && want.lists.length > 1
                  ? tt(`How we pick “${list.title_en}”`, `“${list.title_bn}” কীভাবে বাছাই করি`)
                  : tt("How we pick this list", "এই তালিকা কীভাবে বাছাই করি")}
              </summary>
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
      </>
    </PageLockScope>
  );
}
