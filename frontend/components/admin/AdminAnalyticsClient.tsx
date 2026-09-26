"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  apiGetAdminAnalytics,
  getScores,
  type AdminAnalyticsResponse,
  type ScoreItem,
  type ScoresResponse,
} from "@/lib/api";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import ErrorState from "@/components/ui/ErrorState";
import Skeleton from "@/components/ui/Skeleton";
import GrowthChart from "./analytics/GrowthChart";
import { BarList, FunnelBars, HoursHeatmap, MetricRow, Panel, StockBarList } from "./analytics/widgets";
import { COLORS, SEGMENT_META, SEGMENT_ORDER } from "./analytics/shared";

const ADMIN_LINKS = [
  { href: "/admin/scores", label: "Score Adjustments" },
  { href: "/admin/daily-pick", label: "Today's Top Stock" },
  { href: "/admin/tips", label: "Edit Tips" },
  { href: "/admin/feedback", label: "Feedback" },
  { href: "/admin/campaigns", label: "Email Campaigns" },
];

function flatten(scores: ScoresResponse | null): Map<string, ScoreItem> {
  if (!scores) return new Map();
  const all = Object.values(scores.tiers).flat();
  return new Map(all.map((s) => [s.trading_code.toUpperCase(), s]));
}

const n = (v: number) => v.toLocaleString();
const pctOf = (part: number, whole: number) => (whole ? Math.round((part / whole) * 100) : 0);

function Section({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-base font-bold text-text-main">{title}</h2>
        {note && <span className="text-xs text-text-muted">{note}</span>}
      </div>
      {children}
    </section>
  );
}

