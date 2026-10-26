"use client";

import Link from "next/link";
import type { CompanyDetail } from "@/lib/api";
import { money } from "@/lib/formatters";
import { sectorSlug } from "@/lib/sector";
import { toNum } from "@/lib/stock-metrics";

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
    en: "Looks cheap right now — priced below its usual level.",
    bn: "এখন সস্তা মনে হচ্ছে — স্বাভাবিকের চেয়ে কম দামে।",
  },
  fair: {
    tone: "neutral",
    en: "Priced about fairly — neither a bargain nor expensive.",
    bn: "দাম মোটামুটি ন্যায্য — খুব সস্তাও না, দামিও না।",
  },
  expensive: {
    tone: "bad",
    en: "Looks pricey right now — costs more than usual for what you get.",
    bn: "এখন দামি মনে হচ্ছে — যা পাচ্ছেন তার তুলনায় স্বাভাবিকের চেয়ে বেশি দাম।",
  },
};

/**
 * Our verdict on today's price, as plain lines: the page's ONE valuation
 * verdict (backend P4 bands, same as the signal), today's P/E against its own
 * usual level, against its sector, and where the company ranks in its sector.
 * These were captions scattered through the price section; since 2026-10-27
 * they answer one question in the full verdict.
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
      en: `P/E ${pe.toFixed(1)} today — ${below ? "below" : "above"} its ${en} of ${avg.toFixed(1)}.`,
      bn: `আজ P/E ${pe.toFixed(1)} — এর ${bn} ${avg.toFixed(1)}-এর চেয়ে ${below ? "কম" : "বেশি"}।`,
    });
  }

  const sectorPe = valuation?.sector_median_pe ?? null;
  if (pe != null && pe > 0 && sectorPe != null && sectorPe > 0) {
    const cheaper = pe < sectorPe;
    const gap = Math.round((Math.abs(sectorPe - pe) / sectorPe) * 100);
    out.push({
      key: "sector",
      tone: cheaper ? "good" : "bad",
      en: `${cheaper ? "Cheaper" : "Pricier"} than the typical company in its sector — ${gap}% ${cheaper ? "below" : "above"} the sector's P/E of ${sectorPe.toFixed(1)}.`,
      bn: `খাতের সাধারণ কোম্পানির চেয়ে ${cheaper ? "সস্তা" : "দামি"} — খাতের P/E ${sectorPe.toFixed(1)}-এর চেয়ে ${gap}% ${cheaper ? "কম" : "বেশি"}।`,
    });
  }

  const implied = valuation?.sector_implied_price ?? null;
  const ltp = toNum(latest_price?.ltp as number | null);
  if (implied != null && ltp != null) {
    out.push({
      key: "implied",
      tone: "neutral",
      en: `At its sector's usual P/E it would cost about ${money(implied)}, against ${money(ltp)} today. A comparison with peers, not a fair-value estimate.`,
      bn: `খাতের স্বাভাবিক P/E-তে এর দাম হতো প্রায় ${money(implied)}, আজ ${money(ltp)}। এটি প্রতিযোগীদের সাথে তুলনা, ন্যায্য দামের হিসাব নয়।`,
    });
  }

  const rank = sector_context?.rank_in_sector ?? null;
  const peers = sector_context?.peer_count ?? null;
  const sector = sector_context?.sector ?? profile.sector ?? null;
  const sectorAvg = sector_context?.sector_avg_score ?? null;
  if (rank != null && peers != null && peers >= 2 && sector) {
    const avgEn = sectorAvg != null ? ` (sector average ${Math.round(sectorAvg)})` : "";
    const avgBn = sectorAvg != null ? ` (খাতের গড় ${Math.round(sectorAvg)})` : "";
    out.push({
      key: "rank",
      tone: rank <= Math.ceil(peers / 3) ? "good" : rank > peers - Math.ceil(peers / 3) ? "bad" : "neutral",
      en: `Ranked ${ordinal(rank)} of ${peers} in ${sector} on our score${avgEn}.`,
      bn: `আমাদের স্কোরে ${sector} খাতে ${peers}টির মধ্যে ${rank} নম্বরে${avgBn}।`,
      href: `/sector/${sectorSlug(sector)}`,
    });
  }
  return out;
}

const DOT: Record<Tone, string> = { good: "bg-positive", bad: "bg-negative", neutral: "bg-border" };

export default function PriceVerdict({ lines, isBn }: { lines: Line[]; isBn: boolean }) {
  if (!lines.length) return null;
  return (
    <ul className={`space-y-2.5 ${isBn ? "font-bn" : ""}`} lang={isBn ? "bn" : undefined}>
      {lines.map((l) => (
        <li key={l.key} className="flex gap-2.5">
          <span aria-hidden="true" className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${DOT[l.tone]}`} />
          <span className={`text-sm leading-relaxed text-text-main ${l.strong ? "font-semibold" : ""}`}>
            {isBn ? l.bn : l.en}
            {l.href && (
              <>
                {" "}
                <Link href={l.href} prefetch={false} className="font-semibold text-primary-ink hover:underline">
                  {isBn ? "খাত দেখুন" : "See the sector"}
                </Link>
              </>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}
