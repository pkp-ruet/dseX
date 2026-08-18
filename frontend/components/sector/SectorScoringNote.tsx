import Link from "next/link";
import Bn from "@/components/i18n/Bn";

/**
 * How this sector's companies were scored, and why it differs from other sectors.
 *
 * Copy comes from the backend (`sector_service.CLASS_NOTES`) so the explanation
 * can't drift from the scoring code. The full method lives on /about.
 */
export default function SectorScoringNote({
  note,
  sectorName,
}: {
  note: { label: string; en: string; bn: string };
  sectorName: string;
}) {
  return (
    <section className="mb-8" id="how-scored">
      <div className="section-rule-modern">
        <span className="section-rule-text">How {sectorName} Companies Are Scored</span>
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3.5 sm:p-4">
        <span className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[var(--text-muted)]">
          Scoring template · {note.label}
        </span>

        <p className="mt-2.5 text-[0.86rem] font-medium leading-relaxed text-[var(--text)]">
          {note.en}
        </p>
        <Bn className="mt-2 text-[0.9rem] font-medium leading-[1.85] text-[var(--text-muted)]">
          {note.bn}
        </Bn>

        <p className="mt-3 text-[0.78rem] font-semibold text-[var(--text-muted)]">
          Every company gets one score out of 100 from five parts — earnings quality, financial
          health, efficiency, valuation and dividend. Where a company never reported a figure,
          that part&apos;s weight shifts to the parts it did report rather than counting as zero.{" "}
          <Link href="/about" className="text-[var(--primary)] underline">
            See the full method
          </Link>
          .
        </p>
      </div>
    </section>
  );
}
