import type { ReactNode } from "react";

/**
 * One numbered step of the screener (1 pick a goal · 2 your checks · 3 the
 * stocks): a small ink number, a plain h2, an optional line under it and an
 * optional action on the right. Keeps the page reading as three moves.
 */
export default function ScreenerStep({
  n,
  title,
  note,
  action,
  children,
}: {
  /** Optional — the screener is one card and its results, so it shows none now. */
  n?: number;
  title: string;
  note?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          {n != null && (
            <span
              className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-text-main text-xs font-bold text-surface"
              aria-hidden
            >
              {n}
            </span>
          )}
          <div className="min-w-0">
            <h2 className="text-lg font-bold leading-snug text-text-main">{title}</h2>
            {note && <p className="mt-0.5 text-sm text-text-muted">{note}</p>}
          </div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children}
    </section>
  );
}
