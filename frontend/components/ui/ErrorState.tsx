"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { T } from "@/components/i18n/T";

interface Props {
  /** Headline, usually `<T en="We couldn't load …" bn="… এখন লোড করা যাচ্ছে না" />`. */
  title?: ReactNode;
  /** One more sentence. The default says it is a short delay and to try again. */
  message?: ReactNode;
  /** Wire to Next's `reset()` or a refetch; renders the "Try again" button when present. */
  onRetry?: () => void;
  /** Server pages can't pass a callback — set this and "Try again" reloads the page. */
  reload?: boolean;
  /** Extra links (e.g. "Browse all stocks"). Home is always offered. */
  links?: { href: string; label: ReactNode }[];
  /** `page` = full-height centred block; `inline` = compact card inside a page. */
  size?: "page" | "inline";
  className?: string;
  children?: ReactNode;
}

/**
 * The one error surface for the app. Every fetch failure — route-level
 * `error.tsx`, a page's `.catch(() => null)` fallback, a client fetch — renders
 * this, so the copy and the retry button are the same wherever the backend
 * hiccups. Never prints a raw error string to the user.
 */
export default function ErrorState({
  title = <T en="We couldn't load this right now" bn="এই অংশটি এখন লোড করা যাচ্ছে না" />,
  message = (
    <T
      en="Our data service took too long to answer. This usually clears up in a moment, so please try again."
      bn="আমাদের ডেটা সার্ভিস সময়মতো সাড়া দেয়নি। সাধারণত কিছুক্ষণের মধ্যেই ঠিক হয়ে যায়, একটু পরে আবার চেষ্টা করুন।"
    />
  ),
  onRetry,
  reload = false,
  links = [],
  size = "page",
  className = "",
  children,
}: Props) {
  return (
    <div
      role="alert"
      className={`error-state ${size === "page" ? "error-state--page" : "error-state--inline"} ${className}`.trim()}
    >
      <span className="error-state-icon" aria-hidden="true">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 9v4" />
          <path d="M12 17h.01" />
          <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
        </svg>
      </span>
      <h2 className="error-state-title">{title}</h2>
      <p className="error-state-msg">{message}</p>
      {children}
      <div className="error-state-actions">
        {(onRetry || reload) && (
          <button
            type="button"
            onClick={onRetry ?? (() => window.location.reload())}
            className="btn-primary"
          >
            <T en="Try again" bn="আবার চেষ্টা করুন" />
          </button>
        )}
        {links.map((l) => (
          <Link key={l.href} href={l.href} className="btn-quiet">
            {l.label}
          </Link>
        ))}
        <Link href="/" className="btn-link">
          <T en="Home" bn="হোম" />
        </Link>
      </div>
    </div>
  );
}
