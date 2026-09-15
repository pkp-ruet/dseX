import Link from "next/link";
import { t } from "@/lib/home-copy";
import { IconArrowRight } from "@/components/home/personalized/DashIcons";

/**
 * "আজকের বাজার এক নজরে" — the backend's everyday-Bengali paragraph on the day,
 * shown in BOTH language modes (the audience reads Bengali; English mode is a
 * UI preference, not a reading preference). Links to the Bengali daily article.
 */
export default function BanglaSnapshotCard({ summary }: { summary: string | null | undefined }) {
  const text = (summary ?? "").trim();
  if (!text) return null;
  return (
    <section
      lang="bn"
      className="font-bn soft-card overflow-hidden"
      style={{ background: "color-mix(in srgb, var(--accent) 6%, var(--surface))" }}
    >
      <div className="flex items-center justify-between gap-2 border-b border-[var(--border)] px-4 py-3 sm:px-5">
        <h2 className="min-w-0 truncate text-[0.8rem] font-bold text-[var(--text)]">{t("bn", "snapshotTitle")}</h2>
        <Link
          href="/share-bazar"
          prefetch={false}
          className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-[var(--primary)] hover:underline active:opacity-70"
        >
          {t("bn", "readFull")}
          <IconArrowRight size={13} />
        </Link>
      </div>
      <p className="px-4 py-4 text-[0.95rem] leading-relaxed text-[var(--text)] sm:px-5">{text}</p>
    </section>
  );
}
