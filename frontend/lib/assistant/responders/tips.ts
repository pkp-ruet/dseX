import { getDailyTips } from "@/lib/api";
import { COPY } from "../copy";
import type { MessageBlock } from "../types";

/** A few of today's plain-English tips (from the Daily Tips feature). */
export async function tipsResponder(): Promise<MessageBlock[]> {
  const res = await getDailyTips();
  const tips = (res.tips ?? []).slice(0, 3);
  if (!tips.length) return [{ type: "text", text: COPY.tips.none }];

  const blocks: MessageBlock[] = [{ type: "text", text: COPY.tips.intro }];
  for (const t of tips) {
    blocks.push({ type: "text", text: `• ${t.text}` });
  }
  blocks.push({ type: "text", text: "", link: { href: "/daily-tips", label: COPY.tips.seeAll } });
  blocks.push({ type: "disclaimer" });
  return blocks;
}
