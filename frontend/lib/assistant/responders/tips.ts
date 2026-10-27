import { getDailyTips, type DailyTip } from "@/lib/api";
import { COPY } from "../copy";
import type { MessageBlock } from "../types";

/** A tip's one-line summary in each language; tips stored before 2026-10-28 carry only `text`. */
export function tipLine(t: DailyTip): { en: string; bn?: string } {
  const x = t as DailyTip & { summary?: string | null; summary_bn?: string | null };
  return { en: x.summary || t.text, bn: x.summary_bn || undefined };
}

/** A few of today's tips (from the Daily Tips feature). */
export async function tipsResponder(): Promise<MessageBlock[]> {
  const res = await getDailyTips();
  const tips = (res.tips ?? []).slice(0, 3);
  if (!tips.length) return [{ type: "text", text: COPY.tips.none, bn: COPY.tips.noneBn }];

  const blocks: MessageBlock[] = [{ type: "text", text: COPY.tips.intro, bn: COPY.tips.introBn }];
  for (const t of tips) {
    const line = tipLine(t);
    blocks.push({ type: "text", text: `• ${line.en}`, bn: line.bn ? `• ${line.bn}` : undefined });
  }
  blocks.push({
    type: "text",
    text: "",
    link: { href: "/buy-sell-signals#tips", label: COPY.tips.seeAll, labelBn: COPY.tips.seeAllBn },
  });
  blocks.push({ type: "disclaimer" });
  return blocks;
}
