import type { AnalysisLang, PortfolioAnalysis } from "@/lib/portfolio-analysis";
import PfCard from "./PfCard";

// Numbers inside Bengali prose stay Western (9, 6.1%) — matches the rest of the
// site and avoids webfont glyph issues with Bengali numerals on some devices.

const STR = {
  en: {
    title: "Your money by sector",
    counts: (sectors: number, stocks: number) =>
      `${stocks} stock${stocks === 1 ? "" : "s"} in ${sectors} sector${sectors === 1 ? "" : "s"}, biggest first.`,
    heavy: "Over 40%",
    stockCount: (n: number) => `${n} stock${n === 1 ? "" : "s"}`,
    line: "The small mark on each bar is the 40% line.",
    desc: "Why it matters: if you own only bank stocks and banks have a bad year, everything falls together. A mix (say bank, medicine and telecom) means one weak sector can't drag it all down. A simple rule: keep any one sector under about 40%.",
  },
  bn: {
    title: "খাতভিত্তিক ভাগ",
    counts: (sectors: number, stocks: number) => `${sectors}টি খাতে ${stocks}টি শেয়ার, বড়টা আগে।`,
    heavy: "40%-এর বেশি",
    stockCount: (n: number) => `${n}টি শেয়ার`,
    line: "প্রতিটি বারের ছোট খাড়া দাগটি 40%-এর সীমা।",
    desc: "কেন জরুরি: শুধু ব্যাংকের শেয়ার থাকলে ব্যাংকের বছর খারাপ গেলে সব একসাথে পড়ে। ব্যাংক, ওষুধ, টেলিকম মিলিয়ে রাখলে একটি দুর্বল খাত সব টেনে নামাতে পারে না। সহজ নিয়ম: কোনো একটি খাতে 40%-এর বেশি না রাখা ভালো।",
  },
} as const;

interface Props {
  analysis: PortfolioAnalysis;
  lang?: AnalysisLang;
}

/** The share above which one sector is called heavy. */
const HEAVY_PCT = 40;

/**
 * Money per sector as a ranked list with thin ink bars — each bar is the
 * sector's share of the whole, with a faint tick at 40%. A sector over that
 * line is the one coloured thing on the card: a warning dot, a "Over 40%"
 * word and a warning-coloured bar.
 */
export default function SectorBreakdownChart({ analysis, lang = "en" }: Props) {
  if (analysis.sectorSpread.length === 0) return null;

  const t = STR[lang];
  const bn = lang === "bn";
  const bnText = bn ? "font-bn" : "";
  const totalStocks = analysis.sectorSpread.reduce((acc, s) => acc + s.count, 0);

  return (
    <PfCard
      title={t.title}
      bn="খাতভিত্তিক ভাগ"
      note={t.counts(analysis.sectorSpread.length, totalStocks)}
      lang={lang}
      dataCard="sectors"
    >
      <ul className="pf-rows border-t border-cell-rule">
        {analysis.sectorSpread.map((s) => {
          const heavy = s.weightPct > HEAVY_PCT;
          return (
            <li key={s.name} className="py-3">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                <div className="min-w-0">
                  <p className="flex min-w-0 items-center gap-2">
                    {heavy && <span className="pf-dot pf-dot--watch" aria-hidden="true" />}
                    <span className="truncate text-sm font-semibold text-text-main">{s.name}</span>
                  </p>
                  <p className={`text-xs font-semibold text-text-muted ${bnText}`} lang={bn ? "bn" : undefined}>
                    {t.stockCount(s.count)}
                    {heavy && <span className="text-watch"> · {t.heavy}</span>}
                  </p>
                </div>
                <span className="pf-num text-base font-bold text-text-main">{s.weightPct.toFixed(0)}%</span>
              </div>
              <div className="pf-bar mt-1.5" aria-hidden="true">
                <span
                  style={{
                    width: `${Math.max(1, Math.min(100, s.weightPct))}%`,
                    ...(heavy ? { background: "var(--watch)" } : {}),
                  }}
                />
                <i className="absolute inset-y-0 w-px bg-border" style={{ left: `${HEAVY_PCT}%` }} />
              </div>
            </li>
          );
        })}
      </ul>

      <div className={`pf-card-foot ${bnText}`} lang={bn ? "bn" : undefined}>
        <p className="m-0 text-sm leading-relaxed text-text-muted">{t.desc}</p>
        <p className="pf-fine">{t.line}</p>
      </div>
    </PfCard>
  );
}
