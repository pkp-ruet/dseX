"use client";

import { useMemo, useState, type ReactNode } from "react";
import type { AdminLead, AdminMember } from "@/lib/api";
import Button from "@/components/ui/Button";
import Chip from "@/components/ui/Chip";
import { money } from "@/lib/formatters";
import { ago, mins, n, shortDate } from "./shared";

type Row = AdminMember | AdminLead;
const isMember = (r: Row): r is AdminMember => "plan" in r;

const SHOW = 20;

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-text-muted">{label}</dt>
      <dd className="text-sm font-semibold tabular-nums text-text-main">{children}</dd>
    </div>
  );
}

function Tag({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "good" | "watch" | "bad" | "gold" }) {
  const cls = {
    neutral: "border-border text-text-muted",
    good: "border-positive text-positive",
    watch: "border-watch text-watch",
    bad: "border-negative text-negative",
    gold: "border-gold text-gold-ink",
  }[tone];
  return <span className={`inline-flex min-h-6 items-center rounded-full border px-2 text-xs font-semibold ${cls}`}>{children}</span>;
}

function endsTone(daysLeft: number | null): "bad" | "watch" | "neutral" {
  if (daysLeft == null) return "neutral";
  if (daysLeft <= 7) return "bad";
  if (daysLeft <= 30) return "watch";
  return "neutral";
}

function PersonRow({ r, windowDays }: { r: Row; windowDays: number }) {
  const member = isMember(r) ? r : null;
  const lead = !member ? (r as AdminLead) : null;
  const has = [
    r.holdings ? `${n(r.holdings)} holdings` : null,
    r.watchlist ? `${n(r.watchlist)} followed` : null,
    r.alerts ? `${n(r.alerts)} alerts` : null,
    r.push ? "push on" : "no push",
    r.installed ? "app installed" : null,
  ].filter(Boolean);
  return (
    <li className="border-t border-border py-3 first:border-t-0">
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1.5">
        <div className="min-w-0">
          <p className="truncate font-semibold text-text-main">{r.name || "No name"}</p>
          <p className="truncate text-xs text-text-muted">{r.email || (r.phone_only ? "Phone sign-in" : "No email")}</p>
        </div>
        <div className="flex flex-wrap gap-1">
          {member && <Tag tone={member.plan === "paid" ? "gold" : "neutral"}>{member.plan_label}</Tag>}
          {member && member.method && <Tag>{member.method === "bkash" ? "bKash" : member.method === "nagad" ? "Nagad" : member.method}</Tag>}
          {!r.active7 && <Tag tone="watch">Quiet 7+ days</Tag>}
          {lead?.lapsed && <Tag tone="gold">Had Premium</Tag>}
          {r.caps.includes("watchlist") && <Tag tone="watch">At watchlist limit</Tag>}
          {r.caps.includes("alerts") && <Tag tone="watch">At alert limit</Tag>}
          {r.premium_views > 0 && !member && <Tag>Opened Premium page ×{n(r.premium_views)}</Tag>}
        </div>
      </div>
      <dl className="mt-2 grid grid-cols-3 gap-x-4 gap-y-2 sm:grid-cols-6">
        <Fact label={`Days of ${windowDays}`}>{n(r.active_days)}</Fact>
        <Fact label="Pages">{n(r.views)}</Fact>
        <Fact label="Time (est.)">{mins(r.minutes)}</Fact>
        <Fact label="Last seen">{ago(r.last_seen)}</Fact>
        {member ? (
          <>
            <Fact label="Premium ends">
              <span className={endsTone(member.days_left) === "bad" ? "text-negative" : endsTone(member.days_left) === "watch" ? "text-watch" : ""}>
                {shortDate(member.until)}
                {member.days_left != null && <span className="ml-1 text-xs font-normal text-text-muted">({member.days_left}d)</span>}
              </span>
            </Fact>
            <Fact label={member.payments ? `Paid · ${member.payments}×` : "Paid"}>
              {member.paid_total ? money(member.paid_total) : "–"}
            </Fact>
          </>
        ) : (
          <>
            <Fact label="Signed up">{shortDate(r.signed_up)}</Fact>
            <Fact label="Visits">{n(r.visits)}</Fact>
          </>
        )}
      </dl>
      <p className="mt-1.5 text-xs text-text-muted">
        {r.top_areas.length ? <>Uses most: <span className="text-text-main">{r.top_areas.join(", ")}</span> · </> : null}
        {has.join(" · ")}
        {member?.first_paid ? ` · first paid ${shortDate(member.first_paid)}` : ""}
        {member && r.signed_up ? ` · joined ${shortDate(r.signed_up)}` : ""}
      </p>
    </li>
  );
}

