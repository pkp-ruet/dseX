"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { createPortal } from "react-dom";
import Button from "@/components/ui/Button";
import SignalChip from "@/components/ui/SignalChip";
import { OwnerTag } from "@/components/home/personalized/OwnerMark";
import {
  IconChartBars,
  IconChevronRight,
  IconCoin,
  IconCrown,
  IconFlame,
  IconList,
  IconLock,
  IconPause,
  IconPlay,
  IconPlus,
  IconSun,
} from "@/components/ui/icons";
import type { Lang } from "@/context/LangContext";
import type { Story, StoryFrame, StoryIcon, StoryTone } from "@/lib/dash-stories";
import { t } from "@/lib/home-copy";
import { usePremium } from "@/lib/premium";
import { savePremiumContext } from "@/lib/premium-context";
import { trackEvent, trackHomeTap } from "@/lib/track";

/** How long one frame shows before the next (paused while held). */
export const STORY_MS = 7000;

export const TONE_TEXT: Record<StoryTone, string> = {
  positive: "text-positive",
  negative: "text-negative",
  neutral: "text-text-main",
};

function Icon({ name, size }: { name: StoryIcon; size: number }) {
  switch (name) {
    case "sun":
      return <IconSun size={size} />;
    case "chart":
      return <IconChartBars size={size} />;
    case "flame":
      return <IconFlame size={size} />;
    case "coin":
      return <IconCoin size={size} />;
    case "plus":
      return <IconPlus size={size} />;
    case "list":
      return <IconList size={size} />;
    case "crown":
    default:
      return <IconCrown size={size} />;
  }
}

/** What sits inside a story's circle: today's change for a stock, else its icon. */
export function StoryFace({ story, size = "md" }: { story: Story; size?: "sm" | "md" }) {
  if (story.inner) {
    return (
      <span className={`text-xs font-bold leading-none tabular-nums nums ${TONE_TEXT[story.inner.tone]}`}>
        {story.inner.text}
      </span>
    );
  }
  return (
    <span className={story.icon === "crown" ? "text-gold-ink" : "text-primary"}>
      <Icon name={story.icon ?? "sun"} size={size === "sm" ? 18 : 24} />
    </span>
  );
}

