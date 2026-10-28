import Link from "next/link";
import { T } from "@/components/i18n/T";
import { IconCheck } from "@/components/ui/icons";
import { PillarBars } from "@/components/stock/HealthCheck";
import HealthCheck from "@/components/stock/HealthCheck";
import BuyBelowAlert from "@/components/stock/report/BuyBelowAlert";
import { DateT, Label, TONE_CLASS, money, perShare, signedPct, tx } from "@/components/stock/report/fmt";
import type { CompanyDetail } from "@/lib/api";
import type {
  AlternativesSection, Bi, CashSection, DividendSection, NextSection, OwnersSection, PriceSection,
  QualitySection, RedFlagsSection, RisksSection, SafetySection, SectorSection, StorySection, ThisYearSection, Tone,
} from "@/lib/stock-report";

/**
 * The bodies of the stock report's sections (2026-10-28). Each section has a
 * free face (`…Free`: public facts, dates, every serious red flag) and a
 * Premium body (`…Body`) that `ReportSection` puts behind its lock. Server
 * components; the data comes ready-worded from the backend
 * (`backend/services/stock_report.py`).
 */

const num = (v: number | null | undefined, d = 1) => (v == null ? "--" : v.toFixed(d));
const crore = (v: number | null | undefined) =>
  v == null ? "--" : `৳${v >= 100 ? Math.round(v).toLocaleString("en-US") : v.toFixed(1)} cr`;
const croreBnT = (v: number | null | undefined) =>
  v == null ? "--" : `৳${v >= 100 ? Math.round(v).toLocaleString("en-US") : v.toFixed(1)} কোটি`;

function Fact({ label, value, sub }: { label: Bi; value: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div>
      <Label {...label} />
      <span className="mt-0.5 block text-base font-bold leading-tight tabular-nums nums text-text-main">{value}</span>
      {sub && <span className="mt-0.5 block text-xs text-text-muted">{sub}</span>}
    </div>
  );
}

/** Simple vertical bars, heights to scale against `max`. */
function Bars({
  items,
  max,
  refLine,
  label,
}: {
  items: { key: string | number; value: number; text: string; x: React.ReactNode; tone?: Tone | "last" }[];
  max: number;
  refLine?: { value: number; label: Bi };
  label: string;
}) {
  const h = (v: number) => `${Math.max(0, Math.min(1, v / max)) * 80}%`;
  return (
    <>
      <div className="rp-bars" role="img" aria-label={label}>
        {items.map((it) => (
          <div key={it.key} className="rp-col">
            <span className="mb-1 text-xs font-bold tabular-nums nums text-text-main">{it.text}</span>
            <div className="rp-bar" data-tone={it.tone === "neutral" ? undefined : it.tone} style={{ height: h(it.value) }} />
          </div>
        ))}
        {refLine && (
          <div className="rp-ref" style={{ bottom: h(refLine.value) }}>
            <span>{tx(refLine.label)}</span>
          </div>
        )}
      </div>
      <div className="rp-xl" aria-hidden="true">
        {items.map((it) => (
          <span key={it.key} className="text-xs text-text-muted">{it.x}</span>
        ))}
      </div>
    </>
  );
}

// ------------------------------------------------------------------ red flags

