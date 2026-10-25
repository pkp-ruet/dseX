"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getWatchlistGlance, type GlanceRow } from "@/lib/api";
import { cacheKeys, readCache, writeCache } from "@/lib/swr-cache";
import { changePct, changeTone, money } from "@/lib/formatters";
import { useLang } from "@/context/LangContext";
import Card from "@/components/ui/Card";
import Chip from "@/components/ui/Chip";
import SectionHeader from "@/components/ui/SectionHeader";
import SignalChip from "@/components/ui/SignalChip";
import Skeleton from "@/components/ui/Skeleton";
import Stat from "@/components/ui/Stat";
import PremiumGate from "@/components/premium/PremiumGate";

/**
 * The watchlist glance board (Premium). One row per watched stock, four
 * answers each: price against its fair value, what stops a Buy, the next
 * record date or AGM, and its risk flags. Built from
 * `GET /api/watchlist/glance` (services/watchlist_glance.py).
 *
 * The four counts on top are free — they are the reader's stakes; the rows
 * sit behind a blurred PremiumGate (screen-only, like every lock).
 */

type Sort = "list" | "gap" | "event" | "risk";

const SOON_DAYS = 30;

// The signal's reason, as the two-to-four-word line a board cell can hold.
// The full sentence (reason_en / reason_bn) is in the row's "More" panel.
const BLOCKER: Record<string, [string, string]> = {
  not_rated: ["Not rated yet", "এখনো রেটিং নেই"],
  average_fundamentals: ["Average company", "মাঝারি মানের কোম্পানি"],
  z_category: ["Z-category share", "Z ক্যাটাগরির শেয়ার"],
  stale_financials: ["Old accounts", "পুরোনো হিসাব"],
  thin_trading: ["Trades too thin", "লেনদেন খুব কম"],
  earnings_dropped: ["Profit fell sharply", "মুনাফা অনেক কমেছে"],
  heavy_debt: ["Loans too big", "ঋণ অনেক বেশি"],
  near_52w_high: ["Near its yearly high", "বছরের সর্বোচ্চ দামের কাছে"],
  quality_expensive: ["Price too high", "দাম এখন বেশি"],
  good_wait_price: ["Waiting for a lower price", "আরও কম দামের অপেক্ষা"],
};

function shortDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function inDays(n: number | null | undefined, bn: boolean): string {
  if (n == null) return "";
  if (n <= 0) return bn ? "আজ" : "today";
  if (n === 1) return bn ? "আগামীকাল" : "tomorrow";
  return bn ? `${n} দিন পর` : `in ${n} days`;
}

const STANCE_TONE: Record<string, string> = {
  cheap: "text-positive",
  fair: "text-text-main",
  expensive: "text-watch",
};

function Cell({ label, children, sub }: { label: string; children: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="text-xs text-text-muted">{label}</div>
      <div className="mt-0.5 text-sm font-semibold leading-snug">{children}</div>
      {sub && <div className="mt-0.5 text-xs leading-snug text-text-muted">{sub}</div>}
    </div>
  );
}

function FairCell({ row, bn }: { row: GlanceRow; bn: boolean }) {
  const f = row.fair;
  const label = bn ? "ন্যায্য দামের তুলনায়" : "Against fair value";
  if (!f || f.low == null || f.high == null) {
    return (
      <Cell label={label} sub={bn ? "হিসাব করার মতো তথ্য নেই" : "Not enough figures"}>
        <span className="text-text-muted">{bn ? "অনুমান নেই" : "No estimate"}</span>
      </Cell>
    );
  }
  const tone = STANCE_TONE[f.stance ?? ""] ?? "text-text-main";
  const range = `${money(f.low)}–${money(f.high)}`;
  let value: string;
  if (f.gap_pct == null) {
    value =
      f.stance === "cheap" ? (bn ? "দাম সস্তা" : "Cheap")
      : f.stance === "expensive" ? (bn ? "দাম চড়া" : "Expensive")
      : (bn ? "ন্যায্য দাম" : "Fair price");
  } else if (Math.abs(f.gap_pct) < 1) {
    value = bn ? "অনুমানের সমান" : "At the estimate";
  } else {
    const n = Math.abs(f.gap_pct).toFixed(0);
    value = f.gap_pct < 0
      ? (bn ? `অনুমানের চেয়ে ${n}% কম` : `${n}% under estimate`)
      : (bn ? `অনুমানের চেয়ে ${n}% বেশি` : `${n}% over estimate`);
  }
  const sub = f.estimates_disagree
    ? `${range} · ${bn ? "হিসাবগুলো একমত নয়" : "estimates differ"}`
    : range;
  return (
    <Cell label={label} sub={<span className="nums">{sub}</span>}>
      <span className={`nums ${tone}`}>{value}</span>
    </Cell>
  );
}

