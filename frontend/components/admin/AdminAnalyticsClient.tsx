"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { apiGetAdminAnalytics, type AdminAnalyticsResponse, type AdminGroupFigures } from "@/lib/api";
import { money } from "@/lib/formatters";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Stat from "@/components/ui/Stat";
import ErrorState from "@/components/ui/ErrorState";
import Skeleton from "@/components/ui/Skeleton";
import Link from "@/components/ui/Link";
import GrowthChart from "./analytics/GrowthChart";

const ADMIN_LINKS = [
  { href: "/admin/payments", label: "Payments" },
  { href: "/admin/scores", label: "Score Adjustments" },
  { href: "/admin/tips", label: "Edit Tips" },
  { href: "/admin/feedback", label: "Feedback" },
  { href: "/admin/campaigns", label: "Email Campaigns" },
];

const n = (v: number | null | undefined) => (v == null ? "–" : Math.round(v).toLocaleString("en-US"));
const pc = (v: number | null | undefined) => (v == null ? "–" : `${Math.round(v)}%`);

function shortDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/** A titled card: one question, its answer under it. */
function Block({ title, note, children }: { title: string; note?: ReactNode; children: ReactNode }) {
  return (
    <Card className="min-w-0">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="text-base font-bold text-text-main">{title}</h2>
        {note && <span className="text-xs font-semibold text-text-muted">{note}</span>}
      </div>
      {children}
    </Card>
  );
}

function Loading() {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} height={88} rounded="var(--radius-md)" />)}
      </div>
      <Skeleton height={300} rounded="var(--radius-md)" />
      <Skeleton height={220} rounded="var(--radius-md)" />
    </div>
  );
}

function Tiles({ d }: { d: AdminAnalyticsResponse }) {
  const t = d.tiles;
  const tiles = [
    { value: n(t.accounts), label: "Accounts", sub: `+${n(t.new_7d)} this week · +${n(t.new_today)} today` },
    { value: n(t.active_today), label: "Active today", sub: "Readers with a page view" },
    { value: n(t.active_7d), label: "Active in 7 days", sub: `${pc((t.active_7d / (t.accounts || 1)) * 100)} of accounts` },
    { value: n(t.active_30d), label: "Active in 30 days", sub: `${pc((t.active_30d / (t.accounts || 1)) * 100)} of accounts` },
    { value: n(t.premium), label: "Premium members", sub: `${n(t.paying)} paying · ${n(t.given)} given` },
    { value: money(t.money_month), label: "Money this month", sub: `${n(t.payments_month)} payments` },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
      {tiles.map((s) => (
        <Card key={s.label} padding="sm" className="min-w-0 sm:p-4">
          <Stat value={s.value} label={s.label} sub={s.sub} size="lg" />
        </Card>
      ))}
    </div>
  );
}

