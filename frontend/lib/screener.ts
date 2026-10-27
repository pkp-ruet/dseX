import type { ScreenerAnswers, ScreenerQuestion } from "@/lib/api";

/** A stock's strengths on the six questions, in words: "Excellent · Cheap · Pays 4%+". */
export function strengthLine(
  levels: ScreenerAnswers | null | undefined,
  questions: ScreenerQuestion[],
  t: (en: string, bn: string) => string,
): string {
  if (!levels) return "";
  return questions
    .map((q) => {
      const l = q.levels[levels[q.key] ?? 0];
      return l?.tag_en ? t(l.tag_en, l.tag_bn ?? l.tag_en) : null;
    })
    .filter(Boolean)
    .join(" · ");
}

/** `strengthLine` in both languages, for a `<T>` that switches without a re-render. */
export function strengthPair(
  levels: ScreenerAnswers | null | undefined,
  questions: ScreenerQuestion[],
): { en: string; bn: string } {
  return {
    en: strengthLine(levels, questions, (en) => en),
    bn: strengthLine(levels, questions, (_en, bn) => bn),
  };
}

/** Every question at "any". */
export function noAnswers(questions: ScreenerQuestion[]): ScreenerAnswers {
  return Object.fromEntries(questions.map((q) => [q.key, 0]));
}

/** `quality:1,price:2` — only the answers that aren't "any", so a link reads. */
export function encodeAnswers(a: ScreenerAnswers): string {
  return Object.entries(a).filter(([, v]) => v).map(([k, v]) => `${k}:${v}`).join(",");
}

export function decodeAnswers(raw: string, questions: ScreenerQuestion[]): ScreenerAnswers {
  const out = noAnswers(questions);
  for (const part of raw.split(",")) {
    const [k, v] = part.split(":");
    const n = Number(v);
    if (k in out && (n === 1 || n === 2)) out[k] = n;
  }
  return out;
}

export const sameAnswers = (a: ScreenerAnswers, b: ScreenerAnswers) =>
  Object.keys({ ...a, ...b }).every((k) => (a[k] ?? 0) === (b[k] ?? 0));

/** Same members, any order. */
export const sameSet = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x));