function BuyCell({ row, bn }: { row: GlanceRow; bn: boolean }) {
  const s = row.signal;
  const label = bn ? "আজ কেনা যায়?" : "Buy today?";
  if (s.signal === "buy" || s.signal === "sell") {
    return (
      <Cell
        label={label}
        sub={s.signal === "buy" ? (bn ? "ভালো কোম্পানি, ভালো দাম" : "Good company, good price") : (bn ? "দুর্বল কোম্পানি" : "Weak company")}
      >
        <SignalChip signal={s.signal} strength={s.strength} lang={bn ? "bn" : "en"} />
      </Cell>
    );
  }
  const [en, bnWord] = BLOCKER[s.reason_key ?? ""] ?? ["Not yet", "এখনো না"];
  return (
    <Cell
      label={label}
      sub={s.buy_below != null && (
        <span className="nums">{bn ? `${money(s.buy_below)}-এর নিচে নামলে` : `Buy zone under ${money(s.buy_below)}`}</span>
      )}
    >
      <span className="text-text-main">{bn ? bnWord : en}</span>
    </Cell>
  );
}

function EventCell({ row, bn }: { row: GlanceRow; bn: boolean }) {
  const e = row.event;
  const label = bn ? "পরের ঘটনা" : "Next event";
  if (!e) {
    return (
      <Cell label={label}>
        <span className="font-normal text-text-muted">{bn ? "আগামী 4 মাসে কিছু নেই" : "Nothing in the next 4 months"}</span>
      </Cell>
    );
  }
  const soon = e.days_left != null && e.days_left <= 7;
  const more = e.more > 0 ? (bn ? ` · আরও ${e.more}টি` : ` · +${e.more} more`) : "";
  if (e.kind === "agm") {
    return (
      <Cell label={label} sub={<span className="nums">{shortDate(e.date)}{more}</span>}>
        <span className={soon ? "text-watch" : "text-text-main"}>
          {bn ? `এজিএম ${inDays(e.days_left, bn)}` : `AGM ${inDays(e.days_left, bn)}`}
        </span>
      </Cell>
    );
  }
  const what = [
    e.cash_per_share ? (bn ? `শেয়ারপ্রতি ${money(e.cash_per_share)}` : `${money(e.cash_per_share)} a share`) : "",
    e.stock_pct ? (bn ? `${e.stock_pct}% বোনাস` : `${e.stock_pct}% bonus`) : "",
  ].filter(Boolean).join(" + ");
  const buy = e.buy_days_left != null && e.buy_days_left < 0
    ? (bn ? "এবার কেনার সময় শেষ" : "Too late to buy for this one")
    : e.buy_by ? (bn ? `কিনতে হবে ${shortDate(e.buy_by)}-এর মধ্যে` : `Buy by ${shortDate(e.buy_by)}`) : "";
  return (
    <Cell label={label} sub={<span className="nums">{[buy, what].filter(Boolean).join(" · ")}{more}</span>}>
      <span className={soon ? "text-watch" : "text-text-main"}>
        {bn ? `রেকর্ড ডেট ${inDays(e.days_left, bn)}` : `Record date ${inDays(e.days_left, bn)}`}
      </span>
    </Cell>
  );
}

