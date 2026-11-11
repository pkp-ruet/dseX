"use client";

import Link from "@/components/ui/Link";
import { TONE_CLASS, ToneChip, tx } from "@/components/report/chip";
import { CompareBars, DateLine, HundredBar } from "@/components/stock/visuals/kit";
import { IconAlert, IconChevronDown, IconCrown } from "@/components/ui/icons";
import { T } from "@/components/i18n/T";
import type { PfChapter, PfFigure, PfPicture, PfRow } from "@/lib/portfolio-report";

/** The four areas' names (2026-11-11): what each card is about. */
const AREA_NAME: Record<string, { en: string; bn: string }> = {
  companies: { en: "Your companies", bn: "আপনার কোম্পানি" },
  spread: { en: "Your spread", bn: "টাকার বণ্টন" },
  prices: { en: "Prices today", bn: "আজকের দাম" },
  watch: { en: "To watch", bn: "নজর রাখুন" },
};

/**
 * One area of "Why we say this" (2026-11-11, was one chapter card with every
 * question open; mockup https://claude.ai/artifact/QJjjrtfUu1ZSJ4rd7wvVeY):
 * the area's name and its answer word, one count line, the first question's
 * answer and picture, and the questions folded under ONE bar. The first
 * question inside the fold skips the answer and picture shown above it.
 * Keeps the chapter ids (`#ch-companies` …) the verdict's tiles jump to.
 */
export default function PfArea({ chapter }: { chapter: PfChapter }) {
  const first = chapter.rows[0];
  const name = AREA_NAME[chapter.key] ?? chapter.title;
  const n = chapter.rows.length;
  return (
    <section id={chapter.id} className="soft-card pfar dash-section" aria-labelledby={`${chapter.id}-h`}>
      <header className="pfar-head">
        <h3 id={`${chapter.id}-h`} className="pfar-title">{tx(name)}</h3>
        <ToneChip word={chapter.head.word} tone={chapter.head.tone} />
      </header>
      <p className="pfar-count">{tx(chapter.head.line)}</p>
      {first?.headline && <p className="pfar-ans">{tx(first.headline)}</p>}
      {first?.picture && (
        <div className="pfar-pic">
          <PfPictureView pic={first.picture} />
        </div>
      )}
      {n > 0 && (
        <details className="pfar-qs">
          <summary>
            <span>
              <T en={`${n} question${n === 1 ? "" : "s"} behind this`} bn={`এর পেছনের ${n}টি প্রশ্ন`} />
            </span>
            <IconChevronDown size={16} />
          </summary>
          <div className="pfar-qs-body">
            {chapter.rows.map((r, i) => (
              <PfQuestion key={r.key} row={r} summarized={i === 0} />
            ))}
          </div>
        </details>
      )}
    </section>
  );
}

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

/** The head of the analysis, after your shares (Premium readers): what this
 *  part of the page is, in one line — the one Premium mark here. */
export function PfReportBand({ answered }: { answered: number }) {
  return (
    <header className="pf-check-head">
      <span className="pf-check-badge">
        <IconCrown size={14} />
        <T en="Premium" bn="প্রিমিয়াম" />
      </span>
      <h2 className="pf-check-title">
        <T en="Your portfolio check" bn="আপনার পোর্টফোলিও যাচাই" />
      </h2>
      <p className="pf-check-sub">
        <T
          en={`Checked again after every close · 3 parts · ${answered} answers`}
          bn={`প্রতিদিন বাজার বন্ধের পর আবার যাচাই · 3টি অংশ · ${answered}টি উত্তর`}
        />
      </p>
    </header>
  );
}
