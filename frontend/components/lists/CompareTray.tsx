"use client";

import Button from "@/components/ui/Button";
import { IconClose } from "@/components/ui/icons";
import { T } from "@/components/i18n/T";
import { compareHref, MAX_COMPARE } from "@/lib/compare";
import { trackEvent } from "@/lib/track";

/**
 * The bar that opens a comparison from a list (2026-11-25, "Compare and
 * Builder Homes": Compare moved onto the shares). It shows while the list
 * bar's Compare switch is on: what is ticked, and "Compare" once two are.
 * On a page it floats above the bottom bar (`fixed`); inside the /lists
 * pop-up it is the sheet's footer (`inSheet`).
 */
export default function CompareTray({
  codes,
  onRemove,
  onDone,
  list,
  inSheet = false,
}: {
  codes: string[];
  onRemove: (code: string) => void;
  /** Turn the switch off (and drop the ticks). */
  onDone: () => void;
  /** GA: which list it came from. */
  list: string;
  inSheet?: boolean;
}) {
  const ready = codes.length >= 2;
  return (
    <div
      className={`lv-tray${inSheet ? " lv-tray--sheet" : " above-bottom-bar"}`}
      data-bottom-card={inSheet ? undefined : ""}
      role="region"
      aria-label="Compare"
    >
      <div className="lv-tray-in">
        <div className="lv-tray-main">
          {codes.length === 0 ? (
            <p className="lv-tray-hint">
              <T en="Tick two or more shares to put them side by side." bn="পাশাপাশি দেখতে দুই বা তার বেশি শেয়ার বাছুন।" />
            </p>
          ) : (
            <ul className="lv-tray-codes" aria-label="Ticked shares">
              {codes.map((c) => (
                <li key={c}>
                  <button type="button" className="lv-tray-code" onClick={() => onRemove(c)} aria-label={`Remove ${c}`}>
                    {c}
                    <IconClose size={12} />
                  </button>
                </li>
              ))}
              {codes.length === 1 && (
                <li className="lv-tray-hint">
                  <T en="Tick one more" bn="আরও একটি বাছুন" />
                </li>
              )}
            </ul>
          )}
          {codes.length >= MAX_COMPARE && (
            <p className="lv-tray-hint">
              <T en={`${MAX_COMPARE} is the most side by side.`} bn={`পাশাপাশি সর্বোচ্চ ${MAX_COMPARE}টি।`} />
            </p>
          )}
        </div>
        <div className="lv-tray-acts">
          <Button type="button" variant="quiet" size="sm" onClick={onDone}>
            <T en="Cancel" bn="বাতিল" />
          </Button>
          {ready ? (
            <Button
              href={compareHref(codes)}
              variant="primary"
              size="sm"
              onClick={() => trackEvent("list_compare", { list, n: codes.length })}
            >
              <T en={`Compare ${codes.length}`} bn={`${codes.length}টি তুলনা`} />
            </Button>
          ) : (
            <Button type="button" variant="primary" size="sm" disabled>
              <T en="Compare" bn="তুলনা" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
