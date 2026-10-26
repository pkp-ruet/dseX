"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Button from "@/components/ui/Button";
import Chip from "@/components/ui/Chip";
import Sheet from "@/components/ui/Sheet";
import Tabs from "@/components/ui/Tabs";
import { IconBell, IconCheck, IconList } from "@/components/ui/icons";
import EmptyState from "@/components/ui/EmptyState";
import Skeleton from "@/components/ui/Skeleton";
import { PageLockScope } from "@/components/premium/LockScope";
import { showLimitNotice } from "@/components/premium/LimitNotice";
import SavedListCard from "@/components/custom-lists/SavedListCard";
import ScreenerStarts from "./ScreenerStarts";
import ScreenerChecks from "./ScreenerChecks";
import ScreenerResults from "./ScreenerResults";
import ScreenerPremium, { SCREENER_ANCHOR } from "./ScreenerPremium";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/context/LangContext";
import { usePremium, isLimitError } from "@/lib/premium";
import { FREE_SCREENER_ROWS } from "@/lib/free-share";
import { useUrlParams, useUrlSync } from "@/lib/use-url-state";
import { loadWatchlist } from "@/lib/watchlist";
import { toast } from "@/lib/toast";
import {
  apiCreateCustomList, apiDeleteCustomList, apiGetCustomLists, apiUpdateCustomList, runCustomList,
  type CustomCheckDef, type CustomCheckValue, type CustomListCatalog, type CustomListResult,
  type CustomListSpec, type CustomListTemplate, type SavedCustomList,
} from "@/lib/api";

type Tab = "build" | "saved";
const TABS: Tab[] = ["build", "saved"];

/** `grade:60,yield_min:4,fresh:1` — the screen in the URL, so a link restores it. */
function encodeChecks(spec: CustomListSpec): string {
  return spec.checks.map((c) => `${c.key}:${c.value === true ? "1" : encodeURIComponent(String(c.value))}`).join(",");
}

function decodeChecks(raw: string, byKey: Map<string, CustomCheckDef>): CustomListSpec["checks"] {
  const out: CustomListSpec["checks"] = [];
  for (const part of raw.split(",")) {
    const i = part.indexOf(":");
    const key = i < 0 ? part : part.slice(0, i);
    const val = i < 0 ? "1" : decodeURIComponent(part.slice(i + 1));
    const def = byKey.get(key);
    if (!def || out.some((c) => c.key === key)) continue;
    if (!def.options.length) {
      out.push({ key, value: true });
      continue;
    }
    const opt = def.options.find((o) => String(o.value) === val);
    if (opt) out.push({ key, value: opt.value });
  }
  return out;
}

const specKey = (s: CustomListSpec) => JSON.stringify({ c: s.checks, s: s.sort ?? "score" });

/**
 * The stock screener (`/screener`, 2026-10-26). Two tabs on one page:
 * - Build: start from a goal or a research list, change the checks, see the
 *   count, the funnel and the stocks. Free readers see the first
 *   `FREE_SCREENER_ROWS` (none with a power check on); the rest blurs and
 *   points at the ONE Premium section `#sc-premium`.
 * - Saved: the old `/my-lists` cards (saving is Premium, enforced server-side).
 * The server renders the Build tab with `initialTemplate` already run, so the
 * HTML Google reads has real rows.
 */
