import Link from "next/link";
import { T } from "@/components/i18n/T";
import type { MessageBlock } from "@/lib/assistant/types";

/** One chat line, in the reader's language (falls back to English when a reply has no Bengali). */
export default function TextBlock({ block }: { block: Extract<MessageBlock, { type: "text" }> }) {
  return (
    <div className="text-sm leading-relaxed text-text-main">
      {block.text && (
        <p>
          <T en={block.text} bn={block.bn || block.text} />
        </p>
      )}
      {block.link && (
        <p className={block.text ? "mt-1" : ""}>
          <Link
            href={block.link.href}
            prefetch={false}
            className="text-sm font-semibold text-primary hover:underline"
          >
            <T en={`${block.link.label} →`} bn={`${block.link.labelBn ?? block.link.label} →`} />
          </Link>
        </p>
      )}
    </div>
  );
}
