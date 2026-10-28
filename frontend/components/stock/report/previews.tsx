import { T } from "@/components/i18n/T";
import { IconBell, IconCheck, IconLock } from "@/components/ui/icons";
import { Hidden, PartTag, type HiddenKind } from "@/components/stock/report/preview";
import { DateT, money, signedPct, tx } from "@/components/stock/report/fmt";
import type {
  AlternativesSection, CashSection, DividendSection, NextSection, OwnersSection, PriceSection,
  RedFlagsSection, RisksSection, SafetySection, StorySection, ThisYearSection,
} from "@/lib/stock-report";

/**
 * Samples of the report's Premium bodies for a free reader (2026-10-28,
 * second cut — user: "free user is still missing everything … expose 20-30%
 * of data"). Each preview is the section's real layout for THIS stock with
 * roughly the first 30% of each list shown for real (`sampleCount`) — one
 * thing to watch with its finding, one price method, the cautious scenario,
 * the latest insider trade, the first quarter, the oldest cash years — and
 * every other figure as a gold "৳ •••" pill (`Hidden`), each part numbered to
 * match the "Premium shows you" lines. The buy-below price always stays hidden.
 */

/** How many items of a list a free reader sees for real: about 30%, at least
 *  one — but none of a list of one, which would give the whole answer away. */
export function sampleCount(n: number): number {
  return n >= 2 ? Math.max(1, Math.round(n * 0.3)) : 0;
}

function Row({ label, value, kind = "tk", part }: { label: React.ReactNode; value?: React.ReactNode; kind?: HiddenKind; part?: string }) {
  return (
    <li className="flex items-center justify-between gap-3 border-b border-dashed border-border py-2 text-sm last:border-b-0">
      <span className="min-w-0 text-text-muted">
        {label}
        {part && <PartTag part={part} />}
      </span>
      {value != null ? <b className="shrink-0 text-right tabular-nums nums text-text-main">{value}</b> : <Hidden kind={kind} />}
    </li>
  );
}

function PartHead({ children, part, note }: { children: React.ReactNode; part: string; note?: React.ReactNode }) {
  return (
    <p className="mt-3 flex flex-wrap items-center gap-x-2 text-xs font-bold text-text-muted">
      <span className="inline-flex items-center">
        {children}
        <PartTag part={part} />
      </span>
      {note && <span className="font-semibold text-gold-ink">{note}</span>}
    </p>
  );
}

/** "1 of 3 shown" beside a part's title. */
function Shown({ n, of }: { n: number; of: number }) {
  if (n <= 0 || n >= of) return null;
  return <T en={`${n} of ${of} shown`} bn={`${of}টির মধ্যে ${n}টি দেখানো হলো`} />;
}

// ------------------------------------------------------------------ red flags

