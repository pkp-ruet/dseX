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

const BAR_GRADIENTS = [
  "from-sky-400 to-cyan-400",
  "from-emerald-400 to-green-400",
  "from-amber-400 to-yellow-400",
  "from-blue-400 to-indigo-400",
  "from-purple-400 to-fuchsia-400",
  "from-pink-400 to-rose-400",
  "from-teal-400 to-cyan-400",
  "from-orange-400 to-red-400",
];

const DOT_BG = [
  "bg-sky-400",
  "bg-emerald-400",
  "bg-amber-400",
  "bg-blue-400",
  "bg-purple-400",
  "bg-pink-400",
  "bg-teal-400",
  "bg-orange-400",
];

export default function SectorBreakdownChart({ analysis, lang = "en" }: Props) {
  if (analysis.sectorSpread.length === 0) return null;

  const t = STR[lang];
  const bnText = lang === "bn" ? "font-bn" : "";
  const max = Math.max(...analysis.sectorSpread.map((s) => s.weightPct));
  const totalStocks = analysis.sectorSpread.reduce((acc, s) => acc + s.count, 0);

  return (
    <Card as="section" padding="none" className="rounded-2xl p-5 sm:p-6">
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-3">
        <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--primary)]/15 border border-[var(--primary)]/30 text-[var(--primary)]">
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
          className={`text-sm sm:text-[15px] uppercase tracking-wider font-bold text-[var(--text)] ${bnText}`}
        >
          {t.title}
        </h3>
        <span className={`ml-auto text-xs sm:text-sm text-[var(--text-muted)] font-medium ${bnText}`}>
          {t.counts(analysis.sectorSpread.length, totalStocks)}
        </span>
      </div>

      <p className={`text-sm text-[var(--ink-2)] mb-5 leading-relaxed ${bnText}`}>{t.desc}</p>

      <ul className="flex flex-col gap-4">
        {analysis.sectorSpread.map((s, i) => {
          const isOver40 = s.weightPct > 40;
          return (
            <li key={s.name} className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-3 text-sm sm:text-[15px]">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={`w-2.5 h-2.5 rounded-full shrink-0 ${DOT_BG[i % DOT_BG.length]}`}
                    aria-hidden
                  />
                  <span className="font-semibold text-[var(--text)] truncate">{s.name}</span>
                  {isOver40 && (
                    <span
                      className={`shrink-0 text-[11px] sm:text-[11px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/15 text-[var(--watch)] border border-amber-500/30 ${bnText}`}
                    >
                      {t.heavy}
                    </span>
                  )}
                </div>
                <div className="flex items-baseline gap-2 shrink-0">
                  <span className="text-base sm:text-lg font-black text-[var(--text)] tabular-nums nums">
                    {s.weightPct.toFixed(0)}%
                  </span>
                  <span className={`text-xs sm:text-sm text-[var(--text-muted)] ${bnText}`}>
                    {t.stockCount(s.count)}
                  </span>
                </div>
              </div>
              <div className="h-2.5 w-full rounded-full bg-[var(--border)]/50 overflow-hidden">
                <div
                  className={`h-full rounded-full bg-gradient-to-r transition-all duration-500 ${BAR_GRADIENTS[i % BAR_GRADIENTS.length]}`}
                  style={{ width: `${(s.weightPct / max) * 100}%` }}
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
