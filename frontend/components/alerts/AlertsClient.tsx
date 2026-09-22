"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { getScores, type ScoreItem, type ScoresResponse } from "@/lib/api";
import { cacheKeys, readCache, writeCache } from "@/lib/swr-cache";
import Button from "@/components/ui/Button";
import {
  loadAlerts,
  subscribeAlerts,
  getCachedAlerts,
  rearmAlert,
  deleteAlert,
  type PriceAlert,
} from "@/lib/price-alerts";
import PriceAlertModal from "@/components/stock/PriceAlertModal";
import EmptyState from "@/components/ui/EmptyState";
import Skeleton from "@/components/ui/Skeleton";
import Card from "@/components/ui/Card";

function flatten(scores: ScoresResponse | null): ScoreItem[] {
  if (!scores) return [];
  return Object.values(scores.tiers).flat();
}

function fmt(n: number): string {
  return Number(n.toFixed(2)).toString();
}

function sentenceFor(a: PriceAlert): string {
  const verb = a.direction === "above" ? "rises to" : "drops to";
  return `when ${a.trading_code} ${verb} ৳${fmt(a.target_price)}`;
}

function triggeredDate(iso: string | null): string {
  if (!iso) return "";
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  return new Date(t).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function AlertCard({
  alert,
  ltp,
  onEdit,
}: {
  alert: PriceAlert;
  ltp: number | null;
  onEdit: (a: PriceAlert) => void;
}) {
  const [busy, setBusy] = useState(false);
  const tone = alert.direction === "above" ? "var(--positive)" : "var(--negative)";

  async function handleRearm() {
    setBusy(true);
    await rearmAlert(alert.id);
    setBusy(false);
  }

  async function handleRemove() {
    setBusy(true);
    await deleteAlert(alert.id);
    // Component unmounts when the list updates; no need to reset busy.
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <Link href={`/stock/${alert.trading_code}`} className="text-base font-bold text-primary">
          {alert.trading_code}
        </Link>
        {alert.is_active ? (
          <span className="rounded-full border border-watch/30 bg-watch/10 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-watch">
            Armed
          </span>
        ) : (
          <span className="rounded-full border border-border bg-surface-2 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-text-muted">
            Triggered {triggeredDate(alert.triggered_at)}
          </span>
        )}
      </div>

      <p className="text-sm text-text-main">
        Alert me <b style={{ color: tone }}>{sentenceFor(alert)}</b>
      </p>

      <div className="flex items-center gap-3 text-xs text-text-muted">
        {ltp != null && <span className="tabular-nums">Now ৳{ltp.toFixed(1)}</span>}
        {!alert.is_active && alert.triggered_price != null && (
          <span className="tabular-nums">Hit at ৳{fmt(alert.triggered_price)}</span>
        )}
      </div>

      <div className="mt-1 flex flex-wrap gap-2">
        {alert.is_active ? (
          <Button type="button" variant="quiet" size="sm" onClick={() => onEdit(alert)}>
            Edit / remove
          </Button>
        ) : (
          <>
            <Button type="button" variant="primary" size="sm" onClick={handleRearm} disabled={busy}>
              {busy ? "Setting…" : "Set again"}
            </Button>
            <Button type="button" variant="danger" size="sm" onClick={handleRemove} disabled={busy}>
              Remove
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

export default function AlertsClient() {
  const { isLoggedIn, isLoading } = useAuth();
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [scores, setScores] = useState<ScoresResponse | null>(
    () => readCache<ScoresResponse>(cacheKeys.scores),
  );
  const [editing, setEditing] = useState<PriceAlert | null>(null);

  useEffect(() => {
    if (!isLoggedIn) return;
    loadAlerts().then(() => setAlerts(getCachedAlerts()));
    setAlerts(getCachedAlerts());
    return subscribeAlerts(() => setAlerts(getCachedAlerts()));
  }, [isLoggedIn]);

  useEffect(() => {
    let cancelled = false;
    getScores()
      .then((s) => {
        if (cancelled) return;
        setScores(s);
        writeCache(cacheKeys.scores, s);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const ltpMap = useMemo(() => {
    const m = new Map<string, number | null>();
    for (const it of flatten(scores)) m.set(it.trading_code.toUpperCase(), it.ltp);
    return m;
  }, [scores]);

  const active = alerts.filter((a) => a.is_active);
  const triggered = alerts.filter((a) => !a.is_active);

  if (isLoading) {
    return (
      <Card padding="md" aria-busy="true" aria-label="Loading alerts">
        <div className="skeleton-rows" role="status">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="skeleton-row">
              <Skeleton width={64} height={16} />
              <Skeleton width="40%" height={14} />
              <Skeleton width={72} height={22} rounded="999px" className="ml-auto" />
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="watchlist-empty">
        <h2>Sign in to set price alerts</h2>
        <p>
          Pick a target price on any stock and we&apos;ll notify you the day it&apos;s reached — by web
          push and in your alerts bell.
        </p>
        <div className="mt-4 flex gap-2 justify-center">
          <Button href="/login?next=%2Falerts" variant="primary" size="sm">
            Sign In
          </Button>
          <Button href="/register?next=%2Falerts" variant="quiet" size="sm">
            Create Account
          </Button>
        </div>
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <EmptyState
        title="No price alerts yet"
        message="Open any stock and tap the Alert button to set a target price. We'll watch it and ping you the day it's hit."
        bn="যে কোনো শেয়ারে গিয়ে Alert বোতামে চাপ দিয়ে দাম ঠিক করে দিন — পৌঁছালেই জানাব।"
        actions={[
          { href: "/dsestockranking", label: "See top-ranked stocks" },
          { href: "/stocks", label: "Browse all stocks" },
        ]}
      />
    );
  }

  return (
    <>
      {active.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-text-muted">
            Armed ({active.length})
          </h2>
          <div className="flex flex-col gap-2.5">
            {active.map((a) => (
              <AlertCard key={a.id} alert={a} ltp={ltpMap.get(a.trading_code) ?? null} onEdit={setEditing} />
            ))}
          </div>
        </section>
      )}

      {triggered.length > 0 && (
        <section>
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-text-muted">
            Recently triggered
          </h2>
          <div className="flex flex-col gap-2.5">
            {triggered.map((a) => (
              <AlertCard key={a.id} alert={a} ltp={ltpMap.get(a.trading_code) ?? null} onEdit={setEditing} />
            ))}
          </div>
        </section>
      )}

      {editing && (
        <PriceAlertModal
          code={editing.trading_code}
          ltp={ltpMap.get(editing.trading_code) ?? null}
          existing={editing}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}
