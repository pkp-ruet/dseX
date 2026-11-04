"use client";

import type { AdminGroupUsage, ScoreItem } from "@/lib/api";
import ActivityChart from "./ActivityChart";
import { BarList, HoursHeatmap, MetricRow, Panel, StockBarList } from "./widgets";
import { Section, dec, mins, n, pctOf } from "./shared";

/** Units for the "median among those who have it" line on the setup list. */
const SETUP_UNIT: Record<string, string> = {
  watchlist: "shares followed",
  portfolio: "holdings",
  alerts: "alerts on",
  screens: "screens",
  reminders: "reminders",
};

/** A tagged deep link's `?src=` in words. */
export const SOURCE_WORDS: Record<string, string> = {
  "push-digest": "Daily digest push",
  "push-alert": "Price alert push",
  watch: "Premium watcher push",
  "watch-teaser": "Free teaser push",
  free: "Free-reader push",
  "offer-banner": "৳99 offer banner",
  limit: "Limit popup",
  brief: "Morning brief",
  letter: "Friday letter",
};

export const sourceLabel = (src: string) => SOURCE_WORDS[src] ?? src;

/** How often active readers came: one stacked bar + a row per bucket. */
function Intensity({ rows, total, color }: { rows: AdminGroupUsage["intensity"]; total: number; color: string }) {
  const shades = [22, 38, 56, 74, 92];
  const shade = (i: number) => `color-mix(in srgb, ${color} ${shades[i] ?? 92}%, var(--surface))`;
  if (!total) return <p className="py-6 text-center text-xs text-text-muted">Nobody active in this window.</p>;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex h-4 overflow-hidden rounded-full bg-surface-2">
        {rows.map((r, i) =>
          r.users ? (
            <div key={r.label} title={`${r.label}: ${n(r.users)}`} style={{ width: `${(r.users / total) * 100}%`, background: shade(i) }} />
          ) : null,
        )}
      </div>
      <ul className="flex flex-col gap-1.5">
        {rows.map((r, i) => (
          <li key={r.label} className="flex items-center gap-2 text-sm">
            <span className="h-3 w-3 shrink-0 rounded-sm" style={{ background: shade(i) }} aria-hidden="true" />
            <span className="min-w-0 flex-1 text-text-main">{r.label}</span>
            <span className="font-bold tabular-nums text-text-main">{n(r.users)}</span>
            <span className="w-10 text-right text-xs tabular-nums text-text-muted">{pctOf(r.users, total)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** What the group has switched on, as a share of its active readers. */
function SetupList({ g, color }: { g: AdminGroupUsage; color: string }) {
  const used = g.setup.filter((r) => r.users > 0).sort((a, b) => b.pct_active - a.pct_active);
  const unused = g.setup.filter((r) => r.users === 0);
  return (
    <div className="flex flex-col gap-3">
      <BarList
        color={color}
        max={100}
        format={(v) => `${dec(v)}%`}
        items={used.map((r) => ({
          key: r.key,
          label: r.label,
          value: r.pct_active,
          secondary: [
            `${n(r.active_users)} active readers`,
            `${n(r.users)} of all ${n(g.accounts)} accounts (${dec(r.pct)}%)`,
            r.median != null && SETUP_UNIT[r.key] ? `median ${dec(r.median)} ${SETUP_UNIT[r.key]}` : null,
          ]
            .filter(Boolean)
            .join(" · "),
        }))}
      />
      {unused.length > 0 && (
        <p className="text-xs text-text-muted">Nobody yet: {unused.map((r) => r.label.toLowerCase()).join(", ")}.</p>
      )}
    </div>
  );
}

function Notified({ g, color }: { g: AdminGroupUsage; color: string }) {
  const s = g.notified;
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-2xl font-bold tabular-nums text-text-main">{n(s.push_sent)}</p>
          <p className="text-xs text-text-muted">
            pushes to {n(s.push_users)} readers{s.push_failed ? ` · ${n(s.push_failed)} failed` : ""}
          </p>
        </div>
        <div>
          <p className="text-2xl font-bold tabular-nums text-text-main">{n(s.email_sent)}</p>
          <p className="text-xs text-text-muted">emails to {n(s.email_users)} readers</p>
        </div>
      </div>
      <BarList
        color={color}
        emptyText="No pushes in this window."
        items={s.kinds.slice(0, 8).map((k) => ({
          key: k.kind,
          label: k.label,
          value: k.sent,
          secondary: `${n(k.users)} readers`,
        }))}
      />
      <div>
        <h4 className="mb-2 text-xs font-semibold text-text-muted">Taps that brought them back</h4>
        <BarList
          color={color}
          emptyText="No tagged taps in this window."
          items={g.sources.map((s2) => ({
            key: s2.src,
            label: sourceLabel(s2.src),
            value: s2.views,
            secondary: `${n(s2.users)} readers`,
          }))}
        />
      </div>
    </div>
  );
}

/**
 * The same two sections for any group (everyone, Premium, free), so the tabs
 * mirror each other: how much they use the site, then what they use. Every
 * per-reader figure is over the group's readers active in the window.
 */
export default function UsageBlock({
  g,
  windowDays,
  color,
  priceMap,
  who,
}: {
  g: AdminGroupUsage;
  windowDays: number;
  color: string;
  priceMap: Map<string, ScoreItem>;
  /** "paying readers", "free readers" … for the headings. */
  who: string;
}) {
  const u = g.usage;
  return (
    <>
      <Section
        title={`How much ${who} use it`}
        note={`Last ${windowDays} days · per reader active in that time`}
      >
        <MetricRow
          cols="grid-cols-2 md:grid-cols-3 xl:grid-cols-6"
          metrics={[
            {
              label: "Active readers",
              value: n(g.active.window),
              accent: color,
              sub: `${dec(g.active.window_pct)}% of ${n(g.accounts)} · ${n(g.active.today)} today · ${n(g.active.d7)} this week`,
            },
            {
              label: "Days they come",
              value: dec(u.days.median),
              sub: `median of ${windowDays} · average ${dec(u.days.mean)}`,
            },
            {
              label: "Visits",
              value: dec(u.visits.median),
              sub: `median · average ${dec(u.visits.mean)}`,
              hint: "A visit ends after 30 minutes with no new page.",
            },
            {
              label: "Time on the site",
              value: mins(u.minutes.median),
              sub: `median · average ${mins(u.minutes.mean)}`,
              hint: "An estimate: each visit runs from its first page to its last, and a one-page visit counts as one minute.",
            },
            {
              label: "Pages they open",
              value: n(u.views.median),
              sub: `median · ${dec(u.visit_pages.median)} a visit, ${mins(u.visit_minutes.median)} a visit`,
            },
            {
              label: "On an average day",
              value: `${dec(g.stickiness)}%`,
              sub: "of them come to the site",
              hint: "Average active readers a day ÷ readers active in the window. Higher = a daily habit.",
            },
          ]}
        />
        <div className="grid gap-3 lg:grid-cols-5">
          <Panel title="Active readers each day" note="Dhaka days" className="lg:col-span-3">
            <ActivityChart daily={g.daily} color={color} />
          </Panel>
          <Panel title="How often they came" note={`days active of ${windowDays}`} className="lg:col-span-2">
            <Intensity rows={g.intensity} total={g.active.window} color={color} />
          </Panel>
        </div>
      </Section>

      <Section title={`What ${who} use`} note={`Last ${windowDays} days`}>
        <div className="grid gap-3 lg:grid-cols-2">
          <Panel title="Parts of the site they open" note="% of active readers">
            <BarList
              color={color}
              max={100}
              format={(v) => `${dec(v)}%`}
              items={g.areas.map((a) => ({
                key: a.key,
                label: a.label,
                value: a.reach,
                secondary: `${n(a.users)} readers · ${dec(a.per_user)} pages each · ${n(a.views)} in all`,
              }))}
            />
          </Panel>
          <Panel title="What they have set up" note="% of active readers">
            <SetupList g={g} color={color} />
          </Panel>
        </div>
        <div className="grid gap-3 lg:grid-cols-3">
          <Panel title="Pages they open most" note="page views">
            <BarList
              color={color}
              items={g.pages.map((p) => ({
                key: p.path,
                label: <span className="font-mono text-xs">{p.path}</span>,
                value: p.views,
                secondary: `${n(p.users)} readers`,
              }))}
            />
          </Panel>
          <Panel title="Stocks they open most" note="page views">
            <StockBarList
              priceMap={priceMap}
              color={color}
              items={g.stocks.map((s) => ({ code: s.code, value: s.views ?? 0, secondary: `${n(s.users)} readers` }))}
            />
          </Panel>
          <Panel title="Notifications they got" note={`last ${windowDays} days`}>
            <Notified g={g} color={color} />
          </Panel>
        </div>
        <Panel title="When they're online" note="page views, Dhaka time">
          <HoursHeatmap matrix={g.hours.matrix} max={g.hours.max} color={color} />
        </Panel>
      </Section>
    </>
  );
}
