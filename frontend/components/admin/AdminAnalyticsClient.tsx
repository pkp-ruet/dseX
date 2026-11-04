"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  apiGetAdminAnalytics,
  getScores,
  type AdminAnalyticsResponse,
  type AdminWindow,
  type ScoreItem,
  type ScoresResponse,
} from "@/lib/api";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import Chip from "@/components/ui/Chip";
import ErrorState from "@/components/ui/ErrorState";
import Skeleton from "@/components/ui/Skeleton";
import Tabs from "@/components/ui/Tabs";
import OverallTab from "./analytics/OverallTab";
import PremiumTab from "./analytics/PremiumTab";
import FreeTab from "./analytics/FreeTab";
import { n } from "./analytics/shared";

const ADMIN_LINKS = [
  { href: "/admin/payments", label: "Payments" },
  { href: "/admin/scores", label: "Score Adjustments" },
  { href: "/admin/daily-pick", label: "Today's Top Stock" },
  { href: "/admin/tips", label: "Edit Tips" },
  { href: "/admin/feedback", label: "Feedback" },
  { href: "/admin/campaigns", label: "Email Campaigns" },
];

type TabKey = "overall" | "premium" | "free";
const TAB_KEYS: TabKey[] = ["overall", "premium", "free"];
const WINDOWS: AdminWindow[] = [7, 30, 90];

function flatten(scores: ScoresResponse | null): Map<string, ScoreItem> {
  if (!scores) return new Map();
  const all = Object.values(scores.tiers).flat();
  return new Map(all.map((s) => [s.trading_code.toUpperCase(), s]));
}

function Loading() {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} height={96} rounded="var(--radius-md)" />)}
      </div>
      <Skeleton height={288} rounded="var(--radius-md)" />
      <Skeleton height={192} rounded="var(--radius-md)" />
    </div>
  );
}

export default function AdminAnalyticsClient() {
  const router = useRouter();
  const { isLoading, isLoggedIn, isAdmin } = useAuth();

  const [data, setData] = useState<AdminAnalyticsResponse | null>(null);
  const [priceMap, setPriceMap] = useState<Map<string, ScoreItem>>(new Map());
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [days, setDays] = useState<AdminWindow>(30);
  const [tab, setTab] = useState<TabKey>("overall");

  useEffect(() => {
    if (isLoading) return;
    if (!isLoggedIn) { router.replace("/login"); return; }
    if (!isAdmin) { router.replace("/"); return; }
  }, [isLoading, isLoggedIn, isAdmin, router]);

  // The tab lives in the hash, so a reload or a shared link opens the same one.
  useEffect(() => {
    const h = window.location.hash.slice(1) as TabKey;
    if (TAB_KEYS.includes(h)) setTab(h);
  }, []);
  const pickTab = (k: TabKey) => {
    setTab(k);
    try { window.history.replaceState(null, "", `#${k}`); } catch { /* ignore */ }
  };

  const load = useCallback((w: AdminWindow, fresh = false) => {
    setBusy(true);
    setFailed(false);
    apiGetAdminAnalytics(w, fresh)
      .then(setData)
      .catch(() => setFailed(true))
      .finally(() => setBusy(false));
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    load(days);
  }, [isAdmin, days, load]);

  useEffect(() => {
    if (!isAdmin) return;
    getScores().then((s) => setPriceMap(flatten(s))).catch(() => {});
  }, [isAdmin]);

  if (isLoading || !isAdmin) {
    return <Loading />;
  }

  const updated = data
    ? new Date(data.generated_at).toLocaleTimeString("en-GB", {
        timeZone: "Asia/Dhaka", hour: "2-digit", minute: "2-digit", hour12: false,
      })
    : null;
  const windowDays = data?.window_days ?? days;
  const plans = data?.plans;

  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title="User analytics"
        lead={
          updated
            ? `Updated ${updated} Dhaka time. Behaviour covers signed-in readers only${
                data?.admins_left_out ? `; ${data.admins_left_out} admin account${data.admins_left_out > 1 ? "s" : ""} left out` : "; admins left out"
              }.`
            : undefined
        }
      />

      <nav aria-label="Admin pages" className="mb-6 flex flex-wrap gap-2">
        {ADMIN_LINKS.map((l) => (
          <Button key={l.href} href={l.href} variant="quiet" size="sm">{l.label}</Button>
        ))}
      </nav>

      <div className="z-20 -mx-4 mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-bg px-4 py-3 sm:-mx-6 sm:px-6 md:sticky md:top-14">
        <Tabs
          ariaLabel="Who to look at"
          idBase="an-tab"
          value={tab}
          onChange={pickTab}
          tabs={[
            { key: "overall", label: "Overall" },
            { key: "premium", label: plans ? `Premium · ${n(plans.paid + plans.gifted)}` : "Premium" },
            { key: "free", label: plans ? `Free · ${n(plans.free)}` : "Free" },
          ]}
        />
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-text-muted">Last</span>
          {WINDOWS.map((w) => (
            <Chip key={w} active={days === w} onClick={() => setDays(w)}>{w} days</Chip>
          ))}
          <Button variant="quiet" size="sm" onClick={() => load(days, true)} disabled={busy}>
            {busy ? "Loading…" : "Refresh"}
          </Button>
        </div>
      </div>

      {failed && !data && (
        <ErrorState title="Couldn't load analytics" size="inline" onRetry={() => load(days)} />
      )}
      {!data && !failed && <Loading />}

      {data && (
        <div
          role="tabpanel"
          aria-labelledby={`an-tab-${tab}`}
          aria-busy={busy}
          className={busy ? "opacity-60 transition-opacity" : "transition-opacity"}
        >
          {tab === "overall" && <OverallTab data={data} priceMap={priceMap} windowDays={windowDays} />}
          {tab === "premium" && <PremiumTab data={data} priceMap={priceMap} windowDays={windowDays} />}
          {tab === "free" && <FreeTab data={data} priceMap={priceMap} windowDays={windowDays} />}
        </div>
      )}
    </>
  );
}
