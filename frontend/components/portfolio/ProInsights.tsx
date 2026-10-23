import Link from "next/link";
import Card from "@/components/ui/Card";
import type { AnalysisLang } from "@/lib/portfolio-analysis";
import type { ProActionKind, ProInsights as Insights, ProLevel, ProLine } from "@/lib/portfolio-pro";

const STR = {
  en: {
    eyebrow: "Premium",
    title: "Your portfolio, in depth",
    sub: "Five checks that go further than the grade.",
    risk: "Risk check",
    paid: "The price you paid",
    income: "Cash coming to you",
    vs: "You vs the market",
    actions: "Your action list",
    actionsSub: "Every stock you own, most urgent first.",
    footer: "Ideas from company numbers, not financial advice. Check a stock yourself before you act.",
  },
  bn: {
    eyebrow: "প্রিমিয়াম",
    title: "আপনার পোর্টফোলিও, বিস্তারিত",
    sub: "গ্রেডের বাইরে আরও পাঁচটি পরীক্ষা।",
    risk: "ঝুঁকি পরীক্ষা",
    paid: "যে দামে কিনেছেন",
    income: "যে নগদ টাকা আসবে",
    vs: "বাজারের তুলনায় আপনি",
    actions: "আপনার করণীয় তালিকা",
    actionsSub: "আপনার প্রতিটি শেয়ার, সবচেয়ে জরুরিটা আগে।",
    footer: "কোম্পানির হিসাব থেকে আইডিয়া, বিনিয়োগ পরামর্শ নয়। কিছু করার আগে নিজে যাচাই করুন।",
  },
} as const;

const LEVEL_CLASS: Record<ProLevel, string> = {
  good: "bg-positive",
  watch: "bg-watch",
  bad: "bg-negative",
};

const ACTION_CLASS: Record<ProActionKind, string> = {
  sell: "text-negative bg-negative/10",
  trim: "text-watch bg-watch/10",
  buy_more: "text-positive bg-positive/10",
  hold: "text-text-muted bg-surface-2",
};

function Lines({ lines, bnText }: { lines: ProLine[]; bnText: string }) {
  return (
    <ul className="flex flex-col gap-2.5">
      {lines.map((l, i) => (
        <li key={i} className="flex items-start gap-2.5">
          <span className={`mt-[7px] h-2 w-2 shrink-0 rounded-full ${LEVEL_CLASS[l.level]}`} aria-hidden />
          <span className={`text-sm sm:text-base leading-relaxed text-text-main ${bnText}`}>{l.text}</span>
        </li>
      ))}
    </ul>
  );
}

function Block({ title, children, bnText }: { title: string; children: React.ReactNode; bnText: string }) {
  return (
    <div className="flex flex-col gap-3 border-t border-border pt-4 first:border-t-0 first:pt-0">
      <h3 className={`text-sm font-bold uppercase tracking-wider text-text-muted ${bnText}`}>{title}</h3>
      {children}
    </div>
  );
}

/** The premium portfolio read (lib/portfolio-pro.ts). Wrapped in PremiumGate
 *  by PortfolioClient for free accounts. */
export default function ProInsights({ insights, lang = "en" }: { insights: Insights; lang?: AnalysisLang }) {
  const t = STR[lang];
  const bnText = lang === "bn" ? "font-bn" : "";
  const { risk, paid, income, vsMarket, actions } = insights;

  return (
    <Card padding="none" className="p-4 sm:p-6">
      <span className={`premium-chip mb-2 ${bnText}`}>{t.eyebrow}</span>
      <h2 className={`text-lg sm:text-xl font-bold text-text-main ${bnText}`}>{t.title}</h2>
      <p className={`text-sm text-text-muted mb-5 ${bnText}`}>{t.sub}</p>

      <div className="flex flex-col gap-5">
        {risk.length > 0 && (
          <Block title={t.risk} bnText={bnText}><Lines lines={risk} bnText={bnText} /></Block>
        )}
        {paid.length > 0 && (
          <Block title={t.paid} bnText={bnText}><Lines lines={paid} bnText={bnText} /></Block>
        )}
        {income.lines.length > 0 && (
          <Block title={t.income} bnText={bnText}><Lines lines={income.lines} bnText={bnText} /></Block>
        )}
        {vsMarket.length > 0 && (
          <Block title={t.vs} bnText={bnText}><Lines lines={vsMarket} bnText={bnText} /></Block>
        )}
        {actions.length > 0 && (
          <Block title={t.actions} bnText={bnText}>
            <p className={`-mt-1 text-sm text-text-muted ${bnText}`}>{t.actionsSub}</p>
            <ul className="flex flex-col divide-y divide-border">
              {actions.map((a) => (
                <li key={a.code} className="flex flex-col gap-1 py-3 first:pt-0 sm:flex-row sm:items-start sm:gap-3">
                  <span className={`inline-flex w-fit shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-bold ${ACTION_CLASS[a.kind]} ${bnText}`}>
                    {a.label}
                  </span>
                  <span className="min-w-0">
                    <Link href={`/stock/${a.code}`} className="font-semibold text-text-main hover:underline">
                      {a.companyName ?? a.code}
                    </Link>{" "}
                    <span className="text-xs text-text-muted">{a.code}</span>
                    <span className={`block text-sm leading-relaxed text-text-muted ${bnText}`}>{a.reason}</span>
                  </span>
                </li>
              ))}
            </ul>
          </Block>
        )}
      </div>

      <p className={`mt-5 text-xs leading-relaxed text-text-muted ${bnText}`}>{t.footer}</p>
    </Card>
  );
}
