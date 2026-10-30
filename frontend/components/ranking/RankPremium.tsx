"use client";

import { useEffect, useState } from "react";
import { T } from "@/components/i18n/T";
import { Locked } from "@/components/premium/AnswerLock";
import { IconCrown } from "@/components/ui/icons";
import Button from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import {
  apiAddRankAlert,
  apiGetRankAlerts,
  apiRemoveRankAlert,
  getRankHistory,
  type RankAlert,
  type RankAlertKind,
  type RankHistory,
} from "@/lib/api";
import { bnDate } from "@/lib/bn";
import { formatDate } from "@/lib/formatters";
import { usePremium } from "@/lib/premium";
import { toast } from "@/lib/toast";
import { trackEvent } from "@/lib/track";
import type { RankedItem } from "@/components/ranking/FullRankTable";

/** One request for the reader's rank alerts, shared by every open row. */
let alertsPromise: Promise<RankAlert[]> | null = null;
function loadAlerts(): Promise<RankAlert[]> {
  if (!alertsPromise) {
    alertsPromise = apiGetRankAlerts()
      .then((r) => r.alerts)
      .catch(() => {
        alertsPromise = null;
        return [];
      });
  }
  return alertsPromise;
}
function setAlertsCache(list: RankAlert[]) {
  alertsPromise = Promise.resolve(list);
}

const TOP_N = 20;

/**
 * What Premium adds to a row's quick view on the rankings page (2026-10-31,
 * the Premium Desk plan step 3): why the signal says what it says, where the
 * company stood every day of the last year, and two rank alerts. Fetched only
 * for a Premium reader; a free reader gets one line pointing at the page's
 * Premium card (`#rk-premium`), which names all of it.
 */
export default function RankPremium({ item }: { item: RankedItem }) {
  const { isPremium, state } = usePremium();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const open = mounted && isPremium;
  const code = item.trading_code;

  const [hist, setHist] = useState<RankHistory | null | "error">(null);
  useEffect(() => {
    if (!open) return;
    let alive = true;
    getRankHistory(code)
      .then((h) => alive && setHist(h))
      .catch(() => alive && setHist("error"));
    return () => {
      alive = false;
    };
  }, [open, code]);

  if (!open) {
    return (
      <p className="rk-prem-hint">
        <IconCrown size={14} />
        <a
          href="#rk-premium"
          onClick={() => trackEvent("premium_lock_tap", { area: "rankings", lock: "rankings-row", state })}
        >
          <T
            en="Premium adds why this signal, a year of rank and rank alerts"
            bn="প্রিমিয়ামে সংকেতের কারণ, এক বছরের র‍্যাঙ্ক আর র‍্যাঙ্ক অ্যালার্ট"
          />
        </a>
      </p>
    );
  }

  return (
    <Locked className="rk-prem">
      {hist === null && (
        <p className="text-sm">
          <T en="Loading…" bn="লোড হচ্ছে…" />
        </p>
      )}
      {hist === "error" && (
        <p className="text-sm">
          <T en="The rank history isn't available right now." bn="র‍্যাঙ্কের ইতিহাস এখন পাওয়া যাচ্ছে না।" />
        </p>
      )}
      {hist && hist !== "error" && (
        <>
          {hist.signal?.reason_en && (
            <p className="rk-detail-reason">
              <span className="font-semibold">
                <T en="Why this signal: " bn="সংকেতের কারণ: " />
              </span>
              <T en={hist.signal.reason_en} bn={hist.signal.reason_bn || hist.signal.reason_en} />
            </p>
          )}
          <RankLine hist={hist} />
          <RankAlerts item={item} rank={hist.points[hist.points.length - 1]?.r ?? null} />
        </>
      )}
    </Locked>
  );
}

/** A year of rank as one line: number 1 at the top. Text-free SVG; the
 *  words sit under it. */
