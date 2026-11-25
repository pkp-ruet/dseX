import type { ReactNode } from "react";
import Link from "@/components/ui/Link";

/**
 * A lesson sentence with its two marks turned into markup: `**bold**` and
 * `[link text](/path)`. Nothing else is parsed, so a lesson can't inject HTML.
 */
const MARK = /(\*\*[^*]+\*\*|\[[^\]]+\]\([^)\s]+\))/g;

export default function Rich({ text }: { text: string }) {
  const parts = text.split(MARK);
  const out: ReactNode[] = parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    const link = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(part);
    if (link) {
      const [, label, href] = link;
      return href.startsWith("/") ? (
        <Link key={i} href={href} className="lz-link">
          {label}
        </Link>
      ) : (
        <a key={i} href={href} className="lz-link" target="_blank" rel="noopener noreferrer">
          {label}
        </a>
      );
    }
    return part;
  });
  return <>{out}</>;
}
