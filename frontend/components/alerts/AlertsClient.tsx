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
import { usePremium } from "@/lib/premium";
import { T } from "@/components/i18n/T";
import { useLang } from "@/context/LangContext";
import { bnDate } from "@/lib/bn";

function flatten(scores: ScoresResponse | null): ScoreItem[] {
  if (!scores) return [];
  return Object.values(scores.tiers).flat();
}

function fmt(n: number): string {
  return Number(n.toFixed(2)).toString();
}

/** "Tell me when GP rises to ৳310", in both languages; the condition is bold. */
function AlertSentence({ a, tone }: { a: PriceAlert; tone: string }) {
  const up = a.direction === "above";
  const price = `৳${fmt(a.target_price)}`;
  return (
    <T
      en={
        <>
          Tell me when {a.trading_code} <b style={{ color: tone }}>{up ? "rises to" : "falls to"} {price}</b>
        </>
      }
      bn={
        <>
          {a.trading_code}-এর দাম <b style={{ color: tone }}>{price}-এ {up ? "উঠলে" : "নামলে"}</b> জানাবেন
        </>
      }
    />
  );
}

function triggeredDate(iso: string | null): { en: string; bn: string } {
  if (!iso) return { en: "", bn: "" };
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return { en: "", bn: "" };
  const d = new Date(t);
  return {
    en: d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
    bn: bnDate(d.toISOString().slice(0, 10)),
  };
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
  const hit = triggeredDate(alert.triggered_at);
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
          <span className="rounded-full border border-watch/30 bg-watch/10 px-2 py-0.5 text-xs font-bold   text-watch">
            <T en="Active" bn="চালু" />
          </span>
        ) : (
          <span className="rounded-full border border-border bg-surface-2 px-2 py-0.5 text-xs font-bold   text-text-muted">
            <T en={`Reached ${hit.en}`.trim()} bn={`${hit.bn} পৌঁছেছে`.trim()} />
          </span>
        )}
      </div>

      <p className="text-sm text-text-main">
        <AlertSentence a={alert} tone={tone} />
      </p>

      <div className="flex items-center gap-3 text-xs text-text-muted">
        {ltp != null && (
          <span className="tabular-nums">
            <T en={`Now ৳${ltp.toFixed(1)}`} bn={`এখন ৳${ltp.toFixed(1)}`} />
          </span>
        )}
        {!alert.is_active && alert.triggered_price != null && (
          <span className="tabular-nums">
            <T en={`Reached at ৳${fmt(alert.triggered_price)}`} bn={`৳${fmt(alert.triggered_price)}-এ পৌঁছেছিল`} />
          </span>
        )}
      </div>

      <div className="mt-1 flex flex-wrap gap-2">
        {alert.is_active ? (
          <Button type="button" variant="quiet" size="sm" onClick={() => onEdit(alert)}>
            <T en="Change or remove" bn="বদলান বা সরান" />
          </Button>
        ) : (
          <>
            <Button type="button" variant="primary" size="sm" onClick={handleRearm} disabled={busy}>
              {busy ? <T en="Setting…" bn="চালু হচ্ছে…" /> : <T en="Set again" bn="আবার চালু করুন" />}
            </Button>
            <Button type="button" variant="danger" size="sm" onClick={handleRemove} disabled={busy}>
              <T en="Remove" bn="সরান" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

export default function AlertsClient() {
  const { isLoggedIn, isLoading } = useAuth();
  const { lang } = useLang();
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

  const alertLimit = usePremium().limits.alerts;
  const active = alerts.filter((a) => a.is_active);
  const triggered = alerts.filter((a) => !a.is_active);

  if (isLoading) {
    return (
      <Card padding="md" aria-busy="true" aria-label={lang === "bn" ? "অ্যালার্ট লোড হচ্ছে" : "Loading alerts"}>
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
        <h2>
          <T en="Sign in to set price alerts" bn="প্রাইস অ্যালার্ট দিতে সাইন ইন করুন" />
        </h2>
        <p>
          <T
            en="Choose a target price on any share, and we will tell you on the day it is reached, by notification and in your alerts bell."
            bn="যেকোনো শেয়ারে একটি দাম ঠিক করে দিন। দাম সেখানে পৌঁছালে সেদিনই নোটিফিকেশন আর অ্যালার্ট বেলে জানাব।"
          />
        </p>
        <div className="mt-4 flex gap-2 justify-center">
          <Button href="/login?next=%2Falerts" variant="primary" size="sm">
            <T en="Sign in" bn="সাইন ইন" />
          </Button>
          <Button href="/register?next=%2Falerts" variant="quiet" size="sm">
            <T en="Create an account" bn="অ্যাকাউন্ট খুলুন" />
          </Button>
        </div>
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <EmptyState
        title={<T en="No price alerts yet" bn="এখনো কোনো প্রাইস অ্যালার্ট নেই" />}
        message={
          <T
            en="Open any share and tap the Alert button to set a target price. We will watch it and tell you on the day it is reached."
            bn="যেকোনো শেয়ারের পেজে গিয়ে অ্যালার্ট বোতামে চাপ দিয়ে একটি দাম ঠিক করে দিন। দাম সেখানে পৌঁছালে সেদিনই জানাব।"
          />
        }
        actions={[
          { href: "/dsestockranking", label: <T en="See the top-ranked shares" bn="শীর্ষ র‍্যাঙ্কের শেয়ার দেখুন" /> },
          { href: "/stocks", label: <T en="Browse all shares" bn="সব শেয়ার দেখুন" /> },
        ]}
      />
    );
  }

  return (
    <>
      {active.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-2 text-xs font-bold   text-text-muted">
            <T
              en={`Active (${active.length}${alertLimit !== null ? ` of ${alertLimit}` : ""})`}
              bn={`চালু (${alertLimit !== null ? `${alertLimit}টির মধ্যে ` : ""}${active.length}টি)`}
            />
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
          <h2 className="mb-2 text-xs font-bold   text-text-muted">
            <T en="Recently reached" bn="সম্প্রতি পৌঁছেছে" />
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
