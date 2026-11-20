"use client";

import { useState } from "react";
import Link from "@/components/ui/Link";
import { T } from "@/components/i18n/T";
import Card from "@/components/ui/Card";
import Skeleton from "@/components/ui/Skeleton";
import { whenWords, type WatchUpdate } from "@/lib/watch-updates";

/*
 * The update row and list (2026-10-30). The watchlist's two cards ("What
 * happened" · "Coming up") moved to the Updates page on 2026-11-20 (the app
 * map: one feed for news on your shares); `UpdateList` renders its "Coming
 * up" and `UpdateRow` the watchlist table's open rows. Each row: the kind word and when, the company, one plain
 * sentence, the figures; the row opens the right place. The same for every
 * reader. Data: lib/watch-updates.ts. Styles: app/styles/watchlist.css →
 * "Updates".
 */

const FIRST_ROWS = 5;

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

export function UpdateList({
  id,
  title,
  note,
  items,
  empty,
  loading,
}: {
  id: string;
  title: React.ReactNode;
  note: React.ReactNode;
  items: WatchUpdate[];
  empty: React.ReactNode;
  loading: boolean;
}) {
  const [all, setAll] = useState(false);
  const fold = !all && items.length > FIRST_ROWS + 1;
  const shown = fold ? items.slice(0, FIRST_ROWS) : items;
  return (
    <Card padding="none" className="wl-ups" aria-labelledby={id}>
      <div className="wl-ups-head">
        <h3 id={id} className="wl-ups-title">
          {title}
          {items.length > 0 && <span className="wl-ups-count">{items.length}</span>}
        </h3>
        <p className="wl-ups-note">{note}</p>
      </div>
      {items.length === 0 ? (
        loading ? (
          <div className="wl-ups-empty" aria-busy="true">
            <Skeleton width="70%" height={14} />
            <Skeleton width="50%" height={12} className="mt-2" />
          </div>
        ) : (
          <p className="wl-ups-empty">{empty}</p>
        )
      ) : (
        <ul className="wl-up-list">
          {shown.map((u) => (
            <UpdateRow key={u.id} u={u} />
          ))}
        </ul>
      )}
      {fold && (
        <div className="wl-news-more">
          <button type="button" onClick={() => setAll(true)}>
            <T en={`Show all ${items.length}`} bn={`সব ${items.length}টি দেখুন`} />
          </button>
        </div>
      )}
    </Card>
  );
}
