import Link from "next/link";
import type { SignalsToday } from "@/lib/api";
import { T } from "@/components/i18n/T";
import { formatDate } from "@/lib/formatters";
import { bnDate } from "@/lib/bn";

const SHOW = 6;

/**
 * What changed since the last trading day (2026-10-31): who joined the list
 * and who left it, with the reason in words. Free — the list is free, so
 * who came and went is too. A rule-change day (`rebuilt`) says so instead of
 * naming 15 shares as news. Renders nothing on a quiet day.
 */
export default function SignalsChanges({
  changes,
  names,
}: {
  changes: SignalsToday["changes"];
  names: Record<string, string | null | undefined>;
}) {
  if (!changes) return null;
  const { joined, left, rebuilt, since } = changes;
  const day = formatDate(since);
  const dayBn = bnDate(since);

  if (joined.length === 0 && left.length === 0) {
    return (
      <p className="sg-changes">
        <T en={`No change since ${day}: the same shares are on the list.`} bn={`${dayBn}-এর পর কোনো বদল নেই: একই শেয়ারগুলো তালিকায় আছে।`} />
      </p>
    );
  }
  if (rebuilt) {
    return (
      <p className="sg-changes">
        <T
          en={`Our checks were updated after ${day}, so the list moved more than usual: ${joined.length} joined and ${left.length} left.`}
          bn={`${dayBn}-এর পর আমাদের যাচাই হালনাগাদ হয়েছে, তাই তালিকা স্বাভাবিকের চেয়ে বেশি বদলেছে: ${joined.length}টি এসেছে, ${left.length}টি বাদ গেছে।`}
        />
      </p>
    );
  }

  const name = (c: string) => names[c] || c;
  return (
    <div className="sg-changes">
      <p className="sg-changes-h">
        <T en={`Since ${day}`} bn={`${dayBn}-এর পর থেকে`} />
      </p>
      {joined.length > 0 && (
        <p>
          <strong className="text-positive">
            <T en={`${joined.length} joined:`} bn={`${joined.length}টি এসেছে:`} />
          </strong>{" "}
          {joined.slice(0, SHOW).map((c, i) => (
            <span key={c}>
              {i > 0 && ", "}
              <Link href={`/stock/${c}`} className="sg-changes-link">
                {name(c)}
              </Link>
            </span>
          ))}
          {joined.length > SHOW && <T en={` and ${joined.length - SHOW} more`} bn={` আরও ${joined.length - SHOW}টি`} />}
        </p>
      )}
      {left.length > 0 && (
        <p>
          <strong className="text-negative">
            <T en={`${left.length} left:`} bn={`${left.length}টি বাদ গেছে:`} />
          </strong>{" "}
          {left.slice(0, SHOW).map((l, i) => (
            <span key={l.code}>
              {i > 0 && "; "}
              <Link href={`/stock/${l.code}`} className="sg-changes-link">
                {name(l.code)}
              </Link>
              {l.reason && (
                <>
                  {", "}
                  <T en={l.reason.en.charAt(0).toLowerCase() + l.reason.en.slice(1)} bn={l.reason.bn} />
                </>
              )}
            </span>
          ))}
          {left.length > SHOW && <T en={` and ${left.length - SHOW} more`} bn={` আরও ${left.length - SHOW}টি`} />}
        </p>
      )}
    </div>
  );
}
