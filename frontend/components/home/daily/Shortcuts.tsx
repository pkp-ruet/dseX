import Link from "@/components/ui/Link";
import type { Lang } from "@/context/LangContext";
import { pageByKey } from "@/lib/places";
import { SHORTCUTS, type Badge, type ShortcutKey } from "@/lib/home-today";
import { PAGE_ICON } from "@/components/places/pageIcons";
import { IconCrown } from "@/components/ui/icons";

/**
 * The home's shortcuts (2026-11-25, the fuller home, addition B): eight icons
 * in fixed places, the same for every reader, so the thumb learns where each
 * one is. They are the pages readers opened most from the home that have no
 * other door on it (27 in 100 trips from the home went to them, page views
 * 4–25 Nov; the four-block home of the same morning had left them two taps
 * away through the Lists tab). Smaller than the icon grid removed that
 * morning: no "See more", no "What is each one?" — the bottom bar stays the
 * menu and "Explore TopStockBD" at the foot lists every page.
 *
 * Names and icons come from `lib/places.ts`, so each page keeps its one name.
 * An icon may wear one number that changes daily (`shortcutBadges`); a gold
 * crown marks a Premium page for a reader without Premium. No hooks: the
 * guest home renders it on the server.
 */
export default function Shortcuts({
  lang,
  badges = {},
  crowns,
}: {
  lang: Lang;
  badges?: Partial<Record<ShortcutKey, Badge>>;
  /** Show the gold crown on Premium pages (readers without Premium, guests). */
  crowns: boolean;
}) {
  const bn = lang === "bn";
  return (
    <nav className={`hm-sc ${bn ? "font-bn" : ""}`} lang={bn ? "bn" : undefined} aria-label={bn ? "শর্টকাট" : "Shortcuts"}>
      <ul className="hm-sc-grid">
        {SHORTCUTS.map((key) => {
          const p = pageByKey(key);
          const Icon = PAGE_ICON[key];
          const b = badges[key];
          const name = bn ? p.name.bn : p.name.en;
          const href = bn && p.hrefBn ? p.hrefBn : p.href;
          return (
            <li key={key}>
              <Link
                href={href}
                className="hm-sc-a"
                data-card={`shortcut-${key}`}
                aria-label={b ? `${name}, ${bn ? b.say.bn : b.say.en}` : undefined}
              >
                <span className="hm-sc-ic" aria-hidden>
                  {Icon && <Icon size={22} />}
                  {crowns && p.premium && (
                    <span className="hm-sc-crown">
                      <IconCrown size={10} />
                    </span>
                  )}
                  {b && <span className="hm-sc-badge nums">{bn ? b.text.bn : b.text.en}</span>}
                </span>
                <span className="hm-sc-name">{name}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
