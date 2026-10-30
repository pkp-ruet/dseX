"use client";

import Link from "next/link";
import { Locked } from "@/components/premium/AnswerLock";
import { usePremiumOpen } from "@/components/premium/usePremiumOpen";
import QuestionRow from "@/components/report/QuestionRow";
import Signpost from "@/components/report/Signpost";
import { TONE_CLASS, ToneChip, tx } from "@/components/report/chip";
import { CompareBars, DateLine, HundredBar } from "@/components/stock/visuals/kit";
import { IconLock } from "@/components/ui/icons";
import { T } from "@/components/i18n/T";
import { PfChapterHead } from "../PfCard";
import type { PfChapter, PfFigure, PfPicture, PfRow } from "@/lib/portfolio-report";

/**
 * One chapter of the portfolio report (2026-10-30) — the stock report's
 * chapter for your money: the question (h2) and one lead line, then ONE card:
 * the chapter's answer (the same as its light), its written read (Premium),
 * the question rows split by hairlines (`QuestionRow`, shared with the stock
 * page), and for a reader without the full check one gold footer linking up
 * to the Premium card under the answer (`#pf-premium`).
 *
 * How each row shows to that reader is set by the builder (`PfRow.free`):
 * `sample` open in full, `word` its answer word only, `lock` its question and
 * a lock, `answer` its word, free picture, free line and free facts (the
 * watch chapter: facts about the reader's own shares). Everything else stays
 * in the HTML under `Locked`.
 */
export default function PfReportChapter({ chapter }: { chapter: PfChapter }) {
  const open = usePremiumOpen();
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
          {open && read}
        </div>
        {chapter.rows.map((r) => (
          <PfQuestion key={r.key} row={r} open={open} />
        ))}
        {!open && read && <Locked>{read}</Locked>}
        {!open && (
          <Signpost text={chapter.signpost} href="#pf-premium" area="portfolio" lock={`pf-${chapter.key}`} foot />
        )}
      </div>
    </section>
  );
}

function PfQuestion({ row, open }: { row: PfRow; open: boolean }) {
  const pic = row.picture ? <PfPictureView pic={row.picture} /> : null;
  const answerRow = row.free === "answer";
  const facts =
    row.freeFacts.length > 0 || (!open && row.lockedNote) ? (
      <div className="pfr-facts">
        {row.freeFacts.length > 0 && (
          <ul>
            {row.freeFacts.map((f, i) => (
              <li key={i}>{tx(f)}</li>
            ))}
          </ul>
        )}
        {!open && row.lockedNote && (
          <a href="#pf-premium" className="pfr-lockline">
            <IconLock size={14} />
            {tx(row.lockedNote)}
          </a>
        )}
      </div>
    ) : undefined;
  return (
    <QuestionRow
      id={`pf-q-${row.key}`}
      anchorClass="dash-section"
      title={tx(row.title)}
      word={row.word}
      tone={row.tone}
      picture={answerRow ? pic : undefined}
      premiumPicture={answerRow ? undefined : pic}
      free={facts}
      headline={row.headline}
      freeLine={answerRow ? row.freeLine : null}
      meaning={row.meaning}
      watch={row.watch}
      details={row.figures.length ? <PfFigures figures={row.figures} /> : undefined}
      sample={row.free === "sample"}
      teaser={row.free === "word" ? "word" : row.free === "lock" || row.free === "sample" ? "lock" : undefined}
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
  const open = usePremiumOpen();
  if (!open) return null;
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
