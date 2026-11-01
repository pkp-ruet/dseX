"use client";

import Link from "next/link";
import QuestionRow from "@/components/report/QuestionRow";
import { TONE_CLASS, ToneChip, tx } from "@/components/report/chip";
import { CompareBars, DateLine, HundredBar } from "@/components/stock/visuals/kit";
import { T } from "@/components/i18n/T";
import { PfChapterHead } from "../PfCard";
import type { PfChapter, PfFigure, PfPicture, PfRow } from "@/lib/portfolio-report";

/**
 * One chapter of the portfolio report (2026-10-30) — the stock report's
 * chapter for your money: the question (h2) and one lead line, then ONE card:
 * the chapter's answer (the same as its light), its written read (Premium),
 * the question rows split by hairlines (`QuestionRow`, shared with the stock
 * page). Premium since 2026-11-02: the page hides every chapter from a free
 * reader under one `Locked` and shows its one Premium card instead.
 */
export default function PfReportChapter({ chapter }: { chapter: PfChapter }) {
  const read = chapter.read ? <p className="rc-read">{tx(chapter.read)}</p> : null;
  return (
    <section id={chapter.id} className="dash-section pf-chapter" aria-labelledby={`${chapter.id}-h`}>
      <PfChapterHead id={`${chapter.id}-h`} title={tx(chapter.title)} lead={tx(chapter.lead)} />
      <div className="rp-sheet rc">
        <div className="rc-top">
          <div className="rq-chead">
            <ToneChip word={chapter.head.word} tone={chapter.head.tone} size="lg" />
            <span className="rq-chead-note">{tx(chapter.head.line)}</span>
          </div>
          {read}
        </div>
        {chapter.rows.map((r) => (
          <PfQuestion key={r.key} row={r} />
        ))}
      </div>
    </section>
  );
}

function PfQuestion({ row }: { row: PfRow }) {
  const facts =
    row.freeFacts.length > 0 ? (
      <div className="pfr-facts">
        <ul>
          {row.freeFacts.map((f, i) => (
            <li key={i}>{tx(f)}</li>
          ))}
        </ul>
      </div>
    ) : undefined;
  return (
    <QuestionRow
      id={`pf-q-${row.key}`}
      anchorClass="dash-section"
      title={tx(row.title)}
      word={row.word}
      tone={row.tone}
      picture={row.picture ? <PfPictureView pic={row.picture} /> : undefined}
      free={facts}
      headline={row.headline}
      meaning={row.meaning}
      watch={row.watch}
      details={row.figures.length ? <PfFigures figures={row.figures} /> : undefined}
    />
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

/** The band above the first chapter for a reader who sees everything. */
export function PfReportBand({ answered }: { answered: number }) {
  return (
    <div className="rp-band pf-band" role="note">
      <div className="min-w-0">
        <b>
          <T en="Your full portfolio check" bn="আপনার পোর্টফোলিওর পূর্ণ যাচাই" />
        </b>
        <span>
          <T
            en={`Updated after every close · ${answered} questions answered, each chapter read for you`}
            bn={`প্রতিদিন বাজার বন্ধের পর হালনাগাদ · ${answered}টি প্রশ্নের উত্তর, প্রতিটি অধ্যায় আপনার জন্য লেখা`}
          />
        </span>
      </div>
    </div>
  );
}
