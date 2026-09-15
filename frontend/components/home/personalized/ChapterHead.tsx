import type { Lang } from "@/context/LangContext";

/** Chapter label with a hairline — the quiet divider between the dashboard's
 *  five chapters. Bigger than a card header, smaller than a page title. */
export default function ChapterHead({ label, sub, lang = "en" }: { label: string; sub?: string; lang?: Lang }) {
  const bn = lang === "bn";
  return (
    <div className={`pt-1 ${bn ? "font-bn" : ""}`} lang={bn ? "bn" : undefined}>
      <div className="flex items-center gap-3">
        <h2 className="text-[0.8rem] font-extrabold uppercase tracking-[0.16em] text-[var(--text)]">{label}</h2>
        <span className="h-px flex-1 bg-[var(--border)]" aria-hidden />
      </div>
      {sub && <p className="mt-1 text-[0.8rem] leading-snug text-[var(--text-muted)]">{sub}</p>}
    </div>
  );
}