function PremiumBlock({ d }: { d: AdminAnalyticsResponse }) {
  const p = d.premium;
  const facts = [
    { value: n(p.paying), label: "Paying" },
    { value: n(p.given), label: "Given by admin" },
    { value: money(p.money_total), label: "Money in total", sub: `${n(p.payments)} payments` },
    { value: n(p.new_buyers_30d), label: "New buyers in 30 days" },
    { value: n(p.repeat_buyers), label: "Paid twice or more" },
    { value: n(p.lapsed_30d), label: "Ended in 30 days, not renewed", tone: p.lapsed_30d ? ("watch" as const) : undefined },
  ];
  return (
    <Block
      title="Premium"
      note={
        p.pending ? (
          <Link href="/admin/payments" className="text-primary underline">
            {n(p.pending)} payment{p.pending > 1 ? "s" : ""} to check
          </Link>
        ) : "No payments waiting"
      }
    >
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {facts.map((f) => <Stat key={f.label} value={f.value} label={f.label} sub={f.sub} tone={f.tone} />)}
      </div>

      <h3 className="mb-2 mt-6 text-sm font-bold text-text-main">
        Premium ends in the next 14 days · {n(p.ending.length)}
      </h3>
      {p.ending.length === 0 ? (
        <p className="text-sm text-text-muted">Nobody&apos;s Premium ends in the next 14 days.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-0 text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-semibold text-text-muted">
                <th className="py-2 pr-3 font-semibold">Reader</th>
                <th className="py-2 pr-3 font-semibold">Ends</th>
                <th className="py-2 pr-3 font-semibold">Seen this week</th>
                <th className="py-2 font-semibold">Push on</th>
              </tr>
            </thead>
            <tbody>
              {p.ending.map((r, i) => (
                <tr key={`${r.contact}-${i}`} className="border-b border-border last:border-0">
                  <td className="py-2 pr-3">
                    <span className="block font-semibold text-text-main">{r.name || r.contact || "Unnamed"}</span>
                    <span className="block text-xs text-text-muted">
                      {r.name && r.contact ? `${r.contact} · ` : ""}{r.plan === "paid" ? "Paying" : "Given"}
                    </span>
                  </td>
                  <td className="nums py-2 pr-3 whitespace-nowrap">
                    {shortDate(r.until)}
                    <span className="block text-xs text-text-muted">
                      {r.days_left === 0 ? "today" : `in ${r.days_left} day${r.days_left > 1 ? "s" : ""}`}
                    </span>
                  </td>
                  <td className={`py-2 pr-3 font-semibold ${r.seen_7d ? "text-positive" : "text-watch"}`}>
                    {r.seen_7d ? "Yes" : "No"}
                  </td>
                  <td className={`py-2 font-semibold ${r.push ? "text-positive" : "text-watch"}`}>
                    {r.push ? "Yes" : "No"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Block>
  );
}

function GroupTable({ free, premium }: { free: AdminGroupFigures; premium: AdminGroupFigures }) {
  const rows: { label: string; f: string; p: string }[] = [
    { label: "Accounts", f: n(free.accounts), p: n(premium.accounts) },
    { label: "Active in 7 days", f: `${n(free.active_7d)} · ${pc(free.active_7d_pct)}`, p: `${n(premium.active_7d)} · ${pc(premium.active_7d_pct)}` },
    { label: "Days active in 30 (middle reader)", f: n(free.median_days), p: n(premium.median_days) },
    { label: "Follow a share", f: pc(free.follow_pct), p: pc(premium.follow_pct) },
    { label: "Have a portfolio", f: pc(free.portfolio_pct), p: pc(premium.portfolio_pct) },
    { label: "Push on a device", f: pc(free.push_pct), p: pc(premium.push_pct) },
    { label: "At the free watchlist cap", f: n(free.at_cap), p: "–" },
  ];
  return (
    <Block title="Free and Premium, side by side">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-xs font-semibold text-text-muted">
            <th className="py-2 pr-3 text-left font-semibold" scope="col"><span className="sr-only">Figure</span></th>
            <th className="py-2 pr-3 text-right font-semibold" scope="col">Free</th>
            <th className="py-2 text-right font-semibold" scope="col">Premium</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label} className="border-b border-border last:border-0">
              <th scope="row" className="py-2 pr-3 text-left font-semibold text-text-main">{r.label}</th>
              <td className="nums py-2 pr-3 text-right">{r.f}</td>
              <td className="nums py-2 text-right">{r.p}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Block>
  );
}

function AreasBlock({ d }: { d: AdminAnalyticsResponse }) {
  const rows = d.areas.slice(0, 14);
  const max = Math.max(1, ...rows.map((r) => Math.max(r.free_pct, r.premium_pct)));
  return (
    <Block title="What readers opened" note={`Last 7 days · share of each group's active readers`}>
      <div className="mb-3 flex gap-4 text-xs font-semibold text-text-muted">
        <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-3 rounded-sm bg-info" />Free</span>
        <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-3 rounded-sm bg-primary" />Premium</span>
      </div>
      <ul className="flex flex-col gap-3">
        {rows.map((r) => (
          <li key={r.key} className="grid grid-cols-1 gap-1 sm:grid-cols-5 sm:items-center sm:gap-3">
            <span className="text-sm font-semibold text-text-main sm:col-span-2">{r.label}</span>
            <div className="flex flex-col gap-1 sm:col-span-3">
              {([["free", "bg-info", r.free_pct, r.free], ["premium", "bg-primary", r.premium_pct, r.premium]] as const).map(
                ([k, cls, p, users]) => (
                  <div key={k} className="flex items-center gap-2">
                    <div className="h-2 flex-1 rounded-sm bg-surface-2">
                      <div className={`h-2 rounded-sm ${cls}`} style={{ width: `${(p / max) * 100}%` }} />
                    </div>
                    <span className="nums w-24 shrink-0 text-right text-xs font-semibold text-text-main">
                      {pc(p)} · {n(users)}
                    </span>
                  </div>
                ),
              )}
            </div>
          </li>
        ))}
      </ul>
    </Block>
  );
}

function StocksBlock({ d }: { d: AdminAnalyticsResponse }) {
  return (
    <Block title="Most-opened stocks" note="Last 7 days">
      {d.stocks.length === 0 ? (
        <p className="text-sm text-text-muted">No stock pages opened yet.</p>
      ) : (
        <ol className="flex flex-col">
          {d.stocks.map((s, i) => (
            <li key={s.code} className="flex items-center gap-3 border-b border-border py-2 last:border-0">
              <span className="nums w-5 text-xs font-semibold text-text-muted">{i + 1}</span>
              <Link href={`/stock/${s.code}`} className="flex-1 font-semibold text-text-main hover:text-primary">
                {s.code}
              </Link>
              <span className="nums text-sm text-text-main">{n(s.users)} readers</span>
              <span className="nums w-20 text-right text-xs text-text-muted">{n(s.views)} views</span>
            </li>
          ))}
        </ol>
      )}
    </Block>
  );
}

export default function AdminAnalyticsClient() {
  const router = useRouter();
  const { isLoading, isLoggedIn, isAdmin } = useAuth();
  const [data, setData] = useState<AdminAnalyticsResponse | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (!isLoggedIn) { router.replace("/login"); return; }
    if (!isAdmin) { router.replace("/"); return; }
  }, [isLoading, isLoggedIn, isAdmin, router]);

  const load = useCallback((fresh = false) => {
    setBusy(true);
    setFailed(false);
    apiGetAdminAnalytics(fresh)
      .then(setData)
      .catch(() => setFailed(true))
      .finally(() => setBusy(false));
  }, []);

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin, load]);

  if (isLoading || !isAdmin) return <Loading />;

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
        lead={
          updated
            ? `Counted at ${updated} Dhaka time, refreshed every 15 minutes. Signed-in readers only; ${
                data?.admins_left_out ? `${data.admins_left_out} admin account${data.admins_left_out > 1 ? "s" : ""}` : "admins"
              } left out.`
            : undefined
        }
        actions={
          <Button variant="quiet" size="sm" onClick={() => load(true)} disabled={busy}>
            {busy ? "Counting…" : "Count again now"}
          </Button>
        }
      />

      <nav aria-label="Admin pages" className="mb-6 flex flex-wrap gap-2">
        {ADMIN_LINKS.map((l) => (
          <Button key={l.href} href={l.href} variant="quiet" size="sm">{l.label}</Button>
        ))}
      </nav>

      {failed && !data && <ErrorState title="Couldn't load analytics" size="inline" onRetry={() => load()} />}
      {!data && !failed && <Loading />}

      {data && (
        <div aria-busy={busy} className="flex flex-col gap-4">
          <Tiles d={data} />

          <Block
            title="Sign-ups and active readers"
            note={`${pc(data.came_back.pct)} of readers who signed up 7+ days ago came back a week later`}
          >
            <GrowthChart growth={data.growth} />
          </Block>

          <PremiumBlock d={data} />

          <div className="grid gap-4 lg:grid-cols-2">
            <GroupTable free={data.groups.free} premium={data.groups.premium} />
            <StocksBlock d={data} />
          </div>

          <AreasBlock d={data} />
        </div>
      )}
    </>
  );
}
