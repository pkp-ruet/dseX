"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "@/components/ui/Link";
import { T } from "@/components/i18n/T";
import { inEveryPlace, placeByKey, placeOf, type PlaceKey } from "@/lib/places";

const LAST_PLACE = "dsex.lastPlace";

/**
 * The back link above every page inside a place (2026-11-20, the app map):
 * "‹ Market" on the results page, "‹ My shares" on the watchlist. It replaces
 * a tab row (a 2026-10-26 tab row above the find pages was removed the same
 * day): you move between places with the bottom bar, and back to a place
 * from here. The stock page belongs to every place, so it points back to the
 * place the reader last came from in this tab, Lists by default; so does
 * Compare since 2026-11-25 (it opens from a share, a list, My shares and
 * search). Rendered once in the root layout, above each page.
 */
export default function PlaceTrail() {
  const pathname = usePathname();
  const here = placeOf(pathname);
  // A share's page or Compare: every place leads to it.
  const isStock = inEveryPlace(pathname);
  const [from, setFrom] = useState<PlaceKey>("lists");

  useEffect(() => {
    try {
      if (here && here.place.key !== "learn") sessionStorage.setItem(LAST_PLACE, here.place.key);
      if (isStock) {
        const k = sessionStorage.getItem(LAST_PLACE) as PlaceKey | null;
        if (k === "market" || k === "lists" || k === "mine") setFrom(k);
      }
    } catch {
      // Storage blocked: the stock page points back to Lists.
    }
  }, [pathname, here, isStock]);

  let key: PlaceKey | null = null;
  if (isStock) key = from;
  else if (here?.page && here.place.key !== "learn") key = here.place.key;
  if (!key) return null;

  const place = placeByKey(key);
  return (
    <Link href={place.href} className="pl-trail" data-card={`trail-${key}`}>
      <span aria-hidden="true">‹</span>
      <T en={place.name.en} bn={place.name.bn} />
    </Link>
  );
}
