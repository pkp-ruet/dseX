import Link from "next/link";
import Chip from "@/components/ui/Chip";
import { IconCrown } from "@/components/ui/icons";
import PfCard from "./PfCard";
import PremiumBlur from "@/components/premium/PremiumBlur";
import type { AnalysisLang } from "@/lib/portfolio-analysis";
import type { ProActionKind, ProInsights as Insights, ProLine } from "@/lib/portfolio-pro";

const STR = {
  en: {
    eyebrow: "Premium",
    title: "Five deeper checks",
    sub: "They go further than the grade and end with what to do with each stock.",
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
    title: "আরও পাঁচটি গভীর যাচাই",
    sub: "গ্রেডের চেয়ে গভীরে যায়, শেষে প্রতিটি শেয়ারে কী করবেন।",
    risk: "ঝুঁকি পরীক্ষা",
    paid: "যে দামে কিনেছেন",
    income: "যে নগদ টাকা আসবে",
    vs: "বাজারের তুলনায় আপনি",
    actions: "আপনার করণীয় তালিকা",
    actionsSub: "আপনার প্রতিটি শেয়ার, সবচেয়ে জরুরিটা আগে।",
    footer: "কোম্পানির হিসাব থেকে আইডিয়া, বিনিয়োগ পরামর্শ নয়। কিছু করার আগে নিজে যাচাই করুন।",
  },
} as const;

/** The action word as a static `Chip` — its tone is its meaning. */
const ACTION_TONE: Record<ProActionKind, "negative" | "watch" | "positive" | "neutral"> = {
  sell: "negative",
  trim: "watch",
  buy_more: "positive",
  hold: "neutral",
};

function Lines({ lines }: { lines: ProLine[] }) {
  return (
    <ul className="flex flex-col gap-2.5">
      {lines.map((l, i) => (
        <li key={i} className="flex items-start gap-3">
          <span className={`pf-dot pf-dot--${l.level} mt-2`} aria-hidden />
          <span className="min-w-0 text-sm leading-relaxed text-text-main sm:text-base">{l.text}</span>
        </li>
      ))}
    </ul>
  );
}

/** One check: its title on the left from md (a definition-list look), the lines beside it. */
function Block({
  title,
  sub,
  children,
  lang,
  cta = false,
}: {
  title: string;
  sub?: string;
  children: React.ReactNode;
  lang: AnalysisLang;
  /** The one "Unlock with Premium" button of the card goes on the first block. */
  cta?: boolean;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 py-5 first:pt-0 last:pb-0 md:grid-cols-[12rem_minmax(0,1fr)] md:gap-6">
      <div className="min-w-0">
        <h4 className="text-sm font-bold text-text-main sm:text-base">{title}</h4>
        {sub && <p className="mt-1 text-sm leading-relaxed text-text-muted">{sub}</p>}
      </div>
      <div className="min-w-0">
        {/* The title stays readable; only the findings blur for free readers. */}
        <PremiumBlur lang={lang} cta={cta}>{children}</PremiumBlur>
      </div>
    </div>
  );
}

/** The premium portfolio read (lib/portfolio-pro.ts). Free readers see every
 *  check's title with its findings blurred in place (`PremiumBlur`). */
export default function ProInsights({ insights, lang = "en" }: { insights: Insights; lang?: AnalysisLang }) {
  const t = STR[lang];
  const bn = lang === "bn";
  const { risk, paid, income, vsMarket, actions } = insights;
  const first = risk.length ? "risk" : paid.length ? "paid" : income.lines.length ? "income" : vsMarket.length ? "vs" : "actions";

  return (
    <PfCard
      title={t.title}

      note={t.sub}
      lang={lang}
      dataCard="pro-insights"
      right={
        <Chip icon={<IconCrown size={14} />}>
          <span className={bn ? "font-bn" : ""}>{t.eyebrow}</span>
        </Chip>
      }
    >
      <div className={bn ? "font-bn" : ""} lang={bn ? "bn" : undefined}>
        <div className="pf-rows border-t border-border pt-5">
          {risk.length > 0 && (
            <Block title={t.risk} lang={lang} cta={first === "risk"}><Lines lines={risk} /></Block>
          )}
          {paid.length > 0 && (
            <Block title={t.paid} lang={lang} cta={first === "paid"}><Lines lines={paid} /></Block>
          )}
          {income.lines.length > 0 && (
            <Block title={t.income} lang={lang} cta={first === "income"}><Lines lines={income.lines} /></Block>
          )}
          {vsMarket.length > 0 && (
            <Block title={t.vs} lang={lang} cta={first === "vs"}><Lines lines={vsMarket} /></Block>
          )}
          {actions.length > 0 && (
            <Block title={t.actions} sub={t.actionsSub} lang={lang} cta={first === "actions"}>
              <ul className="pf-rows">
                {actions.map((a) => (
                  <li key={a.code} className="py-3 first:pt-0">
                    <div className="flex items-center justify-between gap-3">
                      <Link
                        prefetch={false}
                        href={`/stock/${a.code}`}
                        className="min-w-0 truncate font-semibold text-text-main hover:text-primary-ink hover:underline active:opacity-70"
                      >
                        {a.companyName ?? a.code}
                      </Link>
                      <Chip tone={ACTION_TONE[a.kind]} className="shrink-0">{a.label}</Chip>
                    </div>
                    {a.companyName && <p className="text-xs font-semibold text-text-muted">{a.code}</p>}
                    <p className="mt-1 text-sm leading-relaxed text-text-muted">{a.reason}</p>
                  </li>
                ))}
              </ul>
            </Block>
          )}
        </div>
        <p className="pf-fine pf-card-foot">{t.footer}</p>
      </div>
    </PfCard>
  );
}
