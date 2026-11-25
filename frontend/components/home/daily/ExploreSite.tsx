import Link from "@/components/ui/Link";
import type { Lang } from "@/context/LangContext";
import { PLACES } from "@/lib/places";
import { dailyRead } from "@/lib/home-today";
import { IconBook, IconChevronRight, IconCrown } from "@/components/ui/icons";

/**
 * "Explore TopStockBD" at the foot of the signed-in home (2026-11-25, the
 * fuller home, addition E): the four tabs as four small cards, each with its
 * question and every page under it, so a reader sees all the site does
 * without opening a menu (on phones the footer folds these links shut). The
 * Learn card adds one short read that changes every day, in the reader's
 * language. Everything comes from `lib/places.ts`, so every page keeps its
 * one name. The guest home has `NewHere` for this job.
 */
export default function ExploreSite({ lang, crowns, todayIso }: { lang: Lang; crowns: boolean; todayIso: string }) {
  const bn = lang === "bn";
  const read = dailyRead(todayIso);
  return (
    <section className={`hm-explore ${bn ? "font-bn" : ""}`} lang={bn ? "bn" : undefined} data-card="explore">
      <div className="hm-head">
        <div className="hm-head-txt">
          <h2 className="hm-head-h">{bn ? "TopStockBD ঘুরে দেখুন" : "Explore TopStockBD"}</h2>
          <p className="hm-head-note">
            {bn ? "সব পেজ চারটি ট্যাবে। প্রতিটি ট্যাব একটি প্রশ্নের উত্তর দেয়।" : "Every page sits in four tabs. Each tab answers one question."}
          </p>
        </div>
      </div>
      <div className="hm-ex-grid">
        {PLACES.map((place) => {
          const learn = place.key === "learn";
          const placeHref = learn ? (bn ? "/blog" : "/learn") : place.href;
          return (
            <div key={place.key} className="hm-ex-card">
              <Link href={placeHref} className="hm-ex-h" data-card={`explore-${place.key}`}>
                <span>{bn ? place.name.bn : place.name.en}</span>
                <IconChevronRight size={16} />
              </Link>
              <p className="hm-ex-q">{bn ? place.question.bn : place.question.en}</p>
              <ul className="hm-ex-pages">
                {place.pages.map((p) => (
                  <li key={p.key}>
                    <Link href={bn && p.hrefBn ? p.hrefBn : p.href} className="hm-ex-a" data-card={`explore-${p.key}`}>
                      {bn ? p.name.bn : p.name.en}
                      {crowns && p.premium && (
                        <span className="hm-ex-crown" aria-label="Premium">
                          <IconCrown size={11} />
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
              {learn && (
                <Link
                  href={bn ? `/blog/${read.blog}` : `/learn/${read.learn}`}
                  className="hm-ex-read"
                  data-card="explore-read"
                >
                  <IconBook size={16} />
                  <span>
                    <span className="hm-ex-read-k">{bn ? "আজকের লেখা" : "Today's read"}</span>
                    <span className="hm-ex-read-t">{bn ? read.title.bn : read.title.en}</span>
                  </span>
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
