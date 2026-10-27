import Link from "next/link";
import type { CompanyDetail } from "@/lib/api";
import { money } from "@/lib/formatters";
import { sectorSlug } from "@/lib/sector";
import { sectorBn } from "@/lib/bn";
import { toNum } from "@/lib/stock-metrics";
import { T } from "@/components/i18n/T";

type Tone = "good" | "bad" | "neutral";
type Line = { key: string; tone: Tone; en: string; bn: string; strong?: boolean; href?: string };

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
}

const VERDICT: Record<"cheap" | "fair" | "expensive", { tone: Tone; en: string; bn: string }> = {
  cheap: {
    tone: "good",
    en: "The price is low right now, below its usual level.",
    bn: "এখন দাম কম, স্বাভাবিক মাত্রার নিচে।",
  },
  fair: {
    tone: "neutral",
    en: "The price is about fair. It is neither low nor high.",
    bn: "দাম মোটামুটি ন্যায্য। কমও নয়, বেশিও নয়।",
  },
  expensive: {
    tone: "bad",
    en: "The price is high right now. You would pay more than usual for each taka of profit.",
    bn: "এখন দাম বেশি। প্রতি টাকা মুনাফার জন্য স্বাভাবিকের চেয়ে বেশি দাম দিতে হবে।",
  },
};

/**
 * Our verdict on today's price, as plain lines: the page's ONE valuation
 * verdict (backend P4 bands, same as the signal), today's P/E against its own
 * usual level, against its sector, and where the company ranks in its sector.
 * They answer one question in the full verdict (2026-10-27).
 */
export function priceVerdictLines(detail: CompanyDetail): Line[] {
  const { valuation, score_row, sector_context, latest_price, profile } = detail;
  const out: Line[] = [];

  const p4 = toNum(score_row?.p4_val as number | null);
  const band =
    valuation?.verdict ?? (p4 == null ? null : p4 >= 7 ? "cheap" : p4 >= 4 ? "fair" : "expensive");
  if (band) out.push({ key: "verdict", strong: true, ...VERDICT[band] });

  const pe = valuation?.current_pe ?? toNum(score_row?.current_pe as number | null);
  const avg = valuation?.own_avg_pe ?? toNum(score_row?.own_avg_pe as number | null);
  const label = valuation?.own_avg_pe_label;
  if (pe != null && pe > 0 && avg != null && avg > 0) {
    const below = pe < avg;
    const en = label?.en ?? "usual level";
    const bn = label?.bn ?? "স্বাভাবিক মাত্রা";
    out.push({
      key: "own",
      tone: below ? "good" : "bad",
      en: `Its P/E today is ${pe.toFixed(1)}, ${below ? "lower" : "higher"} than its ${en} of ${avg.toFixed(1)}.`,
      bn: `আজ এর পিই ${pe.toFixed(1)}, যা এর ${bn} ${avg.toFixed(1)}-এর চেয়ে ${below ? "কম" : "বেশি"}।`,
    });
  }

  const sectorPe = valuation?.sector_median_pe ?? null;
  if (pe != null && pe > 0 && sectorPe != null && sectorPe > 0) {
    const cheaper = pe < sectorPe;
    const gap = Math.round((Math.abs(sectorPe - pe) / sectorPe) * 100);
    out.push({
      key: "sector",
      tone: cheaper ? "good" : "bad",
      en: `It is ${cheaper ? "cheaper" : "more expensive"} than a typical company in its sector. Its P/E is ${gap}% ${cheaper ? "below" : "above"} the sector's ${sectorPe.toFixed(1)}.`,
      bn: `সেক্টরের সাধারণ কোম্পানির চেয়ে এর দাম ${cheaper ? "কম" : "বেশি"}। এর পিই সেক্টরের ${sectorPe.toFixed(1)}-এর চেয়ে ${gap}% ${cheaper ? "কম" : "বেশি"}।`,
    });
  }

  const implied = valuation?.sector_implied_price ?? null;
  const ltp = toNum(latest_price?.ltp as number | null);
  if (implied != null && ltp != null) {
    out.push({
      key: "implied",
      tone: "neutral",
      en: `At its sector's usual P/E, it would cost about ${money(implied)}. Today it costs ${money(ltp)}. This compares it with similar companies; it is not our fair price.`,
      bn: `সেক্টরের স্বাভাবিক পিই ধরলে এর দাম হতো প্রায় ${money(implied)}। আজকের দাম ${money(ltp)}। এটি একই ধরনের কোম্পানির সঙ্গে তুলনা, আমাদের ন্যায্য দাম নয়।`,
    });
  }

  const rank = sector_context?.rank_in_sector ?? null;
  const peers = sector_context?.peer_count ?? null;
  const sector = sector_context?.sector ?? profile.sector ?? null;
  const sectorAvg = sector_context?.sector_avg_score ?? null;
  if (rank != null && peers != null && peers >= 2 && sector) {
    const avgEn = sectorAvg != null ? ` The sector's average score is ${Math.round(sectorAvg)}.` : "";
    const avgBn = sectorAvg != null ? ` সেক্টরের গড় স্কোর ${Math.round(sectorAvg)}।` : "";
    out.push({
      key: "rank",
      tone: rank <= Math.ceil(peers / 3) ? "good" : rank > peers - Math.ceil(peers / 3) ? "bad" : "neutral",
      en: `On our score it ranks ${ordinal(rank)} of ${peers} companies in ${sector}.${avgEn}`,
      bn: `আমাদের স্কোরে ${sectorBn(sector)} সেক্টরের ${peers}টি কোম্পানির মধ্যে এর অবস্থান ${rank}।${avgBn}`,
      href: `/sector/${sectorSlug(sector)}`,
    });
  }
  return out;
}

const DOT: Record<Tone, string> = { good: "bg-positive", bad: "bg-negative", neutral: "bg-border" };

export default function PriceVerdict({ lines }: { lines: Line[] }) {
  if (!lines.length) return null;
  return (
    <ul className="space-y-2.5">
      {lines.map((l) => (
        <li key={l.key} className="flex gap-2.5">
          <span aria-hidden="true" className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${DOT[l.tone]}`} />
          <span className={`text-sm leading-relaxed text-text-main ${l.strong ? "font-semibold" : ""}`}>
            <T en={l.en} bn={l.bn} />
            {l.href && (
              <>
                {" "}
                <Link href={l.href} prefetch={false} className="font-semibold text-primary-ink hover:underline">
                  <T en="See the sector" bn="সেক্টর দেখুন" />
                </Link>
              </>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}
