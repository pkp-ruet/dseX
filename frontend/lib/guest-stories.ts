import type { MarketIndexData, MarketMoversData, MarketStateData } from "@/lib/api";
import type { Lang } from "@/lib/lang";
import { buildStarterStories, type Story, type StoryFrame } from "@/lib/dash-stories";
import type { ExampleRow } from "@/lib/guest-home";

/**
 * The guest home's story rings (2026-11-23): the market stories a signed-in
 * reader with no shares already gets, without their "Start" ring, plus a
 * "Your shares" ring that plays what a reader's own stories look like — built
 * from today's real example rows — and ends with the sign-up ask.
 */
export function guestStories(i: {
  lang: Lang;
  when: "today" | "last";
  todayIso: string;
  market: MarketStateData | null;
  marketIndex: MarketIndexData | null;
  movers: MarketMoversData | null;
  examples: ExampleRow[];
}): Story[] {
  const { lang } = i;
  const L = (en: string, bn: string) => (lang === "bn" ? bn : en);
  const market = buildStarterStories({
    lang,
    when: i.when,
    todayIso: i.todayIso,
    mood: i.market?.mood ?? null,
    marketIndex: i.marketIndex,
    movers: i.movers,
    // The dividends story is a Premium-locked count for anyone without
    // Premium; the guest home's "Dividends this week" row says the free week.
    recordDates: [],
    premium: false,
  }).filter((s) => s.kind !== "ask");

  const frames: StoryFrame[] = i.examples.slice(0, 2).map((r) => ({
    id: `g:${r.key}:${i.todayIso}`,
    kind: r.tone === "watch" ? "dividend" : "results",
    label: L(`Example · ${r.kind.en}`, `উদাহরণ · ${r.kind.bn}`),
    headline: `${r.name} · ${r.code}`,
    sentence: L(r.text.en, r.text.bn),
    rows: [
      {
        label: L("On your own shares", "আপনার নিজের শেয়ারে"),
        value: L("the same evening", "সেদিন সন্ধ্যাতেই"),
      },
    ],
    cta: { label: L("See the share", "শেয়ারটি দেখুন"), href: r.href },
    tone: r.tone === "good" ? "positive" : r.tone === "bad" ? "negative" : "neutral",
  }));

  frames.push({
    id: "g:ask",
    kind: "ask",
    label: L("Stories on your shares", "আপনার শেয়ারের স্টোরি"),
    headline: L("Add your shares and this row becomes yours", "শেয়ার যোগ করুন, এই সারি আপনার হয়ে যাবে"),
    sentence: L(
      "Each share you own or follow gets its own ring: big moves, results, dividends, grade changes and warnings. A free account takes about 30 seconds.",
      "আপনার বা আপনার অনুসরণ করা প্রতিটি শেয়ারের আলাদা রিং থাকবে: বড় ওঠানামা, আর্থিক ফল, ডিভিডেন্ড, গ্রেড বদল আর সতর্কতা। ফ্রি অ্যাকাউন্ট খুলতে লাগে প্রায় 30 সেকেন্ড।",
    ),
    cta: { label: L("Create free account", "ফ্রি অ্যাকাউন্ট খুলুন"), href: "/register" },
    cta2: { label: L("Sign in", "সাইন ইন"), href: "/login" },
    tone: "neutral",
  });

  return [
    ...market,
    {
      id: "g:yours",
      kind: "ask",
      name: L("Your shares", "আপনার শেয়ার"),
      sub: L("What you would see", "আপনি যা দেখতেন"),
      icon: "plus",
      label: L("Your shares", "আপনার শেয়ার"),
      tone: "neutral",
      rank: 9,
      frames,
    },
  ];
}
