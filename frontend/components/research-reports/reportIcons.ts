import type { ReportSlug } from "@/lib/research-reports";
import { IconAlert, IconBriefcase, IconChartBars, IconCheckCircle, IconCoin, IconNews } from "@/components/ui/icons";

/** One icon per research report — the hub's cards and the dashboard's tiles. */
export const REPORT_ICON: Record<ReportSlug, typeof IconAlert> = {
  "risk-register": IconAlert,
  "auditor-warnings": IconNews,
  "results-season": IconChartBars,
  "who-is-buying": IconBriefcase,
  "is-the-profit-real": IconCheckCircle,
  "dividends-you-can-count-on": IconCoin,
};
