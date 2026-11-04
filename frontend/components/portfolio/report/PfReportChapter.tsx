"use client";

import Link from "next/link";
import { TONE_CLASS, ToneChip, tx } from "@/components/report/chip";
import { CompareBars, DateLine, HundredBar } from "@/components/stock/visuals/kit";
import { IconAlert, IconChevronDown, IconCrown } from "@/components/ui/icons";
import { T } from "@/components/i18n/T";
import type { PfChapter, PfFigure, PfPicture, PfRow } from "@/lib/portfolio-report";

/**
 * One chapter of the portfolio report (2026-10-30), redone clean 2026-11-04
 * (user: "the whole portfolio analysis section looks bit unorganized and too
 * much text"). ONE card per chapter: the question as its title, the answer
 * chip beside it and one count line under it — no lead line, and no written
 * "read" (it only repeated the rows' first sentences). Then the rows, split
 * by hairlines (`PfQuestion`). Premium: the page hides every chapter from a
 * free reader under one `Locked` and shows its one Premium card instead.
 */
export default function PfReportChapter({ chapter }: { chapter: PfChapter }) {
  return (
    <section id={chapter.id} className="dash-section pf-chapter pfc-wrap" aria-labelledby={`${chapter.id}-h`}>
      <div className="soft-card pfc">
        <header className="pfc-head">
          <h2 id={`${chapter.id}-h`} className="pfc-title">{tx(chapter.title)}</h2>
          <div className="pfc-answer">
            <ToneChip word={chapter.head.word} tone={chapter.head.tone} size="lg" />
            <span className="pfc-sub">{tx(chapter.head.line)}</span>
          </div>
        </header>
        {chapter.rows.map((r) => (
          <PfQuestion key={r.key} row={r} />
        ))}
      </div>
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
function PfQuestion({ row }: { row: PfRow }) {
  const hasMore = row.meaning.length > 0 || row.figures.length > 0;
  return (
    <section id={`pf-q-${row.key}`} className="pfq dash-section" aria-labelledby={`pf-q-${row.key}-t`}>
      <div className="pfq-head">
        <h3 id={`pf-q-${row.key}-t`}>{tx(row.title)}</h3>
        {row.word && <ToneChip word={row.word} tone={row.tone} />}
      </div>
      {row.headline && <p className="pfq-answer">{tx(row.headline)}</p>}
      {row.picture && (
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
        <details className="pfq-more">
          <summary>
            <span>
              {row.meaning.length > 0 && row.figures.length > 0 ? (
                <T en="Why it matters · the figures" bn="কেন জরুরি · সংখ্যাগুলো" />
              ) : row.meaning.length > 0 ? (
                <T en="Why it matters" bn="কেন জরুরি" />
              ) : (
                <T en="See the figures" bn="সংখ্যাগুলো দেখুন" />
              )}
            </span>
            <span className="pfq-more-icon" aria-hidden="true">
              <IconChevronDown size={16} />
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

/** The figures behind an answer: one line per share or sector. */
function PfFigures({ figures }: { figures: PfFigure[] }) {
  return (
    <ul className="pfr-figs">
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
          en={`Checked again after every close · ${answered} questions answered`}
          bn={`প্রতিদিন বাজার বন্ধের পর আবার যাচাই · ${answered}টি প্রশ্নের উত্তর`}
        />
      </p>
    </header>
  );
}
