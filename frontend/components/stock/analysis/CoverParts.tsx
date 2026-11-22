"use client";

import { T } from "@/components/i18n/T";
import { Locked } from "@/components/premium/AnswerLock";
import { OpenScope, useLockScope } from "@/components/premium/LockScope";
import { usePremiumOpen } from "@/components/premium/usePremiumOpen";
import { TONE_CLASS, tx } from "@/components/stock/report/fmt";
import { IconLock } from "@/components/ui/icons";
import { PART_ID, type AnalysisPart } from "@/lib/stock-report";

type CoverPart = Pick<AnalysisPart, "key" | "name" | "word" | "tone" | "measured">;

/** Open: each part's one word in its colour, a tap jumps to that part. */
function OpenParts({ parts }: { parts: CoverPart[] }) {
  return (
    <ul className="cv-parts">
      {parts.map((p) => (
        <li key={p.key}>
          <a href={`#${PART_ID(p.key)}`} className="cv-part">
            <span className="cv-part-k">{tx(p.name)}</span>
            <b className={`cv-part-w ${TONE_CLASS[p.measured ? p.tone : "neutral"]}`}>{tx(p.word)}</b>
          </a>
        </li>
      ))}
    </ul>
  );
}

/** Locked: the six names, each with a gold lock where its word goes. */
function LockedParts({ parts }: { parts: CoverPart[] }) {
  return (
    <ul className="cv-parts cv-parts--lock">
      {parts.map((p) => (
        <li key={p.key}>
          <a href="#ch-premium" className="cv-part">
            <span className="cv-part-k">{tx(p.name)}</span>
            <b className="cv-part-w cv-part-lock">
              <IconLock size={12} />
              <T en="Premium" bn="প্রিমিয়াম" />
            </b>
          </a>
        </li>
      ))}
    </ul>
  );
}

/**
 * The six parts of our analysis on the cover, one word each (2026-11-23, the
 * post-ready cover, mockup https://claude.ai/artifact/VTWHEAHf62EEqAj6wBWMDP).
 * Open to whoever can see our analysis; everyone else gets the names with a
 * lock. The open words are always in the HTML under `Locked`, like the split.
 */
export default function CoverParts({ parts }: { parts: CoverPart[] }) {
  const open = usePremiumOpen();
  const opening = !!useLockScope()?.opening;
  if (parts.length === 0) return null;
  return (
    <>
      {!open && !opening && (
        <div className="pl-free">
          <LockedParts parts={parts} />
        </div>
      )}
      <Locked>
        <OpenScope>
          <OpenParts parts={parts} />
        </OpenScope>
      </Locked>
    </>
  );
}
