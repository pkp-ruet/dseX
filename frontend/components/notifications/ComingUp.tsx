"use client";

import { useEffect, useMemo, useState } from "react";
import { T } from "@/components/i18n/T";
import { UpdateList } from "@/components/watchlist/WatchUpdates";
import { getInsightScores, getWatchlistUpdates, type ScoreItem, type WatchlistUpdates } from "@/lib/api";
import { loadMainHoldings } from "@/lib/main-holdings";
import { getCachedWatchlist, loadWatchlist } from "@/lib/watchlist";
import { getCachedAlerts, loadAlerts } from "@/lib/price-alerts";
import { buildWatchUpdates } from "@/lib/watch-updates";

/**
 * "Coming up" on the Updates page (2026-11-20, the app map): the dates ahead
 * on every share the reader owns or follows — results meetings, the last day
 * to buy before a record date, record dates, AGMs, and price alerts close to
 * their price. It moved here from the watchlist's "Coming up" card, so the
 * dates on your shares have one home. The same rules as before
 * (lib/watch-updates.ts), free facts only.
 */
export default function ComingUp() {
  const [codes, setCodes] = useState<string[] | null>(null);
  const [scores, setScores] = useState<ScoreItem[]>([]);
  const [updates, setUpdates] = useState<WatchlistUpdates | null>(null);
  const [loading, setLoading] = useState(true);
  const [alertsTick, setAlertsTick] = useState(0);

  useEffect(() => {
    let live = true;
    Promise.all([loadMainHoldings().catch(() => []), loadWatchlist().catch(() => {})]).then(([held]) => {
      if (!live) return;
      const all = new Set<string>([
        ...held.map((h) => h.trading_code.toUpperCase()),
        ...getCachedWatchlist().map((c) => c.toUpperCase()),
      ]);
      setCodes(Array.from(all).sort().slice(0, 100));
    });
    getInsightScores()
      .then((s) => live && setScores(s))
      .catch(() => {});
    loadAlerts()
      .then(() => live && setAlertsTick((n) => n + 1))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    if (!codes) return;
    if (!codes.length) {
      setLoading(false);
      return;
    }
    let live = true;
    getWatchlistUpdates(codes)
      .then((u) => live && setUpdates(u))
      .catch(() => {})
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [codes]);

  const coming = useMemo(() => {
    if (!codes?.length) return [];
    const mine = new Set(codes);
    const rows = scores.filter((r) => mine.has(r.trading_code.toUpperCase()));
    return buildWatchUpdates({ rows, updates, alerts: getCachedAlerts(), news: [], extremes: null }).coming;
    // alertsTick: re-read the alert cache once it has loaded.
  }, [codes, scores, updates, alertsTick]);

  if (codes && codes.length === 0) return null;

  return (
    <section className="nt-coming" aria-labelledby="nt-coming">
      <UpdateList
        id="nt-coming"
        title={<T en="Coming up" bn="সামনে যা আছে" />}
        note={
          <T
            en="Dates ahead on the shares you own or follow, soonest first."
            bn="আপনার কেনা বা অনুসরণ করা শেয়ারের সামনের তারিখ, কাছেরগুলো আগে।"
          />
        }
        items={coming}
        loading={loading || !codes}
        empty={
          <T
            en="No record date, AGM or results date ahead on your shares yet."
            bn="আপনার শেয়ারগুলোর সামনে এখনো কোনো রেকর্ড ডেট, এজিএম বা ফলের তারিখ নেই।"
          />
        }
      />
    </section>
  );
}
