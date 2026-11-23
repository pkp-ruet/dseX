"use client";

import Link from "@/components/ui/Link";
import { T } from "@/components/i18n/T";
import type { ScreenerListChange } from "@/lib/api";

/**
 * "Left this week" (2026-11-23), under a list's result, inside its Premium
 * gate: the shares that were on the list at the last close before the week
 * began and are gone today, each with the filter it fails now in words
 * ("GP: Yield is now 3.8%."). Folded; nothing when none left.
 */
export default function ListLeft({ left }: { left: ScreenerListChange["left"] }) {
  if (!left.length) return null;
  return (
    <details className="scr-left">
      <summary className="scr-left-sum">
        <span>
          <T
            en={`${left.length} ${left.length === 1 ? "share" : "shares"} left this list this week`}
            bn={`এ সপ্তাহে ${left.length}টি শেয়ার তালিকা থেকে বাদ পড়েছে`}
          />
        </span>
        <span className="scr-left-show" aria-hidden="true"><T en="See why" bn="কারণ দেখুন" /></span>
      </summary>
      <ul className="scr-left-list">
        {left.map((x) => (
          <li key={x.code} className="scr-left-row">
            <Link href={`/stock/${encodeURIComponent(x.code)}`} className="scr-near-name">
              {x.name} <span className="scr-near-code">{x.code}</span>
            </Link>
            <p className="text-sm text-text-main"><T en={x.en} bn={x.bn} /></p>
          </li>
        ))}
      </ul>
    </details>
  );
}
