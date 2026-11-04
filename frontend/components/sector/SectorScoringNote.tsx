import Link from "next/link";
import { T } from "@/components/i18n/T";
import { sectorBn } from "@/lib/bn";
import SectionHeader from "@/components/ui/SectionHeader";

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
  note: { label: string; label_bn?: string; en: string; bn: string };
  sectorName: string;
}) {
  return (
    <section className="mb-8" id="how-scored">
      <SectionHeader
        title={
          <T
            en={`How ${sectorName} companies are scored`}
            bn={`${sectorBn(sectorName)} সেক্টরের কোম্পানির স্কোর যেভাবে হয়`}
          />
        }
        className="mt-8"
      />

      <div className="rounded-xl border border-border bg-surface-2 p-3.5 sm:p-4">
        <span className="inline-flex items-center rounded-full border border-border bg-surface px-2.5 py-1 text-xs font-semibold text-text-muted">
          <T en="Scoring rules" bn="স্কোরের নিয়ম" /> · <T en={note.label} bn={note.label_bn ?? note.label} />
        </span>

        <p className="mt-2.5 text-sm font-medium leading-relaxed text-text-main">
          <T en={note.en} bn={note.bn} />
        </p>

        <p className="mt-3 text-xs font-semibold text-text-muted">
          <T
            en="Every company gets one score out of 100 from four parts of its business: earnings quality, financial health, efficiency and dividend record. The share price is judged on its own. When a company never reported a figure, that part's weight moves to the parts it did report, instead of counting as zero. "
            bn="প্রতিটি কোম্পানি ব্যবসার চারটি অংশ থেকে 100-এর মধ্যে একটি স্কোর পায়: মুনাফার মান, আর্থিক অবস্থা, দক্ষতা আর ডিভিডেন্ডের ধারা। শেয়ারের দাম আলাদাভাবে বিচার করা হয়। কোনো কোম্পানি একটি তথ্য কখনো প্রকাশ না করলে সেটিকে শূন্য ধরা হয় না; তার ভার যায় প্রকাশিত অংশগুলোতে। "
          />
          <Link href="/about" className="text-primary underline">
            <T en="See the full method" bn="পুরো পদ্ধতি দেখুন" />
          </Link>
          .
        </p>
      </div>
    </section>
  );
}
