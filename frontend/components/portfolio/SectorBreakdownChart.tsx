import type { AnalysisLang, PortfolioAnalysis } from "@/lib/portfolio-analysis";
import Card from "@/components/ui/Card";

// Numbers inside Bengali prose stay Western (9, 6.1%) — matches the rest of the
// site and avoids webfont glyph issues with Bengali numerals on some devices.

const STR = {
  en: {
    title: "Sector Breakdown",
    counts: (sectors: number, stocks: number) =>
      `${sectors} sector${sectors === 1 ? "" : "s"} · ${stocks} stock${stocks === 1 ? "" : "s"}`,
    desc: "How your money is split across different industries. If you own only bank stocks and banks have a bad year, your whole portfolio falls together — owning a mix (say bank, pharma, and telecom) means one weak sector doesn't drag everything down. As a rule of thumb, no single sector should hold more than about 40% of your portfolio.",
    heavy: "Heavy",
    stockCount: (n: number) => `· ${n} stock${n === 1 ? "" : "s"}`,
  },
  bn: {
    title: "খাতভিত্তিক ভাগ",
    counts: (sectors: number, stocks: number) =>
      `${sectors}টি খাত · ${stocks}টি শেয়ার`,
    desc: "আপনার টাকা কোন কোন শিল্পে ভাগ হয়ে আছে। শুধু ব্যাংকের শেয়ার থাকলে ব্যাংকের বছর খারাপ গেলে পুরো পোর্টফোলিও একসাথে পড়ে — কিন্তু ব্যাংক, ওষুধ, টেলিকম মিলিয়ে রাখলে একটি দুর্বল খাত সব টেনে নামাতে পারে না। মোটামুটি নিয়ম: কোনো একটি খাতে পোর্টফোলিওর 40%-এর বেশি না রাখা ভালো।",
    heavy: "বেশি ভার",
    stockCount: (n: number) => `· ${n}টি শেয়ার`,
  },
} as const;

interface Props {
  analysis: PortfolioAnalysis;
  lang?: AnalysisLang;
}

/** Same token palette as the allocation donut — one sector, one colour, everywhere. */
const SECTOR_COLORS = [
  "var(--primary)", "var(--info)", "var(--gold)", "var(--warm)", "var(--navy-soft)",
  "var(--positive)", "var(--primary-soft)", "var(--info-soft)", "var(--gold-soft)", "var(--text-muted)",
];

export default function SectorBreakdownChart({ analysis, lang = "en" }: Props) {
  if (analysis.sectorSpread.length === 0) return null;

  const t = STR[lang];
  const bnText = lang === "bn" ? "font-bn" : "";
  const max = Math.max(...analysis.sectorSpread.map((s) => s.weightPct));
  const totalStocks = analysis.sectorSpread.reduce((acc, s) => acc + s.count, 0);

  return (
    <Card as="section" padding="none" className="rounded-xl p-5 sm:p-6">
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-3">
        <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/15 border border-primary/30 text-primary">
          <svg
            className="w-[18px] h-[18px]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M21 15.9A10 10 0 1 1 8 3" />
            <path d="M22 12A10 10 0 0 0 12 2v10z" />
          </svg>
        </span>
        <h3
          className={`text-sm sm:text-base uppercase tracking-wider font-bold text-text-main ${bnText}`}
        >
          {t.title}
        </h3>
        <span className={`ml-auto text-xs sm:text-sm text-text-muted font-medium ${bnText}`}>
          {t.counts(analysis.sectorSpread.length, totalStocks)}
        </span>
      </div>

      <p className={`text-sm text-text-muted mb-5 leading-relaxed ${bnText}`}>{t.desc}</p>

      <ul className="flex flex-col gap-4">
        {analysis.sectorSpread.map((s, i) => {
          const isOver40 = s.weightPct > 40;
          return (
            <li key={s.name} className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-3 text-sm sm:text-base">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: SECTOR_COLORS[i % SECTOR_COLORS.length] }}
                    aria-hidden
                  />
                  <span className="font-semibold text-text-main truncate">{s.name}</span>
                  {isOver40 && (
                    <span
                      className={`shrink-0 rounded-sm border border-watch/30 bg-watch/15 px-1.5 py-0.5 text-xs font-bold uppercase tracking-wider text-watch ${bnText}`}
                    >
                      {t.heavy}
                    </span>
                  )}
                </div>
                <div className="flex items-baseline gap-2 shrink-0">
                  <span className="text-base sm:text-lg font-black text-text-main tabular-nums nums">
                    {s.weightPct.toFixed(0)}%
                  </span>
                  <span className={`text-xs sm:text-sm text-text-muted ${bnText}`}>
                    {t.stockCount(s.count)}
                  </span>
                </div>
              </div>
              <div className="h-2.5 w-full rounded-full bg-border/50 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${(s.weightPct / max) * 100}%`,
                    background: SECTOR_COLORS[i % SECTOR_COLORS.length],
                  }}
                  aria-hidden
                />
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
