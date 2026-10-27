"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Chip from "@/components/ui/Chip";
import Sheet from "@/components/ui/Sheet";
import Tabs from "@/components/ui/Tabs";
import { IconBell, IconCheck, IconChevronDown, IconList, IconLock, IconTune } from "@/components/ui/icons";
import EmptyState from "@/components/ui/EmptyState";
import Skeleton from "@/components/ui/Skeleton";
import { PageLockScope } from "@/components/premium/LockScope";
import { showLimitNotice } from "@/components/premium/LimitNotice";
import SavedListCard from "@/components/custom-lists/SavedListCard";
import ScreenerStarts from "./ScreenerStarts";
import ScreenerQuestions, { questionId } from "./ScreenerQuestions";
import ScreenerChecks from "./ScreenerChecks";
import ScreenerResults from "./ScreenerResults";
import ScreenerPremium, { SCREENER_ANCHOR } from "./ScreenerPremium";
import ScreenerPreview from "./ScreenerPreview";
import { trackEvent } from "@/lib/track";
import { T } from "@/components/i18n/T";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/context/LangContext";
import { usePremium, isLimitError } from "@/lib/premium";
import { FREE_SCREENER_ROWS } from "@/lib/free-share";
import { useUrlParams, useUrlSync } from "@/lib/use-url-state";
import { loadWatchlist } from "@/lib/watchlist";
import { toast } from "@/lib/toast";
import { decodeAnswers, encodeAnswers, noAnswers, sameAnswers, sameSet } from "@/lib/screener";
import {
  apiCreateCustomList, apiDeleteCustomList, apiGetCustomLists, apiUpdateCustomList, runCustomList,
  type CustomCheckDef, type CustomCheckValue, type CustomListCatalog, type CustomListResult,
  type CustomListSpec, type CustomListTemplate, type SavedCustomList, type ScreenerAnswers,
  type ScreenerRequest,
} from "@/lib/api";

type Tab = "build" | "saved";
const TABS: Tab[] = ["build", "saved"];
const FINE_ID = "sc-fine";
/** Retired start ids → their replacement (old homepage links and pushes). */
const START_ALIASES: Record<string, string> = { fallen_good: "rl_fallen_strong" };

/** What each order is for, in plain words — shown in the order sheet to everyone. */
const SORT_HELP: Record<string, { en: string; bn: string }> = {
  score: { en: "For quality: the strongest companies on our grade come first",
           bn: "মানের জন্য: আমাদের গ্রেডে সবচেয়ে শক্তিশালী কোম্পানি আগে" },
  yield: { en: "For income: the most cash dividend for the price comes first",
           bn: "আয়ের জন্য: দামের তুলনায় সবচেয়ে বেশি নগদ ডিভিডেন্ড আগে" },
  cheap: { en: "For bargains: the lowest price for the profit comes first",
           bn: "কম দামের জন্য: মুনাফার তুলনায় সবচেয়ে কম দাম আগে" },
  size: { en: "For safety: the biggest companies come first",
          bn: "নিরাপত্তার জন্য: সবচেয়ে বড় কোম্পানি আগে" },
  growth: { en: "For growth: the fastest-rising profit comes first",
            bn: "বৃদ্ধির জন্য: সবচেয়ে দ্রুত বাড়া মুনাফা আগে" },
};

/** Visible copy as both languages, so the server HTML needs no re-render to switch. */
const tt = (en: string, bn: string) => <T en={en} bn={bn} />;

/** A locked change a free reader tapped — previewed, not applied. */
type Preview = { kind: "answer"; key: string; level: number } | { kind: "order"; sort: string };

/** The screen: the six answers (+ a sector), or exact checks (a fine-tune screen). */
type Screen =
  | { kind: "q"; answers: ScreenerAnswers; sectors: string[]; sort: string }
  | { kind: "c"; checks: CustomListSpec["checks"]; sort: string };

/** `grade:60,yield_min:4,fresh:1,sector:Bank|Cement` — exact checks in the URL, so a link restores them. */
function encodeChecks(checks: CustomListSpec["checks"]): string {
  return checks.map((c) => {
    const v = c.value === true ? "1" : Array.isArray(c.value) ? c.value.map(encodeURIComponent).join("|") : encodeURIComponent(String(c.value));
    return `${c.key}:${v}`;
  }).join(",");
}

