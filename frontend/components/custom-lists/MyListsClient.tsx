"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Card from "@/components/ui/Card";
import Chip from "@/components/ui/Chip";
import Button from "@/components/ui/Button";
import StockRow from "@/components/ui/StockRow";
import SignalChip from "@/components/ui/SignalChip";
import Skeleton from "@/components/ui/Skeleton";
import ErrorState from "@/components/ui/ErrorState";
import SectionHeader from "@/components/ui/SectionHeader";
import ResearchFunnel from "@/components/research/ResearchFunnel";
import PremiumGate from "@/components/premium/PremiumGate";
import SavedListCard from "@/components/custom-lists/SavedListCard";
import { showLimitNotice } from "@/components/premium/LimitNotice";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/context/LangContext";
import { usePremium, isLimitError } from "@/lib/premium";
import { toast } from "@/lib/toast";
import {
  apiCreateCustomList, apiDeleteCustomList, apiGetCustomLists, apiUpdateCustomList,
  getCustomListCatalog, runCustomList,
  type CustomCheckDef, type CustomCheckValue, type CustomListCatalog, type CustomListResult,
  type CustomListSpec, type SavedCustomList,
} from "@/lib/api";

const STARTER: CustomListSpec = {
  checks: [{ key: "grade", value: 60 }, { key: "yield_min", value: 4 }, { key: "category", value: "not_z" }],
  sort: "score",
};

/**
 * Your own research lists (`/my-lists`). The builder runs a spec live against
 * every rated company — the funnel and the count are free, which companies
 * pass is screen-locked for free readers. Saving a list (with its daily
 * "a new stock passed" alert) is Premium, enforced by the backend too.
 */
