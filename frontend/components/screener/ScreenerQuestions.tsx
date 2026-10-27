"use client";

import { useState, type ReactNode } from "react";
import Button from "@/components/ui/Button";
import Chip from "@/components/ui/Chip";
import Sheet from "@/components/ui/Sheet";
import { IconChevronDown, IconLock } from "@/components/ui/icons";
import type { ScreenerAnswers, ScreenerQuestion } from "@/lib/api";

/** The DOM id of one question, so "Almost passed" can jump to it. */
export const questionId = (key: string) => `sc-q-${key}`;

/**
 * The six questions — the screener's main control (2026-10-27). Each is a
 * three-way switch (any · 1 · 2) with a live count under every choice: how
 * many stocks you'd have with that choice, the other answers held, so a
 * reader sees "0" before tapping it. One line under the switch says what the
 * chosen choice checks. A sector picker (one or several sectors) sits under
 * the six.
 *
 * `locked` (free readers): the answers and sectors can't be changed — a tap
 * on another choice calls `onLocked(key, level)` (the page previews what that
 * choice would give), the sector row `onLocked()` (the Premium prompt). The
 * counts stay visible: they are the free part.
 */
export default function ScreenerQuestions({
  questions,
  answers,
  picked,
  sectors,
  facets,
  running,
  locked,
  onAnswer,
  onSectors,
  onLocked,
  header,
  t,
}: {
  questions: ScreenerQuestion[];
  answers: ScreenerAnswers;
  /** The sectors the screen keeps; [] = every sector. */
  picked: string[];
  /** Every DSE sector the screener knows. */
  sectors: { value: string; label_en: string; label_bn: string }[];
  /** {question: [count at any, 1, 2]} from the last run; null while it is a different screen. */
  facets: Record<string, number[]> | null;
  running: boolean;
  locked: boolean;
  onAnswer: (key: string, level: number) => void;
  onSectors: (s: string[]) => void;
  /** A locked tap: on a choice (key + level — the page previews it) or the sector row (no args). */
  onLocked: (key?: string, level?: number) => void;
  /** The quick picks row, at the top of the card. */
  header?: ReactNode;
  t: (en: string, bn: string) => string;
}) {
  const [sectorOpen, setSectorOpen] = useState(false);
  const [draft, setDraft] = useState<string[]>(picked);
  const label = (v: string) => {
    const d = sectors.find((s) => s.value === v);
    return d ? t(d.label_en, d.label_bn) : v;
  };
  const pickedLine = !picked.length
    ? t("All sectors", "সব খাত")
    : picked.length <= 3
      ? picked.map(label).join(", ")
      : t(`${picked.length} sectors: ${picked.slice(0, 2).map(label).join(", ")} and more`,
          `${picked.length}টি খাত: ${picked.slice(0, 2).map(label).join(", ")} ও আরও`);
  const openSectors = () => {
    if (locked) return onLocked();
    setDraft(picked);
    setSectorOpen(true);
  };
  const toggle = (v: string) => setDraft((d) => (d.includes(v) ? d.filter((x) => x !== v) : [...d, v]));

  return (
    <div className="soft-card overflow-hidden">
      {header}
      <ul>
        {questions.map((q) => {
          const on = answers[q.key] ?? 0;
          const counts = facets?.[q.key];
          const lvl = q.levels[on];
          return (
            <li key={q.key} id={questionId(q.key)} className="scroll-mt-32 border-b border-border px-4 py-4 sm:px-5">
              <p className="text-base font-semibold text-text-main" id={`${questionId(q.key)}-t`}>
                {t(q.title_en, q.title_bn)}
              </p>
              <p className="mt-0.5 min-h-5 text-sm text-text-muted">{t(lvl.means_en, lvl.means_bn)}</p>
              <div
                role="radiogroup"
                aria-labelledby={`${questionId(q.key)}-t`}
                className="mt-2.5 grid grid-cols-3 overflow-hidden rounded-lg border border-border"
              >
                {q.levels.map((l, i) => {
                  const sel = i === on;
                  const n = counts?.[i];
                  const empty = n === 0 && !sel;
                  return (
                    <button
                      key={i}
                      type="button"
                      role="radio"
                      aria-checked={sel}
                      onClick={() => {
                        if (sel) return;
                        if (locked) onLocked(q.key, i);
                        else onAnswer(q.key, i);
                      }}
                      className={`flex min-h-14 flex-col items-center justify-center gap-0.5 border-l border-border px-1 py-2 text-center first:border-l-0 ${
                        sel ? "bg-primary-soft text-primary" : "bg-surface text-text-main hover:bg-surface-2 active:bg-surface-2"
                      }`}
                    >
                      <span className={`text-sm leading-tight ${sel ? "font-semibold" : ""} ${empty ? "text-text-muted" : ""}`}>
                        {t(l.label_en, l.label_bn)}
                      </span>
                      <span
                        className={`inline-flex min-h-4 items-center gap-1 text-xs tabular-nums ${sel ? "text-primary" : empty ? "text-negative" : "text-text-muted"} ${running ? "opacity-60" : ""}`}
                        aria-label={n == null ? undefined : t(`${n} stocks`, `${n}টি শেয়ার`)}
                      >
                        {locked && !sel && <IconLock size={12} />}
                        {n ?? ""}
                      </span>
                    </button>
                  );
                })}
              </div>
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        onClick={openSectors}
        className="flex min-h-14 w-full items-center justify-between gap-3 px-4 text-left hover:bg-surface-2 active:bg-surface-2 sm:px-5"
      >
        <span className="min-w-0">
          <span className="block text-base font-semibold text-text-main">{t("Which business sectors?", "কোন খাতের ব্যবসা?")}</span>
          <span className="block text-sm text-text-muted">{pickedLine}</span>
        </span>
        <span className="shrink-0 text-text-muted" aria-hidden>
          {locked ? <IconLock size={16} /> : <IconChevronDown size={18} />}
        </span>
      </button>

      <Sheet
        open={sectorOpen}
        onClose={() => setSectorOpen(false)}
        title={t("Which business sectors?", "কোন খাতের ব্যবসা?")}
        bn={t("Pick one or several. Pick none for every sector.", "এক বা একাধিক বাছুন। কোনোটি না বাছলে সব খাত।")}
        size="lg"
        footer={
          <div className="flex w-full gap-2">
            <Button variant="quiet" className="flex-1" onClick={() => setDraft([])}>
              {t("All sectors", "সব খাত")}
            </Button>
            <Button variant="primary" className="flex-1" onClick={() => { onSectors(draft); setSectorOpen(false); }}>
              {draft.length
                ? t(`Use ${draft.length} ${draft.length === 1 ? "sector" : "sectors"}`, `${draft.length}টি খাত নিন`)
                : t("Use all sectors", "সব খাত নিন")}
            </Button>
          </div>
        }
      >
        <div className="flex flex-wrap gap-2" role="group" aria-label={t("Sectors", "খাত")}>
          {sectors.map((s) => (
            <Chip key={s.value} active={draft.includes(s.value)} onClick={() => toggle(s.value)}>
              {t(s.label_en, s.label_bn)}
            </Chip>
          ))}
        </div>
      </Sheet>
    </div>
  );
}
