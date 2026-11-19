/**
 * Where to send a reader after they sign in or sign up. Only paths on this
 * site count ("/x", never "//host" or a full URL), and the sign-in pages
 * themselves never come back as the place to return to.
 */
export function safeNext(raw: string | null | undefined): string | null {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return null;
  if (/^\/(login|register)(\/|\?|#|$)/.test(raw)) return null;
  return raw;
}

/** "/login" or "/register" with ?next= set to the page the reader is on. */
export function authHref(page: "/login" | "/register", next: string | null | undefined): string {
  const safe = safeNext(next);
  return safe && safe !== "/" ? `${page}?next=${encodeURIComponent(safe)}` : page;
}
