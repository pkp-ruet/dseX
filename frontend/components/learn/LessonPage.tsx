import Link from "@/components/ui/Link";
import ArticleLangNote from "@/components/i18n/ArticleLangNote";
import { bnDate } from "@/lib/bn";
import { formatDate } from "@/lib/formatters";
import { lessonCards, lessonHref } from "@/lib/learn/lessons";
import { pathMeta } from "@/lib/learn/paths";
import type { Lang, Lesson, PathKey } from "@/lib/learn/types";
import LessonBlocks from "./LessonBlocks";
import LessonGate from "./LessonGate";
import Rich from "./Rich";
import { DoneTick, MarkDone, NextLesson, PathProgress } from "./LearnProgress";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://www.topstockbd.com";

/** Sections in reading order. */
const PATH_ORDER: PathKey[] = ["start", "basics", "advanced"];

/** Hub address in a language (/learn in English, /blog in Bengali). */
export const hubHref = (lang: Lang) => (lang === "en" ? "/learn" : "/blog");

/**
 * One lesson (2026-11-25, the Learn rebuild). The same page at
 * `/learn/<en slug>` in English and `/blog/<bn slug>` in Bengali. From 1024px
 * the path's lessons sit in a sticky rail on the left; on phones the page is
 * the article alone, with the path in its eyebrow and the next lesson at the end.
 */
