"use client";

import { useState } from "react";
import Sheet from "@/components/ui/Sheet";
import { ToneChip, tx } from "@/components/report/chip";
import { IconCheck, IconChevronRight, IconLock } from "@/components/ui/icons";
import { T } from "@/components/i18n/T";
import { trackEvent } from "@/lib/track";
import type { Grade } from "@/lib/portfolio-analysis";
import type { PfChapter, PfCheck, PfHealth as Health } from "@/lib/portfolio-report";
import type { Tone } from "@/lib/stock-report";
import { PfQuestion } from "./PfArea";

/** The four checks' names, the same for every reader (the free card shows only these). */
export const CHECK_NAME: Record<PfCheck["key"], { en: string; bn: string }> = {
  companies: { en: "Your companies", bn: "আপনার কোম্পানি" },
  spread: { en: "How your money is spread", bn: "আপনার টাকা কীভাবে ছড়ানো" },
  prices: { en: "Today's prices", bn: "আজকের দাম" },
  watch: { en: "Warnings on your shares", bn: "আপনার শেয়ারে সতর্কতা" },
};

function Mark({ tone }: { tone: Tone }) {
  return (
    <span className="pfh-mark" data-tone={tone} aria-hidden="true">
      {tone === "good" ? <IconCheck size={12} /> : tone === "neutral" ? "–" : "!"}
    </span>
  );
}

function GradeRing({ grade }: { grade: Grade }) {
  return (
    <span className={`pfh-grade pf-g-${grade}`} aria-hidden="true">
      {grade}
    </span>
  );
}

/**
 * "Is everything okay?" (2026-11-23, the simple portfolio page — plan
 * https://claude.ai/artifact/Gmoy9sYiEcvK4wZL5eqTXN): the grade letter with
 * one word, how many checks need a look, and the four checks as plain
 * sentences with a tick or a warning. Each check opens a sheet with the
 * questions behind it (the old "Why we say this" areas). Replaces the
 * verdict card and the four area tiles. Keeps `#ch-answer` (the watcher's
 * pushes open it).
 */
export default function PfHealth({ health, areas }: { health: Health; areas: PfChapter[] }) {
  const [open, setOpen] = useState<PfCheck | null>(null);
  const chapter = open ? areas.find((c) => c.id === open.chapter) ?? null : null;
  return (
    <section id="ch-answer" className="soft-card pfh dash-section" aria-labelledby="pfh-t">
      <h2 id="pfh-t" className="pfh-title">
        <T en="Is everything okay?" bn="সব কি ঠিক আছে?" />
      </h2>
      <div className="pfh-head">
        <GradeRing grade={health.grade} />
        <div className="min-w-0">
          <p className="pfh-word">
            <T en={`Grade ${health.grade} · `} bn={`গ্রেড ${health.grade} · `} />
            {tx(health.word)}
          </p>
          <p className="pfh-line">{tx(health.line)}</p>
        </div>
      </div>
      {/* A check that needs a look shows its answer open under it; a fine one
          stays one line (2026-11-23: nothing important hides behind a tap). */}
      <ul className="pfh-checks">
        {health.checks.map((c) => (
          <li key={c.key}>
            <button
              type="button"
              className="pfh-check"
              data-open={c.detail ? "true" : undefined}
              onClick={() => {
                setOpen(c);
                trackEvent("pf_open", { what: "check", key: c.key, tone: c.tone });
              }}
            >
              <Mark tone={c.tone} />
              <span className="pfh-check-t">
                <b>{tx(c.text)}</b>
                {c.detail && <span className="pfh-check-d">{tx(c.detail)}</span>}
              </span>
              <span className="pfh-see">
                <T en="See why" bn="কারণ দেখুন" />
                <IconChevronRight size={14} />
              </span>
            </button>
          </li>
        ))}
      </ul>

      <Sheet
        open={open != null}
        onClose={() => setOpen(null)}
        size="lg"
        title={open ? <T en={CHECK_NAME[open.key].en} bn={CHECK_NAME[open.key].bn} /> : ""}
      >
        {open && chapter && (
          <div className="pfh-sheet">
            <div className="pfh-sheet-head">
              <ToneChip word={chapter.head.word} tone={chapter.head.tone} />
              <p>{tx(chapter.head.line)}</p>
            </div>
            {chapter.rows.map((r) => (
              <PfQuestion key={r.key} row={r} />
            ))}
          </div>
        )}
      </Sheet>
    </section>
  );
}

/**
 * The same card for a reader without Premium: the grade letter and how many
 * checks need a look are free (they were on the free card already); which
 * checks, and why, are Premium. One link to the page's Premium card.
 */
export function PfHealthLocked({ grade, toLook }: { grade: Grade; toLook: number }) {
  return (
    <section className="soft-card pfh" aria-labelledby="pfh-free-t">
      <h2 id="pfh-free-t" className="pfh-title">
        <T en="Is everything okay?" bn="সব কি ঠিক আছে?" />
      </h2>
      <div className="pfh-head">
        <GradeRing grade={grade} />
        <div className="min-w-0">
          <p className="pfh-word">
            <T en={`Grade ${grade}`} bn={`গ্রেড ${grade}`} />
          </p>
          <p className="pfh-line">
            {toLook === 0 ? (
              <T en="We checked 4 things. All of them look fine." bn="আমরা 4টি বিষয় যাচাই করেছি। সবগুলোই ঠিক আছে।" />
            ) : (
              <T en={`We checked 4 things. ${toLook} need a look.`} bn={`আমরা 4টি বিষয় যাচাই করেছি। ${toLook}টি দেখা দরকার।`} />
            )}
          </p>
        </div>
      </div>
      <ul className="pfh-checks">
        {(Object.keys(CHECK_NAME) as PfCheck["key"][]).map((k) => (
          <li key={k}>
            <a href="#pf-premium" className="pfh-check pfh-check--locked">
              <span className="pfh-mark" data-tone="lock" aria-hidden="true">
                <IconLock size={11} />
              </span>
              <span className="pfh-check-t">
                <T en={CHECK_NAME[k].en} bn={CHECK_NAME[k].bn} />
              </span>
              <span className="pfh-prem">
                <T en="Premium" bn="প্রিমিয়াম" />
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