export function RedFlagsPreview({ s }: { s: RedFlagsSection }) {
  const ambers = s.checks.filter((c) => c.level === "amber");
  const passed = s.checks.filter((c) => c.level === "pass");
  const openAmber = sampleCount(ambers.length);
  const openPassed = Math.max(sampleCount(passed.length), passed.length ? 1 : 0);
  return (
    <>
      {ambers.length > 0 && (
        <>
          <PartHead part="amber" note={<Shown n={openAmber} of={ambers.length} />}>
            <T en="Things to watch" bn="নজরে রাখার বিষয়" />
          </PartHead>
          <ul className="mt-1 grid gap-2">
            {ambers.map((c, i) => (
              <li key={c.key} className="rp-check" data-level="amber">
                <span className="rp-check-dot" aria-hidden="true" />
                <span className="min-w-0 flex-1 text-sm">
                  <b className="block text-text-main">{tx(c.label)}</b>
                  {i < openAmber ? <span className="text-text-muted">{tx(c.detail)}</span> : <Hidden kind="text" />}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
      {passed.length > 0 && (
        <>
          <PartHead part="passed" note={<Shown n={openPassed} of={passed.length} />}>
            <T en={`Passed ${passed.length} checks`} bn={`${passed.length}টি যাচাইয়ে উত্তীর্ণ`} />
          </PartHead>
          <ul className="rp-passed">
            {passed.map((c, i) => (
              <li key={c.key} className="text-xs leading-snug text-text-main">
                <IconCheck size={12} />
                <span className="min-w-0">
                  {i < openPassed ? tx(c.detail) : (
                    <>
                      {tx(c.label)}
                      <span className="block"><Hidden kind="text" size="xs" /></span>
                    </>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}

// ------------------------------------------------------------------ price

export function PricePreview({ s }: { s: PriceSection }) {
  // One method open: the last one listed (rarely the one that sets the middle
  // of the range), so the reader sees what a method looks like.
  const openMethod = s.methods.length >= 2 ? s.methods.length - 1 : -1;
  return (
    <>
      {s.fair && (
        <>
          <PartHead part="fair" note={openMethod >= 0 ? <Shown n={1} of={s.methods.length} /> : undefined}>
            <T en="Our fair range, worked out several ways" bn="কয়েকভাবে হিসাব করা আমাদের ন্যায্য দাম" />
          </PartHead>
          <div className="rp-strip" aria-hidden="true">
            <div className="rp-strip-axis" />
            <div className="rp-strip-today" style={{ left: "30%" }} />
            <span className="rp-strip-tl text-xs font-bold text-text-main" style={{ left: "calc(30% - 8px)" }}>
              <T en={`Today ${money(s.today)}`} bn={`আজ ${money(s.today)}`} />
            </span>
            <span className="rp-strip-rl" style={{ left: "45%" }}><Hidden kind="tk" size="xs" /></span>
            <span className="rp-strip-rl" style={{ left: "78%" }}><Hidden kind="tk" size="xs" /></span>
          </div>
          <ul className="rp-rows mt-0">
            {s.methods.map((m, i) => (
              <Row key={i} label={tx(m.label)} value={i === openMethod ? money(m.price) : undefined} />
            ))}
          </ul>
        </>
      )}
      {s.buy_below != null && (
        <div className="rp-note flex flex-wrap items-center justify-between gap-3">
          <span className="flex items-center gap-2 text-sm font-bold text-text-main">
            <T en="Buy below" bn="এর নিচে কিনুন" /> <Hidden kind="tk" />
            <PartTag part="buy_below" />
          </span>
          <span className="rp-ghost-btn"><IconBell size={14} /><T en="Alert me" bn="অ্যালার্ট দিন" /><IconLock size={12} /></span>
        </div>
      )}
      {s.scenarios.length > 0 && (
        <>
          <PartHead part="scenarios" note={<Shown n={1} of={s.scenarios.length} />}>
            <T en="Next 12 months, if…" bn="আগামী 12 মাসে, যদি…" />
          </PartHead>
          {/* The cautious case is the free one. */}
          <ul className="rp-rows mt-0">
            {s.scenarios.map((sc, i) => (
              <Row key={i} label={tx(sc.label)} value={i === 0 ? money(sc.price) : undefined} />
            ))}
          </ul>
        </>
      )}
    </>
  );
}

// ------------------------------------------------------------------ dividend

export function DividendPreview({ s }: { s: DividendSection }) {
  const maxH = Math.max(1, ...s.history.map((h) => h.cash_ps));
  const any = s.payout_pct != null || s.cash_cover != null || s.next_range != null;
  return (
    <>
      {any && (
        <div className="rp-facts" data-cols="3">
          {s.payout_pct != null && (
            <div>
              <span className="flex items-center text-xs font-semibold text-text-muted">
                <T en="Share of profit paid" bn="মুনাফার কত অংশ দিল" /><PartTag part="safety" />
              </span>
              {/* Free sample: the payout. Cash cover and next year stay grey. */}
              <b className="text-base tabular-nums nums text-text-main">{Math.round(s.payout_pct)}%</b>
            </div>
          )}
          {s.cash_cover != null && (
            <div>
              <span className="block text-xs font-semibold text-text-muted"><T en="Covered by cash" bn="নগদে কতবার ঢাকা" /></span>
              <Hidden kind="x" size="lg" />
            </div>
          )}
          {s.next_range && (
            <div>
              <span className="flex items-center text-xs font-semibold text-text-muted">
                <T en="Next year, likely" bn="আগামী বছর, সম্ভাব্য" /><PartTag part="history" />
              </span>
              <Hidden kind="range" size="lg" />
            </div>
          )}
        </div>
      )}
      {/* The ten-year record is public (the data room has it); shown as is. */}
      {s.history.length >= 2 && (
        <>
          <div className="rp-bars" aria-hidden="true">
            {s.history.map((h) => (
              <div key={h.year} className="rp-col">
                <span className="mb-1 text-xs font-bold tabular-nums nums text-text-main">
                  {h.cash_ps >= 10 ? h.cash_ps.toFixed(0) : h.cash_ps.toFixed(1)}
                </span>
                <div className="rp-bar" data-tone="last" style={{ height: `${(h.cash_ps / (maxH * 1.1)) * 80}%` }} />
              </div>
            ))}
          </div>
          <div className="rp-xl" aria-hidden="true">
            {s.history.map((h) => <span key={h.year} className="text-xs text-text-muted">{`'${String(h.year).slice(2)}`}</span>)}
          </div>
        </>
      )}
    </>
  );
}

// ------------------------------------------------------------------ this year

export function ThisYearPreview({ s }: { s: ThisYearSection }) {
  const vals = s.quarters.flatMap((q) => [q.cur, q.prev]).filter((v): v is number => v != null);
  const max = Math.max(0.01, ...vals.map((v) => Math.abs(v))) * 1.15;
  const h = (v: number | null) => (v == null ? "0%" : `${Math.max(0, v / max) * 80}%`);
  const openQ = sampleCount(s.quarters.length);
  return (
    <>
      {s.quarters.length > 0 && (
        <>
          <PartHead part="quarters" note={<Shown n={openQ} of={s.quarters.length} />}>
            <T en="Each quarter, against last year" bn="প্রতিটি প্রান্তিক, গত বছরের সঙ্গে" />
          </PartHead>
          <div className="rp-qbars" aria-hidden="true">
            {s.quarters.map((q, qi) => (
              <div key={q.q} className="rp-grp">
                {[q.prev, q.cur].map((v, j) => (
                  <div key={j} className="rp-col">
                    {qi < openQ ? (
                      <span className="mb-1 text-xs font-bold tabular-nums nums text-text-main">{v == null ? "" : v.toFixed(2)}</span>
                    ) : (
                      <Hidden kind="num" size="xs" dots="•.••" />
                    )}
                    <div
                      className="rp-bar mt-1"
                      data-tone={j === 0 ? "last" : undefined}
                      style={{ height: h(v), opacity: j === 1 && qi >= openQ ? 0.45 : 1 }}
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div className="rp-xl" aria-hidden="true">
            {s.quarters.map((q) => <span key={q.q} className="text-xs text-text-muted">{tx(q.label)}</span>)}
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
      {s.cash_ytd && (
        <ul className="rp-rows">
          <Row label={tx(s.cash_ytd.label)} part="cash" />
        </ul>
      )}
      {s.next && (
        <div className="rp-note text-sm text-text-main">
          <p className="flex items-center font-bold">
            <T en="The next results, and the number to beat" bn="পরের ফল, আর ছাড়িয়ে যাওয়ার সংখ্যা" />
            <PartTag part="next" />
          </p>
          <p className="mt-1">
            <T en="The number to beat: " bn="ছাড়িয়ে যেতে হবে: " />
            <Hidden kind="tk" />
          </p>
        </div>
      )}
    </>
  );
}

// ------------------------------------------------------------------ what's next

export function NextPreview({ s }: { s: NextSection }) {
  const items = s.items.filter((it) => it.expect);
  if (!items.length) return null;
  const open = sampleCount(items.length);
  return (
    <>
      <PartHead part="expect" note={<Shown n={open} of={items.length} />}>
        <T en="What to expect at each date" bn="প্রতিটি তারিখে কী আশা করা যায়" />
      </PartHead>
      <ul className="mt-1 grid gap-3">
        {items.map((it, i) => (
          <li key={i} className="text-sm">
            <b className="block text-text-main">{tx(it.label)}</b>
            {i < open ? <span className="text-text-main">{tx(it.expect)}</span> : <Hidden kind="text" />}
          </li>
        ))}
      </ul>
    </>
  );
}

// ------------------------------------------------------------------ owners

const crore = (mn: number) => `৳${mn / 10 >= 100 ? Math.round(mn / 10).toLocaleString("en-US") : (mn / 10).toFixed(1)}`;

export function OwnersPreview({ s }: { s: OwnersSection }) {
  // Two or more trades: the newest one in full. A single trade: its size
  // only — its value and the price paid stay grey.
  const full = sampleCount(s.trades.length);
  const openTrend = sampleCount(s.trend.length);
  return (
    <>
      {s.trades.length > 0 && (
        <>
          <PartHead part="trades" note={<Shown n={full} of={s.trades.length} />}>
            <T en="Each insider trade" bn="প্রতিটি লেনদেন" />
          </PartHead>
          <ul className="rp-timeline">
            {s.trades.map((t, i) => {
              const open = i < full;
              const sizeOpen = open || s.trades.length === 1;
              return (
                <li key={i} data-side={t.side}>
                  <b className="block text-sm text-text-main">{tx(t.role)}</b>
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-text-main">
                    <T en={t.side === "buy" ? "Bought" : "Sold"} bn={t.side === "buy" ? "কিনেছেন" : "বিক্রি করেছেন"} />
                    {sizeOpen ? <b className="tabular-nums nums">{t.shares.toLocaleString("en-US")}</b> : <Hidden kind="num" dots="•,•••,•••" />}
                    <T en="shares, worth about" bn="শেয়ার, মূল্য প্রায়" />
                    {open && t.value_mn != null ? (
                      <b className="tabular-nums nums"><T en={`${crore(t.value_mn)} crore`} bn={`${crore(t.value_mn)} কোটি`} /></b>
                    ) : (
                      <Hidden kind="tk" dots="৳ ••• crore" />
                    )}
                  </span>
                  <span className="block text-xs text-text-muted">
                    {t.declared && (<><T en="Declared " bn="ঘোষণা " /><DateT iso={t.declared} /></>)}
                    {t.done && (<>{t.declared ? " · " : ""}<T en="done " bn="সম্পন্ন " /><DateT iso={t.done} /></>)}
                    {" · "}
                    <T en="price then " bn="তখন দাম " />
                    {open && t.price_low != null && t.price_high != null ? (
                      <b className="text-text-main">{`${money(t.price_low)}–${money(t.price_high)}`}</b>
                    ) : (
                      <Hidden kind="range" size="xs" />
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        </>
      )}
      {s.trend.length > 0 && (
        <>
          <PartHead part="trend" note={<Shown n={openTrend} of={s.trend.length} />}>
            <T en="How each group moved" bn="কোন পক্ষ কতটা বদলেছে" />
          </PartHead>
          <ul className="rp-rows mt-0">
            {s.trend.map((g, i) => (
              <Row
                key={i}
                label={tx(g.group)}
                value={i < openTrend ? `${g.from_pct.toFixed(1)}% → ${g.to_pct.toFixed(1)}%` : undefined}
                kind="pct"
              />
            ))}
          </ul>
        </>
      )}
    </>
  );
}

// ------------------------------------------------------------------ cash

export function CashPreview({ s }: { s: CashSection }) {
  if (s.years.length < 2) return null;
  const max = Math.max(110, ...s.years.map((y) => y.ratio)) * 1.08;
  const h = (v: number) => `${Math.max(0, Math.min(1, v / max)) * 80}%`;
  // The oldest years are the free sample; the latest — the answer — stays grey.
  const open = sampleCount(s.years.length);
  return (
    <>
      <PartHead part="bars" note={<Shown n={open} of={s.years.length} />}>
        <T en="Cash for every ৳100 of profit, by year" bn="প্রতি ৳100 মুনাফায় নগদ, বছর ধরে" />
      </PartHead>
      <div className="rp-bars" aria-hidden="true">
        {s.years.map((y, i) => (
          <div key={y.year} className="rp-col">
            {i < open ? (
              <span className="mb-1 text-xs font-bold tabular-nums nums text-text-main">৳{Math.round(y.ratio)}</span>
            ) : (
              <Hidden kind="tk" size="xs" dots="৳ ••" />
            )}
            <div className="rp-bar mt-1" style={{ height: h(Math.max(0, y.ratio)), opacity: i < open ? 1 : 0.45 }} />
          </div>
        ))}
        <div className="rp-ref" style={{ bottom: h(100) }}>
          <span><T en="৳100 = all of it as cash" bn="৳100 = পুরোটাই নগদে" /></span>
        </div>
      </div>
      <div className="rp-xl" aria-hidden="true">
        {s.years.map((y) => <span key={y.year} className="text-xs text-text-muted">{y.year}</span>)}
      </div>
    </>
  );
}

// ------------------------------------------------------------------ safety

export function SafetyPreview({ s }: { s: SafetySection }) {
  if (!s.facts.length) return null;
  const open = sampleCount(s.facts.length);
  return (
    <>
      <PartHead part="facts" note={<Shown n={open} of={s.facts.length} />}>
        <T en="What we checked" bn="যা যাচাই করেছি" />
      </PartHead>
      <ul className="rp-rows mt-0">
        {s.facts.map((f, i) => <Row key={i} label={tx(f.label)} value={i < open ? tx(f.value) : undefined} kind="text" />)}
      </ul>
    </>
  );
}

// ------------------------------------------------------------------ story

export function StoryPreview({ s }: { s: StorySection }) {
  if (!s.growth) return null;
  return (
    <div className="rp-facts" data-cols="3">
      <div>
        <span className="block text-xs font-semibold text-text-muted"><T en="Span" bn="সময়কাল" /></span>
        <b className="text-base text-text-main"><T en={`${s.growth.years} years`} bn={`${s.growth.years} বছর`} /></b>
      </div>
      <div>
        <span className="block text-xs font-semibold text-text-muted"><T en="Sales growth a year" bn="বছরে বিক্রি বৃদ্ধি" /></span>
        <b className="text-base tabular-nums nums text-text-main">{signedPct(s.growth.sales_pct)}</b>
      </div>
      <div>
        <span className="block text-xs font-semibold text-text-muted"><T en="Profit growth a year" bn="বছরে মুনাফা বৃদ্ধি" /></span>
        <Hidden kind="pct" size="lg" />
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ risks

export function RisksPreview({ s }: { s: RisksSection }) {
  if (!s.items.length) return null;
  const open = sampleCount(s.items.length);
  return (
    <>
      <PartHead part="items" note={<Shown n={open} of={s.items.length} />}>
        <T en={`The ${s.items.length} biggest risks`} bn={`সবচেয়ে বড় ${s.items.length}টি ঝুঁকি`} />
      </PartHead>
      <ol className="mt-1 grid gap-3">
        {s.items.map((r, i) => (
          <li key={i} className="flex gap-3">
            <span className="rp-n" aria-hidden="true">{i + 1}</span>
            <span className="min-w-0 flex-1 pt-1.5">
              {i < open ? <span className="block text-sm text-text-main">{tx(r.text)}</span> : <span className="block text-sm"><Hidden kind="text" /></span>}
              {r.trigger && (
                <span className="mt-1.5 block text-xs text-text-muted">
                  <T en="What would change our view: " bn="যা হলে আমাদের মত বদলাবে: " />
                  <Hidden kind="text" size="xs" />
                </span>
              )}
            </span>
          </li>
        ))}
      </ol>
    </>
  );
}

// ------------------------------------------------------------------ alternatives

export function AlternativesPreview({ s }: { s: AlternativesSection }) {
  // The first one's numbers and its one-line comparison are free; who it is
  // stays hidden (the row lock's rule).
  return (
    <>
      <PartHead part="names" note={s.count > 1 ? <Shown n={1} of={s.count} /> : undefined}>
        <T en={`${s.count} ${s.count === 1 ? "company" : "companies"} to compare`} bn={`তুলনার জন্য ${s.count}টি কোম্পানি`} />
      </PartHead>
      <ul className="rp-rows mt-0">
        {s.items.map((a, i) => (
          <li key={i} className="text-sm">
            <span className="min-w-0 flex-1">
              <span className="lk-name"><span className="lk-mask" style={{ width: `${120 + i * 18}px` }} /><IconLock size={14} /></span>
              {i === 0 ? (
                <span className="mt-1 block text-xs text-text-muted">{tx(a.why)}</span>
              ) : (
                <span className="mt-1 block"><Hidden kind="text" size="xs" /></span>
              )}
            </span>
            {i === 0 ? (
              <span className="shrink-0 text-right text-xs text-text-muted tabular-nums nums">
                <b className="block text-sm text-text-main">{a.score != null ? Math.round(a.score) : "--"}/100</b>
                {a.pe != null && <T en={`P/E ${a.pe.toFixed(1)}`} bn={`পিই ${a.pe.toFixed(1)}`} />}
              </span>
            ) : (
              <Hidden kind="num" dots="••/100" />
            )}
          </li>
        ))}
      </ul>
    </>
  );
}

