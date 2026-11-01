"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Button from "@/components/ui/Button";
import Chip from "@/components/ui/Chip";
import Sheet from "@/components/ui/Sheet";
import Tabs from "@/components/ui/Tabs";
import EmptyState from "@/components/ui/EmptyState";
import Skeleton from "@/components/ui/Skeleton";
import { IconBell, IconClose, IconCrown, IconPlus } from "@/components/ui/icons";
import AnswerLock from "@/components/premium/AnswerLock";
import { PageLockScope } from "@/components/premium/LockScope";
import { showLimitNotice } from "@/components/premium/LimitNotice";
import SavedListCard from "@/components/custom-lists/SavedListCard";
import { T } from "@/components/i18n/T";
import FilterSheet from "./FilterSheet";
import AddFilterSheet from "./AddFilterSheet";
import ScreenerTable, { PAGE } from "./ScreenerTable";
import ScreenerPremium, { SCREENER_ANCHOR } from "./ScreenerPremium";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/context/LangContext";
import { usePremium, isLimitError } from "@/lib/premium";
import { useUrlParams, useUrlSync } from "@/lib/use-url-state";
import { toast } from "@/lib/toast";
import { trackEvent } from "@/lib/track";
import { formatDate } from "@/lib/formatters";
import {
  DEFAULT_SORT, EMPTY_SPEC, applyScreen, decodeFilters, encodeFilters, matchReady, sameSpec, setFilter,
  tableColumns, unpackRows, valueWords,
} from "@/lib/screener";
import {
  apiCreateCustomList, apiDeleteCustomList, apiGetCustomLists, apiUpdateCustomList,
  type SavedCustomList, type ScreenerFilter, type ScreenerFilterDef, type ScreenerSpec, type ScreenerUniverse,
} from "@/lib/api";

type Tab = "screen" | "saved";
const TABS: Tab[] = ["screen", "saved"];

/** Visible copy as both languages, so the server HTML needs no re-render to switch. */
const tt = (en: string, bn: string) => <T en={en} bn={bn} />;

/**
 * The stock screener (`/screener`, rebuilt 2026-11-01 — user: the six graded
 * questions were "very complicated to understand and use" and "totally based
 * on our analysis"). A screener of public figures, the way investors already
 * think ("yield over 5%, P/E under 10, category A"):
 *
 * - ready-made screens as one chip row — each just loads visible filters;
 * - the screen's filters as chips ("P/E: Under 10 ✕") + "Add a filter";
 *   a filter's sheet (`FilterSheet`) explains the figure, shows where most
 *   DSE shares sit, and counts every choice before you pick it;
 * - the result as the page: a sortable table whose columns follow the
 *   filters (`ScreenerTable`).
 *
 * Every company's figures arrive with the page (`GET /api/screener`), so
 * filtering, counting and sorting happen here with no request. Everything on
 * public figures is free, every row. Premium = TopStockBD's view as filters
 * (grade, price check, warnings: anyone sees the count, the shares are
 * screen-locked) and saved screens with a daily alert. Saved = the reader's
 * screens; old ones (six questions / checks) open as the closest filters.
 */
