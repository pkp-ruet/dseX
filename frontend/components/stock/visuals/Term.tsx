"use client";

import { T } from "@/components/i18n/T";
import { IconInfo } from "@/components/ui/icons";
import { GLOSSARY, type GlossaryKey } from "@/lib/glossary";
import { trackEvent } from "@/lib/track";

/**
 * A market word, small, after its plain name (2026-10-30): "Price for ৳1 of
 * yearly profit · P/E ⓘ". A tap opens one line on what it means, right
 * under it — no hover (readers are on phones), no dialog. Every opening
 * fires `term_tap`, so we learn which words still confuse readers.
 */
export default function Term({ k }: { k: GlossaryKey }) {
  const g = GLOSSARY[k];
  return (
    <details
      className="rv-term"
      onToggle={(e) => {
        if ((e.currentTarget as HTMLDetailsElement).open) trackEvent("term_tap", { term: k });
      }}
    >
      <summary>
        <T en={g.word.en} bn={g.word.bn} />
        <IconInfo size={12} />
      </summary>
      <span className="rv-term-say">
        <T en={g.means.en} bn={g.means.bn} />
      </span>
    </details>
  );
}
