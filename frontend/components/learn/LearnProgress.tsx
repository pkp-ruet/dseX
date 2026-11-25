"use client";

import Link from "@/components/ui/Link";
import { setLessonDone, useLearnDone } from "@/lib/learn/progress";
import type { LessonCard } from "@/lib/learn/lessons";
import type { Lang } from "@/lib/learn/types";

/**
 * The parts of the Learn pages that read the reader's ticks
 * (`lib/learn/progress.ts`, this device only). Each renders a neutral state on
 * the server and the first paint, then the reader's own.
 */

const say = (lang: Lang, en: string, bn: string) => (lang === "en" ? en : bn);

/** The lesson's number, or a tick once it is done. */
export function DoneTick({ id, n, current = false }: { id: string; n: number; current?: boolean }) {
  const done = useLearnDone().includes(id);
  return (
    <span className={`ln-tick${done ? " is-done" : ""}${current && !done ? " is-now" : ""}`} aria-hidden="true">
      {done ? (
        <svg viewBox="0 0 16 16" width="14" height="14">
          <path d="M3.5 8.5 6.5 11.5 12.5 5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        n
      )}
    </span>
  );
}

/** "3 of 9 done" with a thin bar. Renders the plain count of lessons until the reader has ticked one. */
export function PathProgress({ ids, lang, minutes }: { ids: string[]; lang: Lang; minutes: number }) {
  const done = useLearnDone();
  const n = ids.filter((id) => done.includes(id)).length;
  const hours = minutes >= 60 ? say(lang, `about ${Math.round(minutes / 30) / 2} hours`, `প্রায় ${Math.round(minutes / 30) / 2} ঘণ্টা`) : say(lang, `${minutes} minutes`, `${minutes} মিনিট`);
  if (n === 0) {
    return <span className="ln-meta">{say(lang, `${ids.length} posts · ${hours}`, `${ids.length}টি লেখা · ${hours}`)}</span>;
  }
  return (
    <span className="ln-prog">
      <span className="ln-meta">
        {n === ids.length
          ? say(lang, `All ${ids.length} read`, `${ids.length}টিই পড়া শেষ`)
          : say(lang, `${n} of ${ids.length} read`, `${ids.length}টির মধ্যে ${n}টি পড়া শেষ`)}
      </span>
      <span className="ln-bar" aria-hidden="true">
        <span style={{ width: `${Math.round((n / ids.length) * 100)}%` }} />
      </span>
    </span>
  );
}

/** "Continue: post 4 of 10" on the hub, once the reader has started and not finished. */
export function ContinueCard({ groups, lang }: { groups: { name: string; cards: LessonCard[] }[]; lang: Lang }) {
  const done = useLearnDone();
  const all = groups.flatMap((g) => g.cards.map((c) => ({ ...c, group: g.name, total: g.cards.length })));
  const finished = all.filter((c) => done.includes(c.id)).length;
  if (finished === 0 || finished === all.length) return null;
  const next = all.find((c) => !done.includes(c.id))!;
  const inGroup = all.filter((c) => c.group === next.group);
  const groupDone = inGroup.filter((c) => done.includes(c.id)).length;
  return (
    <section className="ln-cont" aria-label={say(lang, "Continue learning", "যেখানে থেমেছিলেন")}>
      <p className="ln-cont-k">{say(lang, `Continue · ${next.group}`, `চালিয়ে যান · ${next.group}`)}</p>
      <p className="ln-cont-t">
        {say(lang, `${next.n} of ${next.total}: ${next.title}`, `${next.total}টির মধ্যে ${next.n}: ${next.title}`)}
      </p>
      <span className="ln-bar" aria-hidden="true">
        <span style={{ width: `${Math.round((groupDone / inGroup.length) * 100)}%` }} />
      </span>
      <Link href={next.href} className="btn-primary ln-cont-btn">
        {say(lang, "Continue", "চালিয়ে যান")}
      </Link>
    </section>
  );
}

/** The end of a lesson: mark it done, and go on. */
export function MarkDone({ id, lang }: { id: string; lang: Lang }) {
  const done = useLearnDone().includes(id);
  return (
    <div className="ln-done">
      <button
        type="button"
        className={done ? "btn-quiet" : "btn-primary"}
        aria-pressed={done}
        onClick={() => setLessonDone(id, !done)}
      >
        {done ? say(lang, "Read · tap to undo", "পড়া হয়েছে · ফেরাতে চাপুন") : say(lang, "Mark as read", "পড়া হয়েছে চিহ্ন দিন")}
      </button>
      <p className="ln-done-note">
        {say(lang, "Saved on this device only.", "শুধু এই ডিভাইসে সংরক্ষিত থাকে।")}
      </p>
    </div>
  );
}

/** The next-post link; going on also marks this post read. `label` names a new section. */
export function NextLesson({ id, next, lang, label }: { id: string; next: LessonCard; lang: Lang; label?: string }) {
  return (
    <Link href={next.href} className="ln-next" onClick={() => setLessonDone(id, true)}>
      <span className="ln-next-k">
        {label ?? say(lang, `Up next · ${next.minutes} min`, `এরপর · ${next.minutes} মিনিট`)}
      </span>
      <span className="ln-next-t">{next.title}</span>
      <span className="ln-next-d">{next.summary}</span>
    </Link>
  );
}
