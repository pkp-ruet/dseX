import Link from "next/link";
import Card from "@/components/ui/Card";
import ScoreBadge from "@/components/ui/ScoreBadge";
import { taka } from "@/lib/formatters";
import type { AnalysisLang, RebalancePlan } from "@/lib/portfolio-analysis";

const STR = {
  en: {
    title: "What To Buy Next",
    subtitle: "Ideas from our rankings that fill the gaps in your portfolio.",
    dividend: (pct: string) => `${pct}% dividend`,
    footer:
      "These are ideas based on company fundamentals, not financial advice. Always check a stock yourself before buying.",
  },
  bn: {
    title: "এরপর কী কিনবেন",
    subtitle: "আপনার পোর্টফোলিওর ফাঁকগুলো পূরণ করতে আমাদের র‍্যাংকিং থেকে কিছু আইডিয়া।",
    dividend: (pct: string) => `${pct}% ডিভিডেন্ড`,
    footer:
      "এগুলো কোম্পানির মৌলিক তথ্যের ভিত্তিতে দেওয়া আইডিয়া, বিনিয়োগ পরামর্শ নয়। কেনার আগে সবসময় নিজে যাচাই করুন।",
  },
} as const;

interface Props {
  plan: RebalancePlan;
  lang?: AnalysisLang;
}

/**
 * "What to buy next" — turns the analysis' diversification gaps into 2–3
 * concrete ideas from the rankings. Renders nothing when the portfolio is
 * already balanced or no suitable candidates exist.
 */
export default function RebalanceHelper({ plan, lang = "en" }: Props) {
  if (plan.gaps.length === 0 || plan.picks.length === 0) return null;
  const t = STR[lang];
  const bnText = lang === "bn" ? "font-bn" : "";

  return (
    <Card padding="none" className="p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-4">
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
            <path d="M12 5v14M5 12h14" />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <h3
            className={`text-sm sm:text-base uppercase tracking-wider font-bold text-text-main ${bnText}`}
          >
            {t.title}
          </h3>
          <p className={`text-xs sm:text-sm text-text-muted mt-0.5 leading-relaxed ${bnText}`}>
            {t.subtitle}
          </p>
        </div>
      </div>

      {/* Why these */}
      <ul className="flex flex-col gap-2 mb-4">
        {plan.gaps.map((g, i) => (
          <li key={i} className="flex items-start gap-2.5">
            <span
              className="shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full bg-primary"
              aria-hidden
            />
            <span className={`text-sm sm:text-base text-text-main leading-relaxed ${bnText}`}>
              {g}
            </span>
          </li>
        ))}
      </ul>

      {/* Picks */}
      <div className="flex flex-col gap-2.5">
        {plan.picks.map((p) => (
          <Link
            key={p.code}
            prefetch={false}
            href={`/stock/${p.code}`}
            className="group flex items-center gap-3 rounded-xl border border-border p-3 sm:p-3.5 hover:border-primary/50 hover:bg-primary/[0.04] transition-colors"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono font-bold text-primary group-hover:underline">
                  {p.code}
                </span>
                {p.sector && (
                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-border/40 border border-border text-text-muted font-medium">
                    {p.sector}
                  </span>
                )}
                {p.divYieldPct != null && p.divYieldPct > 0 && (
                  <span className={`text-xs text-positive font-semibold ${bnText}`}>
                    {t.dividend(p.divYieldPct.toFixed(1))}
                  </span>
                )}
              </div>
              {p.companyName && (
                <p className="text-xs text-text-muted truncate mt-0.5">{p.companyName}</p>
              )}
              <p className={`text-xs sm:text-sm text-text-main mt-1 leading-snug ${bnText}`}>
                {p.why}
              </p>
            </div>
            <div className="shrink-0 text-right">
              {p.score != null && <ScoreBadge score={p.score} size="sm" />}
              {p.ltp != null && (
                <p className="text-xs text-text-muted tabular-nums nums mt-1">
                  {taka(p.ltp, 1)}
                </p>
              )}
            </div>
          </Link>
        ))}
      </div>

      <p className={`text-xs text-text-muted mt-4 leading-relaxed ${bnText}`}>
        {t.footer}
      </p>
    </Card>
  );
}
