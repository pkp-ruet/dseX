"use client";

import { useState } from "react";
import Link from "next/link";
import { T } from "@/components/i18n/T";
import Card from "@/components/ui/Card";
import SectionHeader from "@/components/ui/SectionHeader";
import Skeleton from "@/components/ui/Skeleton";
import { whenWords, type WatchUpdate, type WatchUpdatesView } from "@/lib/watch-updates";

/*
 * "What's new on your shares" (2026-10-30): every update on the followed
 * shares in two cards — what happened (newest first) and what's coming
 * (soonest first). Each row: the kind word and when, the company, one plain
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

function UpdateList({
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

export default function WatchUpdates({ view, loading }: { view: WatchUpdatesView; loading: boolean }) {
  return (
    <section className="wl-section" aria-labelledby="wl-updates">
      <SectionHeader
        id="wl-updates"
        title={<T en="What's new on your shares" bn="আপনার শেয়ারে নতুন কী" />}
        lead={
          <T
            en="Results, dividends, grade changes, big price moves, your price alerts and the dates ahead, all in one place."
            bn="আর্থিক ফল, ডিভিডেন্ড, গ্রেড বদল, দামের বড় ওঠানামা, আপনার দামের অ্যালার্ট আর সামনের তারিখ, সব এক জায়গায়।"
          />
        }
      />
      <div className="wl-ups-grid">
        <UpdateList
          id="wl-happened"
          title={<T en="What happened" bn="যা ঘটেছে" />}
          note={<T en="The last few weeks, newest first." bn="গত কয়েক সপ্তাহ, নতুনগুলো আগে।" />}
          items={view.happened}
          loading={loading}
          empty={
            <T
              en="Nothing new on your shares lately. Quiet days are normal."
              bn="সম্প্রতি আপনার শেয়ারে নতুন কিছু ঘটেনি। চুপচাপ দিন স্বাভাবিক।"
            />
          }
        />
        <UpdateList
          id="wl-coming"
          title={<T en="Coming up" bn="সামনে যা আছে" />}
          note={<T en="Dates ahead, soonest first." bn="সামনের তারিখ, কাছেরগুলো আগে।" />}
          items={view.coming}
          loading={loading}
          empty={
            <T
              en="No record date, AGM or results date ahead on your shares yet."
              bn="আপনার শেয়ারগুলোর সামনে এখনো কোনো রেকর্ড ডেট, এজিএম বা ফলের তারিখ নেই।"
            />
          }
        />
      </div>
    </section>
  );
}
