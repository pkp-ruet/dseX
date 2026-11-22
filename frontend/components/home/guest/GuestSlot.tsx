"use client";

import Button from "@/components/ui/Button";
import { Carousel, type Slide } from "@/components/home/personalized/SlotCarousel";
import { IconAlert, IconBell, IconCheck, IconCrown, IconStar } from "@/components/ui/icons";
import type { Lang } from "@/context/LangContext";
import type { ShowcasePick } from "@/lib/guest-home";
import type { SampleView } from "@/lib/landing-portfolio";
import { trackEvent } from "@/lib/track";
import { freeN } from "@/lib/premium-line";

const ANALYSES = freeN("analysis") ?? 10;

/**
 * Block 5 for a guest: the signed-in offer slot (same card, same swipe), with
 * three slides that show the personal and Premium layer on examples — the
 * portfolio check on the sample portfolio, the free first week of updates, and
 * one company whose full analysis is open to everyone. No price, no offer.
 * Rendered once per language (the carousel takes `lang`).
 */
export default function GuestSlot({
  lang,
  sample,
  showcase,
}: {
  lang: Lang;
  sample: SampleView | null;
  showcase: ShowcasePick | null;
}) {
  const bn = lang === "bn";
  const L = (en: string, bn2: string) => (bn ? bn2 : en);
  const eyebrow = (icon: React.ReactNode, text: string) => (
    <p className="hm-sl-eye">
      {icon}
      {text}
    </p>
  );

  const slides: Slide[] = [];

  if (sample) {
    slides.push({
      id: "guest-portfolio",
      tone: "gold",
      onSeen: () => trackEvent("guest_slide_view", { slide: "portfolio" }),
      node: (
        <>
          {eyebrow(<IconCrown size={14} />, L("Your portfolio, checked every day", "প্রতিদিন আপনার পোর্টফোলিও যাচাই"))}
          <h3 className="hm-sl-title">
            {L("Add your shares and we check them after every close", "শেয়ার যোগ করুন, প্রতিদিন বাজার বন্ধের পর আমরা যাচাই করব")}
          </h3>
          <p className="hm-sl-body">
            {L(
              `Example: a sample of ${sample.companies} shares gets grade ${sample.grade}, “${sample.gradeLabel}”.`,
              `উদাহরণ: ${sample.companies}টি শেয়ারের একটি নমুনা পোর্টফোলিও পেয়েছে গ্রেড ${sample.grade}, “${sample.gradeLabelBn}”।`,
            )}
          </p>
          {(sample.good || sample.watch) && (
            <ul className="hm-sl-list">
              {sample.good && (
                <li>
                  <IconCheck size={16} />
                  <span>{L(sample.good.en, sample.good.bn)}</span>
                </li>
              )}
              {sample.watch && (
                <li>
                  <IconAlert size={16} />
                  <span>{L(sample.watch.en, sample.watch.bn)}</span>
                </li>
              )}
            </ul>
          )}
          <div className="hm-sl-acts">
            <Button href="/sample-portfolio/diversified" onClick={() => trackEvent("guest_slide_tap", { slide: "portfolio" })}>
              {L("See the sample check", "নমুনা যাচাই দেখুন")}
            </Button>
            <Button href="/register" variant="quiet">
              {L("Add your shares", "শেয়ার যোগ করুন")}
            </Button>
          </div>
        </>
      ),
    });
  }

  slides.push({
    id: "guest-week",
    tone: "clay",
    onSeen: () => trackEvent("guest_slide_view", { slide: "week" }),
    node: (
      <>
        {eyebrow(<IconBell size={14} />, L("Your first week", "আপনার প্রথম সপ্তাহ"))}
        <h3 className="hm-sl-title">
          {L("Add one share and get 7 days of every update, free", "একটি শেয়ার যোগ করুন, 7 দিন সব আপডেট ফ্রি পান")}
        </h3>
        <ul className="hm-sl-list">
          <li>
            <IconCheck size={16} />
            <span>{L("Results, the evening they are posted", "আর্থিক ফল, প্রকাশের দিন সন্ধ্যাতেই")}</span>
          </li>
          <li>
            <IconCheck size={16} />
            <span>{L("The last day to buy before a dividend", "ডিভিডেন্ডের আগে কেনার শেষ দিন")}</span>
          </li>
          <li>
            <IconCheck size={16} />
            <span>{L("Grade changes and warnings on your shares", "আপনার শেয়ারের গ্রেড বদল আর সতর্কতা")}</span>
          </li>
        </ul>
        <div className="hm-sl-acts">
          <Button href="/register" onClick={() => trackEvent("guest_slide_tap", { slide: "week" })}>
            {L("Create free account", "ফ্রি অ্যাকাউন্ট খুলুন")}
          </Button>
        </div>
      </>
    ),
  });

  if (showcase) {
    slides.push({
      id: "guest-showcase",
      tone: "plain",
      onSeen: () => trackEvent("guest_slide_view", { slide: "showcase" }),
      node: (
        <>
          {eyebrow(<IconStar size={14} />, L("Free for everyone", "সবার জন্য ফ্রি"))}
          <h3 className="hm-sl-title">
            {L(`Read our full analysis of ${showcase.name}`, `${showcase.name}-এর পুরো বিশ্লেষণ পড়ুন`)}
          </h3>
          <p className="hm-sl-body">
            {L(
              `We grade ${showcase.name} “${showcase.group.en}”. See why, part by part: profit, finances, business, dividend, price and safety.`,
              `${showcase.name}-কে আমরা “${showcase.group.bn}” বলি। কেন, তা অংশ ধরে দেখুন: মুনাফা, আর্থিক অবস্থা, ব্যবসা, ডিভিডেন্ড, দাম আর নিরাপত্তা।`,
            )}
          </p>
          <p className="hm-sl-small">
            {L(
              `With a free account you read ${ANALYSES} full analyses a month, on any share you choose.`,
              `ফ্রি অ্যাকাউন্টে মাসে ${ANALYSES}টি পুরো বিশ্লেষণ পড়তে পারবেন, যেকোনো শেয়ারের।`,
            )}
          </p>
          <div className="hm-sl-acts">
            <Button
              href={`/stock/${encodeURIComponent(showcase.code)}#ch-analysis`}
              onClick={() => trackEvent("guest_slide_tap", { slide: "showcase" })}
            >
              {L(`Open the ${showcase.code} analysis`, `${showcase.code}-এর বিশ্লেষণ খুলুন`)}
            </Button>
          </div>
        </>
      ),
    });
  }

  return <Carousel slides={slides} lang={lang} />;
}