export default function ScreenerClient({ data }: { data: ScreenerUniverse }) {
  const { isLoggedIn, isLoading: authLoading } = useAuth();
  const { isPremium, state } = usePremium();
  const { bn } = useLang();
  const t = useCallback((en: string, b: string) => (bn ? b : en), [bn]);

  const rows = useMemo(() => unpackRows(data), [data]);
  const defs = useMemo(() => new Map(data.filters.map((f) => [f.key, f] as const)), [data]);
  const ranges = useMemo(() => data.filters.filter((f) => f.kind === "range"), [data]);

  const [tab, setTab] = useState<Tab>("screen");
  const [spec, setSpec] = useState<ScreenerSpec>(EMPTY_SPEC);
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

  // URL → state, once after mount.
  const params = useUrlParams();
  useEffect(() => {
    if (!params) return;
    const tb = params.get("tab") as Tab | null;
    if (tb && TABS.includes(tb)) setTab(tb);
    const ready = data.ready.find((r) => r.id === params.get("ready"));
    if (ready) return setSpec(ready.spec);
    const f = params.get("f");
    const sort = params.get("sort");
    const dir = params.get("dir");
    if (f || sort) {
      setSpec({
        v: 2,
        filters: f ? decodeFilters(f, defs) : [],
        sort: sort && (sort === "name" || ranges.some((r) => r.key === sort)) ? sort : DEFAULT_SORT,
        dir: dir === "asc" ? "asc" : "desc",
      });
    }
  }, [params, data.ready, defs, ranges]);

  // State → URL: a ready-made screen is its name; anything else its filters.
  const ready = matchReady(spec, data.ready);
  const exactReady = ready && sameSpec(ready.spec, spec) ? ready : undefined;
  const defaultOrder = spec.sort === DEFAULT_SORT && spec.dir === "desc";
  useUrlSync(
    {
      tab: tab === "screen" ? null : tab,
      ready: exactReady?.id ?? null,
      f: !exactReady && spec.filters.length ? encodeFilters(spec.filters) : null,
      sort: exactReady || defaultOrder ? null : spec.sort,
      dir: exactReady || defaultOrder ? null : spec.dir,
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

  // ?list=<id> (the daily push) opens that saved screen.
  const openedFromUrl = useRef(false);
  useEffect(() => {
    if (openedFromUrl.current || !saved || !params) return;
    openedFromUrl.current = true;
    const hit = saved.find((l) => l.id === params.get("list"));
    if (hit) edit(hit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saved, params]);

  const result = useMemo(() => applyScreen(rows, spec), [rows, spec]);
  const columns = useMemo(() => tableColumns(spec, defs), [spec, defs]);
  const viewOn = spec.filters.some((f) => defs.get(f.key)?.premium);
  const locked = viewOn && !isPremium;

  const change = (next: ScreenerSpec) => {
    setSpec(next);
    setLimit(PAGE);
  };
  const applyFilter = (key: string, f: ScreenerFilter | null) => {
    change(setFilter(spec, key, f));
    setSheet(null);
    if (f && defs.get(key)?.premium && !isPremium) {
      trackEvent("premium_lock_view", { area: "screener", lock: "Screener view filter", state });
    }
  };
  const sortBy = (key: string) => {
    const d = defs.get(key);
    const first: "asc" | "desc" = key === "name" ? "asc" : d && !d.high_good ? "asc" : "desc";
    change({ ...spec, sort: key, dir: spec.sort === key ? (spec.dir === "asc" ? "desc" : "asc") : first });
  };
  const pickReady = (id: string) => {
    const r = data.ready.find((x) => x.id === id);
    if (!r) return;
    if (exactReady?.id === id) return change(EMPTY_SPEC);
    setEditingId(null);
    setName(t(r.title_en, r.title_bn));
    change(r.spec);
    trackEvent("screener_ready", { id });
  };

  function edit(l: SavedCustomList) {
    const next = l.legacy ? l.filters_spec : (l.spec as ScreenerSpec);
    if (!next) return;
    setEditingId(l.id);
    setName(l.name);
    setAlerts(l.alerts);
    change(next);
    setTab("screen");
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

  /** true once saved. */
  const save = async (): Promise<boolean> => {
    if (!isPremium) {
      showLimitNotice("custom_lists");
      return false;
    }
    if (!name.trim()) {
      toast({ message: t("Give the screen a name first.", "আগে স্ক্রিনের একটি নাম দিন।"), tone: "neutral" });
      return false;
    }
    if (!spec.filters.length) {
      toast({ message: t("Add at least one filter first.", "আগে অন্তত একটি ফিল্টার যোগ করুন।"), tone: "neutral" });
      return false;
    }
    setSaving(true);
    try {
      if (editingId) {
        await apiUpdateCustomList(editingId, { name, spec, alerts });
        toast({ message: t("Screen saved.", "স্ক্রিন সেভ হয়েছে।"), tone: "success" });
      } else {
        const { list } = await apiCreateCustomList(name, spec, alerts);
        setEditingId(list.id);
        toast({
          message: t("Screen saved. We will tell you when a new share matches.", "স্ক্রিন সেভ হয়েছে। নতুন কোনো শেয়ার মিললে জানিয়ে দেব।"),
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
            ? t("You can keep 5 screens. Delete one to add another.", "সর্বোচ্চ 5টি স্ক্রিন রাখা যায়। নতুন যোগ করতে একটি মুছুন।")
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
  const tabLabel: Record<Tab, ReactNode> = {
    screen: tt("Screen", "স্ক্রিন"),
    saved: lists.length ? tt(`Saved (${lists.length})`, `সেভ করা (${lists.length})`) : tt("Saved", "সেভ করা"),
  };
  const sheetDef: ScreenerFilterDef | null = sheet ? defs.get(sheet) ?? null : null;
  const total = rows.length;
  const n = result.length;

  const table = (
    <ScreenerTable
      rows={result}
      columns={columns}
      defs={defs}
      spec={spec}
      limit={limit}
      onSort={sortBy}
      onMore={() => setLimit((x) => x + PAGE)}
      bn={bn}
    />
  );

  return (
    <PageLockScope anchor={SCREENER_ANCHOR}>
      <div ref={topRef} className="scroll-mt-24">
        <Tabs
          tabs={TABS.map((k) => ({ key: k, label: tabLabel[k] }))}
          value={tab}
          onChange={setTab}
          ariaLabel={t("Screener views", "স্ক্রিনারের অংশ")}
          idBase="sc-tab"
          className="mb-6"
        />

        {tab === "screen" && (
          <div role="tabpanel" aria-labelledby="sc-tab-screen" className="space-y-6">
            {/* Ready-made screens: each loads visible filters. */}
            <section aria-labelledby="scr-ready-title">
              <h2 id="scr-ready-title" className="mb-2 text-sm font-semibold text-text-main">
                {tt("Ready-made screens", "তৈরি স্ক্রিন")}
              </h2>
              <div className="flex flex-wrap gap-2">
                {data.ready.map((r) => (
                  <Chip key={r.id} active={ready?.id === r.id} onClick={() => pickReady(r.id)}>
                    {tt(r.title_en, r.title_bn)}
                  </Chip>
                ))}
              </div>
              {ready && <p className="mt-2 text-sm text-text-main">{tt(ready.blurb_en, ready.blurb_bn)}</p>}
            </section>

            {/* The screen's filters */}
            <section className="scr-filters" aria-labelledby="scr-filters-title">
              <div className="flex items-center justify-between gap-3">
                <h2 id="scr-filters-title" className="text-base font-semibold text-text-main">
                  {tt("Your filters", "আপনার ফিল্টার")}
                </h2>
                {spec.filters.length > 0 && (
                  <button type="button" className="scr-link" onClick={() => change({ ...spec, filters: [] })}>
                    {tt("Clear all", "সব মুছুন")}
                  </button>
                )}
              </div>
              {editingId && (
                <p className="mt-1 text-sm text-text-main">
                  {tt(`You are changing your saved screen "${name}".`, `আপনি সেভ করা স্ক্রিন "${name}" বদলাচ্ছেন।`)}
                </p>
              )}
              <ul className="mt-3 flex flex-wrap gap-2">
                {spec.filters.map((f) => {
                  const d = defs.get(f.key);
                  if (!d) return null;
                  const w = valueWords(f, d);
                  return (
                    <li key={f.key} className="scr-chip">
                      <button type="button" className="scr-chip-main" onClick={() => setSheet(f.key)}>
                        {d.premium && <span className="text-gold-ink"><IconCrown size={14} /></span>}
                        <span className="font-normal">{tt(d.short_en, d.short_bn)}:</span>
                        <span>{tt(w.en, w.bn)}</span>
                      </button>
                      <button
                        type="button"
                        className="scr-chip-x"
                        onClick={() => applyFilter(f.key, null)}
                        aria-label={t(`Remove ${d.short_en}`, `${d.short_bn} বাদ দিন`)}
                      >
                        <IconClose size={14} />
                      </button>
                    </li>
                  );
                })}
                <li>
                  <button type="button" className="scr-add" onClick={() => setAddOpen(true)}
                    disabled={spec.filters.length >= data.max_filters}>
                    <IconPlus size={16} />
                    {tt("Add a filter", "ফিল্টার যোগ করুন")}
                  </button>
                </li>
              </ul>
              {!spec.filters.length && (
                <p className="mt-3 text-sm text-text-main">
                  {tt("No filters yet, so every company we cover is listed. Pick a ready-made screen or add a filter: price, P/E, dividend, profit, size, sector and more.",
                     "এখনো কোনো ফিল্টার নেই, তাই আমাদের সব কোম্পানি দেখানো হচ্ছে। একটি তৈরি স্ক্রিন বাছুন বা ফিল্টার যোগ করুন: দাম, পিই, ডিভিডেন্ড, মুনাফা, আকার, সেক্টর আরও অনেক কিছু।")}
                </p>
              )}
            </section>

            {/* The result */}
            <section aria-labelledby="scr-result-title" className="space-y-3">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 id="scr-result-title" className="text-xl font-bold text-text-main tabular-nums">
                    {spec.filters.length
                      ? tt(`${n} of ${total} shares match`, `${total}টির মধ্যে ${n}টি শেয়ার মিলেছে`)
                      : tt(`All ${total} companies`, `সব ${total}টি কোম্পানি`)}
                  </h2>
                  {data.as_of && (
                    <p className="text-sm text-text-main">
                      {tt(`Figures from the close on ${formatDate(data.as_of)}. Tap a column to sort.`,
                         `${formatDate(data.as_of)}-এর ক্লোজিং দামের হিসাব। সাজাতে কলামে চাপুন।`)}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <label htmlFor="scr-sort" className="sr-only">{t("Order", "ক্রম")}</label>
                  <select
                    id="scr-sort"
                    className="scr-select"
                    value={spec.sort}
                    onChange={(e) => sortBy(e.target.value)}
                  >
                    <option value="name">{t("Company, A to Z", "কোম্পানি, নাম অনুযায়ী")}</option>
                    {ranges.map((r) => (
                      <option key={r.key} value={r.key}>{t(r.short_en, r.short_bn)}</option>
                    ))}
                  </select>
                  <Button
                    variant="quiet"
                    onClick={() => change({ ...spec, dir: spec.dir === "asc" ? "desc" : "asc" })}
                    aria-label={t("Flip the order", "ক্রম উল্টে দিন")}
                  >
                    {spec.sort === "name"
                      ? (spec.dir === "asc" ? tt("A first", "আগে A") : tt("Z first", "আগে Z"))
                      : (spec.dir === "desc" ? tt("Highest first", "বেশি আগে") : tt("Lowest first", "কম আগে"))}
                  </Button>
                  <Button variant="quiet" onClick={() => setSaveOpen(true)}>
                    <IconBell size={16} />
                    {editingId ? tt("Save changes", "বদল সেভ করুন") : tt("Save", "সেভ করুন")}
                  </Button>
                </div>
              </div>

              {n === 0 ? (
                <EmptyState
                  title={tt("No share matches every filter", "কোনো শেয়ার সব ফিল্টারে মেলেনি")}
                  message={tt("Take a filter off, or widen a range. The number beside each choice shows what you would get.",
                             "একটি ফিল্টার বাদ দিন, বা সীমা বাড়ান। প্রতিটি বিকল্পের পাশের সংখ্যা দেখায় কতগুলো পাবেন।")}
                />
              ) : locked ? (
                <AnswerLock
                  job="find"
                  lock="Screener view filter"
                  lines={[
                    { en: `Which ${n} shares pass your screen with our view on it`,
                      bn: `আমাদের মতসহ আপনার স্ক্রিনে কোন ${n}টি শেয়ার মেলে` },
                    { en: "Take off the crowned filter to see every share for free",
                      bn: "মুকুট দেওয়া ফিল্টারটি বাদ দিলে সব শেয়ার ফ্রিতে দেখবেন" },
                  ]}
                  brief
                >
                  {table}
                </AnswerLock>
              ) : (
                table
              )}
            </section>

            <ScreenerPremium viewCount={viewOn ? n : null} t={t} />

            <p className="text-sm text-text-main">
              {tt("A screen is a starting point for your own research, not advice to buy.",
                 "স্ক্রিন আপনার নিজের যাচাইয়ের শুরু মাত্র, কেনার পরামর্শ নয়।")}
            </p>

            <FilterSheet
              def={sheetDef}
              current={sheet ? spec.filters.find((f) => f.key === sheet) ?? null : null}
              filters={spec.filters}
              rows={rows}
              locked={!!sheetDef?.premium && !isPremium}
              onApply={(f) => sheet && applyFilter(sheet, f)}
              onClose={() => setSheet(null)}
              t={t}
            />
            <AddFilterSheet
              open={addOpen}
              groups={data.groups}
              filters={data.filters}
              active={spec.filters.map((f) => f.key)}
              onPick={(d) => { setAddOpen(false); setSheet(d.key); }}
              onClose={() => setAddOpen(false)}
              t={t}
            />

            {/* Save */}
            <Sheet
              open={saveOpen}
              onClose={() => setSaveOpen(false)}
              dismissible={!saving}
              title={editingId ? tt(`Save "${name}"`, `"${name}" সেভ করুন`) : tt("Keep this screen", "স্ক্রিনটি রেখে দিন")}
              footer={
                state === "guest" ? (
                  <Button href="/login?next=%2Fscreener" variant="primary" block>
                    {tt("Sign in to save", "সেভ করতে সাইন ইন করুন")}
                  </Button>
                ) : !isPremium ? (
                  <Button href={`#${SCREENER_ANCHOR}`} variant="primary" block onClick={() => setSaveOpen(false)}>
                    {tt("Saving is part of Premium", "সেভ করা প্রিমিয়ামের অংশ")}
                  </Button>
                ) : (
                  <Button variant="primary" block onClick={async () => { if (await save()) setSaveOpen(false); }} disabled={saving}>
                    {saving ? tt("Saving…", "সেভ হচ্ছে…") : editingId ? tt("Save changes", "বদল সেভ করুন") : tt("Save this screen", "স্ক্রিন সেভ করুন")}
                  </Button>
                )
              }
            >
              <div className="space-y-3">
                <p className="text-sm text-text-main">
                  {tt("We run it after every close and tell you when a new share matches.",
                      "প্রতিদিন বাজার বন্ধের পর আমরা এটি চালাই, আর নতুন কোনো শেয়ার মিললে জানাই।")}
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
                  {tt("Tell me when a new share matches", "নতুন কোনো শেয়ার মিললে জানান")}
                </label>
                {editingId && isPremium && (
                  <Button variant="link" onClick={() => { setEditingId(null); setName(""); }}>
                    {tt("Save as a new screen instead", "বরং নতুন স্ক্রিন হিসেবে সেভ করুন")}
                  </Button>
                )}
                {!isPremium && (
                  <p className="text-sm text-text-main">
                    {tt("Premium keeps up to 5 screens, each checked after every close.",
                       "প্রিমিয়ামে সর্বোচ্চ 5টি স্ক্রিন রাখা যায়, আর প্রতিদিন বাজার বন্ধের পর সেগুলো যাচাই হয়।")}
                  </p>
                )}
              </div>
            </Sheet>
          </div>
        )}

        {tab === "saved" && (
          <div role="tabpanel" aria-labelledby="sc-tab-saved">
            {!isLoggedIn && !authLoading ? (
              <EmptyState
                title={tt("Sign in to keep your screens", "স্ক্রিন রাখতে সাইন ইন করুন")}
                message={tt("Saved screens run after every close and tell you when a new share matches.",
                           "সেভ করা স্ক্রিন প্রতিদিন বাজার বন্ধের পর চলে, আর নতুন শেয়ার মিললে জানায়।")}
                actions={[{ href: "/login?next=%2Fscreener%3Ftab%3Dsaved", label: tt("Sign in", "সাইন ইন") }]}
              />
            ) : saved === null ? (
              <div className="space-y-4"><Skeleton height={160} /><Skeleton height={160} /></div>
            ) : lists.length === 0 ? (
              <EmptyState
                title={tt("No saved screens yet", "এখনো কোনো স্ক্রিন সেভ করা নেই")}
                message={tt("Build a screen and save it. We will check it for you after every close.",
                           "একটি স্ক্রিন বানিয়ে সেভ করুন। প্রতিদিন বাজার বন্ধের পর আমরা সেটি যাচাই করব।")}
                actions={[{ onClick: () => setTab("screen"), label: tt("Build a screen", "স্ক্রিন বানান") }]}
              />
            ) : (
              <div className="space-y-4">
                {lists.map((l) => (
                  <SavedListCard
                    key={l.id}
                    list={l}
                    bn={bn}
                    canEdit={isPremium}
                    onEdit={() => edit(l)}
                    onToggleAlerts={() => toggleAlerts(l)}
                    onDelete={() => remove(l)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </PageLockScope>
  );
}
