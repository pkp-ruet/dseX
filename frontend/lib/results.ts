import type { LatestResultRow } from "@/lib/api";
import type { StockRowTone } from "@/components/ui/StockRow";

/** How a quarterly report reads against the same months last year — the one
 *  set of words for the stock-page card, the /results feed and the dashboard. */
export const RESULT_LEVEL: Record<
  LatestResultRow["level"],
  { en: string; bn: string; short: string; shortBn: string; tone: StockRowTone; pill: string }
> = {
  good: { en: "Better than last year", bn: "গত বছরের চেয়ে ভালো", short: "Better", shortBn: "ভালো",
          tone: "positive", pill: "text-positive bg-positive/10" },
  watch: { en: "Mixed — worth watching", bn: "মিশ্র — নজর রাখুন", short: "Mixed", shortBn: "মিশ্র",
           tone: "watch", pill: "text-watch bg-watch/10" },
  bad: { en: "Weaker than last year", bn: "গত বছরের চেয়ে দুর্বল", short: "Weaker", shortBn: "দুর্বল",
         tone: "negative", pill: "text-negative bg-negative/10" },
  neutral: { en: "About the same", bn: "প্রায় আগের মতো", short: "About the same", shortBn: "প্রায় আগের মতো",
             tone: "muted", pill: "text-text-main bg-surface-2" },
};

export const RESULT_LEVEL_ORDER: LatestResultRow["level"][] = ["good", "watch", "bad", "neutral"];