export default function LessonPage({ lesson, lang }: { lesson: Lesson; lang: Lang }) {
  const path = pathMeta(lesson.path);
  const cards = lessonCards(lesson.path, lang);
  const total = cards.length;
  const prev = cards.find((c) => c.n === lesson.n - 1);
  // The last post of a section leads into the next section's first post.
  const nextInPath = cards.find((c) => c.n === lesson.n + 1);
  const nextPath = PATH_ORDER[PATH_ORDER.indexOf(lesson.path) + 1];
  const nextSection = !nextInPath && nextPath ? lessonCards(nextPath, lang)[0] : undefined;
  const next = nextInPath ?? nextSection;
  const say = (en: string, bn: string) => (lang === "en" ? en : bn);
  const hub = hubHref(lang);
  const pathHref = `${hub}#${path.anchor}`;
  const minutes = cards.reduce((s, c) => s + c.minutes, 0);
  const checked = lang === "en" ? formatDate(lesson.checked) : bnDate(lesson.checked);
  const url = `${BASE_URL}${lessonHref(lesson, lang)}`;
  const title = lesson.title[lang];
  const premium = !!path.premium;
  const sectionEl = (sec: Lesson["sections"][number], i: number) => (
    <section key={i} id={`s${i + 1}`} className="lz-sec">
      <h2 className="lz-h2">{sec.heading[lang]}</h2>
      <LessonBlocks blocks={sec.blocks} lang={lang} />
    </section>
  );

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: lesson.seoTitle?.[lang] ?? title,
      description: lesson.summary[lang],
      url,
      inLanguage: lang,
      dateModified: lesson.checked,
      isPartOf: { "@type": "Course", name: `${path.name[lang]} · TopStockBD`, url: `${BASE_URL}${pathHref}` },
      publisher: { "@type": "Organization", name: "TopStockBD", url: BASE_URL },
      // Advanced posts: the first section is free, the rest is Premium.
      ...(premium
        ? { isAccessibleForFree: false, hasPart: { "@type": "WebPageElement", isAccessibleForFree: false, cssSelector: ".premium-locked" } }
        : {}),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
        { "@type": "ListItem", position: 2, name: say("Learn", "শিখুন"), item: `${BASE_URL}${hub}` },
        { "@type": "ListItem", position: 3, name: path.name[lang], item: `${BASE_URL}${pathHref}` },
        { "@type": "ListItem", position: 4, name: title, item: url },
      ],
    },
    ...(lesson.faqs?.length
      ? [
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: lesson.faqs.map((f) => ({
              "@type": "Question",
              name: f.q[lang],
              acceptedAnswer: { "@type": "Answer", text: f.a[lang].replace(/\*\*|\[|\]\([^)]*\)/g, "") },
            })),
          },
        ]
      : []),
  ];

  const extras = (
    <>
          <section className="lz-keys" aria-labelledby="lz-keys-h">
            <h2 id="lz-keys-h" className="lz-keys-k">
              {say("Key points", "মূল কথা")}
            </h2>
            <ul>
              {lesson.keyPoints.map((k, i) => (
                <li key={i}>{k[lang]}</li>
              ))}
            </ul>
          </section>

          {lesson.words?.length ? (
            <section className="lz-words" aria-labelledby="lz-words-h">
              <h2 id="lz-words-h" className="lz-h3">
                {say("Words in this post", "এই লেখার শব্দ")}
              </h2>
              <dl>
                {lesson.words.map((w, i) => (
                  <div key={i} className="lz-word">
                    <dt>{w.term[lang]}</dt>
                    <dd>{w.meaning[lang]}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}

          {lesson.tryIt ? (
            <aside className="lz-try">
              <p className="lz-try-k">{say("Try it on TopStockBD", "TopStockBD-তে দেখুন")}</p>
              <p className="lz-try-t">{lesson.tryIt.text[lang]}</p>
              <Link href={lesson.tryIt.href} className="btn-quiet">
                {lesson.tryIt.label[lang]}
              </Link>
            </aside>
          ) : null}
    </>
  );

  const other: Lang = lang === "en" ? "bn" : "en";

  return (
    <div className={`lz${lang === "bn" ? " font-bn" : ""}`} lang={lang}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* The path, from 1024px. */}
      <aside className="lz-rail" aria-label={path.name[lang]}>
        <Link href={pathHref} className="lz-rail-back">
          ‹ {say("Learn", "শিখুন")}
        </Link>
        <p className="lz-rail-name">{path.name[lang]}</p>
        <PathProgress ids={cards.map((c) => c.id)} lang={lang} minutes={minutes} />
        <ol className="lz-rail-list">
          {cards.map((c) => (
            <li key={c.id}>
              <Link href={c.href} className={`lz-rail-row${c.n === lesson.n ? " is-here" : ""}`} aria-current={c.n === lesson.n ? "page" : undefined}>
                <DoneTick id={c.id} n={c.n} current={c.n === lesson.n} />
                <span className="lz-rail-t">{c.title}</span>
              </Link>
            </li>
          ))}
        </ol>
      </aside>

      <article className="lz-main">
        <header className="lz-head">
          <nav aria-label={say("Breadcrumb", "অবস্থান")} className="lz-crumb">
            <Link href={hub}>{say("Learn", "শিখুন")}</Link>
            <span aria-hidden="true">/</span>
            <Link href={pathHref}>{path.name[lang]}</Link>
          </nav>
          <p className="lz-eye">
            <span className="lz-level" aria-hidden="true">
              {[1, 2, 3].map((i) => (
                <i key={i} className={i <= path.level ? "on" : undefined} />
              ))}
            </span>
            {lesson.path === "start"
              ? say(`${path.name.en} · Step ${lesson.n} of ${total}`, `${path.name.bn} · ধাপ ${lesson.n} / ${total}`)
              : say(`${path.name.en} · ${lesson.n} of ${total}`, `${path.name.bn} · ${lesson.n} / ${total}`)}
          </p>
          <h1 className="lz-h1">{title}</h1>
          <p className="lz-dek">{lesson.summary[lang]}</p>
          <p className="lz-meta">
            <span>{say(`${lesson.minutes} min read`, `${lesson.minutes} মিনিটে পড়া`)}</span>
            <span>{say(`Checked ${checked}`, `যাচাই: ${checked}`)}</span>
          </p>
        </header>

        <ArticleLangNote articleLang={lang} pairHref={lessonHref(lesson, other)} />

        <div className="lz-learn">
          <p className="lz-learn-k">{say("In this post", "এই লেখায়")}</p>
          <ul>
            {lesson.outcomes.map((o, i) => (
              <li key={i}>{o[lang]}</li>
            ))}
          </ul>
        </div>

        <div className="lz-body">
          {(premium ? lesson.sections.slice(0, 1) : lesson.sections).map(sectionEl)}
        </div>

        {premium ? (
          <LessonGate title={lesson.title} parts={lesson.sections.slice(1).map((x) => x.heading)}>
            <div className="lz-gated">
              <div className="lz-body">{lesson.sections.slice(1).map((x, i) => sectionEl(x, i + 1))}</div>
              {extras}
            </div>
          </LessonGate>
        ) : (
          extras
        )}

        {lesson.faqs?.length ? (
          <section className="lz-faq" aria-labelledby="lz-faq-h">
            <h2 id="lz-faq-h" className="lz-h3">
              {say("Questions people ask", "যে প্রশ্নগুলো সবাই করেন")}
            </h2>
            {lesson.faqs.map((f, i) => (
              <details key={i} className="lz-faq-row">
                <summary>{f.q[lang]}</summary>
                <p>
                  <Rich text={f.a[lang]} />
                </p>
              </details>
            ))}
          </section>
        ) : null}

        <div className="lz-end">
          <MarkDone id={lesson.id} lang={lang} />
          {next ? (
            <NextLesson
              id={lesson.id}
              next={next}
              lang={lang}
              label={
                nextSection && nextPath
                  ? say(`Next section · ${pathMeta(nextPath).name.en}`, `পরের অংশ · ${pathMeta(nextPath).name.bn}`)
                  : undefined
              }
            />
          ) : (
            <Link href={hub} className="ln-next">
              <span className="ln-next-k">{say(`End of ${path.name.en}`, `${path.name.bn} শেষ`)}</span>
              <span className="ln-next-t">{say("Back to Learn", "শিখুন পেজে ফিরুন")}</span>
              <span className="ln-next-d">
                {say(
                  "You have read every post here. Use what you learned on any share's page.",
                  "এখানকার সব লেখা পড়া হলো। যা শিখলেন, যেকোনো শেয়ারের পেজে কাজে লাগান।",
                )}
              </span>
            </Link>
          )}
          {prev ? (
            <Link href={prev.href} className="lz-prev">
              ‹ {say(`Back: ${prev.title}`, `আগের লেখা: ${prev.title}`)}
            </Link>
          ) : null}
        </div>

        <p className="lz-fine">
          {say(
            `We checked the facts in this post on ${checked}. Fees and rules change, so your broker has today's figures. This is general learning, not investment advice.`,
            `এই লেখার তথ্য আমরা যাচাই করেছি ${checked}। ফি আর নিয়ম বদলায়, তাই বর্তমান হিসাব আপনার ব্রোকারের কাছে জেনে নিন। এটি সাধারণ শিক্ষার জন্য, বিনিয়োগের পরামর্শ নয়।`,
          )}
        </p>
      </article>
    </div>
  );
}
