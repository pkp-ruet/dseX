"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Button from "@/components/ui/Button";
import Bn from "@/components/i18n/Bn";

/**
 * THE overlay (2026-10 redesign, step 0): a bottom sheet on phones, a centred
 * dialog from 640px up. Escape, the backdrop and the close button all close
 * it; page scroll is locked while open; focus moves in on open and back to
 * the opener on close. Styles: `.sheet-*` in globals.css.
 *
 * Every dialog in the app uses it — the last `.atp-modal` ones (add to
 * portfolio, price alert) moved over 2026-10-25.
 */
export default function Sheet({
  open,
  onClose,
  title,
  bn,
  children,
  footer,
  size = "md",
  dismissible = true,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  bn?: ReactNode;
  children: ReactNode;
  /** Actions row, pinned to the bottom of the sheet. */
  footer?: ReactNode;
  /** md ≈ 440px · lg ≈ 600px wide on desktop. */
  size?: "md" | "lg";
  /** false while saving, so a stray tap can't close it mid-request. */
  dismissible?: boolean;
}) {
  const [mounted, setMounted] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => setMounted(true), []);

  // Latest handlers in refs: callers pass inline `onClose` arrows, and an effect
  // keyed on them re-ran on every parent render — pulling focus back to the
  // panel after each keystroke in a field inside the sheet.
  const onCloseRef = useRef(onClose);
  const dismissibleRef = useRef(dismissible);
  onCloseRef.current = onClose;
  dismissibleRef.current = dismissible;

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && dismissibleRef.current) onCloseRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
      opener?.focus?.();
    };
  }, [open]);

  if (!mounted || !open) return null;

  return createPortal(
    <div className="sheet-backdrop" onClick={() => dismissible && onClose()}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`sheet-panel ${size === "lg" ? "sheet-panel--lg" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-grip" aria-hidden="true" />
        <div className="sheet-head">
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-bold leading-tight text-text-main">
              {title}
            </h2>
            {bn && <Bn className="mt-0.5 text-sm text-text-muted">{bn}</Bn>}
          </div>
          <Button variant="quiet" size="sm" iconOnly aria-label="Close" onClick={onClose} disabled={!dismissible}>
            <span aria-hidden="true">✕</span>
          </Button>
        </div>
        <div className="sheet-body">{children}</div>
        {footer && <div className="sheet-foot">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