type Filter = { key: string; label: string; test: (r: Row) => boolean };
type Sort = { key: string; label: string; cmp: (a: Row, b: Row) => number };

const byActive = (a: Row, b: Row) => b.active_days - a.active_days || b.views - a.views;

const MEMBER_FILTERS: Filter[] = [
  { key: "all", label: "Everyone", test: () => true },
  { key: "quiet", label: "Quiet 7+ days", test: (r) => !r.active7 },
  { key: "ending", label: "Ends within 30 days", test: (r) => isMember(r) && r.days_left != null && r.days_left <= 30 },
  { key: "nopush", label: "No push", test: (r) => !r.push },
  { key: "noportfolio", label: "No portfolio", test: (r) => !r.holdings },
];

const LEAD_FILTERS: Filter[] = [
  { key: "all", label: "Everyone", test: () => true },
  { key: "premium", label: "Opened Premium page", test: (r) => r.premium_views > 0 },
  { key: "limit", label: "At a limit", test: (r) => r.caps.length > 0 },
  { key: "portfolio", label: "Has a portfolio", test: (r) => r.holdings > 0 },
  { key: "lapsed", label: "Had Premium", test: (r) => !isMember(r) && (r as AdminLead).lapsed },
];

const MEMBER_SORTS: Sort[] = [
  { key: "ends", label: "Ends soonest", cmp: (a, b) => ((a as AdminMember).until ?? "9").localeCompare((b as AdminMember).until ?? "9") },
  { key: "active", label: "Most active", cmp: byActive },
  { key: "least", label: "Least active", cmp: (a, b) => -byActive(a, b) },
  { key: "seen", label: "Seen longest ago", cmp: (a, b) => (a.last_seen ?? "").localeCompare(b.last_seen ?? "") },
  { key: "paid", label: "Paid most", cmp: (a, b) => (b as AdminMember).paid_total - (a as AdminMember).paid_total },
];

const LEAD_SORTS: Sort[] = [
  { key: "active", label: "Most active", cmp: byActive },
  { key: "views", label: "Most pages", cmp: (a, b) => b.views - a.views },
  { key: "premium", label: "Opened Premium page most", cmp: (a, b) => b.premium_views - a.premium_views || byActive(a, b) },
  { key: "holdings", label: "Most holdings", cmp: (a, b) => b.holdings - a.holdings || byActive(a, b) },
];

/** Premium members or the most engaged free readers, one row each. */
export default function PeopleList({ rows, kind, windowDays }: { rows: Row[]; kind: "members" | "leads"; windowDays: number }) {
  const filters = kind === "members" ? MEMBER_FILTERS : LEAD_FILTERS;
  const sorts = kind === "members" ? MEMBER_SORTS : LEAD_SORTS;
  const [filter, setFilter] = useState(filters[0].key);
  const [sort, setSort] = useState(sorts[0].key);
  const [all, setAll] = useState(false);

  const counts = useMemo(
    () => Object.fromEntries(filters.map((f) => [f.key, rows.filter(f.test).length])),
    [rows, filters],
  );
  const shown = useMemo(() => {
    const f = filters.find((x) => x.key === filter) ?? filters[0];
    const s = sorts.find((x) => x.key === sort) ?? sorts[0];
    return rows.filter(f.test).sort(s.cmp);
  }, [rows, filters, sorts, filter, sort]);

  if (!rows.length) return <p className="py-6 text-center text-xs text-text-muted">Nobody here yet.</p>;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {filters
          .filter((f) => f.key === "all" || counts[f.key] > 0)
          .map((f) => (
            <Chip key={f.key} active={filter === f.key} onClick={() => { setFilter(f.key); setAll(false); }}>
              {f.label} <span className="tabular-nums">{n(counts[f.key])}</span>
            </Chip>
          ))}
        <label className="ml-auto flex items-center gap-2 text-xs text-text-muted" htmlFor={`sort-${kind}`}>
          Order
          <select
            id={`sort-${kind}`}
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="input-field min-h-10 w-auto py-1 text-sm"
          >
            {sorts.map((s) => (
              <option key={s.key} value={s.key}>{s.label}</option>
            ))}
          </select>
        </label>
      </div>
      <ul>
        {(all ? shown : shown.slice(0, SHOW)).map((r, i) => (
          <PersonRow key={`${r.email ?? r.name ?? "x"}-${i}`} r={r} windowDays={windowDays} />
        ))}
      </ul>
      {shown.length > SHOW && (
        <Button variant="quiet" size="sm" onClick={() => setAll((v) => !v)}>
          {all ? "Show fewer" : `Show all ${n(shown.length)}`}
        </Button>
      )}
    </div>
  );
}
