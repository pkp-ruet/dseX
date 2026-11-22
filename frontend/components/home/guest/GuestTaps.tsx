"use client";

import type { MouseEvent, ReactNode } from "react";
import { trackHomeTap } from "@/lib/track";

/** One delegated listener for the guest home, like the signed-in home's:
 *  a tapped link inside a `[data-card]` wrapper records which card it came
 *  from (GA `home_card_tap`, the card names start with "guest-" or "icon-"). */
export default function GuestTaps({ children }: { children: ReactNode }) {
  function onTap(e: MouseEvent<HTMLDivElement>) {
    const link = (e.target as HTMLElement | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
    if (!link) return;
    const card = link.closest("[data-card]")?.getAttribute("data-card");
    if (card) trackHomeTap(card.startsWith("guest-") || card.startsWith("icon-") ? card : `guest-${card}`, link.getAttribute("href") ?? undefined);
  }
  return (
    <div className="hm hm--guest pb-4" onClickCapture={onTap}>
      {children}
    </div>
  );
}
