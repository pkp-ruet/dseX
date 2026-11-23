"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { T } from "@/components/i18n/T";
import Skeleton from "@/components/ui/Skeleton";
import PriceAlertModal from "@/components/stock/PriceAlertModal";
import BuilderQuestions from "./BuilderQuestions";
import BuilderPlan from "./BuilderPlan";
import BuilderSignIn from "./BuilderSignIn";
import BuilderWall from "./BuilderWall";
import BoughtSheet from "./BoughtSheet";
import { useAuth } from "@/context/AuthContext";
import { usePremium } from "@/lib/premium";
import { toast } from "@/lib/toast";
import { trackEvent } from "@/lib/track";
import { getCachedWatchlist, loadWatchlist, setWatchlist } from "@/lib/watchlist";
import { loadMainHoldings } from "@/lib/main-holdings";
import {
  apiBuildPortfolio,
  apiGetBuilderPlan,
  apiGetBuilderPlans,
  flattenTiers,
  getScores,
  type PortfolioHolding,
  type ScoreItem,
} from "@/lib/api";
import {
  DEFAULT_ANSWERS,
  planGrade,
  type BuilderAnswers,
  type BuilderPlan as Plan,
  type PlanChange,
  type PlanItem,
  type PlanSummary,
} from "@/lib/portfolio-builder";

type Shown = { id: string | null; createdAt: string | null; plan: Plan; changes: Record<string, PlanChange> };

/** `?plan=ID` (a plan-watch push) and `?start=mine` (the portfolio page's link). */
function readParams(): { plan: string | null; start: string | null } {
  if (typeof window === "undefined") return { plan: null, start: null };
  const q = new URLSearchParams(window.location.search);
  return { plan: q.get("plan"), start: q.get("start") };
}

/**
 * The portfolio builder page body (2026-11-23). Signed in only: a guest gets
 * the sign-in card. A reader with a kept plan opens on it; otherwise on the
 * three questions. Build again reopens the questions with the last answers,
 * except for a free reader who has used the free plan: then the Premium wall.
 *
 * Phase 2: a reader with shares can add the money to them ("start from my
 * shares", the lines hold on the whole portfolio, the grade shows before and
 * after), and the plan shows what the after-close plan watch noticed since
 * it was built.
 */