export default function MyListsClient() {
  const { isLoggedIn, isLoading: authLoading } = useAuth();
  const { isPremium, state } = usePremium();
  const { bn } = useLang();
  const t = useCallback((en: string, b: string) => (bn ? b : en), [bn]);

  const [catalog, setCatalog] = useState<CustomListCatalog | null>(null);
  const [catalogError, setCatalogError] = useState(false);
  const [saved, setSaved] = useState<SavedCustomList[] | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [alerts, setAlerts] = useState(true);
  const [spec, setSpec] = useState<CustomListSpec>(STARTER);
  const [result, setResult] = useState<CustomListResult | null>(null);
  const [running, setRunning] = useState(false);
  const [saving, setSaving] = useState(false);
  const builderRef = useRef<HTMLDivElement>(null);

  const byKey = useMemo(
    () => new Map((catalog?.checks ?? []).map((c) => [c.key, c] as const)),
    [catalog],
  );

  // Menu once; saved lists once the reader is known.
  useEffect(() => {
    getCustomListCatalog().then(setCatalog).catch(() => setCatalogError(true));
  }, []);

  const loadSaved = useCallback(() => {
    if (!isLoggedIn) return;
    apiGetCustomLists().then((r) => setSaved(r.lists)).catch(() => setSaved([]));
  }, [isLoggedIn]);

  useEffect(() => {
    if (!authLoading) loadSaved();
  }, [authLoading, loadSaved]);

  // ?list=<id> (from the daily push) opens that list in the builder.
  const openedFromUrl = useRef(false);
  useEffect(() => {
    if (openedFromUrl.current || !saved) return;
    openedFromUrl.current = true;
    const id = new URLSearchParams(window.location.search).get("list");
    const hit = id ? saved.find((l) => l.id === id) : undefined;
    if (hit) {
      setEditingId(hit.id);
      setName(hit.name);
      setAlerts(hit.alerts);
      setSpec(hit.spec);
      document.getElementById(`list-${hit.id}`)?.scrollIntoView({ block: "start" });
    }
  }, [saved]);

  // Run the list live, a moment after the last change.
  useEffect(() => {
    if (!catalog) return;
    setRunning(true);
    const timer = window.setTimeout(() => {
      runCustomList(spec)
        .then(setResult)
        .catch(() => setResult(null))
        .finally(() => setRunning(false));
    }, 350);
    return () => window.clearTimeout(timer);
  }, [spec, catalog]);

  const chosen = new Set(spec.checks.map((c) => c.key));
  const atMax = spec.checks.length >= (catalog?.max_checks ?? 10);

  const addCheck = (c: CustomCheckDef) => {
    if (chosen.has(c.key) || atMax) return;
    setSpec((s) => ({ ...s, checks: [...s.checks, { key: c.key, value: c.default ?? true }] }));
  };
  const setValue = (key: string, value: CustomCheckValue) =>
    setSpec((s) => ({ ...s, checks: s.checks.map((c) => (c.key === key ? { ...c, value } : c)) }));
  const removeCheck = (key: string) =>
    setSpec((s) => ({ ...s, checks: s.checks.filter((c) => c.key !== key) }));

  const startNew = (from: CustomListSpec, title = "") => {
    setEditingId(null);
    setName(title);
    setAlerts(true);
    setSpec(from);
  };

  const edit = (l: SavedCustomList) => {
    setEditingId(l.id);
    setName(l.name);
    setAlerts(l.alerts);
    setSpec(l.spec);
    builderRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const save = async () => {
    if (!isPremium) {
      showLimitNotice("custom_lists");
      return;
    }
    if (!name.trim()) {
      toast({ message: t("Give the list a name first.", "আগে তালিকার একটি নাম দিন।"), tone: "neutral" });
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await apiUpdateCustomList(editingId, { name, spec, alerts });
        toast({ message: t("List saved.", "তালিকা সেভ হয়েছে।"), tone: "success" });
      } else {
        const { list } = await apiCreateCustomList(name, spec, alerts);
        setEditingId(list.id);
        toast({
          message: t("List saved. We'll tell you when a new stock passes.", "তালিকা সেভ হয়েছে। নতুন কোনো শেয়ার পাস করলে জানিয়ে দেব।"),
          tone: "success",
        });
      }
      loadSaved();
    } catch (err) {
      if (isLimitError(err, "custom_lists")) showLimitNotice("custom_lists");
      else {
        const msg = (err as Error)?.message ?? "";
        toast({
          message: msg === "too_many_lists"
            ? t(`You can keep ${catalog?.max_lists ?? 5} lists. Delete one to add another.`,
                `সর্বোচ্চ ${catalog?.max_lists ?? 5}টি তালিকা রাখা যায়। নতুন যোগ করতে একটি মুছুন।`)
            : t("Couldn't save the list. Try again.", "তালিকা সেভ হয়নি। আবার চেষ্টা করুন।"),
          tone: "error",
        });
      }
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
    if (!window.confirm(t(`Delete the list "${l.name}"?`, `"${l.name}" তালিকাটি মুছবেন?`))) return;
    try {
      await apiDeleteCustomList(l.id);
      setSaved((xs) => xs?.filter((x) => x.id !== l.id) ?? xs);
      if (editingId === l.id) startNew(STARTER);
      toast({ message: t("List deleted.", "তালিকা মুছে ফেলা হয়েছে।"), tone: "neutral" });
    } catch {
      toast({ message: t("Couldn't delete the list.", "তালিকা মোছা যায়নি।"), tone: "error" });
    }
  };

  if (catalogError) {
    return (
      <ErrorState
        title="Couldn't load the list builder"
        bn="তালিকা বানানোর অংশটি এখন লোড হচ্ছে না।"
        onRetry={() => window.location.reload()}
      />
    );
  }

  const lists = saved ?? [];
  const lockStakes = result
    ? [t(`${result.passed} of ${result.universe} companies pass your checks today`,
         `আজ ${result.universe}টির মধ্যে ${result.passed}টি কোম্পানি আপনার শর্ত পূরণ করছে`)]
    : undefined;

  return (
    <div className={bn ? "font-bn" : ""} lang={bn ? "bn" : undefined}>
      {/* Saved lists */}
      {isLoggedIn && lists.length > 0 && (
        <section className="mb-10">
          <SectionHeader as="h2" title={t("Your lists", "আপনার তালিকা")} />
          <div className="grid gap-4 md:grid-cols-2">
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
        </section>
      )}

      {/* Builder */}
      <section ref={builderRef} className="dash-section">
        <SectionHeader
          as="h2"
          title={editingId ? t(`Edit "${name}"`, `"${name}" বদলান`) : t("Build a list", "তালিকা বানান")}
          lead={t("Add checks, pick a setting for each, and watch the list change.",
                  "শর্ত যোগ করুন, প্রতিটির মাত্রা বেছে নিন — তালিকা সঙ্গে সঙ্গে বদলাবে।")}
          action={editingId ? (
            <Button variant="link" size="sm" onClick={() => startNew(STARTER)}>{t("Start a new one", "নতুন শুরু করুন")}</Button>
          ) : undefined}
        />

        {!catalog ? (
          <div className="space-y-3"><Skeleton height={40} /><Skeleton height={120} /><Skeleton height={200} /></div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              {/* Templates */}
              <p className="mb-2 text-sm font-semibold text-text-main">{t("Start from", "যেখান থেকে শুরু")}</p>
              <div className="mb-6 flex flex-wrap gap-2">
                {catalog.templates.map((tp) => (
                  <Chip key={tp.id} onClick={() => startNew(tp.spec, t(tp.title_en, tp.title_bn))}>
                    {t(tp.title_en, tp.title_bn)}
                  </Chip>
                ))}
              </div>

              {/* Chosen checks */}
              <Card padding="none">
                <ol className="divide-y divide-border">
                  {spec.checks.map((c, i) => {
                    const def = byKey.get(c.key);
                    if (!def) return null;
                    return (
                      <li key={c.key} className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-sm font-semibold text-text-main">
                            <span className="mr-2 text-text-muted tabular-nums">{i + 1}</span>
                            {def.options.length ? t(def.name_en, def.name_bn) : t(def.label_en ?? def.name_en, def.label_bn ?? def.name_bn)}
                          </p>
                          <Button
                            variant="quiet" size="sm" iconOnly
                            aria-label={t(`Remove ${def.name_en}`, `${def.name_bn} বাদ দিন`)}
                            onClick={() => removeCheck(c.key)}
                            disabled={spec.checks.length <= 1}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
                          </Button>
                        </div>
                        {def.options.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {def.options.map((o) => (
                              <Chip key={String(o.value)} active={c.value === o.value} onClick={() => setValue(c.key, o.value)}>
                                {t(o.label_en, o.label_bn)}
                              </Chip>
                            ))}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ol>
              </Card>

              {/* Add a check */}
              <details className="mt-4" open={spec.checks.length < 2}>
                <summary className="flex min-h-10 cursor-pointer items-center text-sm font-semibold text-primary">
                  {atMax
                    ? t(`You've used all ${catalog.max_checks} checks`, `${catalog.max_checks}টি শর্তই ব্যবহার হয়েছে`)
                    : t("Add a check", "শর্ত যোগ করুন")}
                </summary>
                <div className="mt-3 space-y-4">
                  {catalog.groups.map((g) => {
                    const items = catalog.checks.filter((c) => c.group === g.key && !chosen.has(c.key));
                    if (!items.length) return null;
                    return (
                      <div key={g.key}>
                        <p className="mb-2 text-xs font-semibold text-text-muted">{t(g.en, g.bn)}</p>
                        <div className="flex flex-wrap gap-2">
                          {items.map((c) => (
                            <Chip key={c.key} onClick={atMax ? undefined : () => addCheck(c)}>
                              + {t(c.name_en, c.name_bn)}
                            </Chip>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </details>

              {/* Order */}
              <p className="mb-2 mt-6 text-sm font-semibold text-text-main">{t("Order the list by", "তালিকা সাজান")}</p>
              <div className="flex flex-wrap gap-2">
                {catalog.sorts.map((so) => (
                  <Chip key={so.key} active={(spec.sort ?? "score") === so.key}
                        onClick={() => setSpec((s) => ({ ...s, sort: so.key }))}>
                    {t(so.en, so.bn)}
                  </Chip>
                ))}
              </div>

              {/* Save */}
              <Card className="mt-6">
                <label htmlFor="list-name" className="mb-1.5 block text-sm font-semibold text-text-main">
                  {t("Name", "নাম")}
                </label>
                <input
                  id="list-name"
                  className="input-field"
                  maxLength={40}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("e.g. Cheap banks", "যেমন: সস্তা ব্যাংক")}
                />
                <label htmlFor="list-alerts" className="mt-3 flex min-h-10 items-center gap-2 text-sm text-text-main">
                  <input id="list-alerts" type="checkbox" checked={alerts} onChange={(e) => setAlerts(e.target.checked)} />
                  {t("Tell me when a new stock passes every check", "নতুন কোনো শেয়ার সব শর্ত পূরণ করলে জানান")}
                </label>
                <div className="mt-4">
                  {state === "guest" ? (
                    <Button href="/login?next=%2Fmy-lists" variant="primary" block>
                      {t("Sign in to save", "সেভ করতে সাইন ইন করুন")}
                    </Button>
                  ) : (
                    <Button variant="primary" block onClick={save} disabled={saving}>
                      {saving ? t("Saving…", "সেভ হচ্ছে…") : editingId ? t("Save changes", "বদল সেভ করুন") : t("Save this list", "তালিকা সেভ করুন")}
                    </Button>
                  )}
                  {!isPremium && (
                    <p className="mt-2 text-xs text-text-muted">
                      {t(`Saving lists is part of Premium — up to ${catalog.max_lists}, each checked every trading day.`,
                         `তালিকা সেভ করা প্রিমিয়ামের অংশ — সর্বোচ্চ ${catalog.max_lists}টি, প্রতি লেনদেনের দিন যাচাই করা হয়।`)}
                    </p>
                  )}
                </div>
              </Card>
            </div>

            {/* Live result */}
            <div aria-live="polite">
              {!result ? (
                <div className="space-y-3"><Skeleton height={180} /><Skeleton height={240} /></div>
              ) : (
                <div className={running ? "opacity-60 transition-opacity" : "transition-opacity"}>
                  <p className="text-2xl font-bold text-text-main tabular-nums">
                    {t(`${result.passed} companies pass`, `${result.passed}টি কোম্পানি পাস করেছে`)}
                  </p>
                  <p className="mb-4 text-sm text-text-muted">
                    {t(`out of ${result.universe} rated companies, checked in this order:`,
                       `রেটিং পাওয়া ${result.universe}টির মধ্যে, এই ক্রমে যাচাই করে:`)}
                  </p>
                  <Card className="rl-funnel-card"><ResearchFunnel universe={result.universe} steps={result.funnel} /></Card>
                  {result.stocks.length > 0 && (
                    <PremiumGate
                      label={t("The stocks that pass", "যে শেয়ারগুলো পাস করেছে")}
                      preview="blur"
                      peek={200}
                      stakes={lockStakes}
                      className="mt-4"
                    >
                      <Card padding="none">
                        <ul>
                          {result.stocks.map((s) => (
                            <StockRow
                              key={s.code}
                              as="li"
                              inset="card"
                              code={s.code}
                              name={s.name}
                              price={s.price}
                              change={s.change_pct}
                              sub={s.checks.slice(0, 2).map((c) => t(c.value_en, c.value_bn)).join(" · ")}
                              subClamp
                              trailing={s.signal !== "none" ? <SignalChip signal={s.signal} size="sm" /> : undefined}
                              lang={bn ? "bn" : "en"}
                            />
                          ))}
                        </ul>
                        {result.passed > result.stocks.length && (
                          <p className="border-t border-border p-4 text-sm text-text-muted">
                            {t(`Showing the first ${result.stocks.length} of ${result.passed}. Add a check to narrow it down.`,
                               `${result.passed}টির মধ্যে প্রথম ${result.stocks.length}টি দেখানো হচ্ছে। আরও শর্ত যোগ করে ছোট করুন।`)}
                          </p>
                        )}
                      </Card>
                    </PremiumGate>
                  )}
                  {result.passed === 0 && (
                    <p className="mt-4 text-sm text-text-muted">
                      {t("No company passes every check today. Loosen one setting or remove a check.",
                         "আজ কোনো কোম্পানি সব শর্ত পূরণ করছে না। একটি মাত্রা কমান বা একটি শর্ত বাদ দিন।")}
                    </p>
                  )}
                  <p className="mt-4 text-xs text-text-muted">
                    {t("A list is a starting point for your own research, not advice to buy.",
                       "এই তালিকা নিজের যাচাইয়ের শুরু — কেনার পরামর্শ নয়।")}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
