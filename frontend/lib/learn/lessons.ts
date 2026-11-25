import type { Lang, Lesson, PathKey } from "./types";
import { START_1 } from "./lessons/start-1";
import { START_2 } from "./lessons/start-2";
import { START_3 } from "./lessons/start-3";
import { BASICS_1 } from "./lessons/basics-1";
import { BASICS_2 } from "./lessons/basics-2";
import { BASICS_3 } from "./lessons/basics-3";
import { BASICS_4 } from "./lessons/basics-4";
import { BASICS_5 } from "./lessons/basics-5";
import { BASICS_6 } from "./lessons/basics-6";
import { BASICS_7 } from "./lessons/basics-7";
import { BASICS_8 } from "./lessons/basics-8";
import { BASICS_9 } from "./lessons/basics-9";
import { BASICS_10 } from "./lessons/basics-10";
import { ADV_1 } from "./lessons/adv-1";
import { ADV_2 } from "./lessons/adv-2";
import { ADV_3 } from "./lessons/adv-3";
import { ADV_4 } from "./lessons/adv-4";
import { ADV_5 } from "./lessons/adv-5";
import { ADV_6 } from "./lessons/adv-6";
import { ADV_7 } from "./lessons/adv-7";
import { ADV_8 } from "./lessons/adv-8";
import { ADV_9 } from "./lessons/adv-9";
import { ADV_10 } from "./lessons/adv-10";
import { ADV_11 } from "./lessons/adv-11";

/**
 * Every written lesson, in path order. Server-only in practice (the content is
 * large): client components get the slim `LessonCard` list from the pages.
 */
export const LESSONS: Lesson[] = [
  START_1, START_2, START_3,
  BASICS_1, BASICS_2, BASICS_3, BASICS_4, BASICS_5, BASICS_6, BASICS_7, BASICS_8, BASICS_9, BASICS_10,
  ADV_1, ADV_2, ADV_3, ADV_4, ADV_5, ADV_6, ADV_7, ADV_8, ADV_9, ADV_10, ADV_11,
];

export function lessonsIn(path: PathKey): Lesson[] {
  return LESSONS.filter((x) => x.path === path).sort((a, b) => a.n - b.n);
}

export function lessonBySlug(lang: Lang, slug: string): Lesson | undefined {
  return LESSONS.find((x) => x.slug[lang] === slug);
}

/** The lesson's address in a language. */
export function lessonHref(lesson: Pick<Lesson, "slug">, lang: Lang): string {
  return lang === "en" ? `/learn/${lesson.slug.en}` : `/blog/${lesson.slug.bn}`;
}

/** What the hub, the rail and the progress parts need about a lesson. */
export type LessonCard = {
  id: string;
  n: number;
  href: string;
  title: string;
  summary: string;
  minutes: number;
};

export function lessonCards(path: PathKey, lang: Lang): LessonCard[] {
  return lessonsIn(path).map((x) => ({
    id: x.id,
    n: x.n,
    href: lessonHref(x, lang),
    title: x.title[lang],
    summary: x.summary[lang],
    minutes: x.minutes,
  }));
}
