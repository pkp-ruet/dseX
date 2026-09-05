"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Keep client-side filter/sort state in the URL query string so refresh, back
 * navigation and shared links (WhatsApp / Facebook) all restore the same view.
 *
 * Deliberately avoids `useSearchParams`: on a statically rendered page that
 * hook forces a Suspense boundary whose fallback replaces the whole table in
 * the HTML, which would hurt SEO. Instead the component renders its defaults
 * on the server, reads `window.location` once after mount (`useUrlParams`),
 * and afterwards mirrors state changes back with `history.replaceState`
 * (`useUrlSync`) — which Next 15 keeps in step with its own router.
 */

/** Read the current query string once after hydration. `null` before mount. */
export function useUrlParams(): URLSearchParams | null {
  const [params, setParams] = useState<URLSearchParams | null>(null);
  useEffect(() => {
    setParams(new URLSearchParams(window.location.search));
  }, []);
  return params;
}

/**
 * Mirror `params` into the URL. Empty / null values remove the key so a default
 * view has a clean URL. Skips the very first run so mount never rewrites the
 * address bar, and only writes when something actually changed.
 */
export function useUrlSync(params: Record<string, string | null | undefined>, ready: boolean): void {
  const first = useRef(true);
  const serialized = JSON.stringify(params);
  useEffect(() => {
    if (!ready) return;
    if (first.current) {
      first.current = false;
      return;
    }
    const url = new URL(window.location.href);
    const entries = JSON.parse(serialized) as Record<string, string | null | undefined>;
    for (const [k, v] of Object.entries(entries)) {
      if (v == null || v === "") url.searchParams.delete(k);
      else url.searchParams.set(k, v);
    }
    const next = url.pathname + url.search + url.hash;
    const cur = window.location.pathname + window.location.search + window.location.hash;
    if (next !== cur) window.history.replaceState(window.history.state, "", next);
  }, [ready, serialized]);
}
