"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import Button from "@/components/ui/Button";
import Sheet from "@/components/ui/Sheet";
import EmptyState from "@/components/ui/EmptyState";
import Skeleton from "@/components/ui/Skeleton";
import {
  IconBell, IconBriefcase, IconCalendar, IconCheck, IconClose, IconCoin, IconList, IconPlus, IconTag,
  IconTrendDown, IconTrendUp,
} from "@/components/ui/icons";
import PageGate from "@/components/premium/PageGate";
import { PageLockScope } from "@/components/premium/LockScope";
import { showLimitNotice } from "@/components/premium/LimitNotice";
import SavedListCard from "@/components/custom-lists/SavedListCard";
import { T } from "@/components/i18n/T";
import FilterSheet from "./FilterSheet";
import AddFilterSheet from "./AddFilterSheet";
import ScreenerTable, { PAGE } from "./ScreenerTable";
import ScreenerPremium, { SCREENER_ANCHOR } from "./ScreenerPremium";
import AlmostThere from "./AlmostThere";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/context/LangContext";
import { usePremium, isLimitError } from "@/lib/premium";
import { useUrlParams, useUrlSync } from "@/lib/use-url-state";
import { toast } from "@/lib/toast";
import { trackEvent } from "@/lib/track";
import { formatDate } from "@/lib/formatters";
import {
  A_ONLY, DEFAULT_SORT, applyScreen, decodeFilters, encodeFilters, goalScreens, matchGoal, mergeFilters,
  nearMisses, stripSafety, tableColumns, unpackRows, valueWords, withSafety,
} from "@/lib/screener";
import {
  apiCreateCustomList, apiDeleteCustomList, apiGetCustomLists, apiUpdateCustomList,
  type SavedCustomList, type ScreenerFilter, type ScreenerFilterDef, type ScreenerReady, type ScreenerSpec,
  type ScreenerUniverse,
} from "@/lib/api";

type Order = { sort: string; dir: "asc" | "desc" };
/** Which shares a screen runs over: the safety rules on (the default),
 *  category A only (and the trading rule), or every share. */
type Scope = "safe" | "a" | "all";

/** Shortcuts under "Narrow it down": our own analysis first (2026-11-18). */
const QUICK = ["grade", "price_word", "sector", "yield"] as const;

/** One icon per list, so the six tiles can be told apart at a glance. */
const LIST_ICON: Record<string, ComponentType<{ size?: number }>> = {
  strong_cheap: IconTag,
  steady_dividends: IconCoin,
  dividend_soon: IconCalendar,
  profit_growing: IconTrendUp,
  owners_buying: IconBriefcase,
  strong_near_low: IconTrendDown,
};

const isAOnly = (f: ScreenerFilter) => f.key === "category" && f.in?.join() === "A";

/** Visible copy as both languages, so the server HTML needs no re-render to switch. */
const tt = (en: string, bn: string) => <T en={en} bn={bn} />;

/**
 * The stock screener (`/screener`; Premium since 2026-11-14). Simplified
 * 2026-11-18 (user: "more simple, easy to understand and use, clean and
 * premium look", all eleven suggestions on
 * https://claude.ai/artifact/VmcqfZo8MjRp3MsDUkQx2Y):
 *
 * - **Your screens** (Premium readers with saved screens): one strip on top,
 *   name · today's count · "1 new"; a tap opens the screen.
 * - **One card** (`.scr-builder`) holds the choice:
 *   1. *Start with a list* — six tiles (icon, name, count), one at a time; a
 *      tap on the picked one or "Clear" takes it off. The picked list's line
 *      sits under the tiles with "How we pick" (a sheet with its rules).
 *   2. *Narrow it down* — the reader's filters as chips, then shortcuts (our
 *      grade and price check first, then sector and yield) and "All filters".
 *   3. *Which shares* — Safer shares (no Z, ৳10 lakh a day; the default) ·
 *      Category A · Every share, a count on each.
 *   Its foot (`.scr-foot`) is sticky to the bottom of the screen while the card
 *   is in view: "22 of 362 fit · See them". It replaced the floating count bar.
 * - **The result** shows only once a list or a filter is on (2026-11-18: a free
 *   reader's first answer used to be "All N shares, get Premium" for shares
 *   that are free on /stocks). A Premium reader can still "Browse all" from
 *   the foot, and a link with `?sort=` opens it. The shares + "Almost there"
 *   sit inside one `PageGate` when a list or one of our own checks is on; a
 *   result on public figures alone is open to everyone (THE Premium line, step 5).
 * - **Your saved screens** (`#saved`) at the bottom, for editing.
 *
 * Every company's figures arrive with the page (`GET /api/screener`), so
 * filtering, counting and sorting happen here with no request.
 */
