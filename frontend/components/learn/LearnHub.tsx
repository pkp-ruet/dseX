import Link from "@/components/ui/Link";
import PageHeader from "@/components/ui/PageHeader";
import ArticleLangNote from "@/components/i18n/ArticleLangNote";
import { IconCrown } from "@/components/ui/icons";
import { getGuide } from "@/lib/guides";
import { getBlogPost } from "@/lib/blog-bn";
import { lessonCards, type LessonCard } from "@/lib/learn/lessons";
import { ADVANCED_PLANNED, MORE_GUIDES, PATHS, type PathMeta } from "@/lib/learn/paths";
import type { Lang } from "@/lib/learn/types";
import { ContinueCard, DoneTick, PathProgress } from "./LearnProgress";
import { hubHref } from "./LessonPage";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://www.topstockbd.com";

/** An earlier post (written before the sections) in this hub's language. */
function earlier(lang: Lang, slug: string) {
  if (lang === "en") {
    const g = getGuide(slug);
    return g ? { href: `/learn/${g.slug}`, title: g.title, meta: g.readTime } : null;
  }
  const b = getBlogPost(slug);
  return b ? { href: `/blog/${b.slug}`, title: b.title, meta: b.readTime } : null;
}

function Level({ n }: { n: number }) {
  return (
    <span className="lh-level" aria-hidden="true">
      {[1, 2, 3].map((i) => (
        <i key={i} className={i <= n ? "on" : undefined} />
      ))}
    </span>
  );
}

/**
 * The Learn page (2026-11-25, the rebuild — plan:
 * https://claude.ai/artifact/Q7TxTX1WzkbxGvgcocYEig, reshaped the same day).
 * Getting started (three step posts) · Investing basics (ten posts) ·
 * Advanced (Premium, being written) · More guides. `/learn` renders it in
 * English, `/blog` in Bengali.
 */
