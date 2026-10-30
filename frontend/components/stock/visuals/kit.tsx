import type { CSSProperties, ReactNode } from "react";
import type { Tone } from "@/lib/stock-report";

/**
 * THE picture kit of the stock report (2026-10-30 rebuild, plan
 * https://claude.ai/artifact/9AjhtrCYGSjS2Lx9Kajjg7). Every answer on the
 * page is one of these small pictures, a plain line under it, numbers last.
 *
 * Server components, plain HTML/CSS (+ a little SVG with no text inside), so
 * the picture is in the first paint and in the HTML Google reads — Recharts'
 * ResponsiveContainer draws nothing server-side. Labels are ReactNode, so the
 * caller passes `<T en bn />` pairs. Colour means one thing everywhere: green
 * good, amber check this, red bad, clay this company, grey everyone else.
 * Every picture has an `aria-label` that says it as a sentence. Styles:
 * `rv-*` in `app/styles/report-visuals.css`.
 */

const clamp = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));

/** Keep an absolutely placed label inside its box: centred, or pinned to an
 *  edge when the point is near one. */
function anchor(p: number): CSSProperties {
  const shift = p < 14 ? 0 : p > 86 ? 100 : 50;
  return { left: `${p}%`, transform: `translateX(-${shift}%)` };
}

/** A picture with an optional one-line caption under it. */
function Fig({ children, caption, className = "" }: { children: ReactNode; caption?: ReactNode; className?: string }) {
  return (
    <figure className={`rv-fig ${className}`.trim()}>
      {children}
      {caption && <figcaption className="rv-cap">{caption}</figcaption>}
    </figure>
  );
}

// ------------------------------------------------------------------ compare bars

/** One figure against others, as horizontal bars: "you pay ৳7, it usually
 *  costs ৳10, its sector ৳12". The `me` row is clay, the rest grey. */
export function CompareBars({
  rows,
  label,
  caption,
}: {
  rows: { key: string; name: ReactNode; value: number; text: ReactNode; me?: boolean }[];
  label: string;
  caption?: ReactNode;
}) {
  const max = Math.max(0.0001, ...rows.map((r) => r.value));
  return (
    <Fig caption={caption}>
      <div className="rv-cmp" role="img" aria-label={label}>
        {rows.map((r) => (
          <div key={r.key} className="rv-cmp-row">
            <span className="rv-cmp-name">{r.name}</span>
            <span className="rv-track">
              <span className="rv-fill" data-me={r.me ? "true" : undefined} style={{ width: `${clamp((r.value / max) * 100, 3)}%` }} />
            </span>
            <b className="rv-cmp-val">{r.text}</b>
          </div>
        ))}
      </div>
    </Fig>
  );
}

// ------------------------------------------------------------------ meter

/** Zones on a line with pins on it: cheap / fair / expensive with today's
 *  price, or comfortable / watch / heavy for loans. The `main` pin's label
 *  sits above the bar, the others under it. */
export function Meter({
  min,
  max,
  zones,
  pins,
  label,
  caption,
}: {
  min: number;
  max: number;
  zones: { key: string; from: number; to: number; tone: Tone; name: ReactNode }[];
  pins: { key: string; value: number; text: ReactNode; main?: boolean }[];
  label: string;
  caption?: ReactNode;
}) {
  const span = max - min || 1;
  const pos = (v: number) => clamp(((v - min) / span) * 100);
  const main = pins.filter((p) => p.main);
  const minor = pins.filter((p) => !p.main);
  return (
    <Fig caption={caption}>
      <div className="rv-meter" role="img" aria-label={label}>
        <div className="rv-meter-top">
          {main.map((p) => (
            <span key={p.key} className="rv-meter-lab" data-main="true" style={anchor(pos(p.value))}>{p.text}</span>
          ))}
        </div>
        <div className="rv-meter-bar">
          <span className="rv-meter-zones">
            {zones.map((z) => (
              <span
                key={z.key}
                className="rv-zone"
                data-tone={z.tone}
                style={{ left: `${pos(z.from)}%`, width: `${Math.max(0, pos(z.to) - pos(z.from))}%` }}
              />
            ))}
          </span>
          {pins.map((p) => (
            <span key={p.key} className="rv-pin" data-main={p.main ? "true" : undefined} style={{ left: `${pos(p.value)}%` }} />
          ))}
        </div>
        {minor.length > 0 && (
          <div className="rv-meter-low">
            {minor.map((p) => (
              <span key={p.key} className="rv-meter-lab" style={anchor(pos(p.value))}>{p.text}</span>
            ))}
          </div>
        )}
        <div className="rv-meter-names">
          {zones.map((z) => (
            <span key={z.key} data-tone={z.tone} style={{ width: `${Math.max(0, pos(z.to) - pos(z.from))}%` }}>{z.name}</span>
          ))}
        </div>
      </div>
    </Fig>
  );
}

