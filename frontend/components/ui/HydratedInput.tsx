"use client";

import { useSyncExternalStore, type InputHTMLAttributes } from "react";

const noop = () => () => {};

/** False on the server and while React hydrates, true from then on. */
export function useHydrated(): boolean {
  return useSyncExternalStore(noop, () => true, () => false);
}

/**
 * An <input> that is drawn only once React has hydrated (2026-11-18).
 *
 * Password managers (LastPass) add their own <div> beside a login field as soon
 * as the field is in the page. On a server-rendered form that happens before
 * React hydrates, React meets an element it never rendered, throws "Hydration
 * failed" and redraws the whole page in the browser. Until hydration a box with
 * the same class (so the same size) stands in; on a page reached by a link the
 * input is drawn at once. Use it for sign-in / sign-up fields on server-rendered
 * pages.
 */
export default function HydratedInput(props: InputHTMLAttributes<HTMLInputElement>) {
  const hydrated = useHydrated();
  if (hydrated) return <input {...props} />;
  return (
    <div className={props.className} aria-hidden>
      {" "}
    </div>
  );
}