export default function ScreenerClient({
  catalog,
  initial,
  initialTemplate,
}: {
  catalog: CustomListCatalog;
  initial: CustomListResult | null;
  initialTemplate: string;
}) {
  const { isLoggedIn, isLoading: authLoading } = useAuth();
  const { isPremium, state } = usePremium();
  const { bn } = useLang();
  const t = useCallback((en: string, b: string) => (bn ? b : en), [bn]);

  const byKey = useMemo(() => new Map(catalog.checks.map((c) => [c.key, c] as const)), [catalog]);
  const templates = catalog.templates;
  const defaultSpec = useMemo<CustomListSpec>(
    () => initial?.spec ?? templates.find((tp) => tp.id === initialTemplate)?.spec ?? templates[0].spec,
    [initial, templates, initialTemplate],
  );

  const [tab, setTab] = useState<Tab>("build");
  const [startId, setStartId] = useState<string | null>(initialTemplate);
  const [spec, setSpec] = useState<CustomListSpec>(defaultSpec);
  const [result, setResult] = useState<CustomListResult | null>(initial);
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState(false);

  const [saved, setSaved] = useState<SavedCustomList[] | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [alerts, setAlerts] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [followed, setFollowed] = useState<string[]>([]);
  const buildRef = useRef<HTMLDivElement>(null);

  // URL → state, once after mount.
  const params = useUrlParams();
  useEffect(() => {
    if (!params) return;
    const tb = params.get("tab") as Tab | null;
    if (tb && TABS.includes(tb)) setTab(tb);
    const c = params.get("c");
    const start = params.get("start");
    const tp = start ? templates.find((x) => x.id === start) : undefined;
    if (c) {
      const checks = decodeChecks(c, byKey);
      if (checks.length) {
        const sort = params.get("sort");
        setSpec({ checks, sort: sort && catalog.sorts.some((s) => s.key === sort) ? sort : "score" });
        setStartId(null);
      }
    } else if (tp) {
      setSpec(tp.spec);
      setStartId(tp.id);
    }
  }, [params, templates, byKey, catalog.sorts]);

  // State → URL. A ready-made start is one word; a changed screen is the checks.
  useUrlSync(
    {
      tab: tab === "build" ? null : tab,
      start: startId && startId !== initialTemplate ? startId : null,
      c: startId ? null : encodeChecks(spec),
      sort: startId ? null : spec.sort ?? "score",
    },
    params !== null,
  );

  // Run the screen live, a moment after the last change.
  const lastRun = useRef(initial ? specKey(defaultSpec) : "");
  useEffect(() => {
    const key = specKey(spec);
    if (key === lastRun.current) return;
    setRunning(true);
    const timer = window.setTimeout(() => {
      lastRun.current = key;
      runCustomList(spec)
        .then((r) => { setResult(r); setRunError(false); })
        .catch(() => setRunError(true))
        .finally(() => setRunning(false));
    }, 350);
    return () => window.clearTimeout(timer);
  }, [spec]);

  const loadSaved = useCallback(() => {
    if (!isLoggedIn) return;
    apiGetCustomLists().then((r) => setSaved(r.lists)).catch(() => setSaved([]));
  }, [isLoggedIn]);

  useEffect(() => {
    if (authLoading || !isLoggedIn) return;
    loadSaved();
    loadWatchlist().then(setFollowed).catch(() => {});
  }, [authLoading, isLoggedIn, loadSaved]);

  // ?list=<id> (the daily push) opens that saved screen in the builder.
  const openedFromUrl = useRef(false);
  useEffect(() => {
    if (openedFromUrl.current || !saved || !params) return;
    openedFromUrl.current = true;
    const id = params.get("list");
    const hit = id ? saved.find((l) => l.id === id) : undefined;
    if (hit) edit(hit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saved, params]);

  // Editing the screen by hand leaves the ready-made start behind.
  const change = (fn: (s: CustomListSpec) => CustomListSpec) => {
    setStartId(null);
    setSpec(fn);
  };
  const addCheck = (c: CustomCheckDef) => {
    if (spec.checks.some((x) => x.key === c.key) || spec.checks.length >= catalog.max_checks) return;
    change((s) => ({ ...s, checks: [...s.checks, { key: c.key, value: c.default ?? true }] }));
  };
  const setValue = (key: string, value: CustomCheckValue) =>
    change((s) => ({ ...s, checks: s.checks.map((c) => (c.key === key ? { ...c, value } : c)) }));
  const removeCheck = (key: string) => change((s) => ({ ...s, checks: s.checks.filter((c) => c.key !== key) }));
  const setSort = (key: string) => change((s) => ({ ...s, sort: key }));

  const pick = (tp: CustomListTemplate) => {
    setEditingId(null);
    setName(t(tp.title_en, tp.title_bn));
    setAlerts(true);
    setStartId(tp.id);
    setSpec(tp.spec);
  };

  function edit(l: SavedCustomList) {
    setEditingId(l.id);
    setName(l.name);
    setAlerts(l.alerts);
    setStartId(null);
    setSpec(l.spec);
    setTab("build");
    window.setTimeout(() => buildRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
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
    setSaving(true);
    try {
      if (editingId) {
        await apiUpdateCustomList(editingId, { name, spec, alerts });
        toast({ message: t("Screen saved.", "স্ক্রিন সেভ হয়েছে।"), tone: "success" });
      } else {
        const { list } = await apiCreateCustomList(name, spec, alerts);
        setEditingId(list.id);
        toast({
          message: t("Screen saved. We'll tell you when a new stock passes.", "স্ক্রিন সেভ হয়েছে। নতুন কোনো শেয়ার পাস করলে জানিয়ে দেব।"),
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
            ? t(`You can keep ${catalog.max_lists} screens. Delete one to add another.`,
                `সর্বোচ্চ ${catalog.max_lists}টি স্ক্রিন রাখা যায়। নতুন যোগ করতে একটি মুছুন।`)
            : t("Couldn't save the screen. Try again.", "স্ক্রিন সেভ হয়নি। আবার চেষ্টা করুন।"),
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
      toast({ message: t("Couldn't delete the screen.", "স্ক্রিন মোছা যায়নি।"), tone: "error" });
    }
  };

  // Free share: the first FREE_SCREENER_ROWS, none once a power check is on.
  const powerOn = spec.checks.some((c) => byKey.get(c.key)?.premium);
  const freeRows = isPremium ? Infinity : powerOn ? 0 : FREE_SCREENER_ROWS;
  const shown = result ? Math.min(result.stocks.length, freeRows) : 0;
  const hidden = result ? Math.max(0, result.passed - shown) : 0;
  const yours = result ? result.stocks.filter((s) => followed.includes(s.code)).length : 0;
  const lists = saved ?? [];
  const sortDef = catalog.sorts.find((so) => so.key === (spec.sort ?? "score"));

  const tabLabel: Record<Tab, string> = {
    build: t("Build a screen", "স্ক্রিন বানান"),
    saved: lists.length ? t(`Saved (${lists.length})`, `সেভ করা (${lists.length})`) : t("Saved", "সেভ করা"),
  };

  return (
    <PageLockScope anchor={SCREENER_ANCHOR}>
      <div className={bn ? "font-bn" : ""} lang={bn ? "bn" : undefined}>
        <Tabs
          tabs={TABS.map((k) => ({ key: k, label: tabLabel[k] }))}
          value={tab}
          onChange={setTab}
          ariaLabel={t("Screener views", "স্ক্রিনারের অংশ")}
          idBase="sc-tab"
          className="mb-6"
        />

        {tab === "build" && (
          <div role="tabpanel" aria-labelledby="sc-tab-build" ref={buildRef} className="scroll-mt-24 space-y-10">
            <ScreenerStarts templates={templates} byKey={byKey} active={startId} onPick={pick} t={t} />

            <ScreenerChecks
              catalog={catalog}
              byKey={byKey}
              spec={spec}
              funnel={result?.funnel ?? null}
              editingName={editingId ? name : null}
              onStartFresh={() => {
                const tp = templates.find((x) => x.id === initialTemplate) ?? templates[0];
                pick(tp);
              }}
              onAdd={addCheck}
              onSet={setValue}
              onRemove={removeCheck}
              t={t}
            />

            <ScreenerResults
              result={result}
              running={running}
              error={runError}
              freeRows={freeRows}
              powerOn={powerOn}
              bn={bn}
              t={t}
              toolbar={
                <>
                  <Chip onClick={() => setSortOpen(true)} icon={<IconList size={14} />}>
                    {t(sortDef?.en ?? "Best score first", sortDef?.bn ?? "সবচেয়ে বেশি স্কোর আগে")}
                  </Chip>
                  <Chip onClick={() => setSaveOpen(true)} icon={<IconBell size={14} />}>
                    {editingId ? t("Save changes", "বদল সেভ করুন") : t("Save screen", "স্ক্রিন সেভ করুন")}
                  </Chip>
                </>
              }
            />

            {/* Order */}
            <Sheet open={sortOpen} onClose={() => setSortOpen(false)} title={t("Order the stocks", "শেয়ার সাজান")}>
              <ul className="divide-y divide-border">
                {catalog.sorts.map((so) => {
                  const on = (spec.sort ?? "score") === so.key;
                  return (
                    <li key={so.key}>
                      <button
                        type="button"
                        aria-pressed={on}
                        onClick={() => { setSort(so.key); setSortOpen(false); }}
                        className="flex min-h-12 w-full items-center justify-between gap-3 py-3 text-left text-base text-text-main active:bg-surface-2"
                      >
                        <span className={on ? "font-semibold" : undefined}>{t(so.en, so.bn)}</span>
                        {on && <span className="text-primary"><IconCheck size={18} /></span>}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </Sheet>

            {/* Save */}
            <Sheet
              open={saveOpen}
              onClose={() => setSaveOpen(false)}
              dismissible={!saving}
              title={editingId ? t(`Save "${name}"`, `"${name}" সেভ করুন`) : t("Keep this screen", "স্ক্রিনটি রেখে দিন")}
              bn={t("We run it every trading day and tell you when a new stock passes.",
                    "প্রতি লেনদেনের দিন চালাব, নতুন কোনো শেয়ার পাস করলে জানাব।")}
              footer={
                state === "guest" ? (
                  <Button href="/login?next=%2Fscreener" variant="primary" block>
                    {t("Sign in to save", "সেভ করতে সাইন ইন করুন")}
                  </Button>
                ) : !isPremium ? (
                  <Button href="#sc-premium" variant="primary" block onClick={() => setSaveOpen(false)}>
                    {t("Saving is part of Premium", "সেভ করা প্রিমিয়ামের অংশ")}
                  </Button>
                ) : (
                  <Button variant="primary" block onClick={async () => { if (await save()) setSaveOpen(false); }} disabled={saving}>
                    {saving ? t("Saving…", "সেভ হচ্ছে…") : editingId ? t("Save changes", "বদল সেভ করুন") : t("Save this screen", "স্ক্রিন সেভ করুন")}
                  </Button>
                )
              }
            >
              <div className="space-y-3">
                <div>
                  <label htmlFor="sc-name" className="mb-1.5 block text-sm font-semibold text-text-main">
                    {t("Name", "নাম")}
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
                  {t("Tell me when a new stock passes every check", "নতুন কোনো শেয়ার সব শর্ত পূরণ করলে জানান")}
                </label>
                {editingId && isPremium && (
                  <Button variant="link" onClick={() => { setEditingId(null); setName(""); }}>
                    {t("Save as a new screen instead", "বরং নতুন স্ক্রিন হিসেবে সেভ করুন")}
                  </Button>
                )}
                {!isPremium && (
                  <p className="text-sm text-text-muted">
                    {t(`Premium keeps up to ${catalog.max_lists} screens, each checked every trading day.`,
                       `প্রিমিয়ামে সর্বোচ্চ ${catalog.max_lists}টি স্ক্রিন রাখা যায়, প্রতি লেনদেনের দিন যাচাই হয়।`)}
                  </p>
                )}
              </div>
            </Sheet>

            <ScreenerPremium passed={result?.passed ?? null} hidden={hidden} yours={yours} t={t} />

            <p className="text-xs text-text-muted">
              {t("A screen is a starting point for your own research, not advice to buy.",
                 "স্ক্রিন নিজের যাচাইয়ের শুরু — কেনার পরামর্শ নয়।")}
            </p>
          </div>
        )}

        {tab === "saved" && (
          <div role="tabpanel" aria-labelledby="sc-tab-saved">
            {!isLoggedIn && !authLoading ? (
              <EmptyState
                title={t("Sign in to keep your screens", "স্ক্রিন রাখতে সাইন ইন করুন")}
                message={t("Saved screens run every trading day and tell you when a new stock passes.",
                           "সেভ করা স্ক্রিন প্রতি লেনদেনের দিন চলে, নতুন শেয়ার পাস করলে জানায়।")}
                actions={[{ href: "/login?next=%2Fscreener%3Ftab%3Dsaved", label: t("Sign in", "সাইন ইন") }]}
              />
            ) : saved === null ? (
              <div className="space-y-4"><Skeleton height={160} /><Skeleton height={160} /></div>
            ) : lists.length === 0 ? (
              <EmptyState
                title={t("No saved screens yet", "এখনো কোনো স্ক্রিন সেভ করা নেই")}
                message={t("Build a screen, then save it — we'll watch it for you every trading day.",
                           "একটি স্ক্রিন বানিয়ে সেভ করুন — প্রতি লেনদেনের দিন আমরা নজর রাখব।")}
                actions={[{ onClick: () => setTab("build"), label: t("Build a screen", "স্ক্রিন বানান") }]}
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
