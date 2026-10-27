"use client";

import Chip from "@/components/ui/Chip";
import { IconLock } from "@/components/ui/icons";
import { T } from "@/components/i18n/T";
import type { CustomListTemplate } from "@/lib/api";

/**
 * Quick picks — the top row of the questions card (2026-10-27: the separate
 * "What are you looking for?" step was merged into the questions). A pick is
 * only a shortcut: tapping one fills in the six answers below, so the reader
 * sees what it means. It lights up while the answers match it and goes dark
 * as soon as one answer changes — there is no separate "chosen start".
 */
export default function ScreenerStarts({
  goals,
  active,
  locked,
  onLocked,
  onPick,
  t,
}: {
  /** Goal starts only (`kind: "goal"`). */
  goals: CustomListTemplate[];
  /** The goal the current answers match, if any. */
  active: string | null;
  /** Free readers: picks are free, their own answers are Premium. */
  locked: boolean;
  onLocked: () => void;
  onPick: (tp: CustomListTemplate) => void;
  t: (en: string, bn: string) => string;
}) {
  if (!goals.length) return null;
  return (
    <div className="border-b border-border px-4 py-4 sm:px-5">
      <p className="mb-2 text-sm text-text-muted">
        {locked ? (
          <>
            <T
              en="Quick picks are free. To set your own answers, sectors and order, "
              bn="দ্রুত বাছাইগুলো ফ্রি। নিজের উত্তর, সেক্টর আর ক্রম ঠিক করতে "
            />
            <button type="button" onClick={() => onLocked()} className="inline-flex items-center gap-1 font-semibold text-primary hover:underline">
              <IconLock size={12} />
              <T en="get Premium" bn="প্রিমিয়াম নিন" />
            </button>
          </>
        ) : (
          <T en="Choose a quick pick, or answer the questions yourself." bn="একটি দ্রুত বাছাই নিন, বা নিজেই প্রশ্নগুলোর উত্তর দিন।" />
        )}
      </p>
      <div className="flex flex-wrap gap-2">
        {goals.map((tp) => (
          <Chip key={tp.id} active={tp.id === active} onClick={() => onPick(tp)}>
            <T en={tp.title_en} bn={tp.title_bn} />
          </Chip>
        ))}
      </div>
    </div>
  );
}
