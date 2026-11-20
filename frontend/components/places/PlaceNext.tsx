import Link from "@/components/ui/Link";
import { T } from "@/components/i18n/T";
import { IconChevronRight } from "@/components/ui/icons";
import { placeByKey, type PlaceKey } from "@/lib/places";

/**
 * One line at the end of a page that points to the next place (2026-11-20,
 * the app map). It replaced the market page's "Looking for shares?" tiles and
 * the results page's hub links: the place pages hold the doors now, so a page
 * only needs to say where to go next. `place` is where to send the reader;
 * `ask` is the question that place answers.
 */
export default function PlaceNext({ place: key }: { place: Exclude<PlaceKey, "learn"> }) {
  const place = placeByKey(key);
  return (
    <Link href={place.href} className="pl-next" data-card={`next-${key}`}>
      <span className="pl-next-q">
        <T en={place.question.en} bn={place.question.bn} />
      </span>
      <span className="pl-next-go">
        <T en={`Go to ${place.name.en}`} bn={`${place.name.bn}-এ যান`} />
        <IconChevronRight size={16} />
      </span>
    </Link>
  );
}
