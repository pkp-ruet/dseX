import Link from "next/link";
import type { ReactNode } from "react";
import type { Lang } from "@/context/LangContext";
import { t } from "@/lib/home-copy";
import { IconArrowRight, IconChartBars, IconTrendUp } from "@/components/ui/icons";

interface Item {
  href: string;
  icon: ReactNode;
  title: "dseTodayLink" | "marketAnalysisLink";
  sub: "dseTodayLinkSub" | "marketAnalysisLinkSub";
}

const ITEMS: Item[] = [
  { href: "/dse-today", icon: <IconChartBars size={18} />, title: "dseTodayLink", sub: "dseTodayLinkSub" },
  { href: "/market-analysis", icon: <IconTrendUp size={18} />, title: "marketAnalysisLink", sub: "marketAnalysisLinkSub" },
];

/**
 * The Market today chapter's way out: two quiet link tiles to the full DSE
 * day (`/dse-today`) and the whole market in plain words (`/market-analysis`).
 * Neutral icon tile, title, one muted line, arrow — no colour.
 */
export default function MarketLinks({ lang }: { lang: Lang }) {
  return (
    <nav aria-label={t(lang, "chMarket")} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {ITEMS.map((it) => (
        <Link
          key={it.href}
          href={it.href}
          className="soft-card group flex min-h-14 items-center gap-3 px-4 py-3 transition-colors hover:border-primary active:bg-surface-2"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-text-main">
            {it.icon}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-text-main">{t(lang, it.title)}</span>
            <span className="block text-xs text-text-muted">{t(lang, it.sub)}</span>
          </span>
          <span className="shrink-0 text-text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-primary">
            <IconArrowRight size={16} />
          </span>
        </Link>
      ))}
    </nav>
  );
}
