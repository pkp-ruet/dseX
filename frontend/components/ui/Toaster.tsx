"use client";

import { useEffect, useRef, useState } from "react";
import { TOAST_DISMISS_EVENT, TOAST_EVENT, type ToastOptions } from "@/lib/toast";

const DEFAULT_MS = 3200;
const ACTION_MS = 6000;

/**
 * Renders the one active toast fired through `lib/toast.ts`. Sits above the
 * mobile bottom bar, centred; on desktop it hugs the bottom edge. `role=status`
 * so screen readers announce it without stealing focus.
 */
export default function Toaster() {
  const [current, setCurrent] = useState<ToastOptions | null>(null);
  const [visible, setVisible] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const clear = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
    };
    const hide = () => {
      clear();
      setVisible(false);
      // Let the exit transition finish before unmounting the node.
      timer.current = setTimeout(() => setCurrent(null), 180);
    };
    const onToast = (e: Event) => {
      const detail = (e as CustomEvent<ToastOptions>).detail;
      if (!detail?.message) return;
      clear();
      setCurrent(detail);
      // Two-frame flip so a replacement toast still animates in.
      setVisible(false);
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
      const ms = detail.duration ?? (detail.action ? ACTION_MS : DEFAULT_MS);
      timer.current = setTimeout(hide, ms);
    };
    window.addEventListener(TOAST_EVENT, onToast);
    window.addEventListener(TOAST_DISMISS_EVENT, hide);
    return () => {
      window.removeEventListener(TOAST_EVENT, onToast);
      window.removeEventListener(TOAST_DISMISS_EVENT, hide);
      clear();
    };
  }, []);

  if (!current) return null;

  const tone = current.tone ?? "neutral";

  return (
    <div
      role="status"
      aria-live="polite"
      className={`app-toast app-toast--${tone}${visible ? " is-visible" : ""}`}
    >
      {tone === "success" && (
        <svg className="app-toast-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      )}
      {tone === "error" && (
        <svg className="app-toast-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
          <path d="M12 8v5" />
          <path d="M12 16.5h.01" />
          <circle cx="12" cy="12" r="9" />
        </svg>
      )}
      <span className="app-toast-msg">{current.message}</span>
      {current.action && (
        <button
          type="button"
          className="app-toast-action"
          onClick={() => {
            current.action?.onClick();
            if (timer.current) clearTimeout(timer.current);
            setVisible(false);
            timer.current = setTimeout(() => setCurrent(null), 180);
          }}
        >
          {current.action.label}
        </button>
      )}
    </div>
  );
}
