"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Button from "@/components/ui/Button";
import Sheet from "@/components/ui/Sheet";
import EmptyState from "@/components/ui/EmptyState";
import Skeleton from "@/components/ui/Skeleton";
import { IconBell, IconCheck, IconClose, IconPlus } from "@/components/ui/icons";
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
/** Filters offered as one-tap shortcuts under the lists. */
const QUICK = ["sector", "price"] as const;

/** Visible copy as both languages, so the server HTML needs no re-render to switch. */
const tt = (en: string, bn: string) => <T en={en} bn={bn} />;

/**
 * The stock screener (`/screener`; Premium since 2026-11-14). One page,
 * top to bottom (the same day, user: "make your own is nearly invisible …
 * everything should be on 1 page"; picking several lists at once was tried
 * and taken out: "remove the multiple selection of list. its confusing"):
 *
 * 1. **What are you looking for?** — six lists as radio rows, one at a time;
 *    tapping the picked one again clears it. Each row shows how many shares
 *    it has with the reader's own filters on, so nobody taps into 0.
 *    "How we pick each list" folds the rules; they never show as chips.
 * 2. **Add your own filters** — the reader's own filters as chips, with
 *    one-tap shortcuts (sector, share price, category A only) and "More
 *    filters" (the 12-filter menu). The safety line sits here: no Z shares,
 *    ৳10 lakh a day or more, with "Show them too".
 * 3. **The result** — how many shares fit (free), then the shares + "Almost
 *    there" inside one `PageGate`; a reader without Premium gets the Premium
 *    card there. Premium: an order menu and "Save and watch".
 * While the result is below the screen, a count bar sits at the bottom
 * ("22 shares match · See them"), and a filter sheet's "Show 22 shares"
 * scrolls there (2026-11-14, user: "after selecting a filter it just shows
 * on bottom. user need scrolling"). A picked list folds its six rows into
 * one line with "Change", so the filters and the result move up.
 * 4. **Your saved screens** (`#saved`) — signed-in readers who have some, or
 *    Premium. A saved screen keeps its lists, own filters and switch
 *    (`spec.lists` / `own` / `safe`) and reopens as it was made.
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

  const [picked, setPicked] = useState<string[]>([]);
  const [own, setOwn] = useState<ScreenerFilter[]>([]);
  const [order, setOrder] = useState<Order | null>(null);
  const [safe, setSafe] = useState(true);
  const [limit, setLimit] = useState(PAGE);
  const [sheet, setSheet] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const [saved, setSaved] = useState<SavedCustomList[] | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [alerts, setAlerts] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);
  const savedRef = useRef<HTMLElement>(null);
  const resultRef = useRef<HTMLElement>(null);
  const [listsOpen, setListsOpen] = useState(false);
  const [resultBelow, setResultBelow] = useState(false);

  // The count bar: on while the result is still below the screen.
  useEffect(() => {
    const el = resultRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([e]) => setResultBelow(!e.isIntersecting && e.boundingClientRect.top > 0),
      { rootMargin: "0px 0px -96px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
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

  // URL → state, once after mount. `ready` = the lists picked (comma list);
  // a ready-made screen from before 2026-11-14 loads as own filters; `f` =
  // own filters; `safe=0` turns the safety rules off; `tab=saved` scrolls to
  // the saved screens; `list=<id>` (the daily push) opens one.
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
    (ids: string[], ownFilters: ScreenerFilter[]) =>
      applyScreen(rows, { v: 2, filters: withSafety(mergeFilters([...listRules(ids), ...ownFilters]), safe), sort: "name", dir: "asc" }).length,
    [rows, listRules, safe],
  );
  /** Each list: how many shares it has with the reader's own filters on. */
  const listCounts = useMemo(
    () => new Map(goals.map((g) => [g.id, countOf([g.id], own)] as const)),
    [goals, own, countOf],
  );
  const aOnlyCount = useMemo(
    () => countOf(picked, [...own.filter((f) => f.key !== "category"), A_ONLY]),
    [countOf, picked, own],
  );

  const resetPaging = () => setLimit(PAGE);
  /** One list at a time: a tap picks it, a tap on the picked one clears it. */
  const togglePick = (id: string) => {
    const on = picked.includes(id);
    setPicked(on ? [] : [id]);
    setListsOpen(false);
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
  const sortBy = (key: string) => {
    const d = defs.get(key);
    const first: "asc" | "desc" = key === "name" ? "asc" : d && !d.high_good ? "asc" : "desc";
    setOrder({ sort: key, dir: sortNow.sort === key ? (sortNow.dir === "asc" ? "desc" : "asc") : first });
    resetPaging();
  };
  const clearAll = () => {
    setPicked([]);
    setOwn([]);
    setOrder(null);
    setEditingId(null);
    resetPaging();
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
  /** The six rows show with nothing picked, or after "Change". */
  const rowsShown = !pickedGoals.length || listsOpen;
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
  const hasAOnly = own.some((f) => f.key === "category" && f.in?.join() === "A");
  const anything = picked.length > 0 || own.length > 0;

  return (
    <PageLockScope anchor={SCREENER_ANCHOR}>
      <div ref={topRef} className="scroll-mt-24 space-y-8">
        {/* 1 · The lists */}
        <section aria-labelledby="scr-q">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 id="scr-q" className="text-lg font-bold text-text-main">
                {tt("What are you looking for?", "আপনি কী খুঁজছেন?")}
              </h2>
              {rowsShown && (
                <p className="text-sm text-text-main">
                  {tt("Pick one. Tap it again to clear it.", "একটি বাছুন। আবার চাপলে বাছাই উঠে যাবে।")}
                </p>
              )}
            </div>
            {anything && (
              <button type="button" className="scr-link" onClick={clearAll}>
                {tt("Start again", "আবার শুরু করুন")}
              </button>
            )}
          </div>
          {rowsShown ? (
          <div id="scr-lists" className="scr-lists" role="radiogroup" aria-labelledby="scr-q">
            {goals.map((g) => {
              const on = picked.includes(g.id);
              const c = listCounts.get(g.id) ?? 0;
              return (
                <button
                  key={g.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  className="scr-list"
                  onClick={() => togglePick(g.id)}
                >
                  <span className={`scr-check scr-radio${on ? " is-on" : ""}`} aria-hidden="true">{on && <IconCheck size={14} />}</span>
                  <span className="scr-list-text">
                    <span className="scr-list-name">{tt(g.title_en, g.title_bn)}</span>
                    <span className="scr-list-line">{tt(g.blurb_en, g.blurb_bn)}</span>
                  </span>
                  <span className={`scr-list-n nums${c === 0 ? " is-zero" : ""}`}>
                    <b>{c}</b>
                    <span>{tt(c === 1 ? "share" : "shares", "শেয়ার")}</span>
                  </span>
                </button>
              );
            })}
          </div>
          ) : (
            pickedGoals[0] && (
              <div className="scr-picked">
                <span className="scr-check scr-radio is-on" aria-hidden="true"><IconCheck size={14} /></span>
                <span className="scr-list-text">
                  <span className="scr-list-name">{tt(pickedGoals[0].title_en, pickedGoals[0].title_bn)}</span>
                  <span className="scr-list-line">{tt(pickedGoals[0].blurb_en, pickedGoals[0].blurb_bn)}</span>
                </span>
                <Button variant="quiet" size="sm" onClick={() => setListsOpen(true)} aria-expanded={false} aria-controls="scr-lists">
                  {tt("Change", "বদলান")}
                </Button>
              </div>
            )
          )}
          <details className="scr-how">
            <summary>
              {rowsShown
                ? tt("How we pick each list", "প্রতিটি তালিকা আমরা কীভাবে বাছাই করি")
                : tt("How we pick this list", "এই তালিকা আমরা কীভাবে বাছাই করি")}
            </summary>
            <dl className="scr-how-list">
              {(rowsShown ? goals : pickedGoals).map((g) => (
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
          </details>
        </section>

        {/* 2 · The reader's own filters */}
        <section className="scr-filters" aria-labelledby="scr-own">
          <h2 id="scr-own" className="text-base font-bold text-text-main">
            {picked.length
              ? tt("Narrow it down with your own filters", "নিজের ফিল্টার দিয়ে আরও বাছাই করুন")
              : tt("Or make your own with filters", "অথবা ফিল্টার দিয়ে নিজে বানান")}
          </h2>
          <p className="mt-1 text-sm text-text-main">
            {tt("Each choice shows how many shares you would get.", "প্রতিটি বিকল্প দেখায় কতগুলো শেয়ার পাবেন।")}
          </p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {own.map((f) => {
              const d = defs.get(f.key);
              if (!d) return null;
              const w = valueWords(f, d);
              const aOnly = f.key === "category" && f.in?.join() === "A";
              return (
                <li key={f.key} className={d.ours ? "scr-chip scr-chip--ours" : "scr-chip"}>
                  <button
                    type="button"
                    className="scr-chip-main"
                    onClick={() => (aOnly ? setOwnFilter("category", null) : setSheet(f.key))}
                  >
                    {d.ours && <span className="scr-own-dot" aria-hidden="true" />}
                    {aOnly ? (
                      <span>{tt("Category A only", "শুধু A ক্যাটাগরি")}</span>
                    ) : (
                      <>
                        <span className="font-normal">{tt(d.short_en, d.short_bn)}:</span>
                        <span>{tt(w.en, w.bn)}</span>
                      </>
                    )}
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
                  <button type="button" className="scr-add" onClick={() => setSheet(k)}>
                    <IconPlus size={16} />
                    {tt(d.short_en, d.short_bn)}
                  </button>
                </li>
              );
            })}
            {!hasAOnly && !ownKeys.has("category") && (
              <li>
                <button type="button" className="scr-add" onClick={() => setOwnFilter("category", A_ONLY)}>
                  <IconPlus size={16} />
                  {tt(`Category A only · ${aOnlyCount}`, `শুধু A ক্যাটাগরি · ${aOnlyCount}`)}
                </button>
              </li>
            )}
            <li>
              <button type="button" className="scr-add scr-add--more" onClick={() => setAddOpen(true)}
                disabled={own.length >= data.max_filters}>
                <IconPlus size={16} />
                {tt("More filters", "আরও ফিল্টার")}
              </button>
            </li>
          </ul>
          {own.some((f) => defs.get(f.key)?.ours) && (
            <p className="scr-own-key">
              <span className="scr-own-dot" aria-hidden="true" />
              {tt("Gold filters are our own analysis. No other DSE site has them.",
                 "সোনালি ফিল্টারগুলো আমাদের নিজের বিশ্লেষণ। ডিএসইর আর কোনো সাইটে এগুলো নেই।")}
            </p>
          )}
          <p className="scr-safe mt-3">
            <span>
              {safe
                ? tt("We leave out Z-category shares and shares that trade less than ৳10 lakh a day.",
                     "Z ক্যাটাগরির শেয়ার আর দিনে ৳10 লাখের কম লেনদেন হওয়া শেয়ার আমরা বাদ রাখি।")
                : tt("Showing every share, Z-category and thinly traded ones too.",
                     "সব শেয়ার দেখানো হচ্ছে, Z ক্যাটাগরি আর কম লেনদেনের শেয়ারও।")}
            </span>
            <button type="button" className="scr-link" onClick={() => { setSafe((x) => !x); resetPaging(); }}>
              {safe ? tt("Show them too", "ওগুলোও দেখান") : tt("Leave them out", "ওগুলো বাদ দিন")}
            </button>
          </p>
        </section>

        {/* 3 · The result */}
        <section ref={resultRef} aria-labelledby="scr-result" className="scroll-mt-24 space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="scr-result" className="scr-count nums">
                {anything
                  ? tt(`${n} of ${total} shares fit`, `${total}টির মধ্যে ${n}টি শেয়ার মিলেছে`)
                  : tt(`All ${n} shares`, `সব ${n}টি শেয়ার`)}
              </h2>
              {pickedTitle && <p className="text-sm font-semibold text-text-main">{tt(pickedTitle.en, pickedTitle.bn)}</p>}
              {editingId && (
                <p className="text-sm text-text-main">
                  {tt(`You are changing your saved screen "${name}".`, `আপনি সেভ করা স্ক্রিন "${name}" বদলাচ্ছেন।`)}
                </p>
              )}
              {data.as_of && (
                <p className="text-sm text-text-main">
                  {tt(`After the close on ${formatDate(data.as_of)}.`, `${formatDate(data.as_of)}-এর ক্লোজিংয়ের পর।`)}
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
                {anything && (
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
              message={tt("Pick another list, take a filter off, or show the shares we leave out. The numbers beside each list and choice show what you would get.",
                         "অন্য তালিকা বাছুন, একটি ফিল্টার বাদ দিন, বা যে শেয়ারগুলো বাদ রাখি সেগুলোও দেখুন। প্রতিটি তালিকা আর বিকল্পের পাশের সংখ্যা দেখায় কতগুলো পাবেন।")}
            />
          ) : (
            <PageGate
              anchor={SCREENER_ANCHOR}
              anchorClass="scroll-mt-24"
              promo={
                <ScreenerPremium count={n} goal={picked[0] ?? null} />
              }
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
          )}
          <p className="text-sm text-text-main">
            {tt("A list is a starting point for your own research, not advice to buy.",
               "তালিকা আপনার নিজের যাচাইয়ের শুরু মাত্র, কেনার পরামর্শ নয়।")}
          </p>
        </section>

        {/* 4 · Saved screens */}
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

        {/* The count bar: while the result is below the screen. */}
        {resultBelow && (
          <div data-bottom-card className="scr-countbar above-bottom-bar" role="status">
            <span className="scr-countbar-n nums">
              {anything
                ? tt(`${n} ${n === 1 ? "share matches" : "shares match"}`, `${n}টি শেয়ার মিলেছে`)
                : tt(`All ${n} shares`, `সব ${n}টি শেয়ার`)}
            </span>
            <Button variant="primary" size="sm" onClick={toResult}>
              {tt("See them", "দেখুন")}
            </Button>
          </div>
        )}

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
