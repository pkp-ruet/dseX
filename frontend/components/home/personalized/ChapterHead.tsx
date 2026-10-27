import type { ReactNode } from "react";

/** Chapter title — the divider between the dashboard's chapters, and the
 *  biggest heading on the page after the daily brief. Card titles inside a
 *  chapter are smaller h3s (DashHeader), so the page reads chapter → card →
 *  row at a glance. The icon lives here and nowhere else in the chapter.
 *  No colour: chapters are told apart by size and space, not hue.
 *  One language (2026-10-27): the label is already in the reader's language. */
export default function ChapterHead({
  label,
  sub,
  icon,
}: {
  label: ReactNode;
  sub?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="pt-2">
      <div className="flex items-center gap-2.5">
        {icon && (
          <span className="dash-tile dash-tile-lg" aria-hidden>
            {icon}
          </span>
        )}
        <h2 className="text-xl font-bold leading-tight text-text-main sm:text-2xl">{label}</h2>
      </div>
      {sub && <p className="mt-1 text-sm leading-snug text-text-muted">{sub}</p>}
    </div>
  );
}
