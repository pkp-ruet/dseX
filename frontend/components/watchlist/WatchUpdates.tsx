"use client";

import Link from "@/components/ui/Link";
import { T } from "@/components/i18n/T";
import { whenWords, type WatchUpdate } from "@/lib/watch-updates";

/*
 * The update row and list (2026-10-30). The watchlist's two cards ("What
 * happened" · "Coming up") moved to the Updates page on 2026-11-20 (the app
 * map: one feed for news on your shares); `UpdateRow` draws the watchlist
 * table's open rows (Updates' "Coming up" draws the feed's own row since
 * 2026-11-25). Each row: the kind word and when, the company, one plain
 * sentence, the figures; the row opens the right place. The same for every
 * reader. Data: lib/watch-updates.ts. Styles: app/styles/watchlist.css →
 * "Updates".
 */


export function UpdateRow({ u, showName = true }: { u: WatchUpdate; showName?: boolean }) {
  const when = whenWords(u);
  return (
    <li>
      <Link prefetch={false} href={u.href} className="wl-up">
        <span className={`wl-up-dot wl-up-dot--${u.tone}`} aria-hidden="true" />
        <span className="wl-up-body">
          <span className="wl-up-top">
            <span className="wl-up-kind">
              <T en={u.label.en} bn={u.label.bn} />
            </span>
            <span className="wl-up-when">
              <T en={when.en} bn={when.bn} />
            </span>
          </span>
          {showName && (
            <span className="wl-up-who">
              {u.name} <span className="wl-up-code">{u.code}</span>
            </span>
          )}
          <span className="wl-up-title">
            <T en={u.title.en} bn={u.title.bn} />
          </span>
          {u.line && (
            <span className="wl-up-line">
              <T en={u.line.en} bn={u.line.bn} />
            </span>
          )}
        </span>
      </Link>
    </li>
  );
}
