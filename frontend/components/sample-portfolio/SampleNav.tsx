"use client";

import DashSectionNav from "@/components/home/personalized/DashSectionNav";
import { useLang } from "@/context/LangContext";

const ITEMS: { id: string; en: string; bn: string }[] = [
  { id: "smp-shares", en: "Shares", bn: "শেয়ার" },
  { id: "ch-answer", en: "Answer", bn: "উত্তর" },
  { id: "ch-companies", en: "Companies", bn: "কোম্পানি" },
  { id: "ch-spread", en: "Spread", bn: "বণ্টন" },
  { id: "ch-prices", en: "Prices", bn: "দাম" },
  { id: "ch-watch", en: "Watch", bn: "নজর" },
  { id: "ch-plan", en: "Plan", bn: "পরিকল্পনা" },
];

/** The sample page's chapter chips: the portfolio page's, in the reader's language. */
export default function SampleNav() {
  const { lang, bn } = useLang();
  return <DashSectionNav items={ITEMS.map((i) => ({ id: i.id, label: bn ? i.bn : i.en }))} lang={lang} />;
}
