import Link from "@/components/ui/Link";
import { T } from "@/components/i18n/T";
import { FEED_KIND, dayHead, dhakaDay, timeWords, type Pair } from "@/lib/feed";
import type { NotificationItem } from "@/lib/api";

/**
 * THE update row (2026-11-25, "one feed, told once"): a coloured dot, then
 * one small line — New · the kind word · the share's code · when — then one
 * sentence and an optional second line. Updates' feed and its "Coming up",
 * and the home's "New on your shares" (signed in and guest) all draw this,
 * so one thing on a share reads the same everywhere. Styles: `nt-*` in
 * app/styles/notifications.css.
 */

export type FeedTone = "good" | "bad" | "watch" | "neutral" | "info";

export interface FeedRowProps {
  kind: Pair;
  tone?: FeedTone | string | null;
  code?: string | null;
  when?: Pair | null;
  title: Pair;
  body?: Pair | null;
  isNew?: boolean;
  /** A dot with no colour (a paused rule). */
  plain?: boolean;
}

const DOT: Record<string, string> = { good: "nt-dot--good", bad: "nt-dot--bad", watch: "nt-dot--watch", warn: "nt-dot--watch" };

/** The row's inside: for wrappers that are not a plain link (a letter's
 *  button, a brief with its own list). */
export function FeedRowBody({ kind, tone, code, when, title, body, isNew, plain }: FeedRowProps) {
  return (
    <>
      <span className={`nt-dot ${plain ? "" : DOT[tone ?? ""] ?? ""}`} aria-hidden="true" />
      <span className="nt-text">
        <span className="nt-meta">
          {isNew && (
            <span className="nt-new">
              <T en="New" bn="নতুন" />
            </span>
          )}
          <span>
            <T en={kind.en} bn={kind.bn} />
          </span>
          {code && <span className="nt-code">{code}</span>}
          {when && (
            <span>
              <T en={when.en} bn={when.bn} />
            </span>
          )}
        </span>
        <span className="nt-title">
          <T en={title.en} bn={title.bn || title.en} />
        </span>
        {body && (body.en || body.bn) && (
          <span className="nt-body">
            <T en={body.en} bn={body.bn || body.en} />
          </span>
        )}
      </span>
    </>
  );
}

/** One row: a link that opens the right place. */
export default function FeedRow({ href, id, ...props }: FeedRowProps & { href: string; id?: string }) {
  return (
    <li id={id} className="nt-item" data-new={props.isNew || undefined}>
      <Link href={href} prefetch={false} className="nt-row">
        <FeedRowBody {...props} />
      </Link>
    </li>
  );
}

/** A feed item's row props. `when`: the time (Updates groups rows by day)
 *  or the day (the home lists rows without day headings). */
export function itemRowProps(i: NotificationItem, when: "time" | "day"): FeedRowProps {
  return {
    kind: FEED_KIND[i.kind] ?? { en: "Update", bn: "খবর" },
    tone: i.level,
    code: i.code,
    when: when === "time" ? timeWords(i.at) : dayHead(dhakaDay(i.at)),
    title: { en: i.title_en, bn: i.title_bn || i.title_en },
    body: i.body_en ? { en: i.body_en, bn: i.body_bn || i.body_en } : null,
    isNew: i.new,
  };
}
