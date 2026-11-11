"use client";

import DashSectionNav from "@/components/home/personalized/DashSectionNav";
import { useLang } from "@/context/LangContext";

const ITEMS: { id: string; en: string; bn: string }[] = [
  { id: "smp-shares", en: "Shares", bn: "শেয়ার" },
  { id: "ch-answer", en: "Verdict", bn: "রায়" },
  { id: "ch-plan", en: "Plan", bn: "পরিকল্পনা" },
  { id: "pf-why", en: "Why", bn: "কেন" },
];

/** The sample page's chips: the portfolio page's three parts (2026-11-11),
 *  in the reader's language. */
export default function SampleNav() {
  const { lang, bn } = useLang();
  return <DashSectionNav items={ITEMS.map((i) => ({ id: i.id, label: bn ? i.bn : i.en }))} lang={lang} />;
}
