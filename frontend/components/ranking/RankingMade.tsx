import Link from "next/link";
import type { RankingsToday } from "@/lib/api";
import { TIER_VAR, type TierKey } from "@/lib/constants";
import { CHECK_WEIGHTS, GROUP_NAMES, GROUP_ORDER } from "@/lib/ranking";
import { T } from "@/components/i18n/T";
import { formatDate } from "@/lib/formatters";
import { bnDate } from "@/lib/bn";

const SHOW = 5;

/**
 * How the ranking is made (2026-10-31, the ranking redesign): the plainest
 * fact first ("most DSE companies don't pass our checks"), the four groups as
 * one bar with their counts, and the five checks with their share of the
 * score. Free. Replaced the one-line method strip and the two coverage stats.
 */
export function RankingMade({
  counts,
  total,
  latestFy,
}: {
  counts: Record<string, number>;
  total: number;
  /** The newest year of accounts on file, said beside the checks. */
  latestFy?: number | null;
}) {
  const order = [...GROUP_ORDER].reverse() as TierKey[]; // strongest first
  const weak = counts.weak ?? 0;
  const strong = (counts.excellent ?? 0) + (counts.good ?? 0);
  const mostlyWeak = weak / Math.max(total, 1) >= 0.5;
  return (
    <section aria-labelledby="rk-made-h" className="soft-card rk-made">
      <h2 id="rk-made-h" className="rk-made-h">
        {mostlyWeak ? (
          <T
            en={`Most DSE companies don't pass our checks: ${weak} of ${total} are mostly weak.`}
            bn={`ডিএসইর বেশিরভাগ কোম্পানি আমাদের যাচাইয়ে উতরায় না: ${total}টির মধ্যে ${weak}টি বেশিরভাগ দিকে দুর্বল।`}
          />
        ) : (
          <T
            en={`${strong} of ${total} companies are mostly strong or better.`}
            bn={`${total}টির মধ্যে ${strong}টি কোম্পানি বেশিরভাগ দিকে শক্তিশালী বা তার চেয়ে ভালো।`}
          />
        )}
      </h2>
      <div className="rk-made-bar" aria-hidden="true">
        {order.map((t) => (
          <i key={t} style={{ flexGrow: counts[t] ?? 0, background: TIER_VAR[t] }} />
        ))}
      </div>
      <ul className="rk-made-groups">
        {order.map((t) => (
          <li key={t}>
            <b className="nums">
              <span className="rk-dot" style={{ background: TIER_VAR[t] }} aria-hidden />
              {counts[t] ?? 0}
            </b>
            <span>
              <T en={GROUP_NAMES[t].name.en} bn={GROUP_NAMES[t].name.bn} />
            </span>
          </li>
        ))}
      </ul>
      <div className="rk-made-checks">
        <span className="rk-made-k">
          <T en="Five checks make the score:" bn="পাঁচটি যাচাইয়ে স্কোর:" />
        </span>
        {CHECK_WEIGHTS.map((c) => (
          <span key={c.key} className="rk-made-chip nums">
            <T en={`${c.name.en} ${c.pct}%`} bn={`${c.name.bn} ${c.pct}%`} />
          </span>
        ))}
        {latestFy && (
          <span className="rk-made-fy nums">
            <T en={`Accounts up to ${latestFy}`} bn={`${latestFy} পর্যন্ত হিসাব`} />
          </span>
        )}
        <Link prefetch={false} href="/about" className="rk-made-link">
          <T en="How we score" bn="কীভাবে স্কোর দিই" />
        </Link>
      </div>
    </section>
  );
}

/** One line on this week's group moves: who moved to a better or a lower
 *  group (names free; why is Premium, in the movers section below). */
export function RankingWeek({
  week,
  names,
}: {
  week: RankingsToday["week"];
  names: Record<string, string>;
}) {
  if (!week) return null;
  if (week.method) {
    return (
      <p className="rk-week">
        <T
          en={`Our scoring was updated on ${formatDate(week.to)}, so group moves count again from the next trading day.`}
          bn={`${bnDate(week.to)} আমাদের স্কোরের নিয়ম হালনাগাদ হয়েছে, তাই পরের লেনদেনের দিন থেকে আবার দল বদল গোনা হবে।`}
        />
      </p>
    );
  }
  const { up, down } = week;
  if (!up.length && !down.length) {
    return (
      <p className="rk-week">
        <T en="No company changed group this week." bn="এ সপ্তাহে কোনো কোম্পানির দল বদলায়নি।" />
      </p>
    );
  }
  const list = (codes: string[]) => (
    <>
      {codes.slice(0, SHOW).map((c, i) => (
        <span key={c}>
          {i > 0 && ", "}
          <Link prefetch={false} href={`/stock/${c}`} className="rk-week-link">
            {names[c] ?? c}
          </Link>
        </span>
      ))}
      {codes.length > SHOW && <T en={` and ${codes.length - SHOW} more`} bn={` আরও ${codes.length - SHOW}টি`} />}
    </>
  );
  return (
    <div className="rk-week">
      {up.length > 0 && (
        <p>
          <strong className="text-positive">
            <T en={`${up.length} moved to a better group this week:`} bn={`এ সপ্তাহে ${up.length}টি ভালো দলে উঠেছে:`} />
          </strong>{" "}
          {list(up)}
        </p>
      )}
      {down.length > 0 && (
        <p>
          <strong className="text-negative">
            <T en={`${down.length} moved down:`} bn={`${down.length}টি নিচের দলে নেমেছে:`} />
          </strong>{" "}
          {list(down)}
        </p>
      )}
    </div>
  );
}
