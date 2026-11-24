"use client";

import { useMemo } from "react";
import Link from "@/components/ui/Link";
import StarButton from "@/components/ui/StarButton";
import ListView from "@/components/lists/ListView";
import { IconArrowRight, IconCheck } from "@/components/ui/icons";
import { T } from "@/components/i18n/T";
import { getTier } from "@/lib/constants";
import { SORT_NAME, SORT_PRICE, type Bi, type ListRow, type ListSort } from "@/lib/lists";
import type { ForYouGroup, ForYouPick } from "@/lib/api";

const SORTS: ListSort[] = [
  { id: "own", label: { en: "By your share", bn: "আপনার শেয়ার অনুযায়ী" }, dir: "asc" },
  SORT_PRICE,
  SORT_NAME,
];

/** The heading over a share's picks, in the reader's own terms. */
export function groupTitle(g: ForYouGroup): Bi {
  const a = g.anchor ?? "";
  switch (g.rel) {
    case "own":
      return { en: `Because you own ${a}`, bn: `যেহেতু আপনার কাছে ${a} আছে` };
    case "follow":
      return { en: `Because you follow ${a}`, bn: `যেহেতু আপনি ${a} ফলো করেন` };
    case "read":
      return g.days && g.days >= 2
        ? { en: `Because you looked at ${a} on ${g.days} days`, bn: `যেহেতু আপনি ${g.days} দিন ${a} দেখেছেন` }
        : { en: `Because you looked at ${a}`, bn: `যেহেতু আপনি সম্প্রতি ${a} দেখেছেন` };
    default:
      return { en: "To fill a gap in your money", bn: "আপনার টাকার একটি ফাঁক পূরণে" };
  }
}

/** A pick's panel, opened in place: what it shares with the reader's share,
 *  then Read our analysis · Not for me · Follow. */
function PickPanel({ pick, onHide }: { pick: ForYouPick; onHide?: (p: ForYouPick) => void }) {
  return (
    <div className="fu-panel">
      {pick.chips.length > 0 && (
        <div className="fu-common">
          {pick.chips_label && (
            <p className="fu-common-k">
              <T en={pick.chips_label.en} bn={pick.chips_label.bn} />
            </p>
          )}
          <ul className="fu-traits">
            {pick.chips.map((c) => (
              <li key={c.en}>
                {c.tone !== "neutral" && (
                  <span className="fu-tick" aria-hidden="true">
                    <IconCheck size={12} />
                  </span>
                )}
                <T en={c.en} bn={c.bn} />
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="fu-acts">
        <Link href={`/stock/${pick.code}#ch-analysis`} className="fu-read" data-pick={pick.code}>
          <T en="Read our analysis" bn="বিশ্লেষণ পড়ুন" />
          <IconArrowRight size={14} />
        </Link>
        <span className="fu-acts-end">
          {onHide && (
            <button type="button" className="fu-hide" onClick={() => onHide(pick)}>
              <T en="Not for me" bn="আমার জন্য নয়" />
            </button>
          )}
          <span className="fu-follow">
            <T en="Follow" bn="ফলো" />
            <StarButton code={pick.code} />
          </span>
        </span>
      </div>
    </div>
  );
}

const TIERS = new Set(["excellent", "good", "average", "weak"]);

/**
 * For you in THE list view (2026-11-25, step 4 of the simplify review; For
 * you moved from My shares to Lists). One list of every pick: in its own
 * order the picks sit under a heading per share of the reader's ("Because you
 * own ACI" + the reason), each row says why it fits and its tie ("Like GP")
 * is the key figure; a tap opens what it shares and Read our analysis · Not
 * for me · Follow. Without groups (the starter list) it is one plain list.
 */
export default function ForYouList({
  id,
  picks,
  groups,
  onHide,
}: {
  id: string;
  picks: ForYouPick[];
  groups?: ForYouGroup[];
  onHide?: (p: ForYouPick) => void;
}) {
  const byKey = useMemo(() => new Map((groups ?? []).map((g, i) => [g.key, { g, i }] as const)), [groups]);
  const rows = useMemo<ListRow<ForYouPick>[]>(
    () =>
      picks.map((p, i) => ({
        code: p.code,
        name: p.name || p.code,
        sector: p.sector,
        tier: TIERS.has(p.tier) ? (p.tier as ListRow["tier"]) : p.score != null ? getTier(p.score) : null,
        price: p.price,
        change: p.change_pct,
        fig: p.tag_en ? { en: p.tag_en, bn: p.tag_bn || p.tag_en, words: true } : null,
        why: { en: p.why_en, bn: p.why_bn },
        isNew: p.new,
        sort: { own: (p.group_key ? byKey.get(p.group_key)?.i ?? 99 : 99) * 1000 + i },
        data: p,
      }))
      // The engine hands picks out by turns; the list keeps each share's together.
      .sort((a, b) => (a.sort.own as number) - (b.sort.own as number)),
    [picks, byKey],
  );

  return (
    <ListView
      id={id}
      track="for-you"
      rows={rows}
      figHead={{ en: "Why it fits", bn: "কেন মেলে" }}
      sorts={SORTS}
      defaultSort="own"
      rowId={(r) => `pick-${r.code}`}
      groupOf={
        groups?.length
          ? (r) => {
              const hit = r.data?.group_key ? byKey.get(r.data.group_key) : undefined;
              return hit
                ? { id: hit.g.key, title: groupTitle(hit.g), line: hit.g.line, anchor: `fu-g-${hit.g.key}` }
                : null;
            }
          : undefined
      }
      renderOpen={(r) => <PickPanel pick={r.data!} onHide={onHide} />}
    />
  );
}

/**
 * A free reader's For you (the free view kept, 2026-11-25): the same list,
 * each pick masked — its business shown, never its name — under the heading
 * of the share it came from, and the key figure says Premium.
 */
export function ForYouLockedList({ id, groups }: { id: string; groups: ForYouGroup[] }) {
  const rows = useMemo<ListRow<ForYouGroup>[]>(
    () =>
      groups.flatMap((g) =>
        g.sectors.map((s, i) => ({
          code: `${g.key}-${i}`,
          name: "",
          sector: s.en || null,
          fig: { en: "Premium", bn: "প্রিমিয়াম", tone: "gold" as const, words: true },
          data: g,
        })),
      ),
    [groups],
  );
  return (
    <ListView
      id={id}
      track="for-you-locked"
      rows={rows}
      figHead={{ en: "Why it fits", bn: "কেন মেলে" }}
      sorts={[{ id: "own", label: { en: "By your share", bn: "আপনার শেয়ার অনুযায়ী" }, dir: "asc" }]}
      defaultSort="own"
      masked
      maskKeepSector
      priceFilter={false}
      groupOf={(r) => ({ id: r.data!.key, title: groupTitle(r.data!), line: r.data!.line, anchor: `fu-g-${r.data!.key}` })}
    />
  );
}
