import type { ReactNode } from "react";
import type { Lang } from "@/context/LangContext";
import { accVars } from "@/components/home/personalized/accents";

/** Chapter label — the divider between the dashboard's five chapters. Bigger
 *  than a card header, smaller than a page title. It wears the chapter's
 *  gradient icon tile and fades its rule out in the same colour, so a reader
 *  scrolling fast can tell chapters apart by hue alone. */
export default function ChapterHead({
  label,
  sub,
  lang = "en",
  accent,
  icon,
}: {
  label: string;
  sub?: string;
  lang?: Lang;
  /** The chapter's colour, from `CHAPTER_ACC` in accents.ts. */
  accent?: string;
  icon?: ReactNode;
}) {
  const bn = lang === "bn";
  return (
    <div className={`pt-1 ${bn ? "font-bn" : ""}`} lang={bn ? "bn" : undefined} style={accVars(accent)}>
      <div className="flex items-center gap-2.5">
        {icon && (
          <span className="dash-tile dash-tile-lg" aria-hidden>
            {icon}
          </span>
        )}
        <h2
          className="text-sm font-extrabold uppercase tracking-[0.16em]"
          style={{ color: accent ? "var(--acc)" : "var(--text)" }}
        >
          {label}
        </h2>
        <span
          className="h-px flex-1 rounded-full"
          aria-hidden
          style={{
            background:
              "linear-gradient(90deg, color-mix(in srgb, var(--acc, var(--border)) 45%, transparent), transparent)",
          }}
        />
      </div>
      {sub && <p className="mt-1 text-sm leading-snug text-text-muted">{sub}</p>}
    </div>
  );
}