function decodeChecks(raw: string, byKey: Map<string, CustomCheckDef>): CustomListSpec["checks"] {
  const out: CustomListSpec["checks"] = [];
  for (const part of raw.split(",")) {
    const i = part.indexOf(":");
    const key = i < 0 ? part : part.slice(0, i);
    const val = i < 0 ? "1" : decodeURIComponent(part.slice(i + 1));
    const def = byKey.get(key);
    if (!def || out.some((c) => c.key === key)) continue;
    if (key === "sector") {
      const names = part.slice(i + 1).split("|").map(decodeURIComponent)
        .filter((n) => def.options.some((o) => o.value === n));
      if (names.length) out.push({ key, value: names.length === 1 ? names[0] : names });
      continue;
    }
    if (!def.options.length) {
      out.push({ key, value: true });
      continue;
    }
    const opt = def.options.find((o) => String(o.value) === val);
    if (opt) out.push({ key, value: opt.value });
  }
  return out;
}

const request = (s: Screen): ScreenerRequest =>
  s.kind === "q" ? { answers: s.answers, sectors: s.sectors, sort: s.sort } : { checks: s.checks, sort: s.sort };
const screenKey = (s: Screen) => JSON.stringify(request(s));

function fromTemplate(tp: CustomListTemplate): Screen {
  const sort = tp.spec.sort ?? "score";
  return tp.answers
    ? { kind: "q", answers: tp.answers, sectors: tp.sectors ?? [], sort }
    : { kind: "c", checks: tp.spec.checks, sort };
}

