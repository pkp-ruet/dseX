/**
 * Watch rules (THE Premium line, step 4, 2026-11-22): the reader's own rules
 * on each share. Mirror of backend `services/watch_rules.py` `KINDS` (order,
 * keys and value choices are checked in backend/tests/test_agreement.py).
 * Price alerts stay their own thing (`lib/price-alerts.ts`) and count
 * against the same cap: 3 for a free reader, as many as needed with Premium.
 */

export type Pair = { en: string; bn: string };

export interface RuleKind {
  key: string;
  /** `{v}` is the chosen value. */
  label: Pair;
  /** The default value and the choices, for the kinds that take a percent. */
  value?: number;
  values?: number[];
  /** Only makes sense for a share the reader owns. */
  held?: boolean;
}

export const RULE_KINDS: RuleKind[] = [
  { key: "grade_down", label: { en: "Our grade moves down", bn: "আমাদের গ্রেড নেমে গেলে" } },
  { key: "red_flag", label: { en: "A serious problem is found", bn: "গুরুতর কোনো সমস্যা ধরা পড়লে" } },
  { key: "results", label: { en: "Results are posted", bn: "আর্থিক ফল প্রকাশ হলে" } },
  { key: "dividend", label: { en: "A dividend is declared", bn: "ডিভিডেন্ড ঘোষণা হলে" } },
  { key: "profit_drop", label: { en: "Profit falls {v}% or more in its results", bn: "আর্থিক ফলে মুনাফা {v}% বা বেশি কমলে" }, value: 20, values: [10, 20, 30] },
  { key: "dividend_cut", label: { en: "The dividend is cut or skipped", bn: "ডিভিডেন্ড কমালে বা না দিলে" } },
  { key: "last_day", label: { en: "Tomorrow is the last day to buy for a dividend", bn: "কাল ডিভিডেন্ড পেতে কেনার শেষ দিন হলে" } },
  { key: "day_drop", label: { en: "It falls {v}% or more in a day", bn: "এক দিনে দাম {v}% বা বেশি কমলে" }, value: 5, values: [3, 5, 8] },
  { key: "breakeven", label: { en: "It is back to the price I paid", bn: "আমার কেনা দামে ফিরলে" }, held: true },
  { key: "grade_up", label: { en: "Our grade moves up", bn: "আমাদের গ্রেড উঠলে" } },
  { key: "z_category", label: { en: "It moves to the Z category", bn: "জেড ক্যাটাগরিতে গেলে" } },
  { key: "owners_selling", label: { en: "Founders or directors announce a sale", bn: "উদ্যোক্তা বা পরিচালক বিক্রির ঘোষণা দিলে" } },
];

/** Ticked in the sheet when a share has no rules yet — saved only on Save. */
export const SUGGESTED = ["grade_down", "red_flag", "results", "dividend"];

export function ruleLabel(kind: string, value?: number): Pair {
  const k = RULE_KINDS.find((r) => r.key === kind);
  if (!k) return { en: kind, bn: kind };
  const v = value ?? k.value;
  const vs = v != null ? String(v) : "";
  return { en: k.label.en.replace("{v}", vs), bn: k.label.bn.replace("{v}", vs) };
}