function RiskCell({ row, bn }: { row: GlanceRow; bn: boolean }) {
  const n = row.risks.length;
  const label = bn ? "ঝুঁকি" : "Risk flags";
  if (n === 0) {
    return (
      <Cell label={label}>
        <span className="font-normal text-text-muted">{bn ? "কোনো সতর্কতা নেই" : "None found"}</span>
      </Cell>
    );
  }
  const first = bn ? row.risks[0].bn : row.risks[0].en;
  return (
    <Cell label={label} sub={<span className="line-clamp-2">{first}</span>}>
      <span className="text-negative">
        {bn ? `${n}টি সতর্কতা` : `${n} ${n === 1 ? "flag" : "flags"}`}
      </span>
    </Cell>
  );
}

function BoardRow({ row, bn }: { row: GlanceRow; bn: boolean }) {
  const reason = bn ? row.signal.reason_bn : row.signal.reason_en;
  const hasMore = Boolean(reason) || row.risks.length > 1;
  return (
    <li className="border-t border-border py-4 first:border-t-0 first:pt-0 last:pb-0">
      <div className="flex items-start justify-between gap-3">
        <Link
          href={`/stock/${row.code}`}
          prefetch={false}
          className="min-w-0 hover:underline active:opacity-70"
        >
          <span className="block truncate text-base font-semibold text-text-main">{row.name}</span>
          <span className="text-xs font-semibold text-text-muted">{row.code}</span>
        </Link>
        <div className="shrink-0 text-right nums">
          <div className="text-base font-semibold text-text-main">{money(row.price)}</div>
          <div className={`text-xs font-semibold ${changeTone(row.change_pct)}`}>{changePct(row.change_pct)}</div>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 md:grid-cols-4">
        <FairCell row={row} bn={bn} />
        <BuyCell row={row} bn={bn} />
        <EventCell row={row} bn={bn} />
        <RiskCell row={row} bn={bn} />
      </div>
      {hasMore && (
        <details className="mt-2 text-sm">
          <summary className="inline-flex min-h-10 cursor-pointer items-center font-semibold text-primary-ink">
            {bn ? "কেন, বিস্তারিত" : "Why, in full"}
          </summary>
          <div className="space-y-1.5 pb-1 text-text-main">
            {reason && <p>{reason}</p>}
            {row.risks.length > 0 && (
              <ul className="list-disc space-y-1 pl-5">
                {row.risks.map((r) => (
                  <li key={r.key}>{bn ? r.bn : r.en}</li>
                ))}
              </ul>
            )}
          </div>
        </details>
      )}
    </li>
  );
}