function RankLine({ hist }: { hist: RankHistory }) {
  const pts = hist.points;
  if (pts.length < 2) return null;
  const last = pts[pts.length - 1];
  const W = 300;
  const H = 64;
  const lo = Math.max(1, hist.best - 2);
  const hi = Math.max(lo + 4, hist.worst + 2);
  const x = (k: number) => (k / (pts.length - 1)) * W;
  const y = (r: number) => 4 + ((r - lo) / (hi - lo)) * (H - 8);
  const d = pts.map((p, k) => `${k === 0 ? "M" : "L"}${x(k).toFixed(1)},${y(p.r).toFixed(1)}`).join(" ");
  const since = formatDate(hist.first);
  const sinceBn = bnDate(hist.first);
  return (
    <div className="rk-rankline">
      <p className="rk-rankline-head">
        <T en="Its rank, day by day" bn="প্রতিদিনের র‍্যাঙ্ক" />
        <span className="nums">
          <T en={`Number ${last.r} today`} bn={`আজ ${last.r} নম্বরে`} />
        </span>
      </p>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="rk-spark" aria-hidden="true">
        <path d={d} fill="none" vectorEffect="non-scaling-stroke" />
        <circle cx={x(pts.length - 1)} cy={y(last.r)} r="3" />
      </svg>
      <p className="rk-rankline-foot nums">
        <T
          en={`Since ${since}: best number ${hist.best}, lowest number ${hist.worst}.`}
          bn={`${sinceBn} থেকে: সবচেয়ে ভালো ${hist.best} নম্বর, সবচেয়ে নিচে ${hist.worst} নম্বর।`}
        />
      </p>
    </div>
  );
}

/** "Tell me when it enters the top 20" (outside it today) and "Tell me if it
 *  drops below Good" (Good or Excellent today). Checked after every trading day. */
function RankAlerts({ item, rank }: { item: RankedItem; rank: number | null }) {
  const { isLoggedIn } = useAuth();
  const [alerts, setAlerts] = useState<RankAlert[] | null>(null);
  const [busy, setBusy] = useState<RankAlertKind | null>(null);
  const code = item.trading_code;
  useEffect(() => {
    if (!isLoggedIn) return;
    let alive = true;
    loadAlerts().then((a) => alive && setAlerts(a));
    return () => {
      alive = false;
    };
  }, [isLoggedIn]);

  const kinds: RankAlertKind[] = [];
  if (rank != null && rank > TOP_N) kinds.push("top20");
  if (item.tier === "good" || item.tier === "excellent") kinds.push("below_good");
  const mine = (alerts ?? []).filter((a) => a.code === code);
  // An alert already set stays visible even when its condition no longer applies.
  for (const a of mine) if (!kinds.includes(a.kind)) kinds.push(a.kind);
  if (!isLoggedIn || alerts === null || kinds.length === 0) return null;

  const toggle = async (kind: RankAlertKind) => {
    const existing = mine.find((a) => a.kind === kind);
    setBusy(kind);
    try {
      const res = existing ? await apiRemoveRankAlert(existing.id) : await apiAddRankAlert(code, kind);
      setAlerts(res.alerts);
      setAlertsCache(res.alerts);
      trackEvent("rank_alert", { code, kind, on: existing ? "no" : "yes" });
      toast({
        tone: "success",
        message: existing ? (
          <T en="Alert removed" bn="অ্যালার্ট বন্ধ করা হয়েছে" />
        ) : (
          <T en="Alert set. We check after every trading day." bn="অ্যালার্ট চালু। প্রতি লেনদেনের দিনের পর যাচাই করি।" />
        ),
      });
    } catch (e) {
      const limit = e instanceof Error && e.message.startsWith("limit_reached");
      toast({
        tone: "error",
        message: limit ? (
          <T en="You have 50 rank alerts, the most an account can keep." bn="আপনার 50টি র‍্যাঙ্ক অ্যালার্ট আছে, এর বেশি রাখা যায় না।" />
        ) : (
          <T en="That didn't work. Please try again." bn="হয়নি। আবার চেষ্টা করুন।" />
        ),
      });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="rk-alerts" role="group" aria-label="Rank alerts">
      {kinds.map((kind) => {
        const on = mine.some((a) => a.kind === kind);
        return (
          <Button key={kind} variant="quiet" size="sm" active={on} disabled={busy !== null} onClick={() => toggle(kind)}>
            {kind === "top20" ? (
              on ? (
                <T en="Alert on: when it enters the top 20" bn="অ্যালার্ট চালু: প্রথম 20-এ এলে" />
              ) : (
                <T en="Tell me when it enters the top 20" bn="প্রথম 20-এ এলে জানান" />
              )
            ) : on ? (
              <T en="Alert on: if it drops below Good" bn="অ্যালার্ট চালু: ভালো গ্রেডের নিচে নামলে" />
            ) : (
              <T en="Tell me if it drops below Good" bn="ভালো গ্রেডের নিচে নামলে জানান" />
            )}
          </Button>
        );
      })}
    </div>
  );
}
