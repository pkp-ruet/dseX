import type { ReactNode } from "react";
import Link from "@/components/ui/Link";
import { T } from "@/components/i18n/T";
import { IconChevronRight, IconCrown } from "@/components/ui/icons";
import { PAGE_ICON } from "@/components/places/pageIcons";
import type { Bi, Place } from "@/lib/places";

/** Today's number beside a door: a figure and what it counts. */
export interface DoorFigure {
  value: ReactNode;
  unit?: Bi;
  tone?: "up" | "down";
}

/**
 * The doors of a place page (2026-11-20, the app map): one card, one row per
 * page of the place — icon, name (+ a crown on Premium pages), the reader's
 * question, today's number and a chevron. It fits on one phone screen so the
 * reader sees everything inside a place before tapping. Styles `pl-*` in
 * app/styles/places.css. Server-safe: every word is a `<T>` pair.
 */
export default function PlaceDoors({
  place,
  figures = {},
}: {
  place: Place;
  figures?: Partial<Record<string, DoorFigure | null>>;
}) {
  return (
    <ul className="pl-doors">
      {place.pages.map((page) => {
        const Icon = PAGE_ICON[page.key];
        const f = figures[page.key];
        return (
          <li key={page.key}>
            <Link href={page.href} className="pl-door" data-card={`place-${page.key}`}>
              <span className="pl-door-ic" aria-hidden="true">
                {Icon ? <Icon size={20} /> : null}
              </span>
              <span className="pl-door-text">
                <span className="pl-door-name">
                  <T en={page.name.en} bn={page.name.bn} />
                  {page.premium && (
                    <span className="pl-crown" title="Premium">
                      <IconCrown size={12} />
                      <span className="sr-only">Premium</span>
                    </span>
                  )}
                </span>
                <span className="pl-door-ask">
                  <T en={page.ask.en} bn={page.ask.bn} />
                </span>
              </span>
              {f ? (
                <span className="pl-door-fig nums" data-tone={f.tone}>
                  <span className="pl-door-val">{f.value}</span>
                  {f.unit && (
                    <span className="pl-door-unit">
                      <T en={f.unit.en} bn={f.unit.bn} />
                    </span>
                  )}
                </span>
              ) : null}
              <span className="pl-door-go" aria-hidden="true">
                <IconChevronRight size={16} />
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
