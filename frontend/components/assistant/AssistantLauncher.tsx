"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { PERSONA } from "@/lib/assistant/persona";
import AssistantPanel from "./AssistantPanel";

/**
 * Site-wide floating button that opens the TopStock AI chat panel. Dismissible
 * via the small ✕ (hidden for the current browsing session) for anyone who
 * finds it intrusive — the assistant stays reachable from the nav menu
 * (→ /assistant), and the button returns on the next visit.
 * Hidden on the dedicated /assistant page (which hosts the chat itself).
 * Sits above the mobile bottom bar (z-40) but below transient prompts (z-60).
 */
const HIDE_KEY = "disha:fab-hidden";

export default function AssistantLauncher() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      setHidden(sessionStorage.getItem(HIDE_KEY) === "1");
    } catch {
      /* private mode — ignore */
    }
  }, []);

  function dismiss() {
    setHidden(true);
    try {
      sessionStorage.setItem(HIDE_KEY, "1");
    } catch {
      /* ignore */
    }
  }

  // The /assistant page hosts the chat itself; gate on mount to avoid a
  // hydration flash for users who've dismissed it.
  if (pathname?.startsWith("/assistant")) return null;
  if (!mounted || hidden) return null;

  // On a stock page, pre-seed a one-tap "Ask about CODE" so opening the chat
  // starts pointed at the stock the user is reading.
  const stockMatch = pathname?.match(/^\/stock\/([^/?#]+)/);
  const seedCode = stockMatch ? decodeURIComponent(stockMatch[1]).toUpperCase() : undefined;

  return (
    <>
      {!open && (
        <div className="disha-fab fixed right-4 z-[55]">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label={`Chat with ${PERSONA.name}, your stock helper`}
            className="inline-flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg transition hover:brightness-110 active:scale-95 sm:h-12 sm:w-auto sm:justify-start sm:gap-2 sm:px-4"
            style={{ background: "var(--primary)" }}
          >
            {/* Sparkle = "AI". Icon-only circle on mobile; full pill on sm+. */}
            <svg className="h-6 w-6 sm:h-5 sm:w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M10 4c.5 4 1.5 5.5 5.5 6-4 .5-5 2-5.5 6-.5-4-1.5-5.5-5.5-6 4-.5 5-2 5.5-6z" />
              <path d="M18 3c.2 1.9.6 2.3 2.5 2.5-1.9.2-2.3.6-2.5 2.5-.2-1.9-.6-2.3-2.5-2.5 1.9-.2 2.3-.6 2.5-2.5z" />
            </svg>
            <span className="hidden text-[0.82rem] font-bold sm:inline">Ask {PERSONA.name}</span>
          </button>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Hide the chat button"
            title="Hide (still in the menu)"
            className="absolute -right-1.5 -top-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] shadow-sm transition hover:text-[var(--negative)]"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden>
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
      <AssistantPanel open={open} onClose={() => setOpen(false)} seedCode={seedCode} />
    </>
  );
}