export default function LearnHub({ lang }: { lang: Lang }) {
  const say = (en: string, bn: string) => (lang === "en" ? en : bn);
  const hub = hubHref(lang);
  const [start, basics, advanced] = PATHS;
  const cards: Record<string, LessonCard[]> = {
    start: lessonCards("start", lang),
    basics: lessonCards("basics", lang),
    advanced: lessonCards("advanced", lang),
  };
  const minutes = (cs: LessonCard[]) => cs.reduce((s, c) => s + c.minutes, 0);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": `${BASE_URL}${hub}`,
        url: `${BASE_URL}${hub}`,
        name: say("Learn the share market, step by step", "ধাপে ধাপে শেয়ার বাজার শিখুন"),
        inLanguage: lang,
        isPartOf: { "@id": BASE_URL },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
          { "@type": "ListItem", position: 2, name: say("Learn", "শিখুন"), item: `${BASE_URL}${hub}` },
        ],
      },
      ...[start, basics, advanced].map((p) => ({
        "@type": "Course",
        name: `${p.name[lang]} · TopStockBD`,
        description: p.outcome[lang],
        inLanguage: lang,
        provider: { "@type": "Organization", name: "TopStockBD", url: BASE_URL },
        isAccessibleForFree: !p.premium,
        hasPart: cards[p.key].map((c) => ({ "@type": "Article", name: c.title, url: `${BASE_URL}${c.href}` })),
      })),
    ],
  };

  const premiumTag = (
    <span className="lh-prem">
      <IconCrown size={14} />
      Premium
    </span>
  );

  const pathCard = (p: PathMeta) => {
    const cs = cards[p.key];
    return (
      <li key={p.key}>
        <a href={`#${p.anchor}`} className="lh-card">
          <span className="lh-card-top">
            <Level n={p.level} />
            {p.premium ? premiumTag : null}
          </span>
          <h3 className="lh-card-name">{p.name[lang]}</h3>
          <p className="lh-card-who">{p.who[lang]}</p>
          <span className="lh-card-foot">
            {cs?.length ? (
              <PathProgress ids={cs.map((c) => c.id)} lang={lang} minutes={minutes(cs)} />
            ) : (
              <span className="lh-soon">{say("Being written", "লেখা চলছে")}</span>
            )}
            <span className="lh-go" aria-hidden="true">›</span>
          </span>
        </a>
      </li>
    );
  };

  const lessonList = (p: PathMeta, cta: { en: string; bn: string }) => {
    const cs = cards[p.key];
    return (
      <section id={p.anchor} className="lh-path" aria-labelledby={`${p.anchor}-h`}>
        <div className="lh-path-head">
          <span className="lh-card-top">
            <Level n={p.level} />
            {p.premium ? premiumTag : null}
          </span>
          <h2 id={`${p.anchor}-h`} className="lh-h2">
            {p.name[lang]}
          </h2>
          <p className="lh-path-out">{p.outcome[lang]}</p>
          {p.premium ? (
            <p className="lh-path-note">
              {say(
                "The start of every post is free to read. The full post comes with Premium.",
                "প্রতিটি লেখার শুরুটা সবাই পড়তে পারবেন। পুরো লেখা প্রিমিয়ামে।",
              )}
            </p>
          ) : null}
          <PathProgress ids={cs.map((c) => c.id)} lang={lang} minutes={minutes(cs)} />
        </div>
        <ol className="lh-lessons">
          {cs.map((c) => (
            <li key={c.id}>
              <Link href={c.href} className="lh-row">
                <DoneTick id={c.id} n={c.n} />
                <span className="lh-row-body">
                  <span className="lh-row-t">{c.title}</span>
                  <span className="lh-row-d">{c.summary}</span>
                </span>
                <span className="lh-row-m">
                  {p.premium ? (
                    <span className="lh-row-crown" aria-label="Premium">
                      <IconCrown size={13} />
                    </span>
                  ) : null}
                  {say(`${c.minutes} min`, `${c.minutes} মিনিট`)}
                </span>
              </Link>
            </li>
          ))}
        </ol>
        <Link href={cs[0].href} className="btn-primary lh-start">
          {cta[lang]}
        </Link>
      </section>
    );
  };

  const moreList = () => {
    const items = MORE_GUIDES[lang].map((s) => earlier(lang, s)).filter((x) => x !== null);
    if (items.length === 0) return null;
    return (
      <ul className="lh-earlier">
        {items.map((x) => (
          <li key={x.href}>
            <Link href={x.href}>
              <span className="lh-earlier-t">{x.title}</span>
              <span className="lh-earlier-m">{x.meta}</span>
            </Link>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className={`page-narrow lh${lang === "bn" ? " font-bn" : ""}`} lang={lang}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <PageHeader
        eyebrow={say("Learn", "শিখুন")}
        title={say("Learn the share market, step by step", "ধাপে ধাপে শেয়ার বাজার শিখুন")}
        lead={say(
          "Start with three steps to your first share. Then learn to invest with a plan, in plain words.",
          "প্রথম শেয়ার পর্যন্ত তিনটি ধাপ দিয়ে শুরু করুন। তারপর সহজ ভাষায় শিখুন পরিকল্পনা করে বিনিয়োগ।",
        )}
      />

      <ArticleLangNote
        articleLang={lang}
        pairHref={lang === "en" ? "/blog" : "/learn"}
        lead={lang === "en" ? "সব লেখা বাংলাতেও আছে।" : "Every post is also in English."}
        pairLabel={lang === "en" ? "বাংলায় পড়ুন" : "Read in English"}
      />

      <ContinueCard
        groups={[start, basics, advanced].map((p) => ({ name: p.name[lang], cards: cards[p.key] }))}
        lang={lang}
      />

      <section className="lh-paths" aria-labelledby="lh-where">
        <h2 id="lh-where" className="lh-h2">
          {say("Where are you now?", "আপনি এখন কোথায়?")}
        </h2>
        <ul className="lh-path-list">{PATHS.map(pathCard)}</ul>
      </section>

      {lessonList(start, { en: "Start with step 1", bn: "ধাপ 1 দিয়ে শুরু করুন" })}
      {lessonList(basics, { en: "Start with the first post", bn: "প্রথম লেখা দিয়ে শুরু করুন" })}

      {lessonList(advanced, { en: "Read the first post", bn: "প্রথম লেখা পড়ুন" })}
      {ADVANCED_PLANNED.length ? (
        <p className="lh-path-note lh-coming">
          {say("Coming next: ", "আসছে: ")}
          {ADVANCED_PLANNED.map((t) => t[lang]).join(" · ")}
        </p>
      ) : null}

      <section id="more" className="lh-path" aria-labelledby="more-h">
        <div className="lh-path-head">
          <h2 id="more-h" className="lh-h2">
            {say("More guides", "আরও গাইড")}
          </h2>
          <p className="lh-path-note">
            {say(
              "Short guides to look things up: dividends, IPOs, market rules and tax.",
              "দরকারের সময় দেখে নেওয়ার ছোট গাইড: ডিভিডেন্ড, আইপিও, বাজারের নিয়ম আর কর।",
            )}
          </p>
        </div>
        {moreList()}
      </section>

      <p className="lh-fine">
        {say(
          "These posts are for learning, not investment advice. Fees and rules change, so check today's figures with your broker.",
          "এই লেখাগুলো শেখার জন্য, বিনিয়োগের পরামর্শ নয়। ফি আর নিয়ম বদলায়, তাই বর্তমান হিসাব ব্রোকারের কাছে জেনে নিন।",
        )}
      </p>
    </div>
  );
}
