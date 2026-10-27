import Link from "next/link";
import type { ResearchChanges as Changes } from "@/lib/api";
import { formatDate } from "@/lib/formatters";
import { bnDate } from "@/lib/bn";
import { T } from "@/components/i18n/T";
import { PersonalMark } from "@/components/market-analysis/PersonalCodes";
import { IconArrowDown, IconArrowUp } from "@/components/ui/icons";

/**
 * Who joined and who left since about a month ago, from the daily snapshots.
 * A leaver carries the check it now fails. Never a price move or a return —
 * no track-record claims, by rule.
 */
export default function ResearchChanges({ changes }: { changes: Changes }) {
  if (!changes.since) {
    return (
      <p className="text-sm text-text-muted">
        {changes.tracking_since ? (
          <T
            en={`We started recording this list on ${formatDate(changes.tracking_since)}. Who joins and who leaves will show here from the next trading day.`}
            bn={`এই তালিকা ${bnDate(changes.tracking_since)} থেকে রেকর্ড হচ্ছে। পরের কার্যদিবস থেকে কে যোগ হলো আর কে বাদ পড়ল, তা এখানে দেখা যাবে।`}
          />
        ) : (
          <T
            en="We record this list every trading day. Who joins and who leaves will show here once the first days are in."
            bn="এই তালিকা প্রতি কার্যদিবসে রেকর্ড হয়। প্রথম কয়েক দিনের হিসাব জমলে কে যোগ হলো আর কে বাদ পড়ল, তা এখানে দেখা যাবে।"
          />
        )}
      </p>
    );
  }

  const quiet = changes.joined.length === 0 && changes.left.length === 0;
  const since = { en: formatDate(changes.since), bn: bnDate(changes.since) };
  return (
    <div className="rl-changes">
      <p className="text-sm text-text-muted">
        {quiet ? (
          <T en={`No change since ${since.en}.`} bn={`${since.bn} থেকে কোনো পরিবর্তন নেই।`} />
        ) : (
          <T en={`Since ${since.en}:`} bn={`${since.bn} থেকে:`} />
        )}
      </p>
      {changes.joined.length > 0 && (
        <div>
          <p className="rl-changes-head text-positive">
            <IconArrowUp size={14} />{" "}
            <T en={`Joined (${changes.joined.length})`} bn={`যোগ হয়েছে (${changes.joined.length})`} />
          </p>
          <ul className="rl-changes-list">
            {changes.joined.map((j) => (
              <li key={j.code}>
                <Link prefetch={false} href={`/stock/${j.code}`} className="rl-changes-name">{j.name || j.code}</Link>
                <span className="rl-card-code">{j.code}<PersonalMark code={j.code} /></span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {changes.left.length > 0 && (
        <div>
          <p className="rl-changes-head text-negative">
            <IconArrowDown size={14} />{" "}
            <T en={`Left (${changes.left.length})`} bn={`বাদ পড়েছে (${changes.left.length})`} />
          </p>
          <ul className="rl-changes-list">
            {changes.left.map((l) => (
              <li key={l.code}>
                <Link prefetch={false} href={`/stock/${l.code}`} className="rl-changes-name">{l.name || l.code}</Link>
                <span className="rl-card-code">{l.code}<PersonalMark code={l.code} /></span>
                <span className="rl-changes-why">
                  <T en={l.reason_en} bn={l.reason_bn} />
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
