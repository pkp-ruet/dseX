"use client";

import { useId, useState } from "react";
import { T } from "@/components/i18n/T";
import { IconInfo } from "@/components/ui/icons";
import { GLOSSARY, type GlossaryKey } from "@/lib/glossary";
import { trackEvent } from "@/lib/track";

/**
 * A market word, small, after its plain name (2026-10-30): "Price for ৳1 of
 * yearly profit · P/E ⓘ". A tap opens one line on what it means, right
 * under it — no hover (readers are on phones), no dialog. Every opening
 * fires `term_tap`, so we learn which words still confuse readers.
 *
 * Built from a button and spans (2026-11-04, audit SP5): it sits inside
 * paragraphs, and the <details> it used to be is not allowed in a <p> — the
 * browser closed the paragraph early and React reported a hydration mismatch
 * on every stock page.
 */
export default function Term({ k }: { k: GlossaryKey }) {
  const g = GLOSSARY[k];
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <span className="rv-term" data-open={open ? "" : undefined}>
      <button
        type="button"
        className="rv-term-btn"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (next) trackEvent("term_tap", { term: k });
        }}
      >
        <T en={g.word.en} bn={g.word.bn} />
        <IconInfo size={12} />
      </button>
      <span id={id} className="rv-term-say" hidden={!open}>
        <T en={g.means.en} bn={g.means.bn} />
      </span>
    </span>
  );
}