// ------------------------------------------------------------------ ৳100 bar

export type Swatch = "primary" | "good" | "fair" | "bad" | "info" | "gold" | "navy" | "quiet";

/** "Out of every ৳100 …": one bar split into parts that add up to at most
 *  100; the rest is the grey track. A key under it names each part. */
export function HundredBar({
  parts,
  label,
  caption,
}: {
  parts: { key: string; value: number; text: ReactNode; swatch: Swatch }[];
  label: string;
  caption?: ReactNode;
}) {
  return (
    <Fig caption={caption}>
      <div className="rv-hundred" role="img" aria-label={label}>
        {parts.map((p) => (
          <span key={p.key} data-swatch={p.swatch} style={{ width: `${clamp(p.value)}%` }} />
        ))}
      </div>
      <ul className="rv-key">
        {parts.map((p) => (
          <li key={p.key}>
            <i data-swatch={p.swatch} aria-hidden="true" />
            {p.text}
          </li>
        ))}
      </ul>
    </Fig>
  );
}

// ------------------------------------------------------------------ 100 squares

/** "Of every 100 shares …": a 10 × 10 grid coloured by group (largest
 *  remainder, so the squares always add up to 100). */
export function Squares({
  parts,
  label,
  caption,
}: {
  parts: { key: string; value: number; text: ReactNode; swatch: Swatch }[];
  label: string;
  caption?: ReactNode;
}) {
  const total = parts.reduce((a, p) => a + Math.max(0, p.value), 0) || 1;
  const raw = parts.map((p) => (Math.max(0, p.value) / total) * 100);
  const counts = raw.map(Math.floor);
  let left = 100 - counts.reduce((a, b) => a + b, 0);
  raw
    .map((r, i) => ({ i, rem: r - Math.floor(r) }))
    .sort((a, b) => b.rem - a.rem)
    .forEach(({ i }) => {
      if (left > 0) {
        counts[i] += 1;
        left -= 1;
      }
    });
  const cells: Swatch[] = parts.flatMap((p, i) => Array.from({ length: counts[i] }, () => p.swatch));
  return (
    <Fig caption={caption} className="rv-sq-fig">
      <div className="rv-squares" role="img" aria-label={label}>
        {cells.map((sw, i) => (
          <i key={i} data-swatch={sw} />
        ))}
      </div>
      <ul className="rv-key rv-key-col">
        {parts.map((p, i) => (
          <li key={p.key}>
            <i data-swatch={p.swatch} aria-hidden="true" />
            <span className="min-w-0">{p.text}</span>
            <b className="rv-key-n">{counts[i]}</b>
          </li>
        ))}
      </ul>
    </Fig>
  );
}

// ------------------------------------------------------------------ check dots

/** One dot per check: red first, then amber, then the passed ones. */
export function CheckDots({ red, amber, pass, label, caption }: { red: number; amber: number; pass: number; label: string; caption?: ReactNode }) {
  const dots = [
    ...Array.from({ length: red }, () => "bad"),
    ...Array.from({ length: amber }, () => "fair"),
    ...Array.from({ length: pass }, () => "good"),
  ];
  return (
    <Fig caption={caption}>
      <div className="rv-dots" role="img" aria-label={label}>
        {dots.map((t, i) => (
          <i key={i} data-tone={t}>
            {t === "bad" ? "!" : ""}
          </i>
        ))}
      </div>
    </Fig>
  );
}

// ------------------------------------------------------------------ this year vs last

/** Pairs of bars (last year grey, this year dark) with the change printed
 *  over each pair, so nobody compares heights by eye. */
