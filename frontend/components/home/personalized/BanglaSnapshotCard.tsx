import { t } from "@/lib/home-copy";
import DashHeader from "@/components/home/personalized/DashHeader";

/**
 * "আজকের বাজার এক নজরে" — the backend's everyday-Bengali paragraph on the day,
 * shown in BOTH language modes (the audience reads Bengali; English mode is a
 * UI preference, not a reading preference). Links to the Bengali daily article.
 */
export default function BanglaSnapshotCard({ summary }: { summary: string | null | undefined }) {
  const text = (summary ?? "").trim();
  if (!text) return null;
  return (
    <section lang="bn" className="font-bn soft-card overflow-hidden">
      <DashHeader title={t("bn", "snapshotTitle")} href="/share-bazar" linkLabel={t("bn", "readFull")} />
      <p className="px-4 py-4 text-base leading-relaxed text-text-main sm:px-5">{text}</p>
    </section>
  );
}
