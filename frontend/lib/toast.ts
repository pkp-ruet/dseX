/**
 * Tiny app-wide toast bus. Any client code calls `toast({...})`; the single
 * `<Toaster />` mounted in the root layout renders it. No provider, no context —
 * a window CustomEvent, the same pattern `openGlobalSearch` uses.
 *
 * Use it for the feedback that used to be silent (added to watchlist, holding
 * saved, alert set, link copied) and for short undo windows. One toast at a
 * time; a new one replaces the current.
 */

export interface ToastOptions {
  message: string;
  /** Optional one-word action, e.g. "Undo" / "View". */
  action?: { label: string; onClick: () => void };
  /** Visual tone. `success` gets a check, `error` a warning, default is neutral. */
  tone?: "neutral" | "success" | "error";
  /** Auto-dismiss delay in ms. Undo toasts use a longer one. */
  duration?: number;
}

export const TOAST_EVENT = "dsex:toast";
export const TOAST_DISMISS_EVENT = "dsex:toast-dismiss";

export function toast(opts: ToastOptions | string): void {
  if (typeof window === "undefined") return;
  const detail: ToastOptions = typeof opts === "string" ? { message: opts } : opts;
  window.dispatchEvent(new CustomEvent<ToastOptions>(TOAST_EVENT, { detail }));
}

export function dismissToast(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(TOAST_DISMISS_EVENT));
}
