"use client";

import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { OwnerTag } from "@/components/home/personalized/OwnerMark";
import StoryViewer, { StoryFace } from "@/components/home/personalized/StoryViewer";
import type { Lang } from "@/context/LangContext";
import type { Story } from "@/lib/dash-stories";
import { t } from "@/lib/home-copy";
import { bstDateStr } from "@/lib/market-hours";
import { trackEvent } from "@/lib/track";

/** "Seen" is a per-reader convenience for the day: localStorage, reset at
 *  the next Dhaka date, never sent anywhere. */
const seenKey = (uid: string | null) => `dsex.stories.seen.${uid ?? "anon"}`;
const MAX_SEEN_IDS = 400;

function readSeen(uid: string | null, day: string): Set<string> {
  try {
    const raw = localStorage.getItem(seenKey(uid));
    if (!raw) return new Set();
    const v = JSON.parse(raw) as { day?: string; ids?: string[] };
    return v?.day === day && Array.isArray(v.ids) ? new Set(v.ids) : new Set();
  } catch {
    return new Set();
  }
}

function writeSeen(uid: string | null, day: string, ids: Set<string>): void {
  try {
    localStorage.setItem(seenKey(uid), JSON.stringify({ day, ids: Array.from(ids).slice(-MAX_SEEN_IDS) }));
  } catch {}
}

const SKELETON = [0, 1, 2, 3, 4];

/**
 * The story rings under the greeting (2026-10-28 — replaced "Your stocks
 * today" and "This week on your stocks"). "Today" leads, then the stories the
 * reader hasn't watched, then the ones they have (grey ring — still there, and
 * they replay as often as the reader likes), then a free reader's Premium
 * ring. The order is frozen while the viewer is open so watching doesn't
 * shuffle the run. A one-line label sits above the rings ("Your stories
 * today", or "Today's market stories" for a reader with no stocks) so the
 * row says what it is.
 */
export default function StoriesRow({
  stories,
  loading,
  quiet,
  starter = false,
  userId,
  lang,
}: {
  stories: Story[];
  /** Holdings not known yet — grey placeholder rings hold the space. */
  loading: boolean;
  /** The reader has stocks but nothing happened on them: one quiet line. */
  quiet: boolean;
  /** A reader with no stocks yet: the rings are market stories. */
  starter?: boolean;
  userId: string | null;
  lang: Lang;
}) {
  const bn = lang === "bn";
  const day = bstDateStr();
  const [seen, setSeen] = useState<Set<string>>(() => new Set());
  const [open, setOpen] = useState<{ list: Story[]; index: number } | null>(null);
  const headId = useId();

  useEffect(() => setSeen(readSeen(userId, day)), [userId, day]);

  const markSeen = useCallback(
    (id: string) =>
      setSeen((prev) => {
        if (prev.has(id)) return prev;
        const next = new Set(prev);
        next.add(id);
        writeSeen(userId, day, next);
        return next;
      }),
    [userId, day],
  );

  const isSeen = useCallback((s: Story) => s.frames.every((f) => seen.has(f.id)), [seen]);

  const ordered = useMemo(() => {
    const today = stories.filter((s) => s.kind === "today");
    const more = stories.filter((s) => s.kind === "more");
    const rest = stories.filter((s) => s.kind !== "today" && s.kind !== "more");
    return [...today, ...rest.filter((s) => !isSeen(s)), ...rest.filter((s) => isSeen(s)), ...more];
  }, [stories, isSeen]);

  // A tap on the before-the-bell push lands on `/?src=brief`: open the Today
  // story (where the brief is) once the rings are ready, once per visit.
  const [autoOpened, setAutoOpened] = useState(false);
  useEffect(() => {
    if (autoOpened || loading || !ordered.length || ordered[0].kind !== "today") return;
    if (typeof window === "undefined" || new URLSearchParams(window.location.search).get("src") !== "brief") return;
    if (!ordered[0].frames.some((f) => f.kind === "brief")) return;
    setAutoOpened(true);
    trackEvent("story_open", { story: "today", code: "", seen: 0, from: "brief" });
    setOpen({ list: ordered, index: 0 });
  }, [autoOpened, loading, ordered]);

  // The label holds its place while the rings load, so nothing jumps.
  const head = (
    <div className="flex items-baseline justify-between gap-3">
      <p id={headId} className="text-sm font-semibold text-text-main">
        {t(lang, starter ? "storiesMarket" : "storiesTitle")}
      </p>
      <p className="shrink-0 text-xs text-text-muted">{t(lang, "storiesHint")}</p>
    </div>
  );

  if (loading) {
    return (
      <div lang={bn ? "bn" : undefined} className={bn ? "font-bn" : undefined}>
        {head}
        <ul className="story-rail" aria-hidden>
          {SKELETON.map((k) => (
            <li key={k} className="story-bubble">
              <span className="story-ring story-ring--skeleton" />
              <span className="mt-0.5 block h-3 w-10 rounded-sm bg-surface-2" />
            </li>
          ))}
        </ul>
      </div>
    );
  }
  if (!ordered.length) return null;

  const openAt = (index: number) => {
    const s = ordered[index];
    trackEvent("story_open", { story: s.kind, code: s.code ?? "", seen: isSeen(s) ? 1 : 0 });
    setOpen({ list: ordered, index });
  };

  return (
    <div lang={bn ? "bn" : undefined} className={bn ? "font-bn" : undefined}>
      {head}
      <ul className="story-rail" aria-labelledby={headId}>
        {ordered.map((s, i) => {
          const done = isSeen(s);
          const n = s.frames.length;
          const label = bn
            ? `${s.name}${s.code ? ` (${s.code})` : ""}: ${n}টি স্টোরি${done ? ", দেখা হয়েছে" : ""}`
            : `${s.name}${s.code ? ` (${s.code})` : ""}: ${n} ${n === 1 ? "story" : "stories"}${done ? ", seen" : ""}`;
          return (
            <li key={s.id}>
              <button type="button" className="story-bubble" onClick={() => openAt(i)} aria-label={label}>
                <span className={`story-ring story-ring--${done ? "seen" : s.tone}`}>
                  <span className="story-ring-in">
                    <StoryFace story={s} />
                  </span>
                  {s.owner && (
                    <span className="story-owner">
                      <OwnerTag kind={s.owner} lang={lang} />
                    </span>
                  )}
                </span>
                <span className={`story-label text-xs ${done ? "text-text-muted" : "font-semibold text-text-main"}`}>
                  {s.label}
                </span>
              </button>
            </li>
          );
        })}
        {quiet && (
          <li className="flex min-h-16 items-center pl-1 text-sm text-text-muted">
            <span className="mr-2 h-2 w-2 shrink-0 rounded-full bg-positive" aria-hidden />
            {t(lang, "allQuiet")}
          </li>
        )}
      </ul>
      {open && (
        <StoryViewer
          stories={open.list}
          start={open.index}
          onClose={() => setOpen(null)}
          onSeen={markSeen}
          lang={lang}
        />
      )}
    </div>
  );
}