export function PairBars({
  items,
  label,
  legend,
}: {
  items: { key: string | number; name: ReactNode; prev: number | null; cur: number | null }[];
  label: string;
  /** The two legend labels: last year, this year. */
  legend: [ReactNode, ReactNode];
}) {
  const vals = items.flatMap((q) => [q.prev, q.cur]).filter((v): v is number => v != null);
  const max = Math.max(0.01, ...vals.map((v) => Math.abs(v)));
  const h = (v: number | null) => `${v == null ? 0 : clamp((Math.max(0, v) / max) * 100)}%`;
  return (
    <Fig>
      <div className="rv-pairs" role="img" aria-label={label}>
        {items.map((q) => {
          const pct = q.prev != null && q.cur != null && q.prev > 0 ? ((q.cur - q.prev) / q.prev) * 100 : null;
          return (
            <div key={q.key} className="rv-pair">
              <span className="rv-pair-tag" data-tone={pct == null ? undefined : pct >= 0 ? "good" : "bad"}>
                {pct == null ? "" : `${pct >= 0 ? "+" : "−"}${Math.abs(pct).toFixed(0)}%`}
              </span>
              <div className="rv-pair-bars">
                <span data-kind="prev" style={{ height: h(q.prev) }} />
                <span data-kind="cur" data-neg={q.cur != null && q.cur < 0 ? "true" : undefined} style={{ height: h(q.cur) }} />
              </div>
              <span className="rv-pair-name">{q.name}</span>
            </div>
          );
        })}
      </div>
      <p className="rv-legend">
        <span><i data-kind="prev" aria-hidden="true" />{legend[0]}</span>
        <span><i data-kind="cur" aria-hidden="true" />{legend[1]}</span>
      </p>
    </Fig>
  );
}

// ------------------------------------------------------------------ year bars

/** One bar a year, the latest coloured; an optional reference line. */
export function YearBars({
  items,
  max,
  refLine,
  label,
  caption,
}: {
  items: { key: string | number; value: number; text: string; x: ReactNode; tone?: Tone }[];
  max: number;
  refLine?: { value: number; text: ReactNode };
  label: string;
  caption?: ReactNode;
}) {
  const h = (v: number) => `${clamp((v / max) * 100)}%`;
  return (
    <Fig caption={caption}>
      <div className="rv-years" role="img" aria-label={label}>
        {items.map((it) => (
          <div key={it.key} className="rv-year">
            <span className="rv-year-v">{it.text}</span>
            <span className="rv-year-bar" data-tone={it.tone === "neutral" ? undefined : it.tone} style={{ height: h(it.value) }} />
          </div>
        ))}
        {refLine && (
          <div className="rv-ref" style={{ bottom: h(refLine.value) }}>
            <span>{refLine.text}</span>
          </div>
        )}
      </div>
      <div className="rv-years-x" aria-hidden="true">
        {items.map((it) => (
          <span key={it.key}>{it.x}</span>
        ))}
      </div>
    </Fig>
  );
}

// ------------------------------------------------------------------ date line

/** The dates coming up, left to right from today. Even spacing (real-day
 *  spacing piles labels on top of each other); each says how far away it is. */
export function DateLine({
  items,
  label,
}: {
  items: { key: string; name: ReactNode; when: ReactNode; strong?: boolean; tone?: Tone }[];
  label: string;
}) {
  return (
    <div className="rv-dates" role="img" aria-label={label} style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
      {items.map((it) => (
        <div key={it.key} className="rv-date" data-strong={it.strong ? "true" : undefined} data-tone={it.tone}>
          <span className="rv-date-dot" aria-hidden="true" />
          <span className="rv-date-name">{it.name}</span>
          <span className="rv-date-when">{it.when}</span>
        </div>
      ))}
    </div>
  );
}

// ------------------------------------------------------------------ rank line

/** Where it stands among its peers: one dot per company (a bar past 24),
 *  best on the left, this company clay. */
