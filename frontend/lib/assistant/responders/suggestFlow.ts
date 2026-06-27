import { getStockRecommendations, type RecommendationAnswers } from "@/lib/api";
import { COPY } from "../copy";
import { toAnswers } from "../flows";
import type { MessageBlock } from "../types";

/** Final step of the suggest flow: call the recommendation engine, render picks. */
export async function runSuggest(
  collected: Partial<RecommendationAnswers>,
): Promise<MessageBlock[]> {
  const answers = toAnswers(collected);
  const res = await getStockRecommendations(answers);

  if (!res.picks?.length) {
    return [{ type: "text", text: COPY.empty.text }];
  }

  const relaxed = (res.relaxations?.length ?? 0) > 0;
  return [
    { type: "text", text: relaxed ? COPY.suggest.none : COPY.suggest.done },
    {
      type: "recommended-list",
      picks: res.picks.slice(0, 5),
      relaxations: res.relaxations ?? [],
    },
    { type: "disclaimer" },
  ];
}
