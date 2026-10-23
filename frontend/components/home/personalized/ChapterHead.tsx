import type { ReactNode } from "react";
import type { Lang } from "@/context/LangContext";
import Bn from "@/components/i18n/Bn";

/** Chapter title — the divider between the dashboard's chapters, and the
 *  biggest heading on the page after the daily brief. Card titles inside a
 *  chapter are smaller h3s (DashHeader), so the page reads chapter → card →
 *  row at a glance. The icon lives here and nowhere else in the chapter.
 *  No colour: chapters are told apart by size and space, not hue. */
export default function ChapterHead({
  label,
  bn,
  sub,
  lang = "en",
  icon,
}: {
  label: string;
  /** The Bengali title, shown as a line under an English title. */
  bn?: string;
  sub?: string;
  lang?: Lang;
  icon?: ReactNode;
}) {
  const isBn = lang === "bn";
  return (
    <div className={`pt-2 ${isBn ? "font-bn" : ""}`} lang={isBn ? "bn" : undefined}>
      <div className="flex items-center gap-2.5">
        {icon && (
          <span className="dash-tile dash-tile-lg" aria-hidden>
            {icon}
          </span>
        )}
        <h2 className="text-xl font-bold leading-tight text-text-main sm:text-2xl">{label}</h2>
      </div>
      {bn && !isBn && <Bn className="mt-0.5 text-sm text-text-muted">{bn}</Bn>}
      {sub && <p className="mt-1 text-sm leading-snug text-text-muted">{sub}</p>}
    </div>
  );
}