/** One stacked bar of where every account sits today + a legend with counts. */
function SegmentBar({ segments, total }: { segments: AdminAnalyticsResponse["segments"]; total: number }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex h-4 rounded-full overflow-hidden bg-surface-2">
        {SEGMENT_ORDER.map((k) =>
          segments[k] ? (
            <div
              key={k}
              title={`${SEGMENT_META[k].label}: ${n(segments[k])}`}
              style={{ width: `${(segments[k] / (total || 1)) * 100}%`, background: SEGMENT_META[k].color }}
            />
          ) : null,
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {SEGMENT_ORDER.map((k) => (
          <div key={k} className="flex items-start gap-2">
            <span className="mt-1 h-3 w-3 shrink-0 rounded-sm" style={{ background: SEGMENT_META[k].color }} />
            <div className="min-w-0">
              <p className="text-sm text-text-main">
                <span className="font-bold tabular-nums">{n(segments[k])}</span> {SEGMENT_META[k].label}
                <span className="ml-1 text-xs text-text-muted">{pctOf(segments[k], total)}%</span>
              </p>
              <p className="text-xs text-text-muted">{SEGMENT_META[k].blurb}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Loading() {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
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
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (isLoading) return;
    if (!isLoggedIn) { router.replace("/login"); return; }
    if (!isAdmin) { router.replace("/"); return; }
  }, [isLoading, isLoggedIn, isAdmin, router]);

  useEffect(() => {
    if (!isAdmin) return;
    setFailed(false);
    apiGetAdminAnalytics().then(setData).catch(() => setFailed(true));
  }, [isAdmin, attempt]);

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

  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title="User analytics"
        bn="ব্যবহারকারীরা কারা, কতজন ফিরে আসে, কী দেখে"
        lead={updated ? `Updated ${updated} Dhaka time. Behaviour panels cover the last 30 days.` : undefined}
      />

      <nav aria-label="Admin pages" className="flex flex-wrap gap-2 mb-6">
        {ADMIN_LINKS.map((l) => (
          <Button key={l.href} href={l.href} variant="quiet" size="sm">{l.label}</Button>
        ))}
      </nav>

      {failed && !data && (
        <ErrorState title="Couldn't load analytics" size="inline" onRetry={() => setAttempt((a) => a + 1)} />
      )}
      {!data && !failed && <Loading />}

      {data && <Dashboard data={data} priceMap={priceMap} />}
    </>
  );
}

function Dashboard({ data, priceMap }: { data: AdminAnalyticsResponse; priceMap: Map<string, ScoreItem> }) {
  const h = data.headline;
  const total = h.total_users;
  const { d1, d7, d30 } = data.retention;
  const a = data.activation;
  const f = data.features;

  return (
    <div className="flex flex-col gap-8">
      <Section title="The numbers">
        <MetricRow
          metrics={[
            {
              label: "Total users",
              value: n(total),
              sub: `+${n(h.new_today)} today · +${n(h.new_7d)} this week · +${n(h.new_30d)} in 30 days`,
            },
            {
              label: "Active today",
              value: n(h.dau),
              accent: COLORS.positive,
              sub: `${h.stickiness}% of monthly users come daily`,
              hint: "Distinct signed-in users with a page view today (Dhaka day). DAU / MAU = stickiness.",
            },
            {
              label: "Active this week",
              value: n(h.wau),
              sub: `${pctOf(h.wau, total)}% of all users`,
            },
            {
              label: "Active this month",
              value: n(h.mau),
              sub: `${pctOf(h.mau, total)}% of all users`,
            },
          ]}
        />
        <GrowthChart growth={data.growth} />
      </Section>

      <Section title="Do they come back?">
        <MetricRow
          cols="grid-cols-3"
          metrics={[
            { key: "d1", label: "Next day", s: d1 },
            { key: "d7", label: "After a week", s: d7 },
            { key: "d30", label: "After a month", s: d30 },
          ].map(({ label, s }) => ({
            label,
            value: `${s.pct}%`,
            accent: s.pct >= 40 ? COLORS.positive : s.pct >= 20 ? COLORS.watch : COLORS.negative,
            sub: `${n(s.retained)} of ${n(s.eligible)} came back`,
            hint: "Share of users whose latest visit is at least this many days after the day they signed up.",
          }))}
        />
        <Panel title="Where every account is today">
          <SegmentBar segments={data.segments} total={total} />
        </Panel>
      </Section>

      <Section title="How far they get">
        <div className="grid gap-3 md:grid-cols-2">
          <Panel title="From sign-up to real use" note="% of all users">
            <FunnelBars
              steps={[
                { label: "Signed up", count: a.signed_up, color: COLORS.muted },
                { label: "Came back another day", count: a.returned, color: COLORS.indigo },
                { label: "Followed a stock", count: a.built_watchlist, color: COLORS.primary },
                { label: "Added a holding", count: a.added_portfolio, color: COLORS.orange },
                {
                  label: "Uses a power feature",
                  count: a.power_feature,
                  color: COLORS.positive,
                  hint: "Push on, app installed, price alert set, or asked TopStock AI.",
                },
              ]}
            />
          </Panel>
          <Panel title="Power features" note="users">
            <BarList
              color={COLORS.indigo}
              items={[
                { key: "installed", label: "Installed the app", value: f.installed },
                { key: "ai", label: "Asked TopStock AI", value: f.ai },
                { key: "push", label: "Push notifications on", value: f.push },
                { key: "alerts", label: "Set a price alert", value: f.alerts },
              ]
                .sort((x, y) => y.value - x.value)
                .map((it) => ({ ...it, secondary: `${pctOf(it.value, total)}% of users` }))}
            />
          </Panel>
        </div>
      </Section>

      <Section title="What they do" note="last 30 days">
        <div className="grid gap-3 md:grid-cols-2">
          <Panel title="Pages they open" note="views">
            <BarList
              items={data.sections.map((s) => ({
                key: s.category,
                label: s.category,
                value: s.views,
                secondary: `${n(s.users)} users`,
              }))}
            />
          </Panel>
          <Panel title="When they're online" note="Dhaka time">
            <HoursHeatmap matrix={data.active_hours.matrix} max={data.active_hours.max} />
          </Panel>
        </div>
      </Section>

      <Section title="Stocks they care about">
        <div className="grid gap-3 md:grid-cols-3">
          <Panel title="Most opened" note="30 days, views">
            <StockBarList
              priceMap={priceMap}
              items={data.stocks.viewed.map((s) => ({
                code: s.code,
                value: s.views ?? 0,
                secondary: `${n(s.users)} users`,
              }))}
            />
          </Panel>
          <Panel title="Most followed" note="users">
            <StockBarList
              priceMap={priceMap}
              color={COLORS.pink}
              items={data.stocks.watched.map((s) => ({ code: s.code, value: s.users }))}
            />
          </Panel>
          <Panel title="Most owned" note="users">
            <StockBarList
              priceMap={priceMap}
              color={COLORS.orange}
              items={data.stocks.held.map((s) => ({ code: s.code, value: s.users }))}
            />
          </Panel>
        </div>
      </Section>

      <Section title="Where they come from">
        <div className="grid gap-3 md:grid-cols-2">
          <Panel title="Taps from push & email" note="30 days, views">
            <BarList
              color={COLORS.indigo}
              emptyText="No tagged notification taps yet."
              items={data.notifications.map((s) => ({
                key: s.src,
                label: s.src,
                value: s.views,
                secondary: `${n(s.users)} users`,
              }))}
            />
          </Panel>
          <Panel title="How they signed up" note="users">
            <BarList
              color={COLORS.orange}
              items={[
                { key: "google", label: "Google", value: data.signup_source.google },
                { key: "password", label: "Email / phone", value: data.signup_source.password },
              ].map((it) => ({ ...it, secondary: `${pctOf(it.value, total)}% of users` }))}
            />
          </Panel>
        </div>
      </Section>
    </div>
  );
}
