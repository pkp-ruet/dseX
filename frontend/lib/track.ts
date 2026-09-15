/**
 * Tiny event tracker for the dashboard — one call per card tap so the next
 * homepage rework is driven by what people actually use, not taste.
 *
 * Rides on the Google Analytics tag the root layout already loads (no-op when
 * GA is off, e.g. locally or on admin pages). Never throws.
 */
type Gtag = (command: "event", name: string, params?: Record<string, string | number>) => void;

function gtag(): Gtag | null {
  if (typeof window === "undefined") return null;
  const g = (window as unknown as { gtag?: Gtag }).gtag;
  return typeof g === "function" ? g : null;
}

/** `card` = which dashboard card was tapped; `target` = where it led. */
export function trackHomeTap(card: string, target?: string): void {
  try {
    gtag()?.("event", "home_card_tap", { card, ...(target ? { target } : {}) });
  } catch {}
}

/** Generic UI event (language switch, tab change …). */
export function trackEvent(name: string, params?: Record<string, string | number>): void {
  try {
    gtag()?.("event", name, params);
  } catch {}
}