/**
 * The stock screener (`/screener`, rebuilt around six questions 2026-10-27).
 * Two tabs on one page:
 * - Build: ONE card — quick picks on top (a shortcut that fills in the
 *   answers; it lights up while the answers match it), then the SIX
 *   QUESTIONS, each a three-way switch with a live count under every choice,
 *   and a sector picker; under it "See the exact rules" — the checks
 *   the answers stand for, readable by everyone, changeable with Premium. A
 *   screen that isn't six answers (a research start, an old link, a saved
 *   screen edited by hand) is a fine-tune screen: the rules show instead of
 *   the questions. Then the stocks, each with its strengths, the ones that
 *   miss one answer, and a link to the research lists. Free readers see the first
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
  const questions = useMemo(() => catalog.questions ?? [], [catalog]);
  const sectorOptions = useMemo(() => byKey.get("sector")?.options.map((o) => ({
    value: String(o.value), label_en: o.label_en, label_bn: o.label_bn,
  })) ?? [], [byKey]);
  const templates = catalog.templates;
  const findTemplate = useCallback(
    (id: string | null) => (id ? templates.find((x) => x.id === (START_ALIASES[id] ?? id)) : undefined),
    [templates],
  );
  const defaultScreen = useMemo<Screen>(() => {
    const tp = findTemplate(initialTemplate) ?? templates[0];
    return fromTemplate(tp);
  }, [findTemplate, initialTemplate, templates]);

  const [tab, setTab] = useState<Tab>("build");
  const [screen, setScreen] = useState<Screen>(defaultScreen);
  const [result, setResult] = useState<CustomListResult | null>(initial);
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState(false);
  const [checkOpen, setCheckOpen] = useState<string | null>(null);
  const [fineOpen, setFineOpen] = useState(false);
  const [lockOpen, setLockOpen] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [previewRes, setPreviewRes] = useState<CustomListResult | null>(null);
  const [previewError, setPreviewError] = useState(false);
  const previewSeq = useRef(0);

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
    const a = params.get("a");
    const c = params.get("c");
    const sortP = params.get("sort");
    const sort = sortP && catalog.sorts.some((s) => s.key === sortP) ? sortP : "score";
    const tp = findTemplate(params.get("start"));
    if (a != null && questions.length) {
      // `sectors=Bank|Cement`; `sector=Bank` is the one-sector form of older links.
      const raw = params.get("sectors") ?? params.get("sector") ?? "";
      const sectors = raw.split("|").filter((x) => sectorOptions.some((o) => o.value === x));
      setScreen({ kind: "q", answers: decodeAnswers(a, questions), sectors, sort });
    } else if (c) {
      const checks = decodeChecks(c, byKey);
      if (checks.length) setScreen({ kind: "c", checks, sort });
    } else if (tp) {
      setScreen(fromTemplate(tp));
    }
  }, [params, findTemplate, byKey, catalog.sorts, questions, sectorOptions]);

  // The quick pick the answers match (lit on the card), and whether the
  // order matches it too (then the URL is just its name).
  const goals = useMemo(() => templates.filter((tp) => tp.kind === "goal" && tp.answers), [templates]);
  const matchedGoal = screen.kind === "q"
    ? goals.find((g) => sameAnswers(g.answers!, screen.answers) && sameSet(g.sectors ?? [], screen.sectors))
    : undefined;
  const urlGoal = matchedGoal && (matchedGoal.spec.sort ?? "score") === screen.sort ? matchedGoal : undefined;

  // State → URL. A quick pick is one word; anything else is its answers or checks.
  useUrlSync(
    {
      tab: tab === "build" ? null : tab,
      start: urlGoal && urlGoal.id !== initialTemplate ? urlGoal.id : null,
      a: !urlGoal && screen.kind === "q" ? encodeAnswers(screen.answers) || "none" : null,
      sectors: !urlGoal && screen.kind === "q" && screen.sectors.length ? screen.sectors.join("|") : null,
      c: !urlGoal && screen.kind === "c" ? encodeChecks(screen.checks) : null,
      sort: urlGoal ? null : screen.sort,
    },
    params !== null,
  );

  // Run the screen live, a moment after the last change.
  const lastRun = useRef(initial ? screenKey(defaultScreen) : "");
  useEffect(() => {
    const key = screenKey(screen);
    if (key === lastRun.current) return;
    setRunning(true);
    const timer = window.setTimeout(() => {
      lastRun.current = key;
      runCustomList(request(screen))
        .then((r) => {
          setResult(r);
          setRunError(false);
          // Exact checks that turn out to be six answers become a questions screen.
          if (screen.kind === "c" && r.answers && questions.length) {
            const next: Screen = { kind: "q", answers: r.answers, sectors: r.sectors ?? [], sort: screen.sort };
            lastRun.current = screenKey(next);
            setScreen(next);
          }
        })
        .catch(() => setRunError(true))
        .finally(() => setRunning(false));
    }, 350);
    return () => window.clearTimeout(timer);
  }, [screen, questions.length]);

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

  // The exact checks behind the screen: its own, or what the answers expand to.
  const checks: CustomListSpec["checks"] =
    screen.kind === "c" ? screen.checks : result?.answers ? result.spec.checks : [];
  const isFine = screen.kind === "c" || !questions.length;
  const canTune = isPremium || !questions.length;
  // Free readers: quick picks, every count and the first rows are free;
  // setting their own answers and sectors is Premium (screen-only, like every lock).
  const locked = !isPremium && questions.length > 0;

  const answer = (key: string, level: number) => {
    setScreen((s) => s.kind === "q" ? { ...s, answers: { ...s.answers, [key]: level } } : s);
  };
  const setSectors = (sectors: string[]) => {
    setScreen((s) => s.kind === "q" ? { ...s, sectors } : s);
  };
  // Fine-tuning turns the screen into exact checks.
  const changeChecks = (fn: (c: CustomListSpec["checks"]) => CustomListSpec["checks"]) => {
    setScreen((s) => ({ kind: "c", checks: fn(s.kind === "c" ? s.checks : checks), sort: s.sort }));
  };
  const addCheck = (c: CustomCheckDef) => {
    if (checks.some((x) => x.key === c.key) || checks.length >= catalog.max_checks) return;
    changeChecks((xs) => [...xs, { key: c.key, value: c.default ?? true }]);
  };
  const setValue = (key: string, value: CustomCheckValue) =>
    changeChecks((xs) => xs.map((c) => (c.key === key ? { ...c, value } : c)));
  const removeCheck = (key: string) => changeChecks((xs) => xs.filter((c) => c.key !== key));
  const setSort = (key: string) => setScreen((s) => ({ ...s, sort: key }));

  const pick = (tp: CustomListTemplate) => {
    setEditingId(null);
    setName(t(tp.title_en, tp.title_bn));
    setAlerts(true);
    setScreen(fromTemplate(tp));
  };
  const startOver = () => pick(findTemplate(initialTemplate) ?? templates[0]);

  function edit(l: SavedCustomList) {
    setEditingId(l.id);
    setName(l.name);
    setAlerts(l.alerts);
    setScreen({ kind: "c", checks: l.spec.checks, sort: l.spec.sort ?? "score" });
    setTab("build");
    window.setTimeout(() => buildRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  }

  /** "Change" on the near-miss block: jump to that question, or open that check. */
  const changeMissed = (key: string, by: "question" | "check") => {
    if (by === "question") {
      const el = document.getElementById(questionId(key));
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
      el?.querySelector<HTMLButtonElement>('[aria-checked="true"]')?.focus({ preventScroll: true });
      return;
    }
    setFineOpen(true);
    if (canTune && checks.some((c) => c.key === key)) setCheckOpen(key);
    else window.setTimeout(() => document.getElementById(FINE_ID)?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  };

  /** Free readers: run the change they tapped and show what it would give. */
  const openPreview = (pv: Preview) => {
    if (pv.kind === "answer" && screen.kind !== "q") return setLockOpen(true);
    const next: Screen = pv.kind === "answer" && screen.kind === "q"
      ? { ...screen, answers: { ...screen.answers, [pv.key]: pv.level } }
      : { ...screen, sort: pv.kind === "order" ? pv.sort : screen.sort };
    const seq = ++previewSeq.current;
    setPreview(pv);
    setPreviewRes(null);
    setPreviewError(false);
    trackEvent("premium_lock_view", { area: "screener", lock: pv.kind === "answer" ? "Screener answer" : "Screener order", state });
    runCustomList(request(next))
      .then((r) => { if (seq === previewSeq.current) setPreviewRes(r); })
      .catch(() => { if (seq === previewSeq.current) setPreviewError(true); });
  };
  const previewQ = preview?.kind === "answer" ? questions.find((q) => q.key === preview.key) : undefined;
  const previewLevel = previewQ && preview?.kind === "answer" ? previewQ.levels[preview.level] : undefined;
  const previewSort = preview?.kind === "order" ? catalog.sorts.find((so) => so.key === preview.sort) : undefined;

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
    if (screen.kind === "q" ? !screen.sectors.length && !Object.values(screen.answers).some(Boolean) : !screen.checks.length) {
      toast({ message: t("Answer at least one question first.", "আগে অন্তত একটি প্রশ্নের উত্তর দিন।"), tone: "neutral" });
      return false;
    }
    const spec = request(screen);
    setSaving(true);
    try {
      if (editingId) {
        await apiUpdateCustomList(editingId, { name, spec, alerts });
        toast({ message: t("Screen saved.", "স্ক্রিন সেভ হয়েছে।"), tone: "success" });
      } else {
        const { list } = await apiCreateCustomList(name, spec, alerts);
        setEditingId(list.id);
        toast({
          message: t("Screen saved. We will tell you when a new share passes.", "স্ক্রিন সেভ হয়েছে। নতুন কোনো শেয়ার পাস করলে জানিয়ে দেব।"),
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

  // Free share: the first FREE_SCREENER_ROWS, none once a power check is on.
  const powerOn = checks.some((c) => byKey.get(c.key)?.premium);
  const freeRows = isPremium ? Infinity : powerOn ? 0 : FREE_SCREENER_ROWS;
  const shown = result ? Math.min(result.stocks.length, freeRows) : 0;
  const hidden = result ? Math.max(0, result.passed - shown) : 0;
  const yours = result ? result.stocks.filter((s) => followed.includes(s.code)).length : 0;
  const lists = saved ?? [];
  const sortDef = catalog.sorts.find((so) => so.key === screen.sort);
  const facets = screen.kind === "q" && result?.answers ? result.facets ?? null : null;
  const fineShown = isFine || fineOpen;

  const tabLabel: Record<Tab, ReactNode> = {
    build: tt("Build a screen", "স্ক্রিন বানান"),
    saved: lists.length ? tt(`Saved (${lists.length})`, `সেভ করা (${lists.length})`) : tt("Saved", "সেভ করা"),
  };

  return (
    <PageLockScope anchor={SCREENER_ANCHOR}>
      <div>
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
            <section aria-label={t("Find stocks", "শেয়ার খুঁজুন")}>
              {editingId && (
                <p className="mb-3 text-sm text-text-muted">
                  {tt(`You are changing your saved screen "${name}".`, `আপনি সেভ করা স্ক্রিন "${name}" বদলাচ্ছেন।`)}{" "}
                  <button type="button" onClick={startOver} className="font-semibold text-primary hover:underline">
                    {tt("Start fresh", "নতুন করে শুরু করুন")}
                  </button>
                </p>
              )}
              <div className="space-y-4">
                {isFine ? (
                  questions.length > 0 && (
                    <Card>
                      <p className="text-base font-semibold text-text-main">
                        {tt("This screen uses exact rules", "এই স্ক্রিনে নির্দিষ্ট নিয়ম ব্যবহার হয়েছে")}
                      </p>
                      <p className="mt-1 text-sm text-text-muted">
                        {tt("It does not fit the six questions, so its rules are listed below.",
                           "এটি ছয়টি প্রশ্নে মেলে না, তাই নিয়মগুলো নিচে দেওয়া হলো।")}
                      </p>
                      <Button variant="quiet" className="mt-3" onClick={startOver}>
                        {tt("Use the six questions instead", "বরং ছয়টি প্রশ্ন দিয়ে খুঁজুন")}
                      </Button>
                    </Card>
                  )
                ) : (
                  screen.kind === "q" && (
                    <ScreenerQuestions
                      questions={questions}
                      answers={{ ...noAnswers(questions), ...screen.answers }}
                      picked={screen.sectors}
                      sectors={sectorOptions}
                      facets={facets}
                      running={running}
                      locked={locked}
                      onAnswer={answer}
                      onSectors={setSectors}
                      onLocked={(key, level) => (key != null && level != null ? openPreview({ kind: "answer", key, level }) : setLockOpen(true))}
                      header={
                        <ScreenerStarts
                          goals={goals}
                          active={matchedGoal?.id ?? null}
                          locked={locked}
                          onLocked={() => setLockOpen(true)}
                          onPick={pick}
                          t={t}
                        />
                      }
                      t={t}
                    />
                  )
                )}

                <div id={FINE_ID} className="scroll-mt-32">
                  {!isFine && (
                    <button
                      type="button"
                      aria-expanded={fineOpen}
                      aria-controls={`${FINE_ID}-body`}
                      onClick={() => setFineOpen((v) => !v)}
                      className="flex min-h-12 w-full items-center gap-2 rounded-lg px-1 text-left text-sm font-semibold text-primary hover:bg-surface-2 active:bg-surface-2"
                    >
                      <IconTune size={16} />
                      <span className="flex-1">{tt("See the exact rules", "ঠিক কী যাচাই হচ্ছে দেখুন")}</span>
                      <span className={`text-text-muted transition-transform ${fineOpen ? "rotate-180" : ""}`} aria-hidden>
                        <IconChevronDown size={16} />
                      </span>
                    </button>
                  )}
                  {fineShown && (
                    <div id={`${FINE_ID}-body`} className={isFine ? undefined : "mt-2"}>
                      <p className="mb-2 text-sm text-text-muted">
                        {canTune
                          ? tt("A share must pass every one of these. Tap one to change it or take it out.",
                              "একটি শেয়ারকে এর প্রতিটিতে পাস করতে হবে। বদলাতে বা বাদ দিতে একটিতে চাপুন।")
                          : tt("This is exactly what your answers check. A share must pass every one.",
                              "আপনার উত্তরগুলো ঠিক এগুলোই যাচাই করে। একটি শেয়ারকে প্রতিটিতে পাস করতে হবে।")}
                      </p>
                      {checks.length > 0 ? (
                        <ScreenerChecks
                          catalog={catalog}
                          byKey={byKey}
                          spec={{ checks, sort: screen.sort }}
                          funnel={result?.funnel ?? null}
                          funnelKeys={result ? result.spec.checks.map((c) => c.key) : null}
                          universe={result?.universe ?? null}
                          running={running}
                          readOnly={!canTune}
                          open={checkOpen}
                          onOpen={setCheckOpen}
                          onAdd={addCheck}
                          onSet={setValue}
                          onRemove={removeCheck}
                          t={t}
                        />
                      ) : (
                        <p className="text-sm text-text-muted">
                          {tt("There are no rules yet, so every rated company is in. Answer a question above to begin.",
                             "এখনো কোনো নিয়ম নেই, তাই রেটিং পাওয়া সব কোম্পানি আছে। শুরু করতে ওপরে একটি প্রশ্নের উত্তর দিন।")}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </section>

            <ScreenerResults
              result={result}
              running={running}
              error={runError}
              freeRows={freeRows}
              powerOn={powerOn}
              questions={questions}
              followed={followed}
              onChangeCheck={changeMissed}
              t={t}
              toolbar={
                <>
                  {/* The order is part of setting your own screen — Premium, like the answers. */}
                  <Chip
                    onClick={() => setSortOpen(true)}
                    icon={locked ? <IconLock size={14} /> : <IconList size={14} />}
                  >
                    {tt(sortDef?.en ?? "Best score first", sortDef?.bn ?? "বেশি স্কোর আগে")}
                  </Chip>
                  <Chip onClick={() => setSaveOpen(true)} icon={<IconBell size={14} />}>
                    {editingId ? tt("Save changes", "বদল সেভ করুন") : tt("Save screen", "স্ক্রিন সেভ করুন")}
                  </Chip>
                </>
              }
            />

            <Link
              href="/stock-insights#research"
              prefetch={false}
              className="flex min-h-12 items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-3 text-sm hover:bg-surface-2 active:bg-surface-2"
            >
              <span>
                <span className="block font-semibold text-text-main">{tt("Our six research lists", "আমাদের ছয়টি গবেষণা তালিকা")}</span>
                <span className="block text-text-muted">
                  {tt("Ideas we test in the open, with every step shown", "যে ধারণাগুলো আমরা খোলাখুলি যাচাই করি, প্রতিটি ধাপসহ")}
                </span>
              </span>
              <span className="text-primary" aria-hidden>→</span>
            </Link>

            {/* Your own answers are Premium */}
            <Sheet
              open={lockOpen}
              onClose={() => setLockOpen(false)}
              title={tt("Set up your own screen with Premium", "প্রিমিয়ামে নিজের মতো স্ক্রিন সাজান")}
              footer={
                <div className="flex w-full gap-2">
                  <Button variant="quiet" className="flex-1" onClick={() => setLockOpen(false)}>
                    {tt("Not now", "এখন না")}
                  </Button>
                  <Button href={`#${SCREENER_ANCHOR}`} variant="primary" className="flex-1" onClick={() => setLockOpen(false)}>
                    {tt("See Premium", "প্রিমিয়াম দেখুন")}
                  </Button>
                </div>
              }
            >
              <ul className="space-y-2 text-sm text-text-main">
                <li>{tt("Free: the six quick picks, the count under every answer and the first 3 shares.",
                       "ফ্রি: ছয়টি দ্রুত বাছাই, প্রতিটি উত্তরের নিচের সংখ্যা আর প্রথম 3টি শেয়ার।")}</li>
                <li>{tt("Premium: change any answer, pick one or several sectors, change the order, see every share and save your screens.",
                       "প্রিমিয়াম: যেকোনো উত্তর বদলান, এক বা একাধিক সেক্টর বাছুন, ক্রম বদলান, সব শেয়ার দেখুন আর স্ক্রিন সেভ করুন।")}</li>
              </ul>
            </Sheet>

            {/* Order */}
            <Sheet
              open={sortOpen}
              onClose={() => setSortOpen(false)}
              title={tt("Order the shares", "শেয়ার সাজান")}
            >
              {locked && (
                <p className="mb-2 text-sm text-text-muted">
                  {tt("Changing the order is part of Premium. Tap one to see which shares it puts on top.",
                      "ক্রম বদলানো প্রিমিয়ামের অংশ। কোন শেয়ার ওপরে আসে, তা দেখতে একটিতে চাপুন।")}
                </p>
              )}
              <ul className="divide-y divide-border">
                {catalog.sorts.map((so) => {
                  const on = screen.sort === so.key;
                  const help = SORT_HELP[so.key];
                  return (
                    <li key={so.key}>
                      <button
                        type="button"
                        aria-pressed={on}
                        onClick={() => {
                          setSortOpen(false);
                          if (on) return;
                          if (locked) openPreview({ kind: "order", sort: so.key });
                          else setSort(so.key);
                        }}
                        className="flex min-h-14 w-full items-center justify-between gap-3 py-3 text-left active:bg-surface-2"
                      >
                        <span className="min-w-0">
                          <span className={`block text-base text-text-main ${on ? "font-semibold" : ""}`}>{tt(so.en, so.bn)}</span>
                          {help && <span className="block text-sm text-text-muted">{tt(help.en, help.bn)}</span>}
                        </span>
                        {on ? (
                          <span className="shrink-0 text-primary"><IconCheck size={18} /></span>
                        ) : locked ? (
                          <span className="shrink-0 text-text-muted"><IconLock size={16} /></span>
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </Sheet>

            {/* What a locked change would give (free readers) */}
            <ScreenerPreview
              open={!!preview}
              onClose={() => setPreview(null)}
              title={previewQ && previewLevel
                ? `${t(previewQ.title_en, previewQ.title_bn)} ${t(previewLevel.label_en, previewLevel.label_bn)}`
                : previewSort ? t(previewSort.en, previewSort.bn) : ""}
              line={previewLevel
                ? t(previewLevel.means_en, previewLevel.means_bn)
                : preview?.kind === "order" && SORT_HELP[preview.sort]
                  ? t(SORT_HELP[preview.sort].en, SORT_HELP[preview.sort].bn)
                  : null}
              count={previewRes?.passed ?? null}
              current={preview?.kind === "answer" ? result?.passed ?? null : null}
              stocks={previewRes?.stocks ?? null}
              loading={!previewRes && !previewError}
              error={previewError}
              cta={preview?.kind === "order"
                ? t("Change the order with Premium", "প্রিমিয়ামে ক্রম বদলান")
                : t("See them with Premium", "প্রিমিয়ামে দেখুন")}
              ctaHref={`#${SCREENER_ANCHOR}`}
              onCta={() => {
                trackEvent("premium_lock_tap", { area: "screener", lock: preview?.kind === "order" ? "Screener order" : "Screener answer", state });
                setPreview(null);
              }}
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
                  <Button href="#sc-premium" variant="primary" block onClick={() => setSaveOpen(false)}>
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
                <p className="text-sm text-text-muted">
                  {tt("We run it every trading day and tell you when a new share passes.",
                      "প্রতি লেনদেনের দিন আমরা এটি চালাই, আর নতুন কোনো শেয়ার পাস করলে জানাই।")}
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
                  {tt("Tell me when a new share passes every check", "নতুন কোনো শেয়ার সব যাচাইয়ে পাস করলে জানান")}
                </label>
                {editingId && isPremium && (
                  <Button variant="link" onClick={() => { setEditingId(null); setName(""); }}>
                    {tt("Save as a new screen instead", "বরং নতুন স্ক্রিন হিসেবে সেভ করুন")}
                  </Button>
                )}
                {!isPremium && (
                  <p className="text-sm text-text-muted">
                    {tt(`Premium keeps up to ${catalog.max_lists} screens, each checked every trading day.`,
                       `প্রিমিয়ামে সর্বোচ্চ ${catalog.max_lists}টি স্ক্রিন রাখা যায়, আর প্রতি লেনদেনের দিন সেগুলো যাচাই হয়।`)}
                  </p>
                )}
              </div>
            </Sheet>

            <ScreenerPremium passed={result?.passed ?? null} hidden={hidden} yours={yours} t={t} />

            <p className="text-xs text-text-muted">
              {tt("A screen is a starting point for your own research, not advice to buy.",
                 "স্ক্রিন আপনার নিজের যাচাইয়ের শুরু মাত্র, কেনার পরামর্শ নয়।")}
            </p>
          </div>
        )}

        {tab === "saved" && (
          <div role="tabpanel" aria-labelledby="sc-tab-saved">
            {!isLoggedIn && !authLoading ? (
              <EmptyState
                title={tt("Sign in to keep your screens", "স্ক্রিন রাখতে সাইন ইন করুন")}
                message={tt("Saved screens run every trading day and tell you when a new share passes.",
                           "সেভ করা স্ক্রিন প্রতি লেনদেনের দিন চলে, আর নতুন শেয়ার পাস করলে জানায়।")}
                actions={[{ href: "/login?next=%2Fscreener%3Ftab%3Dsaved", label: tt("Sign in", "সাইন ইন") }]}
              />
            ) : saved === null ? (
              <div className="space-y-4"><Skeleton height={160} /><Skeleton height={160} /></div>
            ) : lists.length === 0 ? (
              <EmptyState
                title={tt("No saved screens yet", "এখনো কোনো স্ক্রিন সেভ করা নেই")}
                message={tt("Build a screen and save it. We will check it for you every trading day.",
                           "একটি স্ক্রিন বানিয়ে সেভ করুন। প্রতি লেনদেনের দিন আমরা সেটি যাচাই করব।")}
                actions={[{ onClick: () => setTab("build"), label: tt("Build a screen", "স্ক্রিন বানান") }]}
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