function Frame({ frame, lang }: { frame: StoryFrame; lang: Lang }) {
  const total = frame.bar ? frame.bar.up + frame.bar.flat + frame.bar.down : 0;
  const pct = (n: number) => `${(n / total) * 100}%`;
  return (
    <div aria-live="polite">
      <p className="flex items-center gap-1.5 text-sm font-semibold text-text-muted">
        {frame.locked && <IconLock size={14} />}
        {frame.label}
      </p>
      <h2 className="mt-1 line-clamp-4 text-xl font-bold leading-snug text-text-main sm:text-2xl">{frame.headline}</h2>

      {frame.big && (
        <div className="mt-4">
          <span className={`block text-4xl font-bold leading-none tabular-nums nums sm:text-5xl ${TONE_TEXT[frame.big.tone ?? "neutral"]}`}>
            {frame.big.text}
          </span>
          {frame.big.caption && <span className="mt-1.5 block text-sm text-text-muted">{frame.big.caption}</span>}
        </div>
      )}

      {frame.chip && (
        <div className="mt-4">
          <SignalChip signal={frame.chip} size="md" />
        </div>
      )}

      {frame.bar && total > 0 && (
        <div className="mt-4">
          <div className="flex h-2.5 overflow-hidden rounded-full bg-surface-2" aria-hidden>
            <span className="bg-positive" style={{ width: pct(frame.bar.up) }} />
            <span className="bg-border" style={{ width: pct(frame.bar.flat) }} />
            <span className="bg-negative" style={{ width: pct(frame.bar.down) }} />
          </div>
          <p className="mt-1.5 text-sm text-text-muted tabular-nums nums">
            {t(lang, "upFlatDown", { up: frame.bar.up, flat: frame.bar.flat, down: frame.bar.down })}
          </p>
        </div>
      )}

      {frame.counts && (
        <div className="mt-4 grid grid-cols-3 divide-x divide-border rounded-lg border border-border">
          {frame.counts.map((c) => (
            <div key={c.label} className="min-w-0 px-3 py-2.5">
              <span className={`block text-2xl font-bold leading-none tabular-nums nums ${TONE_TEXT[c.tone ?? "neutral"]}`}>
                {c.value}
              </span>
              <span className="mt-1 block truncate text-xs font-semibold text-text-muted">{c.label}</span>
            </div>
          ))}
        </div>
      )}

      {frame.locked && (
        <div className="premium-mask mt-4" aria-hidden>
          <span className="premium-mask-line w-11/12" />
          <span className="premium-mask-line w-3/4" />
          <span className="premium-mask-line w-5/6" />
        </div>
      )}

      {frame.sentence && <p className="mt-4 line-clamp-5 text-base leading-relaxed text-text-main">{frame.sentence}</p>}

      {frame.rows && frame.rows.length > 0 && (
        <dl className="mt-4 divide-y divide-border border-t border-border">
          {frame.rows.map((r) => (
            <div key={r.label} className="flex items-baseline justify-between gap-3 py-2.5 text-sm">
              <dt className="shrink-0 text-text-muted">{r.label}</dt>
              <dd className={`min-w-0 truncate text-right font-semibold tabular-nums nums ${TONE_TEXT[r.tone ?? "neutral"]}`}>
                {r.value}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

/**
 * The story viewer: full screen on phones, a phone-shaped card from 640px.
 * Tap the right two-thirds for the next frame, the left third to go back;
 * swipe sideways for the next / previous story, swipe down to close, hold to
 * pause. Arrow keys, Space (pause) and Escape work on a keyboard. A frame
 * moves on by itself after `STORY_MS` — the progress bar's CSS animation ends
 * and calls `next` — and stays put for readers who ask for reduced motion.
 * Reaching the end of the last story closes it. Every frame shown is reported
 * through `onSeen`, so the row can grey the ring; seen stories replay freely.
 */
export default function StoryViewer({
  stories,
  start,
  onClose,
  onSeen,
  lang,
}: {
  stories: Story[];
  start: number;
  onClose: () => void;
  onSeen: (frameId: string) => void;
  lang: Lang;
}) {
  const bn = lang === "bn";
  const L = (en: string, b: string) => (bn ? b : en);
  const { state: plan } = usePremium();
  const [pos, setPos] = useState({ si: start, fi: 0, n: 0 });
  const [paused, setPaused] = useState(false);
  const [mounted, setMounted] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const press = useRef<{ x: number; y: number; t: number } | null>(null);

  const story = stories[pos.si];
  const frame = story?.frames[pos.fi];

  const go = (si: number, fi: number) => setPos((p) => ({ si, fi, n: p.n + 1 }));
  const next = () => {
    if (!story) return;
    if (pos.fi < story.frames.length - 1) go(pos.si, pos.fi + 1);
    else if (pos.si < stories.length - 1) go(pos.si + 1, 0);
    else onClose();
  };
  const prev = () => {
    if (pos.fi > 0) go(pos.si, pos.fi - 1);
    else if (pos.si > 0) go(pos.si - 1, stories[pos.si - 1].frames.length - 1);
    else go(pos.si, 0);
  };
  const nextStory = () => (pos.si < stories.length - 1 ? go(pos.si + 1, 0) : onClose());
  const prevStory = () => go(Math.max(0, pos.si - 1), 0);

  // Latest handlers for the window listeners below.
  const keys = useRef({ next, prev, onClose, toggle: () => setPaused((v) => !v) });
  keys.current = { next, prev, onClose, toggle: () => setPaused((v) => !v) };

  useEffect(() => setMounted(true), []);

  // Page scroll locked, focus in on open and back to the ring on close.
  useEffect(() => {
    if (!mounted) return;
    const opener = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") keys.current.onClose();
      else if (e.key === "ArrowRight") keys.current.next();
      else if (e.key === "ArrowLeft") keys.current.prev();
      // Space pauses only when no button has focus (it presses a button).
      else if (e.key === " " && e.target === panelRef.current) {
        e.preventDefault();
        keys.current.toggle();
      }
    };
    const onVis = () => document.hidden && setPaused(true);
    window.addEventListener("keydown", onKey);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("visibilitychange", onVis);
      opener?.focus?.();
    };
  }, [mounted]);

  // Report every frame shown; a locked frame counts as a lock view.
  const frameId = frame?.id;
  useEffect(() => {
    if (!frame) return;
    onSeen(frame.id);
    if (frame.locked) trackEvent("premium_lock_view", { area: "home", lock: frame.kind === "more" ? "stories-more" : "stories", state: plan });
  }, [frameId]);

  useEffect(() => {
    if (story) trackEvent("story_view", { story: story.kind, code: story.code ?? "" });
  }, [story?.id]);

  if (!mounted || !story || !frame) return null;

  const onDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    press.current = { x: e.clientX, y: e.clientY, t: Date.now() };
    setPaused(true);
  };
  const onUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    const p = press.current;
    press.current = null;
    setPaused(false);
    if (!p) return;
    const dx = e.clientX - p.x;
    const dy = e.clientY - p.y;
    if (dy > 80 && Math.abs(dy) > Math.abs(dx)) return onClose();
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) return dx < 0 ? nextStory() : prevStory();
    // A hold (or a small drag) only pauses.
    if (Date.now() - p.t > 350 || Math.abs(dx) > 12 || Math.abs(dy) > 12) return;
    const rect = e.currentTarget.getBoundingClientRect();
    if (e.clientX - rect.left < rect.width / 3) prev();
    else next();
  };
  const onCancel = () => {
    press.current = null;
    setPaused(false);
  };

  const onCta = (href: string) => {
    trackHomeTap("stories", href);
    if (frame.locked) {
      trackEvent("premium_lock_tap", { area: "home", lock: frame.kind === "more" ? "stories-more" : "stories", state: plan });
      savePremiumContext({
        from: "home",
        label: L("Every story on your stocks", "আপনার শেয়ারের সব স্টোরি"),
        stakes: frame.stakes,
      });
    }
    onClose();
  };

  const owner = story.owner;
  return createPortal(
    <div
      className={`story-backdrop ${bn ? "font-bn" : ""}`}
      lang={bn ? "bn" : undefined}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={story.code ? `${story.name} (${story.code})` : story.name}
        tabIndex={-1}
        className={`story-panel ${paused ? "is-paused" : ""}`}
      >
        <div className="story-progress" aria-hidden>
          {story.frames.map((f, k) => (
            <span key={f.id} className={`story-seg ${k < pos.fi ? "story-seg--done" : ""}`}>
              {k === pos.fi && (
                <span
                  key={pos.n}
                  className="story-seg-fill story-seg-fill--run"
                  style={{ animationDuration: `${STORY_MS}ms` }}
                  onAnimationEnd={next}
                />
              )}
              {k !== pos.fi && <span className="story-seg-fill" />}
            </span>
          ))}
        </div>

        <div className="mt-3 flex items-center gap-3">
          <span className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border bg-surface-2">
            <StoryFace story={story} size="sm" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="flex min-w-0 items-center gap-1.5 text-sm font-bold text-text-main">
              <span className="truncate">{story.name}</span>
              {story.code && story.code !== story.name && (
                <span className="shrink-0 text-xs font-semibold text-text-muted">{story.code}</span>
              )}
              {owner && <OwnerTag kind={owner} lang={lang} />}
            </p>
            <p className="truncate text-xs text-text-muted">
              {story.sub}
              {frame.when ? ` · ${frame.when}` : ""}
            </p>
          </div>
          <Button
            variant="quiet"
            size="md"
            iconOnly
            aria-label={paused ? L("Play", "চালু করুন") : L("Pause", "থামান")}
            onClick={() => setPaused((v) => !v)}
          >
            {paused ? <IconPlay size={16} /> : <IconPause size={16} />}
          </Button>
          <Button variant="quiet" size="md" iconOnly aria-label={L("Close", "বন্ধ করুন")} onClick={onClose}>
            <span aria-hidden="true">✕</span>
          </Button>
        </div>

        <div
          className="story-stage"
          onPointerDown={onDown}
          onPointerUp={onUp}
          onPointerCancel={onCancel}
          onPointerLeave={(e) => press.current && e.pointerType === "mouse" && onCancel()}
          onContextMenu={(e) => e.preventDefault()}
        >
          <Frame frame={frame} lang={lang} />
        </div>

        {(frame.cta || frame.cta2) && (
          <div className="mt-4 space-y-2">
            {frame.cta && (
              <Button href={frame.cta.href} variant="primary" size="lg" block onClick={() => onCta(frame.cta!.href)}>
                {frame.cta.label}
              </Button>
            )}
            {frame.cta2 && (
              <Button href={frame.cta2.href} variant="quiet" size="lg" block onClick={() => onCta(frame.cta2!.href)}>
                {frame.cta2.label}
              </Button>
            )}
          </div>
        )}

        <button type="button" className="story-nav story-nav--prev" aria-label={L("Previous", "আগের")} onClick={prev}>
          <span className="flex rotate-180">
            <IconChevronRight size={20} />
          </span>
        </button>
        <button type="button" className="story-nav story-nav--next" aria-label={L("Next", "পরের")} onClick={next}>
          <IconChevronRight size={20} />
        </button>
      </div>
    </div>,
    document.body,
  );
}
