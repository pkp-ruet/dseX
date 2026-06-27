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

  return (
    <>
      {!open && (
        <div className="disha-fab fixed right-4 z-[55]">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label={`Chat with ${PERSONA.name}, your stock helper`}
            className="inline-flex h-12 items-center gap-2 rounded-full px-4 text-white shadow-lg transition hover:brightness-110 active:scale-95"
            style={{ background: "var(--primary)" }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M12 3C6.5 3 2 6.8 2 11.5c0 2.3 1.1 4.4 2.9 5.9-.1 1-.5 2.4-1.4 3.4 1.6-.2 3.2-.8 4.3-1.6 1.3.5 2.7.8 4.2.8 5.5 0 10-3.8 10-8.5S17.5 3 12 3z" />
            </svg>
            <span className="text-[0.82rem] font-bold">Ask {PERSONA.name}</span>
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
      <AssistantPanel open={open} onClose={() => setOpen(false)} />
    </>
  );
}