export default function ScreenerClient({ data }: { data: ScreenerUniverse }) {
  const { isLoggedIn, isLoading: authLoading } = useAuth();
  const { isPremium } = usePremium();
  const { bn } = useLang();
  const t = useCallback((en: string, b: string) => (bn ? b : en), [bn]);

  const rows = useMemo(() => unpackRows(data), [data]);
  const defs = useMemo(() => new Map(data.filters.map((f) => [f.key, f] as const)), [data]);
  const ranges = useMemo(() => data.filters.filter((f) => f.kind === "range"), [data]);
  // The order menu: every range on the filter menu, plus our score.
  const orders = useMemo(() => ranges.filter((f) => f.menu !== false || f.key === "score"), [ranges]);
  const goals = useMemo(() => goalScreens(data.ready), [data.ready]);
  const goalById = useMemo(() => new Map(goals.map((g) => [g.id, g] as const)), [goals]);
  const menuCount = useMemo(() => data.filters.filter((f) => f.menu !== false).length, [data.filters]);

  const [picked, setPicked] = useState<string[]>([]);
  const [own, setOwn] = useState<ScreenerFilter[]>([]);
  const [order, setOrder] = useState<Order | null>(null);
  const [safe, setSafe] = useState(true);
  const [browse, setBrowse] = useState(false);
  const [limit, setLimit] = useState(PAGE);
  const [sheet, setSheet] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [howOpen, setHowOpen] = useState(false);

  const [saved, setSaved] = useState<SavedCustomList[] | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [alerts, setAlerts] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);
  const savedRef = useRef<HTMLElement>(null);
  const resultRef = useRef<HTMLElement>(null);

  const toResult = useCallback(() => {
    const el = resultRef.current;
    if (!el) return;
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  }, []);
  /** After a filter sheet closes: take the reader to the shares if they are below. */
  const showResultSoon = () => {
    window.setTimeout(() => {
      const el = resultRef.current;
      if (el && el.getBoundingClientRect().top > window.innerHeight - 120) toResult();
    }, 320);
  };

  // URL → state, once after mount. `ready` = the list picked (a ready-made
  // screen from before 2026-11-14 loads as own filters); `f` = own filters
  // (`category:A` = the Category A choice); `safe=0` = Every share; `sort` /
  // `dir` = the order (and opens the result); `tab=saved` scrolls to the
  // saved screens; `list=<id>` (the daily push) opens one.
  const params = useUrlParams();
  useEffect(() => {
    if (!params) return;
    if (params.get("safe") === "0") setSafe(false);
    const ids = (params.get("ready") ?? "").split(",").filter(Boolean);
    const lists = ids.filter((id) => goalById.has(id));
    if (lists.length) setPicked([lists[0]]);
    const old = ids.length === 1 && !lists.length ? data.ready.find((r) => r.id === ids[0]) : undefined;
    if (old) {
      setOwn(stripSafety(old.spec.filters).filters);
      setOrder({ sort: old.spec.sort, dir: old.spec.dir });
    }
    const f = params.get("f");
    if (f) setOwn(stripSafety(decodeFilters(f, defs)).filters);
    const sort = params.get("sort");
    if (sort && (sort === "name" || ranges.some((r) => r.key === sort))) {
      setOrder({ sort, dir: params.get("dir") === "asc" ? "asc" : "desc" });
      setBrowse(true);
    }
    if (params.get("tab") === "saved") {
      window.setTimeout(() => savedRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 300);
    }
  }, [params, goalById, data.ready, defs, ranges]);

  const firstGoal = picked.length ? goalById.get(picked[0]) : undefined;
  const sortNow: Order = order ?? (firstGoal ? { sort: firstGoal.spec.sort, dir: firstGoal.spec.dir } : { sort: DEFAULT_SORT, dir: "desc" });

  useUrlSync(
    {
      ready: picked.length ? picked.join(",") : null,
      f: own.length ? encodeFilters(own) : null,
      sort: order ? order.sort : null,
      dir: order ? order.dir : null,
      safe: safe ? null : "0",
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

  const openedFromUrl = useRef(false);
  useEffect(() => {
    if (openedFromUrl.current || !saved || !params) return;
    openedFromUrl.current = true;
    const hit = saved.find((l) => l.id === params.get("list"));
    if (hit) edit(hit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saved, params]);

  // --- The screen --------------------------------------------------------
  const listRules = useCallback(
    (ids: string[]) => ids.flatMap((id) => goalById.get(id)?.spec.filters ?? []),
    [goalById],
  );
  /** Lists + own filters, merged: what the reader sees (no safety rules). */
  const shownFilters = useMemo(() => mergeFilters([...listRules(picked), ...own]), [listRules, picked, own]);
  const shownSpec: ScreenerSpec = useMemo(
    () => ({ v: 2, filters: shownFilters, sort: sortNow.sort, dir: sortNow.dir }),
    [shownFilters, sortNow.sort, sortNow.dir],
  );
  const effective: ScreenerSpec = useMemo(
    () => ({ ...shownSpec, filters: withSafety(shownFilters, safe) }),
    [shownSpec, shownFilters, safe],
  );
  const result = useMemo(() => applyScreen(rows, effective), [rows, effective]);
  const columns = useMemo(() => tableColumns(shownSpec, defs), [shownSpec, defs]);
  const near = useMemo(
    () => (shownFilters.length ? nearMisses(rows, effective) : []),
    [rows, effective, shownFilters.length],
  );
  const countOf = useCallback(
    (ids: string[], ownFilters: ScreenerFilter[], safeOn: boolean = safe) =>
      applyScreen(rows, { v: 2, filters: withSafety(mergeFilters([...listRules(ids), ...ownFilters]), safeOn), sort: "name", dir: "asc" }).length,
    [rows, listRules, safe],
  );
  /** Each list: how many shares it has with the reader's own filters on. */
  const listCounts = useMemo(
    () => new Map(goals.map((g) => [g.id, countOf([g.id], own)] as const)),
    [goals, own, countOf],
  );

  // "Which shares": Category A lives in `own` as `category: A` (so links and
  // saved screens keep it); the switch shows it, never a chip.
  const hasAOnly = own.some(isAOnly);
  const ownRest = useMemo(() => own.filter((f) => !isAOnly(f)), [own]);
  const scope: Scope = hasAOnly ? "a" : safe ? "safe" : "all";
  const scopeCounts = useMemo(
    () => ({
      safe: countOf(picked, ownRest, true),
      a: countOf(picked, [...ownRest.filter((f) => f.key !== "category"), A_ONLY], true),
      all: countOf(picked, ownRest, false),
    }),
    [countOf, picked, ownRest],
  );
  /** A list or a filter of the reader's own is on: there is a shortlist to show. */
  const chosen = picked.length > 0 || ownRest.length > 0;
  // THE Premium line, step 5 (2026-11-22): a result built only on public
  // figures (your own filters, not one of our lists or our own checks) is the
  // market, free to look at. Our lists and our-analysis filters stay Premium.
  const judged = picked.length > 0 || own.some((f) => defs.get(f.key)?.ours);
  const showResult = chosen || browse;

  const resetPaging = () => setLimit(PAGE);
  /** One list at a time: a tap picks it, a tap on the picked one clears it. */
  const togglePick = (id: string) => {
    const on = picked.includes(id);
    setPicked(on ? [] : [id]);
    setOrder(null);
    resetPaging();
    if (!on) trackEvent("screener_list", { id });
  };
  const setOwnFilter = (key: string, f: ScreenerFilter | null) => {
    setOwn((xs) => {
      const i = xs.findIndex((x) => x.key === key);
      if (f && i >= 0) return xs.map((x, j) => (j === i ? f : x));
      if (f) return [...xs, f];
      return xs.filter((x) => x.key !== key);
    });
    setSheet(null);
    resetPaging();
  };
  const setScope = (s: Scope) => {
    setOwn((xs) => (s === "a" ? [...xs.filter((f) => f.key !== "category"), A_ONLY] : xs.filter((f) => !isAOnly(f))));
    setSafe(s !== "all");
    resetPaging();
  };
  const sortBy = (key: string) => {
    const d = defs.get(key);
    const first: "asc" | "desc" = key === "name" ? "asc" : d && !d.high_good ? "asc" : "desc";
    setOrder({ sort: key, dir: sortNow.sort === key ? (sortNow.dir === "asc" ? "desc" : "asc") : first });
    resetPaging();
  };
  const clearAll = () => {
    setPicked([]);
    setOwn([]);
    setSafe(true);
    setOrder(null);
    setBrowse(false);
    setEditingId(null);
    resetPaging();
  };
  const browseAll = () => {
    setBrowse(true);
    window.setTimeout(toResult, 60);
  };

  function edit(l: SavedCustomList) {
    const raw = (l.legacy ? l.filters_spec : l.spec) as ScreenerSpec | undefined;
    if (!raw) return;
    setEditingId(l.id);
    setName(l.name);
    setAlerts(l.alerts);
    const savedLists = (raw.lists ?? []).filter((id) => goalById.has(id));
    if ((raw.lists || raw.own) && savedLists.length <= 1) {
      setPicked(savedLists);
      setOwn(raw.own ?? []);
      setSafe(raw.safe ?? true);
    } else {
      const hit = matchGoal(raw, goals);
      if (hit) {
        setPicked([hit.goal.id]);
        setOwn(hit.refine);
        setSafe(hit.safe);
      } else {
        const s = stripSafety(raw.filters);
        setPicked([]);
        setOwn(s.filters);
        setSafe(s.safe);
      }
    }
    setOrder(raw.sort && raw.sort !== DEFAULT_SORT ? { sort: raw.sort, dir: raw.dir } : null);
    resetPaging();
    if (l.dropped?.length) {
      toast({
        message: t(
          `This screen was made in the old screener. ${l.dropped.map((d) => d.en).join(", ")} has no filter here, so it was left out. Save to keep the new version.`,
          `স্ক্রিনটি পুরোনো স্ক্রিনারে বানানো। ${l.dropped.map((d) => d.bn).join(", ")}-এর কোনো ফিল্টার এখানে নেই, তাই বাদ গেছে। নতুন রূপটি রাখতে সেভ করুন।`,
        ),
        tone: "neutral",
      });
    }
    window.setTimeout(() => topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  }

  const pickedGoals = picked.map((id) => goalById.get(id)).filter((g): g is ScreenerReady => !!g);
  const pickedTitle = pickedGoals.length
    ? { en: pickedGoals.map((g) => g.title_en).join(" + "), bn: pickedGoals.map((g) => g.title_bn).join(" + ") }
    : null;

  const openSave = () => {
    if (!editingId && pickedTitle) setName(t(pickedTitle.en, pickedTitle.bn).slice(0, 40));
    setSaveOpen(true);
  };

  /** true once saved. `filters` (lists + own + safety) is what the daily check runs. */
  const save = async (): Promise<boolean> => {
    if (!isPremium) {
      showLimitNotice("custom_lists");
      return false;
    }
    if (!name.trim()) {
      toast({ message: t("Give the screen a name first.", "আগে স্ক্রিনের একটি নাম দিন।"), tone: "neutral" });
      return false;
    }
    if (!shownFilters.length) {
      toast({ message: t("Pick a list or add a filter first.", "আগে একটি তালিকা বা ফিল্টার বাছুন।"), tone: "neutral" });
      return false;
    }
    const spec: ScreenerSpec = { ...effective, lists: picked, own, safe };
    setSaving(true);
    try {
      if (editingId) {
        await apiUpdateCustomList(editingId, { name, spec, alerts });
        toast({ message: t("Screen saved.", "স্ক্রিন সেভ হয়েছে।"), tone: "success" });
      } else {
        const { list } = await apiCreateCustomList(name, spec, alerts);
        setEditingId(list.id);
        toast({
          message: t("Saved. We will tell you when a new share joins.", "সেভ হয়েছে। নতুন কোনো শেয়ার যোগ হলে জানিয়ে দেব।"),
          tone: "success",
        });
      }
      loadSaved();
      return true;
    } catch (err) {
      if (isLimitError(err, "custom_lists")) showLimitNotice("custom_lists");
      else {
        const msg = (err as Error)?.message ?? "";
        toast({
          message: msg === "too_many_lists"
            ? t("You can keep 10 screens. Delete one to add another.", "সর্বোচ্চ 10টি স্ক্রিন রাখা যায়। নতুন যোগ করতে একটি মুছুন।")
            : t("We couldn't save the screen. Please try again.", "স্ক্রিন সেভ হয়নি। আবার চেষ্টা করুন।"),
          tone: "error",
        });
      }
      return false;
    } finally {
      setSaving(false);
    }
  };

  const toggleAlerts = async (l: SavedCustomList) => {
    try {
      await apiUpdateCustomList(l.id, { alerts: !l.alerts });
      setSaved((xs) => xs?.map((x) => (x.id === l.id ? { ...x, alerts: !l.alerts } : x)) ?? xs);
    } catch (err) {
      if (isLimitError(err, "custom_lists")) showLimitNotice("custom_lists");
    }
  };

  const remove = async (l: SavedCustomList) => {
    if (!window.confirm(t(`Delete the screen "${l.name}"?`, `"${l.name}" স্ক্রিনটি মুছবেন?`))) return;
    try {
      await apiDeleteCustomList(l.id);
      setSaved((xs) => xs?.filter((x) => x.id !== l.id) ?? xs);
      if (editingId === l.id) setEditingId(null);
      toast({ message: t("Screen deleted.", "স্ক্রিন মুছে ফেলা হয়েছে।"), tone: "neutral" });
    } catch {
      toast({ message: t("We couldn't delete the screen.", "স্ক্রিন মোছা যায়নি।"), tone: "error" });
    }
  };

  const lists = saved ?? [];
  const sheetDef: ScreenerFilterDef | null = sheet ? defs.get(sheet) ?? null : null;
  const total = rows.length;
  const n = result.length;
  const ownKeys = new Set(own.map((f) => f.key));

  const SCOPES: { key: Scope; en: string; bn: string }[] = [
    { key: "safe", en: "Safer shares", bn: "তুলনামূলক নিরাপদ" },
    { key: "a", en: "Category A", bn: "শুধু A ক্যাটাগরি" },
    { key: "all", en: "Every share", bn: "সব শেয়ার" },
  ];
  const scopeNote =
    scope === "safe"
      ? tt("Leaves out Z-category shares and shares that trade under ৳10 lakh a day.",
           "Z ক্যাটাগরির শেয়ার আর দিনে ৳10 লাখের কম লেনদেন হওয়া শেয়ার বাদ থাকে।")
      : scope === "a"
        ? safe
          ? tt("Only DSE category A shares that trade ৳10 lakh a day or more.",
               "শুধু ডিএসইর A ক্যাটাগরির শেয়ার, যেগুলোর দিনে ৳10 লাখ বা বেশি লেনদেন হয়।")
          : tt("Only DSE category A shares.", "শুধু ডিএসইর A ক্যাটাগরির শেয়ার।")
        : tt("Every share, Z-category and thinly traded ones too.",
             "সব শেয়ার, Z ক্যাটাগরি আর কম লেনদেনের শেয়ারও।");

  return (
    <PageLockScope anchor={SCREENER_ANCHOR}>
      <div ref={topRef} className="scroll-mt-24 space-y-8">
        {/* Your screens: a member's saved screens, one tap each */}
        {isPremium && lists.length > 0 && (
          <nav className="scr-strip" aria-labelledby="scr-mine">
            <div className="scr-strip-head">
              <h2 id="scr-mine" className="scr-label">{tt("Your screens", "আপনার স্ক্রিন")}</h2>
              <button
                type="button"
                className="scr-link"
                onClick={() => savedRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
              >
                {tt("Manage", "সাজান")}
              </button>
            </div>
            <ul className="scr-strip-row">
              {lists.map((l) => (
                <li key={l.id}>
                  <button
                    type="button"
                    className="scr-strip-item"
                    aria-current={editingId === l.id ? "true" : undefined}
                    onClick={() => edit(l)}
                  >
                    <span className="scr-strip-name">{l.name}</span>
                    {l.passed != null && <span className="scr-strip-n nums">{l.passed}</span>}
                    {l.joined.length > 0 && (
                      <span className="scr-strip-new nums">
                        {tt(`${l.joined.length} new`, `${l.joined.length}টি নতুন`)}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        )}

        {/* The one card: lists, own filters, which shares, and the count */}
        <section className="scr-builder" aria-label={t("Build your screen", "আপনার স্ক্রিন বানান")}>
          <div className="scr-part">
            <div className="scr-part-head">
              <h2 id="scr-q" className="scr-label">{tt("Start with a list", "একটি তালিকা দিয়ে শুরু করুন")}</h2>
              {picked.length > 0 && ownRest.length > 0 && (
                <button type="button" className="scr-link" onClick={clearAll}>
                  {tt("Start again", "আবার শুরু করুন")}
                </button>
              )}
            </div>
            <div className="scr-tiles" role="radiogroup" aria-labelledby="scr-q">
              {goals.map((g) => {
                const on = picked.includes(g.id);
                const c = listCounts.get(g.id) ?? 0;
                const Icon = LIST_ICON[g.id] ?? IconList;
                return (
                  <button
                    key={g.id}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    className="scr-tile"
                    onClick={() => togglePick(g.id)}
                  >
                    <span className="scr-tile-ic" aria-hidden="true"><Icon size={18} /></span>
                    {on && <span className="scr-tile-tick" aria-hidden="true"><IconCheck size={12} /></span>}
                    <span className="scr-tile-name">{tt(g.title_en, g.title_bn)}</span>
                    <span className={`scr-tile-n nums${c === 0 ? " is-zero" : ""}`}>
                      <b>{c}</b>
                      {tt(c === 1 ? " share" : " shares", "টি শেয়ার")}
                    </span>
                  </button>
                );
              })}
            </div>
            {pickedGoals[0] ? (
              <div className="scr-pickline">
                <p>{tt(pickedGoals[0].blurb_en, pickedGoals[0].blurb_bn)}</p>
                <div className="scr-pickline-acts">
                  <button type="button" className="scr-link" onClick={() => setHowOpen(true)}>
                    {tt("How we pick", "কীভাবে বাছাই করি")}
                  </button>
                  <button type="button" className="scr-link" onClick={() => togglePick(pickedGoals[0].id)}>
                    {tt("Clear", "বাদ দিন")}
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" className="scr-link justify-self-start" onClick={() => setHowOpen(true)}>
                {tt("How we pick each list", "প্রতিটি তালিকা কীভাবে বাছাই করি")}
              </button>
            )}
          </div>

          <div className="scr-part">
            <h2 className="scr-label">
              {picked.length ? tt("Narrow it down", "আরও বাছাই করুন") : tt("Or set your own filters", "অথবা নিজের ফিল্টার দিন")}
            </h2>
            <ul className="scr-chips">
              {ownRest.map((f) => {
                const d = defs.get(f.key);
                if (!d) return null;
                const w = valueWords(f, d);
                return (
                  <li key={f.key} className={d.ours ? "scr-chip scr-chip--ours" : "scr-chip"}>
                    <button type="button" className="scr-chip-main" onClick={() => setSheet(f.key)}>
                      {d.ours && <span className="scr-own-dot" aria-hidden="true" />}
                      <span className="font-normal">{tt(d.short_en, d.short_bn)}:</span>
                      <span>{tt(w.en, w.bn)}</span>
                    </button>
                    <button
                      type="button"
                      className="scr-chip-x"
                      onClick={() => setOwnFilter(f.key, null)}
                      aria-label={t(`Remove ${d.short_en}`, `${d.short_bn} বাদ দিন`)}
                    >
                      <IconClose size={14} />
                    </button>
                  </li>
                );
              })}
              {QUICK.filter((k) => !ownKeys.has(k)).map((k) => {
                const d = defs.get(k);
                if (!d) return null;
                return (
                  <li key={k}>
                    <button
                      type="button"
                      className={d.ours ? "scr-add scr-add--ours" : "scr-add"}
                      onClick={() => setSheet(k)}
                      disabled={own.length >= data.max_filters}
                    >
                      {d.ours && <span className="scr-own-dot" aria-hidden="true" />}
                      {tt(d.short_en, d.short_bn)}
                      <IconPlus size={14} />
                    </button>
                  </li>
                );
              })}
              <li>
                <button
                  type="button"
                  className="scr-add scr-add--more"
                  onClick={() => setAddOpen(true)}
                  disabled={own.length >= data.max_filters}
                >
                  {tt(`All filters · ${menuCount}`, `সব ফিল্টার · ${menuCount}`)}
                </button>
              </li>
            </ul>
          </div>

          <div className="scr-part">
            <h2 id="scr-scope" className="scr-label">{tt("Which shares", "কোন শেয়ার")}</h2>
            <div className="scr-seg" role="radiogroup" aria-labelledby="scr-scope">
              {SCOPES.map((s) => {
                const c = scopeCounts[s.key];
                return (
                  <button
                    key={s.key}
                    type="button"
                    role="radio"
                    aria-checked={scope === s.key}
                    className="scr-seg-item"
                    onClick={() => setScope(s.key)}
                  >
                    <b className={`nums${c === 0 ? " is-zero" : ""}`}>{c}</b>
                    <span>{tt(s.en, s.bn)}</span>
                  </button>
                );
              })}
            </div>
            <p className="scr-note">{scopeNote}</p>
          </div>

          {/* The foot: sticky to the screen's bottom while the card is in view */}
          <div className="scr-foot" role="status">
            {chosen || browse ? (
              n > 0 ? (
                <>
                  <p className="scr-foot-n nums">
                    {chosen
                      ? tt(`${n} of ${total} fit`, `${total}টির মধ্যে ${n}টি মিলেছে`)
                      : tt(`All ${n} shares`, `সব ${n}টি শেয়ার`)}
                  </p>
                  <Button size="sm" onClick={toResult}>{tt("See them", "দেখুন")}</Button>
                </>
              ) : (
                <p className="scr-foot-note">
                  {tt("No share fits. Try another list, take a filter off or choose Every share.",
                      "কোনো শেয়ার মেলেনি। অন্য তালিকা বাছুন, একটি ফিল্টার বাদ দিন বা সব শেয়ার বাছুন।")}
                </p>
              )
            ) : (
              <>
                <p className="scr-foot-note">{tt("Pick a list or add a filter to start.", "শুরু করতে একটি তালিকা বা ফিল্টার বাছুন।")}</p>
                {isPremium && (
                  <Button variant="quiet" size="sm" onClick={browseAll}>
                    {tt(`Browse all ${n}`, `সব ${n}টি দেখুন`)}
                  </Button>
                )}
              </>
            )}
          </div>
        </section>

        {/* The result: once there is a shortlist (or a member browses) */}
        {showResult && (
          <section ref={resultRef} aria-labelledby="scr-result" className="scroll-mt-24 space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="min-w-0">
                <h2 id="scr-result" className="text-lg font-bold text-text-main">
                  {pickedTitle
                    ? tt(pickedTitle.en, pickedTitle.bn)
                    : chosen ? tt("Your filters", "আপনার ফিল্টার") : tt("Every share", "সব শেয়ার")}
                </h2>
                <p className="text-sm text-text-main nums">
                  {data.as_of
                    ? tt(`${n} ${n === 1 ? "share" : "shares"} · after the close on ${formatDate(data.as_of)}`,
                         `${n}টি শেয়ার · ${formatDate(data.as_of)}-এর ক্লোজিংয়ের পর`)
                    : tt(`${n} ${n === 1 ? "share" : "shares"}`, `${n}টি শেয়ার`)}
                </p>
                {editingId && (
                  <p className="text-sm text-text-main">
                    {tt(`You are changing your saved screen "${name}".`, `আপনি সেভ করা স্ক্রিন "${name}" বদলাচ্ছেন।`)}
                  </p>
                )}
              </div>
              {isPremium && n > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <label htmlFor="scr-sort" className="sr-only">{t("Order", "ক্রম")}</label>
                  <select id="scr-sort" className="scr-select" value={sortNow.sort} onChange={(e) => sortBy(e.target.value)}>
                    <option value="name">{t("Company, A to Z", "কোম্পানি, নাম অনুযায়ী")}</option>
                    {orders.map((r) => (
                      <option key={r.key} value={r.key}>{t(r.short_en, r.short_bn)}</option>
                    ))}
                  </select>
                  {chosen && (
                    <Button variant="quiet" onClick={openSave}>
                      <IconBell size={16} />
                      {editingId ? tt("Save changes", "বদল সেভ করুন") : tt("Save and watch", "সেভ করে নজর রাখুন")}
                    </Button>
                  )}
                </div>
              )}
            </div>

            {n === 0 ? (
              <EmptyState
                title={tt("No share fits right now", "এই মুহূর্তে কোনো শেয়ার মেলেনি")}
                message={tt("Pick another list, take a filter off, or choose Every share under Which shares.",
                           "অন্য তালিকা বাছুন, একটি ফিল্টার বাদ দিন, বা \"কোন শেয়ার\"-এ সব শেয়ার বাছুন।")}
              />
            ) : (
              !judged ? (
                <div className="space-y-6">
                  <ScreenerTable
                    rows={result}
                    columns={columns}
                    defs={defs}
                    spec={effective}
                    limit={limit}
                    onSort={sortBy}
                    onMore={() => setLimit((x) => x + PAGE)}
                    bn={bn}
                  />
                  {isPremium && <AlmostThere near={near} defs={defs} />}
                </div>
              ) : (
              <PageGate
                anchor={SCREENER_ANCHOR}
                anchorClass="scroll-mt-24"
                promo={<ScreenerPremium count={n} goal={picked[0] ?? null} />}
              >
                <div className="space-y-6">
                  <ScreenerTable
                    rows={result}
                    columns={columns}
                    defs={defs}
                    spec={effective}
                    limit={limit}
                    onSort={sortBy}
                    onMore={() => setLimit((x) => x + PAGE)}
                    bn={bn}
                  />
                  <AlmostThere near={near} defs={defs} />
                </div>
              </PageGate>
              )
            )}
            <p className="text-sm text-text-main">
              {tt("A list is a starting point for your own research, not advice to buy.",
                 "তালিকা আপনার নিজের যাচাইয়ের শুরু মাত্র, কেনার পরামর্শ নয়।")}
            </p>
          </section>
        )}

        {/* Saved screens, for editing */}
        {isLoggedIn && (isPremium || lists.length > 0) && (
          <section id="saved" ref={savedRef} aria-labelledby="scr-saved" className="scroll-mt-24 space-y-4">
            <h2 id="scr-saved" className="text-lg font-bold text-text-main">
              {tt(lists.length ? `Your saved screens (${lists.length})` : "Your saved screens",
                  lists.length ? `আপনার সেভ করা স্ক্রিন (${lists.length})` : "আপনার সেভ করা স্ক্রিন")}
            </h2>
            {saved === null ? (
              <Skeleton height={140} />
            ) : lists.length === 0 ? (
              <p className="text-sm text-text-main">
                {tt("Nothing saved yet. Pick a list or add filters, then tap \"Save and watch\". We check it after every close and tell you when a share joins.",
                    "এখনো কিছু সেভ করা নেই। একটি তালিকা বা ফিল্টার বাছুন, তারপর \"সেভ করে নজর রাখুন\" চাপুন। প্রতিদিন বাজার বন্ধের পর আমরা যাচাই করি, আর নতুন শেয়ার যোগ হলে জানাই।")}
              </p>
            ) : (
              lists.map((l) => (
                <SavedListCard
                  key={l.id}
                  list={l}
                  bn={bn}
                  canEdit={isPremium}
                  onEdit={() => edit(l)}
                  onToggleAlerts={() => toggleAlerts(l)}
                  onDelete={() => remove(l)}
                />
              ))
            )}
          </section>
        )}

        <FilterSheet
          def={sheetDef}
          current={sheet ? own.find((f) => f.key === sheet) ?? null : null}
          filters={effective.filters}
          rows={rows}
          ours={!!sheetDef?.ours}
          countFor={sheet ? (f) => countOf(picked, [...own.filter((x) => x.key !== sheet), ...(f ? [f] : [])]) : undefined}
          onApply={(f) => {
            if (!sheet) return;
            setOwnFilter(sheet, f);
            showResultSoon();
          }}
          onClose={() => setSheet(null)}
          t={t}
        />
        <AddFilterSheet
          open={addOpen}
          groups={data.groups}
          filters={data.filters}
          active={own.map((f) => f.key)}
          onPick={(d) => { setAddOpen(false); setSheet(d.key); }}
          onClose={() => setAddOpen(false)}
          t={t}
        />

        {/* How we pick: the picked list's rules, or every list's */}
        <Sheet
          open={howOpen}
          onClose={() => setHowOpen(false)}
          title={pickedTitle
            ? tt(`How we pick “${pickedTitle.en}”`, `“${pickedTitle.bn}” কীভাবে বাছাই করি`)
            : tt("How we pick each list", "প্রতিটি তালিকা কীভাবে বাছাই করি")}
        >
          <div className="space-y-4">
            <dl className="scr-how-list">
              {(pickedGoals.length ? pickedGoals : goals).map((g) => (
                <div key={g.id}>
                  {!pickedGoals.length && <dt>{tt(g.title_en, g.title_bn)}</dt>}
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
              {tt("Every list also leaves out Z-category shares and shares that trade under ৳10 lakh a day, unless you choose Every share under Which shares.",
                  "প্রতিটি তালিকা থেকে Z ক্যাটাগরির শেয়ার আর দিনে ৳10 লাখের কম লেনদেন হওয়া শেয়ারও বাদ থাকে, যদি না \"কোন শেয়ার\"-এ সব শেয়ার বাছেন।")}
            </p>
          </div>
        </Sheet>

        {/* Save (the buttons only show for Premium readers) */}
        <Sheet
          open={saveOpen}
          onClose={() => setSaveOpen(false)}
          dismissible={!saving}
          title={editingId ? tt(`Save "${name}"`, `"${name}" সেভ করুন`) : tt("Keep watching this", "এটিতে নজর রাখুন")}
          footer={
            <Button variant="primary" block onClick={async () => { if (await save()) setSaveOpen(false); }} disabled={saving}>
              {saving ? tt("Saving…", "সেভ হচ্ছে…") : editingId ? tt("Save changes", "বদল সেভ করুন") : tt("Save", "সেভ করুন")}
            </Button>
          }
        >
          <div className="space-y-3">
            <p className="text-sm text-text-main">
              {tt("We check it after every close and tell you when a share joins or leaves, and why.",
                  "প্রতিদিন বাজার বন্ধের পর আমরা এটি যাচাই করি, আর কোনো শেয়ার যোগ হলে বা বাদ পড়লে কারণসহ জানাই।")}
            </p>
            <div>
              <label htmlFor="sc-name" className="mb-1.5 block text-sm font-semibold text-text-main">
                {tt("Name", "নাম")}
              </label>
              <input
                id="sc-name"
                className="input-field"
                maxLength={40}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("e.g. Cheap banks", "যেমন: সস্তা ব্যাংক")}
              />
            </div>
            <label htmlFor="sc-alerts" className="flex min-h-10 items-center gap-2 text-sm text-text-main">
              <input id="sc-alerts" type="checkbox" checked={alerts} onChange={(e) => setAlerts(e.target.checked)} />
              {tt("Tell me when a share joins", "নতুন শেয়ার যোগ হলে জানান")}
            </label>
            {editingId && (
              <Button variant="link" onClick={() => { setEditingId(null); setName(""); }}>
                {tt("Save as a new screen instead", "বরং নতুন স্ক্রিন হিসেবে সেভ করুন")}
              </Button>
            )}
          </div>
        </Sheet>
      </div>
    </PageLockScope>
  );
}