export function RankLine({ rank, of, name, value, label }: { rank: number; of: number; name: ReactNode; value: ReactNode; label: string }) {
  const many = of > 24;
  return (
    <div className="rv-rank">
      <div className="rv-rank-head">
        <span className="rv-rank-name">{name}</span>
        <span className="rv-rank-val">{value}</span>
      </div>
      {many ? (
        <div className="rv-rank-bar" role="img" aria-label={label}>
          <span style={{ left: `${clamp(((rank - 1) / Math.max(1, of - 1)) * 100)}%` }} />
        </div>
      ) : (
        <div className="rv-rank-dots" role="img" aria-label={label}>
          {Array.from({ length: of }, (_, i) => (
            <i key={i} data-me={i + 1 === rank ? "true" : undefined}>
              {i + 1 === rank ? rank : ""}
            </i>
          ))}
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ trend line

/** Ten years of sales and profit as two lines (SVG, no text inside: the
 *  labels are HTML so they switch language). Values may be null or negative. */
export function TrendLine({
  series,
  label,
  from,
  to,
  caption,
}: {
  series: { key: string; values: (number | null)[]; swatch: Swatch; name: ReactNode; note?: ReactNode }[];
  label: string;
  from: ReactNode;
  to: ReactNode;
  caption?: ReactNode;
}) {
  const W = 300;
  const H = 96;
  const pad = 6;
  const n = Math.max(...series.map((s) => s.values.length));
  const all = series.flatMap((s) => s.values).filter((v): v is number => v != null);
  if (n < 2 || !all.length) return null;
  const lo = Math.min(0, ...all);
  const hi = Math.max(...all);
  const y = (v: number) => H - pad - ((v - lo) / (hi - lo || 1)) * (H - pad * 2);
  const x = (i: number) => pad + (i / (n - 1)) * (W - pad * 2);
  return (
    <Fig caption={caption}>
      <svg className="rv-trend" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label={label}>
        {lo < 0 && <line x1={0} x2={W} y1={y(0)} y2={y(0)} className="rv-trend-zero" vectorEffect="non-scaling-stroke" />}
        {series.map((s) => {
          const pts = s.values.map((v, i) => (v == null ? null : `${x(i).toFixed(1)},${y(v).toFixed(1)}`)).filter(Boolean);
          return (
            <polyline
              key={s.key}
              points={pts.join(" ")}
              fill="none"
              data-swatch={s.swatch}
              className="rv-trend-line"
              vectorEffect="non-scaling-stroke"
            />
          );
        })}
      </svg>
      <div className="rv-trend-x" aria-hidden="true">
        <span>{from}</span>
        <span>{to}</span>
      </div>
      <ul className="rv-key">
        {series.map((s) => (
          <li key={s.key}>
            <i data-swatch={s.swatch} aria-hidden="true" />
            {s.name}
            {s.note && <span className="rv-key-note">{s.note}</span>}
          </li>
        ))}
      </ul>
    </Fig>
  );
}

// ------------------------------------------------------------------ money steps

/** "৳10,000 today → 24 shares → ৳885 a year": money followed through. */
export function MoneySteps({ steps, label }: { steps: { key: string; value: string; name: ReactNode; tone?: Tone }[]; label: string }) {
  return (
    <div className="rv-steps" role="img" aria-label={label}>
      {steps.map((s, i) => (
        <div key={s.key} className="rv-step-wrap">
          {i > 0 && <span className="rv-step-arrow" aria-hidden="true">→</span>}
          <div className="rv-step">
            <b data-tone={s.tone}>{s.value}</b>
            <span>{s.name}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ------------------------------------------------------------------ three paths

/** Three prices for the next year, each a bar out from today's price: up to
 *  the right in green, down to the left in red. */
export function Paths({
  today,
  paths,
  label,
  todayText,
  caption,
}: {
  today: number;
  paths: { key: string; price: number; priceText: string; name: ReactNode }[];
  label: string;
  todayText: ReactNode;
  caption?: ReactNode;
}) {
  const pcts = paths.map((p) => ((p.price - today) / today) * 100);
  const max = Math.max(5, ...pcts.map((v) => Math.abs(v)));
  return (
    <Fig caption={caption}>
      <div className="rv-paths" role="img" aria-label={label}>
        <p className="rv-paths-today">{todayText}</p>
        {paths.map((p, i) => {
          const v = pcts[i];
          const w = `${clamp((Math.abs(v) / max) * 50, 1, 50)}%`;
          return (
            <div key={p.key} className="rv-path">
              <span className="rv-path-name">{p.name}</span>
              <span className="rv-path-track">
                <span className="rv-path-mid" aria-hidden="true" />
                <span className="rv-path-bar" data-tone={v >= 0 ? "good" : "bad"} style={v >= 0 ? { left: "50%", width: w } : { right: "50%", width: w }} />
              </span>
              <b className="rv-path-val">
                {p.priceText}
                <span data-tone={v >= 0 ? "good" : "bad"}>{`${v >= 0 ? "+" : "−"}${Math.abs(v).toFixed(0)}%`}</span>
              </b>
            </div>
          );
        })}
      </div>
    </Fig>
  );
}

// ------------------------------------------------------------------ rating ladder

const LADDER = ["AAA", "AA", "A", "BBB", "BB", "B", "C", "D"];

/** A credit rating on the AAA … D ladder (the "+" / "−" fall into their
 *  letter's step). AAA–BBB is investment grade. */
export function RatingLadder({ grade, label, caption }: { grade: string; label: string; caption?: ReactNode }) {
  const base = grade.toUpperCase().replace(/[^A-D]/g, "");
  const at = LADDER.indexOf(base);
  return (
    <Fig caption={caption}>
      <div className="rv-ladder" role="img" aria-label={label}>
        {LADDER.map((g, i) => (
          <span key={g} data-on={i === at ? "true" : undefined} data-tone={i <= 2 ? "good" : i === 3 ? "fair" : "bad"}>
            {i === at ? grade.toUpperCase() : g}
          </span>
        ))}
      </div>
    </Fig>
  );
}