export default function BuilderClient() {
  const { isLoggedIn, isLoading, user, refreshUser } = useAuth();
  const { isPremium } = usePremium();

  const [loaded, setLoaded] = useState(false);
  const [plans, setPlans] = useState<PlanSummary[]>([]);
  const [shown, setShown] = useState<Shown | null>(null);
  const [freeUsedServer, setFreeUsedServer] = useState(false);
  const [mode, setMode] = useState<"questions" | "plan">("questions");
  const [answers, setAnswers] = useState<BuilderAnswers>(DEFAULT_ANSWERS);
  const [building, setBuilding] = useState(false);
  const [wall, setWall] = useState(false);
  const [bought, setBought] = useState(false);
  const [alertFor, setAlertFor] = useState<PlanItem | null>(null);
  const [priceMap, setPriceMap] = useState<Map<string, ScoreItem> | null>(null);
  const [holdings, setHoldings] = useState<PortfolioHolding[] | null>(null);
  const topRef = useRef<HTMLDivElement>(null);

  const freeUsed = !isPremium && (freeUsedServer || !!user?.builder?.free_used);

  useEffect(() => {
    if (!isLoggedIn) return;
    let live = true;
    const params = readParams();
    Promise.all([apiGetBuilderPlans(), loadMainHoldings().catch(() => [] as PortfolioHolding[])])
      .then(async ([res, held]) => {
        if (!live) return;
        setPlans(res.plans);
        setFreeUsedServer(res.builder.free_used);
        setHoldings(held);
        const hasShares = held.length > 0;
        let doc = res.latest;
        // A plan-watch push opens the plan it is about.
        if (params.plan && doc && params.plan !== doc.id && res.plans.some((p) => p.id === params.plan)) {
          doc = await apiGetBuilderPlan(params.plan).catch(() => doc);
        }
        if (!live) return;
        const canBuild = isPremium || !res.builder.free_used;
        if (params.start === "mine" && hasShares && canBuild) {
          // The portfolio page's "Have new money to add?": straight to the questions.
          if (doc) setShown({ id: doc.id, createdAt: doc.created_at, plan: doc.plan, changes: doc.changes ?? {} });
          setAnswers({ ...(doc ? doc.plan.answers : DEFAULT_ANSWERS), exclude: [], start: "mine" });
          setMode("questions");
        } else if (doc) {
          setShown({ id: doc.id, createdAt: doc.created_at, plan: doc.plan, changes: doc.changes ?? {} });
          setAnswers({ ...doc.plan.answers, exclude: [], start: doc.plan.answers.start ?? "fresh" });
          setMode("plan");
        } else {
          setAnswers({ ...DEFAULT_ANSWERS, start: hasShares ? "mine" : "fresh" });
        }
      })
      .catch(() => undefined)
      .finally(() => live && setLoaded(true));
    getScores()
      .then((s) => live && setPriceMap(new Map(flattenTiers(s).map((r) => [r.trading_code.toUpperCase(), r]))))
      .catch(() => undefined);
    return () => {
      live = false;
    };
    // isPremium only matters on the first read; a later change doesn't refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn]);

  const grade = useMemo(() => (shown && priceMap ? planGrade(shown.plan, priceMap) : null), [shown, priceMap]);

  /** The main portfolio today, for "Add to my shares" (null without shares). */
  const held = useMemo(() => {
    if (!holdings?.length) return null;
    const codes = new Set<string>();
    let value = 0;
    for (const h of holdings) {
      const code = h.trading_code.toUpperCase();
      codes.add(code);
      const px = priceMap?.get(code)?.ltp ?? h.buy_price;
      value += (Number(h.qty) || 0) * (Number(px) || 0);
    }
    return { count: codes.size, value };
  }, [holdings, priceMap]);

  const toTop = () => topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  const build = useCallback(
    async (a: BuilderAnswers) => {
      if (freeUsed) {
        setWall(true);
        return;
      }
      setBuilding(true);
      try {
        const res = await apiBuildPortfolio(a);
        trackEvent("builder_build", {
          first: !res.builder || res.builder.count <= 1 ? 1 : 0,
          premium: isPremium ? 1 : 0,
          shares: res.plan.items.length,
          start: res.plan.answers.start ?? "fresh",
        });
        setShown({ id: res.id, createdAt: res.created_at ?? null, plan: res.plan, changes: {} });
        setAnswers({ ...res.plan.answers, exclude: [] });
        setMode("plan");
        if (res.id) {
          setFreeUsedServer(res.builder.free_used);
          apiGetBuilderPlans()
            .then((k) => setPlans(k.plans))
            .catch(() => undefined);
          refreshUser().catch(() => undefined);
        }
        toTop();
      } catch (e) {
        const err = e as { status?: number; message?: string };
        if (err?.status === 403 && err.message === "limit_reached:portfolio_builder") {
          setFreeUsedServer(true);
          setWall(true);
        } else {
          toast({ tone: "error", message: <T en="Couldn't build the plan. Try again." bn="পরিকল্পনা বানানো যায়নি। আবার চেষ্টা করুন।" /> });
        }
      } finally {
        setBuilding(false);
      }
    },
    [freeUsed, isPremium, refreshUser],
  );

  const buildAgain = () => {
    trackEvent("builder_again_tap", { premium: isPremium ? 1 : 0, free_used: freeUsed ? 1 : 0 });
    if (freeUsed) {
      setWall(true);
      return;
    }
    setMode("questions");
    toTop();
  };

  const notForMe = (code: string) => {
    if (!shown) return;
    if (freeUsed) {
      setWall(true);
      return;
    }
    build({ ...shown.plan.answers, exclude: [...shown.plan.answers.exclude, code] });
  };

  const followAll = async () => {
    if (!shown) return;
    const codes = shown.plan.items.map((i) => i.code);
    try {
      await loadWatchlist();
      const have = getCachedWatchlist();
      const next = Array.from(new Set([...have, ...codes]));
      await setWatchlist(next);
      const added = next.length - have.length;
      toast({
        tone: "success",
        message:
          added > 0 ? (
            <T en={`Following ${added} more ${added === 1 ? "share" : "shares"}.`} bn={`আরও ${added}টি শেয়ার ফলো করছেন।`} />
          ) : (
            <T en="You already follow all of them." bn="এগুলোর সবই আগে থেকে ফলো করছেন।" />
          ),
      });
    } catch {
      toast({ tone: "error", message: <T en="Couldn't follow them. Try again." bn="ফলো করা যায়নি। আবার চেষ্টা করুন।" /> });
    }
  };

  const openPlan = async (id: string) => {
    if (shown?.id === id) return;
    try {
      const doc = await apiGetBuilderPlan(id);
      setShown({ id: doc.id, createdAt: doc.created_at, plan: doc.plan, changes: doc.changes ?? {} });
      setAnswers({ ...doc.plan.answers, exclude: [], start: doc.plan.answers.start ?? "fresh" });
      setMode("plan");
      toTop();
    } catch {
      toast({ tone: "error", message: <T en="Couldn't open that plan." bn="পরিকল্পনাটি খোলা যায়নি।" /> });
    }
  };

  if (isLoading) {
    return <Skeleton className="w-full" height={240} />;
  }
  if (!isLoggedIn) {
    return <BuilderSignIn />;
  }
  if (!loaded) {
    return <Skeleton className="w-full" height={240} />;
  }

  return (
    <div ref={topRef} className="pb-wrap scroll-mt-24">
      {mode === "questions" || !shown ? (
        <BuilderQuestions
          key={shown?.id ?? "new"}
          answers={held ? answers : { ...answers, start: "fresh" }}
          onChange={setAnswers}
          onBuild={build}
          building={building}
          again={!!shown}
          onCancel={shown ? () => setMode("plan") : undefined}
          held={held}
        />
      ) : (
        <BuilderPlan
          plan={shown.plan}
          changes={shown.changes}
          freePlan={!isPremium && plans.length <= 1}
          crown={freeUsed}
          grade={grade}
          plans={plans}
          currentId={shown.id}
          building={building}
          onBuildAgain={buildAgain}
          onNotForMe={notForMe}
          onBought={() => setBought(true)}
          onFollowAll={followAll}
          onAlert={setAlertFor}
          onOpenPlan={openPlan}
        />
      )}

      <BuilderWall open={wall} onClose={() => setWall(false)} />
      {bought && shown && <BoughtSheet key={shown.id ?? "x"} items={shown.plan.items} open={bought} onClose={() => setBought(false)} />}
      {alertFor && (
        <PriceAlertModal
          code={alertFor.code}
          ltp={alertFor.price}
          w52High={alertFor.hi52}
          w52Low={alertFor.lo52}
          preset={alertFor.wait_under}
          onClose={() => setAlertFor(null)}
        />
      )}
    </div>
  );
}
