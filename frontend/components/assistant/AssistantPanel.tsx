"use client";
import { useEffect, useRef } from "react";
import { PERSONA } from "@/lib/assistant/persona";
import ChatSurface from "./ChatSurface";

/**
 * Mobile-first bottom-sheet / desktop side card for the floating assistant.
 * Built from scratch (the app has no modal primitive): backdrop, focus trap,
 * ESC-to-close, aria-modal, body-scroll lock.
 */
export default function AssistantPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    restoreFocusRef.current = document.activeElement as HTMLElement | null;

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const nodes = panelRef.current?.querySelectorAll<HTMLElement>(
        'a[href],button:not([disabled]),input:not([disabled]),textarea,[tabindex]:not([tabindex="-1"])',
      );
      if (!nodes || nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      restoreFocusRef.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[65] flex items-end justify-center sm:items-center sm:justify-end sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-label={`${PERSONA.name} — stock helper`}
    >
      <button
        type="button"
        aria-label="Close chat"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />
      <div
        ref={panelRef}
        className="disha-rise relative z-[1] flex h-[82vh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl bg-[var(--surface)] shadow-2xl sm:h-[620px] sm:rounded-2xl"
      >
        <header className="flex items-center justify-between gap-2 border-b border-[var(--border)] px-3.5 py-2.5">
          <div className="flex items-center gap-2">
            <span
              aria-hidden
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[0.8rem] font-bold text-white"
              style={{ background: "var(--primary)" }}
            >
              {PERSONA.initial}
            </span>
            <div className="leading-tight">
              <div className="text-[0.9rem] font-bold text-[var(--text)]">
                {PERSONA.name}
              </div>
              <div className="text-[0.66rem] text-[var(--text-muted)]">{PERSONA.tagline}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close chat"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[var(--text-muted)] transition hover:bg-[var(--surface-2)]"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </header>
        <div className="min-h-0 flex-1">
          <ChatSurface variant="panel" />
        </div>
      </div>
    </div>
  );
}