export default function GlanceBoard({ codes }: { codes: string[] }) {
  const { bn } = useLang();
  const codesKey = codes.join(",");
  const [rows, setRows] = useState<GlanceRow[] | null>(() =>
    codes.length ? readCache<GlanceRow[]>(cacheKeys.watchlistGlance(codes)) : null,
  );
  const [failed, setFailed] = useState(false);
  const [sort, setSort] = useState<Sort>("list");

  useEffect(() => {
    if (!codes.length) {
      setRows([]);
      return;
    }
    const key = cacheKeys.watchlistGlance(codes);
    const cached = readCache<GlanceRow[]>(key);
    if (cached) setRows(cached);
    setFailed(false);
    let cancelled = false;
    getWatchlistGlance(codes)
      .then((fresh) => {
        if (cancelled) return;
        setRows(fresh);
        writeCache(key, fresh);
      })
      .catch(() => {
        if (!cancelled && !cached) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [codesKey]);

  const counts = useMemo(() => {
    const r = rows ?? [];
    return {
      under: r.filter((x) => x.fair?.gap_pct != null && x.fair.gap_pct <= -1).length,
      buys: r.filter((x) => x.signal.signal === "buy").length,
      events: r.filter((x) => x.event?.days_left != null && x.event.days_left <= SOON_DAYS).length,
      risky: r.filter((x) => x.risks.length > 0).length,
    };
  }, [rows]);

  const sorted = useMemo(() => {
    const r = [...(rows ?? [])];
    const last = (v: number | null | undefined) => (v == null ? Number.POSITIVE_INFINITY : v);
    if (sort === "gap") r.sort((a, b) => last(a.fair?.gap_pct) - last(b.fair?.gap_pct));
    else if (sort === "event") r.sort((a, b) => last(a.event?.days_left) - last(b.event?.days_left));
    else if (sort === "risk") r.sort((a, b) => b.risks.length - a.risks.length);
    return r;
  }, [rows, sort]);

  if (!codes.length || failed || (rows && rows.length === 0)) return null;

  const total = rows?.length ?? codes.length;
  const stakes = [
    bn ? `${counts.under}টি শেয়ার ন্যায্য দামের চেয়ে কমে` : `${counts.under} of your stocks trade under fair value`,
    counts.events > 0
      ? (bn ? `${counts.events}টির রেকর্ড ডেট বা এজিএম ${SOON_DAYS} দিনের মধ্যে` : `${counts.events} have a record date or AGM within ${SOON_DAYS} days`)
      : "",
    counts.risky > 0
      ? (bn ? `${counts.risky}টিতে ঝুঁকির সতর্কতা` : `${counts.risky} carry a risk flag`)
      : "",
  ].filter(Boolean);

  const SORTS: { key: Sort; en: string; bn: string }[] = [
    { key: "list", en: "Your order", bn: "আপনার সাজানো" },
    { key: "gap", en: "Most under value", bn: "সবচেয়ে কম দামে" },
    { key: "event", en: "Next event", bn: "পরের ঘটনা" },
    { key: "risk", en: "Most risk flags", bn: "বেশি ঝুঁকি" },
  ];

  return (
    <section
      aria-labelledby="wl-glance"
      className={bn ? "font-bn" : undefined}
      lang={bn ? "bn" : undefined}
    >
      <SectionHeader
        id="wl-glance"
        title={bn ? "প্রতিটি শেয়ার এক নজরে" : "Every stock at a glance"}
        bn={bn ? undefined : "প্রতিটি শেয়ার এক নজরে — ন্যায্য দাম, কেনায় বাধা, পরের ঘটনা আর ঝুঁকি।"}
        lead={
          bn
            ? "ন্যায্য দামের তুলনায় আজকের দাম, কেনা যায় কি না, পরের রেকর্ড ডেট বা এজিএম, আর যা খারাপ হতে পারে।"
            : "Price against fair value, what stops a Buy, the next record date or AGM, and what could go wrong."
        }
      />

      <Card padding="md" className="mb-3">
        {rows === null ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} height={44} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat value={counts.under} label={bn ? "ন্যায্য দামের চেয়ে কমে" : "Under fair value"} sub={`${bn ? "মোট" : "of"} ${total}`} />
            <Stat value={counts.buys} label={bn ? "আজ কেনার সংকেত" : "A Buy today"} tone={counts.buys ? "positive" : "default"} />
            <Stat value={counts.events} label={bn ? `${SOON_DAYS} দিনে রেকর্ড ডেট বা এজিএম` : `Record date or AGM in ${SOON_DAYS} days`} />
            <Stat value={counts.risky} label={bn ? "ঝুঁকির সতর্কতা আছে" : "Carry a risk flag"} tone={counts.risky ? "negative" : "default"} />
          </div>
        )}
      </Card>

      {rows !== null && (
        <PremiumGate
          label={bn ? "ওয়াচলিস্টের পুরো বোর্ড" : "The watchlist glance board"}
          preview="blur"
          peek={220}
          stakes={stakes}
        >
          <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label={bn ? "বোর্ড সাজান" : "Sort the board"}>
            {SORTS.map((s) => (
              <Chip key={s.key} active={sort === s.key} onClick={() => setSort(s.key)}>
                {bn ? s.bn : s.en}
              </Chip>
            ))}
          </div>
          <Card padding="md">
            <ul>
              {sorted.map((row) => (
                <BoardRow key={row.code} row={row} bn={bn} />
              ))}
            </ul>
          </Card>
          <p className="mt-2 text-xs text-text-muted">
            {bn
              ? "ন্যায্য দাম একটি আনুমানিক হিসাব, নিশ্চিত দাম নয়। এটি পরামর্শ নয় — নিজে যাচাই করে সিদ্ধান্ত নিন।"
              : "Fair value is a rough estimate, not a promise. This is not advice — check for yourself before you decide."}
          </p>
        </PremiumGate>
      )}
    </section>
  );
}
