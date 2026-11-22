"use client";

import Link from "@/components/ui/Link";
import { TONE_CLASS, ToneChip, tx } from "@/components/report/chip";
import { CompareBars, DateLine, HundredBar } from "@/components/stock/visuals/kit";
import { IconAlert, IconChevronDown } from "@/components/ui/icons";
import { T } from "@/components/i18n/T";
import type { PfFigure, PfPicture, PfRow } from "@/lib/portfolio-report";

/**
 * One question of the portfolio report, in reading order: the question and
 * its answer word, the answer in one sentence, the picture, what it found
 * share by share (a short list), one "watch" line — and folded under one
 * quiet bar, why it matters and the figures. The general text lives in the
 * fold so the open card stays short.
 */
export function PfQuestion({ row, summarized = false }: { row: PfRow; summarized?: boolean }) {
  const hasMore = row.meaning.length > 0 || row.figures.length > 0;
  return (
    <section id={`pf-q-${row.key}`} className="pfq dash-section" aria-labelledby={`pf-q-${row.key}-t`}>
      <div className="pfq-head">
        <h3 id={`pf-q-${row.key}-t`}>{tx(row.title)}</h3>
        {row.word && <ToneChip word={row.word} tone={row.tone} />}
      </div>
      {row.headline && !summarized && <p className="pfq-answer">{tx(row.headline)}</p>}
      {row.picture && !summarized && (
        <div className="pfq-pic">
          <PfPictureView pic={row.picture} />
        </div>
      )}
      {row.points.length > 0 && (
        <ul className="pfq-points">
          {row.points.map((p, i) => (
            <li key={i}>{tx(p)}</li>
          ))}
        </ul>
      )}
      {row.watch && (
        <p className="pfq-watch">
          <span className="pfq-watch-icon" aria-hidden="true">
            <IconAlert size={16} />
          </span>
          <span>{tx(row.watch)}</span>
        </p>
      )}
      {hasMore && (
        // A full-width clay tap bar that says what it holds (2026-11-04, user:
        // the quiet text fold was "hard to find, user may miss this").
        <details className="pfq-more">
          <summary>
            <span className="pfq-more-text">
              <b className="pfq-more-closed">
                {row.meaning.length > 0 && row.figures.length > 0 ? (
                  <T en="Why it matters, and the figures" bn="কেন জরুরি, আর সংখ্যাগুলো" />
                ) : row.meaning.length > 0 ? (
                  <T en="Why it matters" bn="কেন জরুরি" />
                ) : (
                  <T en="See the figures" bn="সংখ্যাগুলো দেখুন" />
                )}
              </b>
              <b className="pfq-more-opened">
                <T en="Hide the details" bn="বিস্তারিত লুকান" />
              </b>
              <span className="pfq-more-hint">
                {row.meaning.length > 0 && row.figures.length > 0 ? (
                  <T en="What it means for you, and the figures behind it" bn="আপনার জন্য এর মানে, আর এর পেছনের হিসাব" />
                ) : row.meaning.length > 0 ? (
                  <T en="What it means for your money" bn="আপনার টাকার জন্য এর মানে" />
                ) : (
                  <T en="The figures behind this answer" bn="এই উত্তরের পেছনের হিসাব" />
                )}
              </span>
            </span>
            <span className="pfq-more-icon" aria-hidden="true">
              <IconChevronDown size={18} />
            </span>
          </summary>
          <div className="pfq-more-body">
            {row.meaning.map((m, i) => (
              <p key={i} className="pfq-more-p">{tx(m)}</p>
            ))}
            {row.figures.length > 0 && <PfFigures figures={row.figures} />}
          </div>
        </details>
      )}
    </section>
  );
}

/** A row's picture, from the stock report's kit. */
export function PfPictureView({ pic }: { pic: PfPicture }) {
  if (pic.kind === "split") {
    return (
      <HundredBar
        label={pic.label}
        parts={pic.parts.map((p) => ({ key: p.key, value: p.value, text: tx(p.text), swatch: p.swatch }))}
      />
    );
  }
  if (pic.kind === "bars") {
    return (
      <CompareBars
        label={pic.label}
        rows={pic.rows.map((r) => ({ key: r.key, name: tx(r.name), value: r.value, text: r.text, me: r.me }))}
      />
    );
  }
  return (
    <DateLine
      label={pic.label}
      items={pic.items.map((it) => ({ key: it.key, name: tx(it.name), when: tx(it.when), strong: it.strong, tone: it.tone }))}
    />
  );
}

/** A value this long reads better under the name than beside it. */
const LONG_VALUE = 26;

/** The figures behind an answer: one line per share or sector. When any
 *  value is long ("৳2,770 · +6% from today · this year's high ৳2,777") the
 *  whole list puts each value under its name (2026-11-04: side by side, a
 *  long value ran over the name on phones). */
function PfFigures({ figures }: { figures: PfFigure[] }) {
  const stack = figures.some((f) => Math.max(f.value.en.length, f.value.bn.length) > LONG_VALUE);
  return (
    <ul className={`pfr-figs${stack ? " pfr-figs--stack" : ""}`}>
      {figures.map((f) => (
        <li key={f.key}>
          {f.code ? (
            <Link prefetch={false} href={`/stock/${f.code}`} className="pfr-figs-k">
              {tx(f.label)}
            </Link>
          ) : (
            <span className="pfr-figs-k">{tx(f.label)}</span>
          )}
          <b className={f.tone ? TONE_CLASS[f.tone] : undefined}>{tx(f.value)}</b>
        </li>
      ))}
    </ul>
  );
}
