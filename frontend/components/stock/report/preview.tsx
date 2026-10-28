"use client";

import { createContext, useContext, type ReactNode } from "react";
import { IconLock } from "@/components/ui/icons";
import { T } from "@/components/i18n/T";
import type { InsideLine, SectionKey } from "@/lib/stock-report";

/**
 * The masked preview of a locked report section (2026-10-28, user: the
 * "Premium shows you" lines alone were hard to picture). A free reader sees
 * the section's real layout for this stock — chart shapes, row labels, the
 * names of the checks — with only the deciding figures replaced by grey bars
 * (`Redact`). Each part carries a small gold number (`PartTag`) matching a
 * numbered line in the "Premium shows you" box. The answer itself is never in
 * the preview's markup; the real body stays under `.premium-locked`.
 */

/** The parts each section's preview draws. A "Premium shows you" line whose
 *  `part` is not listed here (or has none) is numbered on the preview's
 *  "What it means" block. The backend tags its lines with these keys
 *  (stock_report.part). */
export const PREVIEW_PARTS: Partial<Record<SectionKey | "you", string[]>> = {
  red_flags: ["amber", "passed"],
  price: ["fair", "buy_below", "scenarios"],
  dividend: ["safety", "history"],
  this_year: ["quarters", "cash", "next"],
  next: ["expect"],
  owners: ["trades", "trend"],
  cash: ["bars"],
  safety: ["facts"],
  // quality: the five checks are in the free face (first one open), so its
  // lines number the "What it means" block.
  risks: ["items"],
  alternatives: ["names"],
  you: ["you1", "you2", "you3"],
};

export type NumberedLine = InsideLine & { n: number; at: string };

/** Number the lines 1, 2, 3 and settle which preview part each one marks. */
export function numberLines(key: SectionKey | "you", lines: InsideLine[], hasWatch: boolean): NumberedLine[] {
  const drawn = new Set([...(PREVIEW_PARTS[key] ?? []), "meaning", ...(hasWatch ? ["watch"] : [])]);
  return lines.map((l, i) => ({ ...l, n: i + 1, at: l.part && drawn.has(l.part) ? l.part : "meaning" }));
}

const PartsCtx = createContext<NumberedLine[]>([]);

export function PartsProvider({ lines, children }: { lines: NumberedLine[]; children: ReactNode }) {
  return <PartsCtx.Provider value={lines}>{children}</PartsCtx.Provider>;
}

/** The gold number(s) beside a preview part — nothing when no line marks it. */
export function PartTag({ part, className = "" }: { part: string; className?: string }) {
  const lines = useContext(PartsCtx).filter((l) => l.at === part);
  if (!lines.length) return null;
  return (
    <span className={`rp-tags ${className}`.trim()} aria-hidden="true">
      {lines.map((l) => <span key={l.n} className="rp-tag">{l.n}</span>)}
    </span>
  );
}

/** What kind of figure is hidden — the pill keeps its unit, the way a
 *  hidden bKash balance still shows "৳". */
export type HiddenKind = "tk" | "pct" | "x" | "num" | "range" | "text";

const DOTS: Record<HiddenKind, string> = {
  tk: "৳ •••",
  pct: "••%",
  x: "•.•×",
  num: "•••",
  range: "৳ ••• – •••",
  text: "•••• ••• •••••",
};

/**
 * A hidden Premium figure (2026-10-29, user picked "hidden like a balance"
 * over grey bars, which read as a page still loading): a gold pill with the
 * figure's unit, dots for its digits and a lock. Never pass the real value.
 */
export function Hidden({ kind = "num", size = "sm", dots }: {
  kind?: HiddenKind;
  size?: "xs" | "sm" | "lg";
  /** Override the dots (e.g. "৳ ••• crore"). */
  dots?: string;
}) {
  return (
    <span className="rp-hidden" data-size={size}>
      <span>{dots ?? DOTS[kind]}</span>
      <IconLock size={size === "lg" ? 12 : 10} />
    </span>
  );
}

// Money ("৳1,234.5"), a percentage or a multiple ("16%", "7.5×", "7.5 times"),
// or a bare number. Years (1990–2039 on their own) and numbers glued to letters
// ("Q1", "FY2026") are left as they are. No look-behind: iOS before 16.4
// can't parse one, and the whole page would fail there. Group 1 = money;
// else group 2 is the character before the number, group 3 the number.
const NUM_RE = /(৳\s?\d(?:\d|,(?=\d{3}))*(?:\.\d+)?)|(^|[^A-Za-z\d.,৳])(\d(?:\d|,(?=\d{3}))*(?:\.\d+)?(?:\s?(?:%|×))?)(?![A-Za-z\d])/g;

function dotsFor(token: string): { kind: HiddenKind; dots?: string } | null {
  const t = token.trim();
  if (t.startsWith("৳")) return { kind: "tk" };
  if (t.endsWith("%")) return { kind: "pct" };
  if (t.endsWith("×")) return { kind: "x" };
  if (/^(199\d|20[0-3]\d)$/.test(t)) return null;
  return { kind: "num", dots: t.includes(".") ? "•.•" : "••" };
}

/** Each figure in the text: where it starts and what stands in for it. */
function figures(text: string): { at: number; len: number; d: { kind: HiddenKind; dots?: string } }[] {
  const out: { at: number; len: number; d: { kind: HiddenKind; dots?: string } }[] = [];
  for (const m of text.matchAll(NUM_RE)) {
    const token = m[1] ?? m[3];
    if (!token) continue;
    const d = dotsFor(token);
    if (!d) continue;
    const at = (m.index ?? 0) + (m[1] ? 0 : (m[2] ?? "").length);
    out.push({ at, len: token.length, d });
  }
  return out;
}

/** A sentence with each figure swapped for a `Hidden` pill. */
function maskNode(text: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  let last = 0;
  figures(text).forEach((f, k) => {
    if (f.at > last) out.push(text.slice(last, f.at));
    out.push(<Hidden key={k} kind={f.d.kind} dots={f.d.dots} />);
    last = f.at + f.len;
  });
  if (last < text.length) out.push(text.slice(last));
  return out;
}

/** True when the sentence has a figure to hide (else masking would show it all). */
export function hasFigure(text: string | null | undefined): boolean {
  return !!text && figures(text).length > 0;
}

/**
 * A Premium sentence for a free reader: its words, with every figure hidden
 * in a pill — or, when it has no figure (the words would be the whole
 * answer), one text pill.
 */
export function MaskedSentence({ b, size = "sm" }: { b: { en: string; bn: string }; size?: "xs" | "sm" | "lg" }) {
  if (!hasFigure(b.en)) return <Hidden kind="text" size={size} />;
  return <T en={<>{maskNode(b.en)}</>} bn={<>{maskNode(b.bn || b.en)}</>} />;
}
