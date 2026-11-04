"use client";

import { useState } from "react";
import type { AdminAnalyticsResponse, AdminGroupKey, AdminRenewalWeek, ScoreItem } from "@/lib/api";
import Chip from "@/components/ui/Chip";
import { money } from "@/lib/formatters";
import PeopleList from "./PeopleList";
import UsageBlock, { sourceLabel } from "./UsageBlock";
import { BarList, MetricRow, Panel } from "./widgets";
import { COLORS, GROUP_COLOR, Section, dec, n, pctOf, shortDate } from "./shared";

type PremiumKey = Extract<AdminGroupKey, "paid" | "gifted" | "premium">;

const WHO: Record<PremiumKey, string> = {
  paid: "paying readers",
  gifted: "free-month readers",
  premium: "Premium readers",
};

/** Next 8 weeks of Premium end dates, one row a week. */
function Renewals({ weeks }: { weeks: AdminRenewalWeek[] }) {
  const max = Math.max(1, ...weeks.map((w) => w.paid + w.gifted));
  if (!weeks.some((w) => w.paid || w.gifted)) {
    return <p className="py-6 text-center text-xs text-text-muted">No Premium ends in the next 8 weeks.</p>;
  }
  return (
    <ul className="flex flex-col gap-3">
      {weeks.map((w) => (
        <li key={w.start} className="grid grid-cols-12 items-center gap-2">
          <span className="col-span-3 text-sm text-text-main sm:col-span-2">
            {shortDate(w.start)}–{shortDate(w.end)}
          </span>
          <div className="col-span-9 flex flex-col gap-1 sm:col-span-10">
            <div className="flex h-3 overflow-hidden rounded-full bg-surface-2">
              {w.paid > 0 && <div style={{ width: `${(w.paid / max) * 100}%`, background: GROUP_COLOR.paid }} title={`${w.paid} paid plans`} />}
              {w.gifted > 0 && <div style={{ width: `${(w.gifted / max) * 100}%`, background: GROUP_COLOR.gifted }} title={`${w.gifted} free months`} />}
            </div>
            <p className="text-xs text-text-muted">
              {w.paid || w.gifted ? (
                <>
                  {w.paid > 0 && (
                    <>
                      <span className="font-semibold text-text-main">{n(w.paid)} paid</span>
                      {` · ${n(w.paid_active7)} seen this week · ${n(w.paid_push)} with push`}
                    </>
                  )}
                  {w.paid > 0 && w.gifted > 0 && " · "}
                  {w.gifted > 0 && <span className="font-semibold text-text-main">{n(w.gifted)} free month</span>}
                </>
              ) : (
                "None"
              )}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function PremiumTab({
  data,
  priceMap,
  windowDays,
}: {
  data: AdminAnalyticsResponse;
  priceMap: Map<string, ScoreItem>;
  windowDays: number;
}) {
  const [key, setKey] = useState<PremiumKey>("paid");
  const groups = data.groups;
  const p = data.premium;
  const rev = p?.revenue;
  const conv = p?.conversion;
  if (!groups || !p) {
    return <p className="text-sm text-text-muted">Deploy the backend to see Premium behaviour.</p>;
  }
  const g = groups[key];
  const members = (p.members ?? []).filter((m) => key === "premium" || m.plan === key);
  const paid = groups.paid;
  const free = groups.free;

  return (
    <div className="flex flex-col gap-8">
      {rev && (
        <Section title="Money" note="accepted payments, incl. ৳0 grants made by hand">
          <MetricRow
            cols="grid-cols-2 lg:grid-cols-4"
            metrics={[
              {
                label: "Taken in total",
                value: money(rev.total),
                accent: COLORS.primary,
                sub: `${n(rev.payments)} payments from ${n(rev.buyers)} buyers`,
              },
              {
                label: "This month",
                value: money(rev.month),
                sub: `of ${money(rev.total)} in total · ${n(rev.month_payments)} payments · last ${windowDays} days ${money(rev.window)}`,
              },
              {
                label: "Paying now",
                value: n(p.paid ?? 0),
                sub: `+ ${n(p.on_trial)} on the old free month · ${n(p.granted)} given`,
                hint: "Premium end date still ahead. Paying = bought a plan; the old free month ended for new readers on 2026-10-25.",
              },
              {
                label: "Bought again",
                value: n(rev.repeat_buyers),
                sub: `${n(p.lapsed_30d ?? 0)} paid plans ended in the last 30 days · ${n(rev.pending)} to check · ${n(rev.revoked)} revoked`,
                hint: "Buyers with two or more accepted payments. There is no auto-renewal.",
              },
            ]}
          />
          <div className="grid gap-3 md:grid-cols-2">
            <Panel title="By plan" note="taka">
              <BarList
                format={(v) => money(v)}
                items={rev.by_plan.map((r) => ({ key: r.key, label: r.label, value: r.amount, secondary: `${n(r.payments)} payments` }))}
              />
            </Panel>
            <Panel title="By how they paid" note="taka">
              <BarList
                color={COLORS.pink}
                format={(v) => money(v)}
                items={rev.by_method.map((r) => ({ key: r.key, label: r.label, value: r.amount, secondary: `${n(r.payments)} payments` }))}
              />
            </Panel>
          </div>
        </Section>
      )}

      {p.renewals && (
        <Section
          title="When Premium ends"
          note="next 8 weeks"
          lead="No plan renews by itself: every paid plan below has to be bought again. Seen this week and push on are the readers you can still reach easily."
        >
          <Panel>
            <Renewals weeks={p.renewals} />
          </Panel>
        </Section>
      )}

      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold text-text-main">Behaviour of</p>
        <div className="flex flex-wrap gap-2">
          {(["paid", "gifted", "premium"] as PremiumKey[]).map((k) => (
            <Chip key={k} active={key === k} onClick={() => setKey(k)}>
              {groups[k].label} <span className="tabular-nums">{n(groups[k].accounts)}</span>
            </Chip>
          ))}
        </div>
        {key !== "premium" && free.active.window > 0 && (
          <p className="text-sm text-text-muted">
            Against free readers:{" "}
            <span className="font-semibold text-text-main">
              {dec(groups[key].usage.days.median)} vs {dec(free.usage.days.median)} days
            </span>{" "}
            a reader,{" "}
            <span className="font-semibold text-text-main">
              {n(groups[key].usage.views.median)} vs {n(free.usage.views.median)} pages
            </span>
            , {dec(groups[key].stickiness)}% vs {dec(free.stickiness)}% on an average day.
          </p>
        )}
      </div>

      <UsageBlock g={g} windowDays={windowDays} color={GROUP_COLOR[key]} priceMap={priceMap} who={WHO[key]} />

      {conv && (
        <Section title="How they became Premium" note={`${n(conv.payers)} buyers`}>
          <div className="grid gap-3 md:grid-cols-2">
            <Panel title="Time from sign-up to first payment" note="buyers">
              <BarList
                items={conv.signup_to_pay.map((r) => ({
                  key: r.label,
                  label: r.label,
                  value: r.users,
                  secondary: `${pctOf(r.users, conv.payers)}% of buyers`,
                }))}
              />
            </Panel>
            <Panel title="The Premium page" note={`last ${windowDays} days`}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-2xl font-bold tabular-nums text-text-main">{n(conv.premium_page.free_visited)}</p>
                  <p className="text-xs text-text-muted">
                    free readers opened it ({pctOf(conv.premium_page.free_visited, conv.premium_page.free_active)}% of {n(conv.premium_page.free_active)} active) and haven&apos;t bought
                  </p>
                </div>
                <div>
                  <p className="text-2xl font-bold tabular-nums" style={{ color: COLORS.primary }}>{n(conv.premium_page.bought)}</p>
                  <p className="text-xs text-text-muted">bought in the same time</p>
                </div>
              </div>
              <p className="mt-3 text-xs text-text-muted">
                The free readers who opened it did so a median {dec(conv.premium_page.free_visit_views)} times.
              </p>
              {conv.before_after.payers > 0 ? (
                <p className="mt-3 text-sm text-text-main">
                  In the {conv.before_after.span} days before paying, buyers came on{" "}
                  <span className="font-semibold">{dec(conv.before_after.before)}</span> days on average; in the {conv.before_after.span} days after, on{" "}
                  <span className="font-semibold">{dec(conv.before_after.after)}</span> ({n(conv.before_after.payers)} buyers).
                </p>
              ) : (
                <p className="mt-3 text-xs text-text-muted">
                  Before vs after paying fills in once buyers have had Premium for {conv.before_after.span} days.
                </p>
              )}
            </Panel>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Panel title="What they opened in the 24 hours before paying" note={`% of ${n(conv.before.payers)} buyers`}>
              <BarList
                max={100}
                format={(v) => `${v}%`}
                items={conv.before.areas.slice(0, 10).map((a) => ({
                  key: a.key,
                  label: a.label,
                  value: pctOf(a.users, conv.before.payers),
                  secondary: `${n(a.users)} buyers`,
                }))}
              />
            </Panel>
            <Panel title="Taps that came just before paying" note="buyers">
              <BarList
                color={COLORS.pink}
                emptyText="No tagged taps in the 24 hours before a payment."
                items={conv.before.sources.map((s) => ({ key: s.src, label: sourceLabel(s.src), value: s.users }))}
              />
            </Panel>
          </div>
        </Section>
      )}

      <Section
        title={key === "gifted" ? "Free-month readers" : key === "paid" ? "Paying members" : "Premium members"}
        note={`${n(members.length)} · figures for the last ${windowDays} days`}
        lead={paid.accounts ? "Everyone who has Premium today, with how much they used it. Quiet = no visit in 7 days." : undefined}
      >
        <Panel>
          <PeopleList rows={members} kind="members" windowDays={windowDays} />
        </Panel>
      </Section>
    </div>
  );
}
