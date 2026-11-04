"use client";

import type { AdminAnalyticsResponse, AdminGroupUsage, ScoreItem } from "@/lib/api";
import { money } from "@/lib/formatters";
import GrowthChart from "./GrowthChart";
import UsageBlock, { sourceLabel } from "./UsageBlock";
import { BarList, FunnelBars, HoursHeatmap, MetricRow, Panel, StockBarList } from "./widgets";
import { COLORS, GROUP_COLOR, SEGMENT_META, SEGMENT_ORDER, Section, dec, mins, n, pctOf, times } from "./shared";

/* ------------------------------------------------------------------ *
 * Who they are: accounts by plan, and how many of each came lately.
 * ------------------------------------------------------------------ */
function PlanMix({ groups, windowDays }: { groups: NonNullable<AdminAnalyticsResponse["groups"]>; windowDays: number }) {
  const rows = [groups.paid, groups.gifted, groups.free];
  const total = rows.reduce((a, g) => a + g.accounts, 0) || 1;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex h-4 overflow-hidden rounded-full bg-surface-2">
        {rows.map((g) =>
          g.accounts ? (
            <div key={g.key} title={`${g.label}: ${n(g.accounts)}`} style={{ width: `${(g.accounts / total) * 100}%`, background: GROUP_COLOR[g.key] }} />
          ) : null,
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {rows.map((g) => (
          <div key={g.key} className="flex items-start gap-2">
            <span className="mt-1 h-3 w-3 shrink-0 rounded-sm" style={{ background: GROUP_COLOR[g.key] }} aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-sm text-text-main">
                <span className="font-bold tabular-nums">{n(g.accounts)}</span> {g.label.toLowerCase()}
                <span className="ml-1 text-xs text-text-muted">{pctOf(g.accounts, total)}%</span>
              </p>
              <p className="text-xs text-text-muted">
                {n(g.active.window)} active in {windowDays} days ({dec(g.active.window_pct)}%) · {n(g.active.today)} today
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Paying vs free month vs free, metric by metric.
 * ------------------------------------------------------------------ */
type Row = { label: string; hint?: string; get: (g: AdminGroupUsage) => number; fmt: (v: number) => string; ratio?: boolean };

const setupPct = (key: string) => (g: AdminGroupUsage) => g.setup.find((r) => r.key === key)?.pct_active ?? 0;
const pctFmt = (v: number) => `${dec(v)}%`;

const COMPARE: { title: string; rows: Row[] }[] = [
  {
    title: "How many",
    rows: [
      { label: "Accounts", get: (g) => g.accounts, fmt: n },
      { label: "Active in the window", get: (g) => g.active.window, fmt: n },
      { label: "Share active in the window", get: (g) => g.active.window_pct, fmt: pctFmt },
      { label: "Active today", get: (g) => g.active.today, fmt: n },
    ],
  },
  {
    title: "How much (median active reader)",
    rows: [
      { label: "Days they come", get: (g) => g.usage.days.median, fmt: dec, ratio: true },
      { label: "Visits", get: (g) => g.usage.visits.median, fmt: dec, ratio: true },
      { label: "Pages opened", get: (g) => g.usage.views.median, fmt: n, ratio: true },
      { label: "Time on the site", hint: "Estimate: first to last page of each visit.", get: (g) => g.usage.minutes.median, fmt: mins, ratio: true },
      { label: "Pages a visit", get: (g) => g.usage.visit_pages.median, fmt: dec, ratio: true },
      { label: "Minutes a visit", get: (g) => g.usage.visit_minutes.median, fmt: mins, ratio: true },
      { label: "On an average day", hint: "Share of the window's active readers who come on a given day.", get: (g) => g.stickiness, fmt: pctFmt, ratio: true },
    ],
  },
  {
    title: "What they have set up (% of active readers)",
    rows: [
      { label: "Has a portfolio", get: setupPct("portfolio"), fmt: pctFmt, ratio: true },
      { label: "Follows shares", get: setupPct("watchlist"), fmt: pctFmt, ratio: true },
      { label: "Push on a device", get: setupPct("push"), fmt: pctFmt, ratio: true },
      { label: "Installed the app", get: setupPct("installed"), fmt: pctFmt, ratio: true },
      { label: "Price alert on", get: setupPct("alerts"), fmt: pctFmt, ratio: true },
      { label: "Asked TopStock AI in the window", get: setupPct("ai_window"), fmt: pctFmt, ratio: true },
    ],
  },
];

function CompareTable({ groups }: { groups: NonNullable<AdminAnalyticsResponse["groups"]> }) {
  const cols = [groups.paid, groups.gifted, groups.free];
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="py-2 pr-3 text-left text-xs font-semibold text-text-muted" scope="col">Metric</th>
            {cols.map((g) => (
              <th key={g.key} className="px-2 py-2 text-right text-xs font-semibold" scope="col" style={{ color: GROUP_COLOR[g.key] }}>
                {g.label}
              </th>
            ))}
            <th className="py-2 pl-2 text-right text-xs font-semibold text-text-muted" scope="col" title="Paying ÷ free">
              Paying vs free
            </th>
          </tr>
        </thead>
        {COMPARE.map((block) => (
          <tbody key={block.title}>
            <tr>
              <th colSpan={5} scope="colgroup" className="pb-1 pt-4 text-left text-xs font-bold text-text-main">
                {block.title}
              </th>
            </tr>
            {block.rows.map((r) => (
              <tr key={r.label} className="border-b border-border last:border-b-0">
                <th scope="row" className="py-2 pr-3 text-left font-normal text-text-main">
                  {r.label}
                  {r.hint && <span className="ml-1 cursor-help text-text-muted" title={r.hint}>ⓘ</span>}
                </th>
                {cols.map((g) => (
                  <td key={g.key} className="px-2 py-2 text-right font-semibold tabular-nums text-text-main">
                    {r.fmt(r.get(g))}
                  </td>
                ))}
                <td className="py-2 pl-2 text-right text-xs font-semibold tabular-nums text-text-muted">
                  {r.ratio ? times(r.get(groups.paid), r.get(groups.free)) : ""}
                </td>
              </tr>
            ))}
          </tbody>
        ))}
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Which parts of the site each group opens, side by side.
 * ------------------------------------------------------------------ */
function AreaCompare({ paid, free }: { paid: AdminGroupUsage; free: AdminGroupUsage }) {
  const keys = Array.from(new Set([...paid.areas, ...free.areas].map((a) => a.key)));
  const rows = keys
    .map((k) => {
      const p = paid.areas.find((a) => a.key === k);
      const f = free.areas.find((a) => a.key === k);
      return { key: k, label: p?.label ?? f?.label ?? k, p: p?.reach ?? 0, f: f?.reach ?? 0, pp: p?.per_user ?? 0, fp: f?.per_user ?? 0 };
    })
    .sort((a, b) => b.p + b.f - (a.p + a.f))
    .slice(0, 16);
  const bar = (v: number, color: string) => (
    <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
      <div className="h-full rounded-full" style={{ width: `${Math.min(100, v)}%`, background: color }} />
    </div>
  );
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-4 text-xs text-text-muted">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: GROUP_COLOR.paid }} />Paying</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: GROUP_COLOR.free }} />Free</span>
        <span>% of each group&apos;s active readers who opened it · pages each</span>
      </div>
      <ul className="flex flex-col gap-3">
        {rows.map((r) => (
          <li key={r.key}>
            <p className="mb-1 text-sm text-text-main">{r.label}</p>
            <div className="flex items-center gap-2">
              {bar(r.p, GROUP_COLOR.paid)}
              <span className="w-28 shrink-0 text-right text-xs tabular-nums text-text-muted">
                <span className="font-bold text-text-main">{dec(r.p)}%</span> · {dec(r.pp)}
              </span>
            </div>
            <div className="mt-1 flex items-center gap-2">
              {bar(r.f, GROUP_COLOR.free)}
              <span className="w-28 shrink-0 text-right text-xs tabular-nums text-text-muted">
                <span className="font-bold text-text-main">{dec(r.f)}%</span> · {dec(r.fp)}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SegmentBar({ segments, total }: { segments: AdminAnalyticsResponse["segments"]; total: number }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex h-4 overflow-hidden rounded-full bg-surface-2">
        {SEGMENT_ORDER.map((k) =>
          segments[k] ? (
            <div key={k} title={`${SEGMENT_META[k].label}: ${n(segments[k])}`} style={{ width: `${(segments[k] / (total || 1)) * 100}%`, background: SEGMENT_META[k].color }} />
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

export default function OverallTab({
  data,
  priceMap,
  windowDays,
}: {
  data: AdminAnalyticsResponse;
  priceMap: Map<string, ScoreItem>;
  windowDays: number;
}) {
  const h = data.headline;
  const total = h.total_users;
  const { d1, d7, d30 } = data.retention;
  const a = data.activation;
  const f = data.features;
  const groups = data.groups;
  const rev = data.premium?.revenue;

  return (
    <div className="flex flex-col gap-8">
      <Section title="The numbers">
        <MetricRow
          cols="grid-cols-2 lg:grid-cols-5"
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
              sub: `${dec(h.stickiness)}% of monthly users come daily`,
              hint: "Signed-in readers with a page view today (Dhaka day). Today ÷ last 30 days = stickiness.",
            },
            { label: "Active this week", value: n(h.wau), sub: `${pctOf(h.wau, total)}% of all users` },
            { label: "Active in 30 days", value: n(h.mau), sub: `${pctOf(h.mau, total)}% of all users` },
            {
              label: "Paying now",
              value: n(data.premium?.paid ?? 0),
              accent: COLORS.primary,
              sub: rev
                ? `${money(rev.month)} this month · ${money(rev.total)} in total · ${n(rev.buyers)} buyers`
                : `${n(data.premium?.active ?? 0)} Premium in all`,
            },
          ]}
        />
        <GrowthChart growth={data.growth} />
      </Section>

      {groups && (
        <>
          <Section title="Who they are" note="accounts by plan today">
            <Panel>
              <PlanMix groups={groups} windowDays={windowDays} />
            </Panel>
          </Section>

          <Section
            title="Premium vs free, side by side"
            note={`last ${windowDays} days`}
            lead="Every per-reader figure is over the readers of that group who visited in the window, so a group of mostly sleeping accounts doesn't drag it down."
          >
            <div className="grid gap-3 xl:grid-cols-5">
              <Panel title="Metric by metric" className="xl:col-span-3">
                <CompareTable groups={groups} />
              </Panel>
              <Panel title="What each group opens" className="xl:col-span-2">
                <AreaCompare paid={groups.paid} free={groups.free} />
              </Panel>
            </div>
          </Section>
        </>
      )}

      <Section title="Do they come back?">
        <MetricRow
          cols="grid-cols-3"
          metrics={[
            { label: "Next day", s: d1 },
            { label: "After a week", s: d7 },
            { label: "After a month", s: d30 },
          ].map(({ label, s }) => ({
            label,
            value: `${dec(s.pct)}%`,
            accent: s.pct >= 40 ? COLORS.positive : s.pct >= 20 ? COLORS.watch : COLORS.negative,
            sub: `${n(s.retained)} of ${n(s.eligible)} came back`,
            hint: "Share of users whose latest visit is at least this many days after the day they signed up.",
          }))}
        />
        <div className="grid gap-3 md:grid-cols-2">
          <Panel title="Where every account is today">
            <SegmentBar segments={data.segments} total={total} />
          </Panel>
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
            <div className="mt-4">
              <BarList
                color={COLORS.indigo}
                items={[
                  { key: "installed", label: "Installed the app", value: f.installed },
                  { key: "ai", label: "Asked TopStock AI", value: f.ai },
                  { key: "push", label: "Push on a device", value: f.push },
                  { key: "alerts", label: "Set a price alert", value: f.alerts },
                ]
                  .sort((x, y) => y.value - x.value)
                  .map((it) => ({ ...it, secondary: `${pctOf(it.value, total)}% of users` }))}
              />
            </div>
          </Panel>
        </div>
      </Section>

      {groups ? (
        <UsageBlock g={groups.all} windowDays={windowDays} color={GROUP_COLOR.all} priceMap={priceMap} who="everyone" />
      ) : (
        <Section title="What they do" note="last 30 days">
          <div className="grid gap-3 md:grid-cols-2">
            <Panel title="Pages they open" note="views">
              <BarList items={data.sections.map((s) => ({ key: s.category, label: s.category, value: s.views, secondary: `${n(s.users)} users` }))} />
            </Panel>
            <Panel title="When they're online" note="Dhaka time">
              <HoursHeatmap matrix={data.active_hours.matrix} max={data.active_hours.max} />
            </Panel>
          </div>
        </Section>
      )}

      <Section title="Stocks they keep">
        <div className="grid gap-3 md:grid-cols-2">
          <Panel title="Most followed" note="readers">
            <StockBarList priceMap={priceMap} color={COLORS.pink} items={data.stocks.watched.map((s) => ({ code: s.code, value: s.users }))} />
          </Panel>
          <Panel title="Most owned" note="readers">
            <StockBarList priceMap={priceMap} color={COLORS.orange} items={data.stocks.held.map((s) => ({ code: s.code, value: s.users }))} />
          </Panel>
        </div>
      </Section>

      <Section title="Where they come from">
        <div className="grid gap-3 md:grid-cols-2">
          <Panel title="How they signed up" note="users">
            <BarList
              color={COLORS.orange}
              items={[
                { key: "google", label: "Google", value: data.signup_source.google },
                { key: "password", label: "Email / phone", value: data.signup_source.password },
              ].map((it) => ({ ...it, secondary: `${pctOf(it.value, total)}% of users` }))}
            />
          </Panel>
          {!groups && (
            <Panel title="Taps from push & email" note="views">
              <BarList
                color={COLORS.indigo}
                emptyText="No tagged notification taps yet."
                items={data.notifications.map((s) => ({ key: s.src, label: sourceLabel(s.src), value: s.views, secondary: `${n(s.users)} users` }))}
              />
            </Panel>
          )}
        </div>
      </Section>
    </div>
  );
}
