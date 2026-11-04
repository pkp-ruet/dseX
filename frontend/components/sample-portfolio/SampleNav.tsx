"use client";

import DashSectionNav from "@/components/home/personalized/DashSectionNav";
import { useLang } from "@/context/LangContext";

const ITEMS: { id: string; en: string; bn: string }[] = [
  { id: "smp-shares", en: "Shares", bn: "শেয়ার" },
  { id: "ch-answer", en: "Answer", bn: "উত্তর" },
  { id: "ch-companies", en: "Companies", bn: "কোম্পানি" },
  { id: "ch-spread", en: "Spread", bn: "বণ্টন" },
  { id: "ch-prices", en: "Prices", bn: "দাম" },
  { id: "ch-loss", en: "Losses", bn: "লোকসান" },
  { id: "ch-watch", en: "Watch", bn: "নজর" },
  { id: "ch-plan", en: "Plan", bn: "পরিকল্পনা" },
];

/** The sample page's chapter chips: the portfolio page's, in the reader's
 *  language. `loss` = the sample has shares below what it paid. */
export default function SampleNav({ loss = false }: { loss?: boolean }) {
  const { lang, bn } = useLang();
  const items = ITEMS.filter((i) => loss || i.id !== "ch-loss");
  return <DashSectionNav items={items.map((i) => ({ id: i.id, label: bn ? i.bn : i.en }))} lang={lang} />;
}
