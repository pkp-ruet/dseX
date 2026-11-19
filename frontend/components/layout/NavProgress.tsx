"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * A thin clay line across the top while the next page loads (design review
 * 2026-11-19). Pages preload only on touch and our indexable pages can't show
 * loading screens (SEO rule 4), so on a budget phone a tapped link left the
 * old page frozen for one to three seconds and readers tapped again.
 *
 * Any tap on a link to another page of this site starts it (after 150 ms, so
 * a fast page never flickers); the new path ends it, with a 12 s safety stop.
 */
const DELAY_MS = 150;
const GIVE_UP_MS = 12_000;

export default function NavProgress() {
  const pathname = usePathname();
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const timers = useRef<number[]>([]);

  const clear = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const raw = a.getAttribute("href");
      if (!raw || raw.startsWith("#") || raw.startsWith("mailto:") || raw.startsWith("tel:")) return;
      let url: URL;
      try {
        url = new URL(a.href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      // Same page (a filter in the ?query or a #part changes) or an API /
      // file link: no new page to wait for, and the path wouldn't change to
      // end the line.
      if (url.pathname === window.location.pathname) return;
      if (url.pathname.startsWith("/api/")) return;
      clear();
      timers.current.push(window.setTimeout(() => setState("busy"), DELAY_MS));
      timers.current.push(window.setTimeout(() => setState("idle"), GIVE_UP_MS));
    };
    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("click", onClick);
      clear();
    };
  }, []);

  // The new page is in: finish the line and fade it out.
  useEffect(() => {
    clear();
    setState((s) => (s === "busy" ? "done" : "idle"));
    const t = window.setTimeout(() => setState("idle"), 300);
    return () => window.clearTimeout(t);
  }, [pathname]);

  return <div className="nav-progress" data-state={state} aria-hidden="true" />;
}
