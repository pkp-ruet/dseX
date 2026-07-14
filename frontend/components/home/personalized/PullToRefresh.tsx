"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

const THRESHOLD = 72; // px of (damped) pull needed to trigger a refresh
const MAX_PULL = 110; // clamp the rubber-band travel
const REST = 52; // where the spinner sits while refreshing

/**
 * Native-style pull-to-refresh for the personalized home (PWA feel). Touch-only
 * — inert on desktop. Activates only when the page is scrolled to the very top;
 * a downward drag rubber-bands the content and, past the threshold, runs
 * `onRefresh` while a spinner spins, then snaps back.
 */
export default function PullToRefresh({
  onRefresh,
  children,
}: {
  onRefresh: () => Promise<unknown>;
  children: ReactNode;
}) {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [dragging, setDragging] = useState(false);

  // Refs mirror state/props so the window listeners (attached once) read fresh
  // values without re-subscribing.
  const startY = useRef<number | null>(null);
  const activeGesture = useRef(false);
  const pullRef = useRef(0);
  const refreshingRef = useRef(false);
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!window.matchMedia("(pointer: coarse)").matches) return; // touch only

    const setPullBoth = (v: number) => {
      pullRef.current = v;
      setPull(v);
    };

    const onStart = (e: TouchEvent) => {
      if (refreshingRef.current || e.touches.length !== 1 || window.scrollY > 0) return;
      startY.current = e.touches[0].clientY;
      activeGesture.current = true;
    };

    const onMove = (e: TouchEvent) => {
      if (!activeGesture.current || startY.current == null) return;
      if (window.scrollY > 0) {
        activeGesture.current = false;
        setDragging(false);
        setPullBoth(0);
        return;
      }
      const dy = e.touches[0].clientY - startY.current;
      if (dy <= 0) {
        if (pullRef.current !== 0) setPullBoth(0);
        setDragging(false);
        return;
      }
      const dist = Math.min(MAX_PULL, dy * 0.5); // damped
      setDragging(true);
      setPullBoth(dist);
      if (dist > 4 && e.cancelable) e.preventDefault(); // suppress native overscroll
    };

    const onEnd = async () => {
      if (!activeGesture.current) return;
      activeGesture.current = false;
      startY.current = null;
      setDragging(false);
      if (pullRef.current >= THRESHOLD) {
        refreshingRef.current = true;
        setRefreshing(true);
        setPullBoth(REST);
        try {
          await onRefreshRef.current();
        } catch {
          /* ignore — keep the UX quiet */
        }
        refreshingRef.current = false;
        setRefreshing(false);
        setPullBoth(0);
      } else {
        setPullBoth(0);
      }
    };

    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onEnd, { passive: true });
    window.addEventListener("touchcancel", onEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onEnd);
    };
  }, []);

  const progress = Math.min(1, pull / THRESHOLD);
  const snap = dragging ? "none" : "transform 0.22s ease, opacity 0.22s ease";

  return (
    <div className="relative">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center"
        style={{
          transform: `translateY(${Math.max(0, pull - 34)}px)`,
          opacity: pull > 6 || refreshing ? 1 : 0,
          transition: snap,
        }}
        aria-hidden
      >
        <span className="mt-2 grid h-9 w-9 place-items-center rounded-full border border-[var(--border)] bg-[var(--surface)] shadow-md">
          <svg
            className={refreshing ? "animate-spin" : ""}
            style={!refreshing ? { transform: `rotate(${progress * 270}deg)` } : undefined}
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--primary)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 12a9 9 0 1 1-6.2-8.6" />
            <path d="M21 3v6h-6" />
          </svg>
        </span>
      </div>

      {/* Transform only while pulling/refreshing — a permanent transform would
          make position:fixed descendants (modals, sheets) anchor here. */}
      <div style={{ transform: pull ? `translateY(${pull}px)` : undefined, transition: snap }}>
        {children}
      </div>
    </div>
  );
}
