"use client";

/**
 * THE link for every page (2026-11-10). Use it instead of `next/link`
 * (the design lint fails a direct `next/link` import anywhere else).
 *
 * Next.js preloads every page whose link scrolls into view. Our pages are
 * heavy (both languages plus the full analysis are in the HTML), so one
 * scroll through the ranking downloaded 50 stock pages the reader never
 * opened: tens of MB of a reader's mobile data, and a Worker request each.
 *
 * Here nothing preloads on scroll. A page starts loading when the reader is
 * about to open it: a finger touches the link, or the mouse moves over it.
 * That head start (100–300 ms) keeps a tap nearly as quick as before.
 * Pass `prefetch` explicitly to get Next's own behaviour back for one link.
 */

import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { useRef, type ComponentProps, type MouseEvent, type TouchEvent } from "react";

type Props = ComponentProps<typeof NextLink>;

/** The path to preload, or null for links we shouldn't (external, mailto, object hrefs). */
function internalPath(href: Props["href"]): string | null {
  if (typeof href !== "string" || !href.startsWith("/") || href.startsWith("//")) return null;
  const path = href.split("#")[0];
  return path || null;
}

export default function Link({ prefetch, onMouseEnter, onTouchStart, href, ...rest }: Props) {
  const router = useRouter();
  const done = useRef(false);

  // An explicit prefetch prop means the caller wants Next's own behaviour.
  if (prefetch !== undefined && prefetch !== null && prefetch !== false) {
    return <NextLink href={href} prefetch={prefetch} onMouseEnter={onMouseEnter} onTouchStart={onTouchStart} {...rest} />;
  }

  const warm = () => {
    if (done.current) return;
    const path = internalPath(href);
    if (!path) return;
    done.current = true;
    try {
      router.prefetch(path);
    } catch {
      // A failed preload only means the page loads on tap, as any link would.
    }
  };

  return (
    <NextLink
      href={href}
      prefetch={false}
      onMouseEnter={(e: MouseEvent<HTMLAnchorElement>) => {
        onMouseEnter?.(e);
        warm();
      }}
      onTouchStart={(e: TouchEvent<HTMLAnchorElement>) => {
        onTouchStart?.(e);
        warm();
      }}
      {...rest}
    />
  );
}
