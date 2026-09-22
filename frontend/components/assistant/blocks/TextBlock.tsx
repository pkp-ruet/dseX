import Link from "next/link";
import type { MessageBlock } from "@/lib/assistant/types";

export default function TextBlock({ block }: { block: Extract<MessageBlock, { type: "text" }> }) {
  return (
    <div className="text-sm leading-relaxed text-text-main">
      {block.text && <p>{block.text}</p>}
      {block.bn && (
        <p lang="bn" className="font-bn mt-1 text-sm text-text-muted">
          {block.bn}
        </p>
      )}
      {block.link && (
        <p className={block.text ? "mt-1" : ""}>
          <Link
            href={block.link.href}
            prefetch={false}
            className="text-sm font-semibold text-primary hover:underline"
          >
            {block.link.label} →
          </Link>
        </p>
      )}
    </div>
  );
}