export function RedFlagsFree({ s }: { s: RedFlagsSection }) {
  const reds = s.checks.filter((c) => c.level === "red");
  if (!reds.length) return null;
  // Serious red flags are always named for free (a user decision, 2026-10-28).
  return (
    <ul className="rp-checks">
      {reds.map((c) => (
        <li key={c.key} className="rp-check" data-level="red">
          <span className="rp-check-dot" aria-hidden="true" />
          <span className="min-w-0 text-sm leading-snug">
            <b className="block text-text-main">{tx(c.label)}</b>
            <span className="text-text-muted">{tx(c.detail)}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

export function RedFlagsBody({ s }: { s: RedFlagsSection }) {
  const reds = s.checks.filter((c) => c.level === "red");
  const ambers = s.checks.filter((c) => c.level === "amber");
  const passed = s.checks.filter((c) => c.level === "pass");
  return (
    <>
      {[...reds, ...ambers].length > 0 && (
        <ul className="rp-checks mt-3">
          {[...reds, ...ambers].map((c) => (
            <li key={c.key} className="rp-check" data-level={c.level}>
              <span className="rp-check-dot" aria-hidden="true" />
              <span className="min-w-0 text-sm leading-snug">
                <b className="block text-text-main">{tx(c.label)}</b>
                <span className="text-text-muted">{tx(c.detail)}</span>
                {c.evidence && (
                  <span className="mt-0.5 block text-xs text-text-muted">
                    <T en="Notice: " bn="নোটিশ: " />
                    {c.evidence.title} · <DateT iso={c.evidence.date} />
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
      {passed.length > 0 && (
        <div className="mt-4 border-t border-border pt-3">
          <p className="text-xs font-bold text-text-muted">
            <T en={`Passed ${passed.length} checks`} bn={`${passed.length}টি যাচাইয়ে উত্তীর্ণ`} />
          </p>
          <ul className="rp-passed">
            {passed.map((c) => (
              <li key={c.key} className="text-xs leading-snug text-text-main">
                <IconCheck size={12} />
                <span>{tx(c.detail)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

// ------------------------------------------------------------------ price

export function PriceFree({ s }: { s: PriceSection }) {
  return (
    <div className="rp-facts" data-cols="4">
      <Fact label={{ en: "Today", bn: "আজ" }} value={money(s.today)} />
      <Fact label={{ en: "P/E now", bn: "এখনকার পিই" }} value={num(s.pe.now)} />
      <Fact label={{ en: "Its usual P/E", bn: "এর স্বাভাবিক পিই" }} value={num(s.pe.usual)} />
      <Fact label={{ en: "Sector P/E", bn: "সেক্টরের পিই" }} value={num(s.pe.sector)} />
    </div>
  );
}

export function PriceBody({ s, code, ltp, w52High, w52Low }: {
  s: PriceSection; code: string; ltp: number | null; w52High?: number | null; w52Low?: number | null;
}) {
  const f = s.fair;
  const points = [s.today, ...(f ? [f.low, f.high] : []), ...s.methods.map((m) => m.price)].filter((v) => v > 0);
  const lo = points.length ? Math.min(...points) * 0.88 : 0;
  const hi = points.length ? Math.max(...points) * 1.06 : 1;
  const pos = (v: number) => `${((v - lo) / (hi - lo)) * 100}%`;
  return (
    <>
      {f && (
        <div className="rp-strip" aria-hidden="true">
          <div className="rp-strip-axis" />
          <div className="rp-strip-range" style={{ left: pos(f.low), width: `calc(${pos(f.high)} - ${pos(f.low)})` }} />
          {s.methods.map((m, i) => <div key={i} className="rp-strip-dot" style={{ left: pos(m.price) }} />)}
          <div className="rp-strip-today" style={{ left: pos(s.today) }} />
          <span className="rp-strip-tl text-xs font-bold text-text-main" style={{ left: `calc(${pos(s.today)} - 8px)` }}>
            <T en={`Today ${money(s.today)}`} bn={`আজ ${money(s.today)}`} />
          </span>
          <span className="rp-strip-rl text-xs text-text-muted tabular-nums" style={{ left: pos(f.low) }}>{money(f.low)}</span>
          <span className="rp-strip-rl text-xs text-text-muted tabular-nums" style={{ left: pos(f.high) }}>{money(f.high)}</span>
        </div>
      )}
      {s.methods.length > 0 && (
        <ul className="rp-rows">
          {s.methods.map((m, i) => (
            <li key={i} className="text-sm">
              <span className="text-text-muted">{tx(m.label)}</span>
              <b className="tabular-nums nums text-text-main">{money(m.price)}</b>
            </li>
          ))}
        </ul>
      )}
      {s.buy_below != null && (
        <div className="rp-note flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-bold text-text-main">
            <T en={`Buy below ${money(s.buy_below)}`} bn={`${money(s.buy_below)}-এর নিচে কিনুন`} />
          </p>
          <BuyBelowAlert code={code} target={s.buy_below} ltp={ltp} w52High={w52High} w52Low={w52Low} />
        </div>
      )}
      {s.scenarios.length > 0 && (
        <div className="mt-4 border-t border-border pt-3">
          <p className="text-sm font-bold text-text-main">
            <T en="Next 12 months, if…" bn="আগামী 12 মাসে, যদি…" />
          </p>
          <ul className="rp-rows">
            {s.scenarios.map((sc, i) => (
              <li key={i} className="text-sm">
                <span className="text-text-muted">{tx(sc.label)}</span>
                <b className="tabular-nums nums text-text-main">{money(sc.price)}</b>
              </li>
            ))}
          </ul>
          <p className="mt-1 text-xs text-text-muted">
            <T en="These are sums, not a forecast." bn="এগুলো হিসাব, পূর্বাভাস নয়।" />
          </p>
        </div>
      )}
    </>
  );
}

// ------------------------------------------------------------------ dividend

export function DividendFree({ s }: { s: DividendSection }) {
  const l = s.latest;
  if (!l) return null;
  return (
    <div className="rp-facts" data-cols="4">
      <Fact
        label={{ en: "Cash a share", bn: "শেয়ারপ্রতি নগদ" }}
        value={l.cash_ps != null && l.cash_ps > 0 ? perShare(l.cash_ps) : <T en="No cash" bn="নগদ নেই" />}
        sub={
          <>
            {l.cash_pct != null && l.cash_pct > 0 ? `${l.cash_pct}% · ` : ""}
            {tx(l.kind)}
            {l.fy ? ` · FY${l.fy}` : ""}
            {l.stock_pct != null && l.stock_pct > 0 ? (
              <T en={` · ${l.stock_pct}% bonus`} bn={` · ${l.stock_pct}% বোনাস`} />
            ) : null}
          </>
        }
      />
      <Fact label={{ en: "Yield at today's price", bn: "আজকের দামে ইল্ড" }} value={l.yield_pct != null ? `${l.yield_pct.toFixed(1)}%` : "--"} />
      <Fact label={{ en: "Record date", bn: "রেকর্ড ডেট" }} value={l.record_date ? <DateT iso={l.record_date} /> : "--"} />
      {l.upcoming && l.buy_by ? (
        <Fact label={{ en: "Last day to buy", bn: "কেনার শেষ দিন" }} value={<DateT iso={l.buy_by} />} />
      ) : (
        <Fact label={{ en: "AGM", bn: "এজিএম" }} value={l.agm_date ? <DateT iso={l.agm_date} /> : "--"} />
      )}
    </div>
  );
}

export function DividendBody({ s }: { s: DividendSection }) {
  const maxH = Math.max(1, ...s.history.map((h) => h.cash_ps));
  return (
    <>
      {(s.payout_pct != null || s.cash_cover != null || s.next_range) && (
        <div className="rp-facts" data-cols="3">
          {s.payout_pct != null && <Fact label={{ en: "Share of profit paid", bn: "মুনাফার কত অংশ দিল" }} value={`${Math.round(s.payout_pct)}%`} />}
          {s.cash_cover != null && <Fact label={{ en: "Covered by cash", bn: "নগদে কতবার ঢাকা" }} value={`${s.cash_cover.toFixed(1)}×`} />}
          {s.next_range && (
            <Fact
              label={{ en: "Next year, likely", bn: "আগামী বছর, সম্ভাব্য" }}
              value={`${perShare(s.next_range.low)}–${perShare(s.next_range.high)}`}
            />
          )}
        </div>
      )}
      {s.history.length >= 2 && (
        <Bars
          label="Cash dividend per share by year"
          max={maxH * 1.1}
          items={s.history.map((h, i) => ({
            key: h.year,
            value: h.cash_ps,
            text: h.cash_ps >= 10 ? h.cash_ps.toFixed(0) : h.cash_ps.toFixed(1),
            x: `'${String(h.year).slice(2)}`,
            tone: i === s.history.length - 1 ? "good" : undefined,
          }))}
        />
      )}
      {/* The ৳10,000 sum and the record-date sum are the backend's meaning
          lines (stock_report.py), shown under the bars by ReportSection. */}
    </>
  );
}

// ------------------------------------------------------------------ this year

export function ThisYearFree({ s }: { s: ThisYearSection }) {
  if (!s.latest) return null;
  return (
    <div className="mt-3">
      <p className="text-base font-bold leading-snug text-text-main">{tx(s.latest.headline)}</p>
      {s.latest.posted && (
        <p className="text-xs text-text-muted">
          <T en="Posted " bn="প্রকাশ: " />
          <DateT iso={s.latest.posted} />
        </p>
      )}
    </div>
  );
}

export function ThisYearBody({ s }: { s: ThisYearSection }) {
  const vals = s.quarters.flatMap((q) => [q.cur, q.prev]).filter((v): v is number => v != null);
  const max = Math.max(0.01, ...vals.map((v) => Math.abs(v))) * 1.15;
  const h = (v: number | null) => (v == null ? "0%" : `${Math.max(0, v / max) * 80}%`);
  return (
    <>
      {s.quarters.length > 0 && (
        <>
          <div className="rp-qbars" role="img" aria-label="Profit per share by quarter, this year against last year">
            {s.quarters.map((q) => (
              <div key={q.q} className="rp-grp">
                {[q.prev, q.cur].map((v, j) => (
                  <div key={j} className="rp-col">
                    <span
                      className={`mb-1 text-xs font-bold tabular-nums nums ${
                        j === 1 && v != null && q.prev != null && v < q.prev ? "text-negative" : "text-text-main"
                      }`}
                    >
                      {v == null ? "" : v.toFixed(2)}
                    </span>
                    <div className="rp-bar" data-tone={j === 0 ? "last" : undefined} style={{ height: h(v) }} />
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div className="rp-xl" aria-hidden="true">
            {s.quarters.map((q) => (
              <span key={q.q} className="text-xs text-text-muted">{tx(q.label)}</span>
            ))}
          </div>
          <p className="mt-2 flex flex-wrap gap-4 text-xs text-text-muted">
            <span className="inline-flex items-center gap-1.5">
              <i className="inline-block h-2.5 w-2.5 rounded-sm bg-text-muted/35" aria-hidden="true" />
              <T en="Last year" bn="গত বছর" />
            </span>
            <span className="inline-flex items-center gap-1.5">
              <i className="inline-block h-2.5 w-2.5 rounded-sm bg-text-main" aria-hidden="true" />
              {tx(s.fy_label)}
            </span>
          </p>
        </>
      )}
      {/* The next results are the section's "what to watch" line; this note
          only stands in when the backend sent no watch line. */}
      {s.next && !s.watch && (
        <div className="rp-note text-sm text-text-main">
          <p className="font-bold">
            {tx(s.next.what)}
            {s.next.date && (
              <>
                {" · "}
                {s.next.approx && <T en="around " bn="সম্ভাব্য " />}
                <DateT iso={s.next.date} />
              </>
            )}
          </p>
          {s.next.beat != null && (
            <p>
              <T
                en={`The number to beat: ${perShare(s.next.beat)} a share, the same quarter last year.`}
                bn={`ছাড়িয়ে যেতে হবে: শেয়ারপ্রতি ${perShare(s.next.beat)}, গত বছরের একই প্রান্তিক।`}
              />
            </p>
          )}
        </div>
      )}
    </>
  );
}

// ------------------------------------------------------------------ what's next

export function NextFree({ s }: { s: NextSection }) {
  if (!s.items.length) return null;
  return (
    <ul className="rp-rows">
      {s.items.map((it, i) => (
        <li key={i} className="text-sm">
          <span className="text-text-main">{tx(it.label)}</span>
          <b className="shrink-0 tabular-nums nums text-text-main">
            {it.date ? (
              <>
                {it.approx && <span className="font-normal text-text-muted"><T en="around " bn="সম্ভাব্য " /></span>}
                <DateT iso={it.date} />
              </>
            ) : "--"}
          </b>
        </li>
      ))}
    </ul>
  );
}

export function NextBody({ s }: { s: NextSection }) {
  const withExpect = s.items.filter((it) => it.expect);
  if (!withExpect.length) return null;
  return (
    <ul className="mt-3 grid gap-3">
      {withExpect.map((it, i) => (
        <li key={i} className="text-sm leading-snug">
          <b className="block text-text-main">{tx(it.label)}</b>
          <span className="text-text-main">{tx(it.expect)}</span>
        </li>
      ))}
    </ul>
  );
}

// ------------------------------------------------------------------ owners

const OWN_KEYS = [
  { k: "sponsor", cls: "rp-own-sponsor", en: "Sponsors", bn: "উদ্যোক্তা" },
  { k: "institute", cls: "rp-own-institute", en: "Institutions", bn: "প্রতিষ্ঠান" },
  { k: "foreign", cls: "rp-own-foreign", en: "Foreign", bn: "বিদেশি" },
  { k: "govt", cls: "rp-own-govt", en: "Government", bn: "সরকার" },
  { k: "public", cls: "rp-own-public", en: "Public", bn: "সাধারণ" },
] as const;

export function OwnersFree({ s }: { s: OwnersSection }) {
  const sp = s.split;
  if (!sp) return null;
  const parts = OWN_KEYS.map((o) => ({ ...o, v: sp[o.k] ?? 0 })).filter((o) => o.v > 0.05);
  return (
    <div className="mt-2">
      <div className="rp-own" aria-hidden="true">
        {parts.map((p) => <span key={p.k} className={p.cls} style={{ width: `${p.v}%` }} />)}
      </div>
      <div className="rp-own-key">
        {parts.map((p) => (
          <span key={p.k} className="text-xs text-text-main">
            <i className={p.cls} aria-hidden="true" />
            <T en={`${p.en} ${p.v.toFixed(1)}%`} bn={`${p.bn} ${p.v.toFixed(1)}%`} />
          </span>
        ))}
      </div>
      <p className="mt-2 text-xs text-text-muted">
        {sp.as_of && (
          <>
            <T en="As of " bn="যে তারিখের হিসাব: " />
            <DateT iso={sp.as_of} />
          </>
        )}
        {s.rule30 && (
          <>
            {sp.as_of ? " · " : ""}
            <span className={s.rule30.ok ? "" : "font-semibold text-negative"}>
              <T
                en={`Sponsors and directors hold ${s.rule30.pct.toFixed(1)}% (the rule asks for 30%)`}
                bn={`উদ্যোক্তা-পরিচালকদের হাতে ${s.rule30.pct.toFixed(1)}% (নিয়ম অনুযায়ী 30% লাগে)`}
              />
            </span>
          </>
        )}
      </p>
    </div>
  );
}

const shares = (n: number) => n.toLocaleString("en-US");

export function OwnersBody({ s }: { s: OwnersSection }) {
  return (
    <>
      {s.trades.length > 0 && (
        <ul className="rp-timeline">
          {s.trades.map((t, i) => (
            <li key={i} data-side={t.side}>
              <b className="block text-sm text-text-main">
                {tx(t.role)}
                {t.name ? <span className="font-normal text-text-muted"> · {t.name}</span> : null}
              </b>
              <span className="block text-sm text-text-main">
                <T
                  en={`${t.side === "buy" ? "Bought" : "Sold"} ${shares(t.shares)} shares${t.status === "declared" ? " (declared, not yet confirmed)" : ""}`}
                  bn={`${shares(t.shares)}টি শেয়ার ${t.side === "buy" ? "কিনেছেন" : "বিক্রি করেছেন"}${t.status === "declared" ? " (ঘোষণা দিয়েছেন, এখনো নিশ্চিত হয়নি)" : ""}`}
                />
                {t.value_mn != null && (
                  <span className="text-text-muted">
                    {" · "}
                    <T en={`about ${crore(t.value_mn / 10)}`} bn={`প্রায় ${croreBnT(t.value_mn / 10)}`} />
                  </span>
                )}
              </span>
              <span className="block text-xs text-text-muted">
                {t.declared && (<><T en="Declared " bn="ঘোষণা " /><DateT iso={t.declared} /></>)}
                {t.done && (<>{t.declared ? " · " : ""}<T en="done " bn="সম্পন্ন " /><DateT iso={t.done} /></>)}
                {t.price_low != null && t.price_high != null && (
                  <>
                    {" · "}
                    <T
                      en={`price then ${money(t.price_low)} to ${money(t.price_high)}`}
                      bn={`তখন দাম ${money(t.price_low)} থেকে ${money(t.price_high)}`}
                    />
                  </>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
      {s.trend.length > 0 && (
        <ul className="rp-rows">
          {s.trend.map((g, i) => {
            const up = g.to_pct > g.from_pct;
            return (
              <li key={i} className="text-sm">
                <span className="text-text-muted">
                  {tx(g.group)} · <DateT iso={g.from_date} /> → <DateT iso={g.to_date} />
                </span>
                <b className={`shrink-0 tabular-nums nums ${up ? "text-positive" : "text-negative"}`}>
                  {g.from_pct.toFixed(1)}% → {g.to_pct.toFixed(1)}%
                </b>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

// ------------------------------------------------------------------ cash

export function CashBody({ s }: { s: CashSection }) {
  if (s.years.length < 2) return null;
  const max = Math.max(110, ...s.years.map((y) => y.ratio)) * 1.08;
  const usual = s.usual;
  return (
    <Bars
      label="Cash from the business for every 100 taka of profit, by year"
      max={max}
      refLine={{ value: 100, label: { en: "৳100 = all of it as cash", bn: "৳100 = পুরোটাই নগদে" } }}
      items={s.years.map((y, i) => ({
        key: y.year,
        value: Math.max(0, y.ratio),
        text: `৳${Math.round(y.ratio)}`,
        x: String(y.year),
        tone:
          i === s.years.length - 1
            ? usual != null && y.ratio < usual - 10
              ? "fair"
              : y.ratio < 0
                ? "bad"
                : undefined
            : y.ratio < 0
              ? "bad"
              : undefined,
      }))}
    />
  );
}

// ------------------------------------------------------------------ safety

export function SafetyFree({ s }: { s: SafetySection }) {
  if (!s.rating) return null;
  const r = s.rating;
  return (
    <p className="mt-3 text-sm text-text-main">
      <T en="Credit rating: " bn="ক্রেডিট রেটিং: " />
      <b>{r.long_term}</b>
      {r.short_term ? ` / ${r.short_term}` : ""}
      {r.outlook ? <T en={`, ${r.outlook} outlook`} bn={`, ${r.outlook} আউটলুক`} /> : null}
      <span className="text-text-muted">
        {" · "}
        {r.agency} · <DateT iso={r.date} />
      </span>
    </p>
  );
}

export function SafetyBody({ s }: { s: SafetySection }) {
  if (!s.facts.length) return null;
  return (
    <ul className="rp-rows">
      {s.facts.map((f, i) => (
        <li key={i} className="text-sm">
          <span className="text-text-muted">{tx(f.label)}</span>
          <b className={`text-right ${TONE_CLASS[f.tone]}`}>{tx(f.value)}</b>
        </li>
      ))}
    </ul>
  );
}

// ------------------------------------------------------------------ quality

export function QualityFree({ s, scoreRow }: { s: QualitySection; scoreRow: CompanyDetail["score_row"] }) {
  return (
    <div className="mt-3">
      <p className="mb-3 text-sm text-text-muted">
        <T
          en={`Score ${s.score != null ? Math.round(s.score) : "--"}/100${s.rank && s.total ? ` · ${s.rank} of ${s.total} companies` : ""} · ${s.healthy} of ${s.checks} checks healthy`}
          bn={`স্কোর ${s.score != null ? Math.round(s.score) : "--"}/100${s.rank && s.total ? ` · ${s.total}টির মধ্যে ${s.rank} নম্বর` : ""} · ${s.checks}টির মধ্যে ${s.healthy}টি যাচাই ভালো`}
        />
      </p>
      {scoreRow && <PillarBars scoreRow={scoreRow} />}
    </div>
  );
}

export function QualityBody({ detail }: { detail: CompanyDetail }) {
  if (!detail.score_row) return null;
  return (
    <div className="mt-4">
      <HealthCheck scoreRow={detail.score_row} detail={detail} />
    </div>
  );
}

// ------------------------------------------------------------------ story

export function StoryFree({ s }: { s: StorySection }) {
  const rows = s.years.filter((y) => y.revenue_cr != null || y.profit_cr != null);
  if (!rows.length) return null;
  return (
    <div className="mt-3">
      <table className="w-full border-collapse text-xs tabular-nums nums sm:text-sm">
        <thead>
          <tr className="text-left text-xs text-text-muted">
            <th className="py-2 pr-3 font-semibold"><T en="Year" bn="বছর" /></th>
            <th className="py-2 pr-3 text-right font-semibold"><T en="Sales" bn="বিক্রি" /></th>
            <th className="py-2 pr-3 text-right font-semibold"><T en="Profit" bn="মুনাফা" /></th>
            <th className="py-2 pr-3 text-right font-semibold"><T en="Margin" bn="মার্জিন" /></th>
            <th className="py-2 text-right font-semibold"><T en="Return on equity" bn="ইকুইটিতে রিটার্ন" /></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((y) => (
            <tr key={y.year} className="border-t border-border">
              <td className="py-2 pr-3 font-semibold text-text-main">{y.year}</td>
              <td className="py-2 pr-3 text-right"><T en={crore(y.revenue_cr)} bn={croreBnT(y.revenue_cr)} /></td>
              <td className={`py-2 pr-3 text-right ${y.profit_cr != null && y.profit_cr < 0 ? "text-negative" : ""}`}>
                <T en={crore(y.profit_cr)} bn={croreBnT(y.profit_cr)} />
              </td>
              <td className="py-2 pr-3 text-right">{y.margin_pct == null ? "--" : `${y.margin_pct.toFixed(1)}%`}</td>
              <td className="py-2 text-right">{y.roe_pct == null ? "--" : `${y.roe_pct.toFixed(1)}%`}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function StoryBody({ s }: { s: StorySection }) {
  const g = s.growth;
  if (!g) return null;
  return (
    <div className="rp-facts" data-cols="3">
      <Fact label={{ en: "Span", bn: "সময়কাল" }} value={<T en={`${g.years} years`} bn={`${g.years} বছর`} />} />
      <Fact label={{ en: "Sales growth a year", bn: "বছরে বিক্রি বৃদ্ধি" }} value={signedPct(g.sales_pct)} />
      <Fact label={{ en: "Profit growth a year", bn: "বছরে মুনাফা বৃদ্ধি" }} value={signedPct(g.profit_pct)} />
    </div>
  );
}

// ------------------------------------------------------------------ sector

export function SectorFree({ s }: { s: SectorSection }) {
  if (!s.ranks.length) return null;
  return (
    <ul className="rp-rows">
      {s.ranks.map((r, i) => (
        <li key={i} className="text-sm">
          <span className="text-text-muted">{tx(r.label)}</span>
          <span className="shrink-0 text-right">
            <b className="tabular-nums nums text-text-main">
              <T en={`${r.rank} of ${r.of}`} bn={`${r.of}টির মধ্যে ${r.rank}`} />
            </b>
            <span className="ml-2 text-xs text-text-muted">{tx(r.value)}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

// ------------------------------------------------------------------ risks

export function RisksBody({ s }: { s: RisksSection }) {
  if (!s.items.length) return null;
  return (
    <ol className="mt-3 grid gap-3">
      {s.items.map((r, i) => {
        // The first risk is usually the section's headline: don't print it twice.
        const isHeadline = r.text.en === s.headline.en;
        if (isHeadline && !r.trigger) return null;
        return (
          <li key={i} className="flex gap-3 text-sm leading-snug">
            <span className="rp-n" aria-hidden="true">{i + 1}</span>
            <span className="min-w-0 pt-1">
              {!isHeadline && <span className="block text-text-main">{tx(r.text)}</span>}
              {r.trigger && (
                <span className={`block text-xs text-text-muted ${isHeadline ? "" : "mt-0.5"}`}>
                  <T en="What would change our view: " bn="যা হলে আমাদের মত বদলাবে: " />
                  {tx(r.trigger)}
                </span>
              )}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

// ------------------------------------------------------------------ alternatives

export function AlternativesBody({ s }: { s: AlternativesSection }) {
  if (!s.items.length) return null;
  return (
    <ul className="rp-rows">
      {s.items.map((a) => (
        <li key={a.code} className="text-sm">
          <Link href={`/stock/${a.code}`} prefetch={false} className="min-w-0 hover:underline active:opacity-70">
            <b className="block text-text-main">{a.name ?? a.code}</b>
            <span className="text-xs text-text-muted">
              {a.code} · {tx(a.why)}
            </span>
          </Link>
          <span className="shrink-0 text-right text-xs text-text-muted tabular-nums nums">
            <b className="block text-sm text-text-main">{a.score != null ? Math.round(a.score) : "--"}/100</b>
            {a.pe != null && <T en={`P/E ${a.pe.toFixed(1)}`} bn={`পিই ${a.pe.toFixed(1)}`} />}
          </span>
        </li>
      ))}
    </ul>
  );
}
