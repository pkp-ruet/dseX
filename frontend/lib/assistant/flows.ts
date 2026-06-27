/**
 * The guided "suggest stocks" slot flow — a conversational, 4-tap version of the
 * recommendation quiz. We collect a subset of answers via chips and merge them
 * over the quiz's proven DEFAULTS, then hand off to the existing engine.
 */
import type { RecommendationAnswers } from "@/lib/api";
import type { Chip, MessageBlock, SlotKey } from "./types";
import { COPY, ANY_SECTOR } from "./copy";

/** Mirrors RecommendationQuiz.tsx DEFAULTS (frontend/components/stock-recommendation). */
export const SUGGEST_DEFAULTS: RecommendationAnswers = {
  timeline: "long",
  strategy: "fundamental_strong",
  risk: "balanced",
  size: "any",
  sectors: [],
  dividend: "doesnt_matter",
  valuation: "any",
  budget: "any",
};

export const SLOT_ORDER: SlotKey[] = ["strategy", "dividend", "risk", "sectors"];

export function toAnswers(collected: Partial<RecommendationAnswers>): RecommendationAnswers {
  return { ...SUGGEST_DEFAULTS, ...collected };
}

function slotFilled(collected: Partial<RecommendationAnswers>, key: SlotKey): boolean {
  if (key === "sectors") return collected.sectors !== undefined;
  return collected[key] !== undefined;
}

/** Index of the next unanswered slot (or SLOT_ORDER.length when all done). */
export function nextSlotIndex(collected: Partial<RecommendationAnswers>, from = 0): number {
  for (let i = Math.max(0, from); i < SLOT_ORDER.length; i++) {
    if (!slotFilled(collected, SLOT_ORDER[i])) return i;
  }
  return SLOT_ORDER.length;
}

/** Build the question text + answer chips for one slot. */
export function slotQuestion(key: SlotKey, sectors: string[]): MessageBlock[] {
  if (key === "sectors") {
    const chips: Chip[] = [
      { label: COPY.slots.sectors.anyLabel, emoji: "🌐", slot: { key: "sectors", value: ANY_SECTOR } },
      ...sectors.map((s) => ({ label: s, slot: { key: "sectors" as SlotKey, value: s } })),
    ];
    return [
      { type: "text", text: COPY.slots.sectors.q },
      { type: "chips", chips, layout: "wrap" },
    ];
  }
  const def = COPY.slots[key];
  const chips: Chip[] = def.chips.map((c) => ({ label: c.label, slot: { key, value: c.value } }));
  return [
    { type: "text", text: def.q },
    { type: "chips", chips, layout: "wrap" },
  ];
}

/** Apply a chip answer to the collected map (sectors handled specially). */
export function applySlot(
  collected: Partial<RecommendationAnswers>,
  key: SlotKey,
  value: string,
): Partial<RecommendationAnswers> {
  if (key === "sectors") {
    return { ...collected, sectors: value === ANY_SECTOR ? [] : [value] };
  }
  return { ...collected, [key]: value };
}

/** Pre-fill non-sector answers from parsed entities so a topic word skips a step. */
export function prefillFromEntities(metric?: string): Partial<RecommendationAnswers> {
  const out: Partial<RecommendationAnswers> = {};
  if (metric === "dividend") out.dividend = "income_focused";
  else if (metric === "growth") out.valuation = "growth";
  else if (metric === "cheap") out.valuation = "value";
  return out;
}
