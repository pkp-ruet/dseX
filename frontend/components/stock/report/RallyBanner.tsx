import { IconAlert } from "@/components/ui/icons";
import { tx } from "@/components/stock/report/fmt";
import type { RallyWarning } from "@/lib/stock-report";

/**
 * The rumour-rally warning (2026-10-28): shown only when the backend found a
 * sharp run with no news from the company. Part of the report since
 * 2026-11-01 (user: "everything we say about the stock will be part of
 * premium"), at its top, above the answer.
 */
export default function RallyBanner({ w }: { w: RallyWarning }) {
  return (
    <div className="rp-rally mb-6" data-level={w.level} role="note">
      <p className={`flex items-start gap-2 text-sm font-bold leading-snug ${w.level === "red" ? "text-negative" : "text-watch"}`}>
        <span className="mt-0.5 shrink-0"><IconAlert size={16} /></span>
        <span>{tx(w.headline)}</span>
      </p>
      {w.lines.length > 0 && (
        <ul className="mt-2 grid gap-1 pl-6 text-sm text-text-main">
          {w.lines.map((l, i) => <li key={i} className="list-disc">{tx(l)}</li>)}
        </ul>
      )}
    </div>
  );
}
