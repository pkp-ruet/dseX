"use client";

import { useEffect, useRef } from "react";
import type { ForYou } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/context/LangContext";
import { PREMIUM_PATH } from "@/lib/premium";
import { FROM_MONTH, LOWEST_PRICE } from "@/lib/premium-plans";
import { savePremiumContext } from "@/lib/premium-context";
import { trackEvent } from "@/lib/track";
import { T } from "@/components/i18n/T";
import Button from "@/components/ui/Button";
import { IconCheck, IconCrown } from "@/components/ui/icons";

/** Anchor of the card: a free reader's locked rows point here. */
export const FOR_YOU_PREMIUM_ANCHOR = "fu-premium";

/**
 * The one Premium card on "Based on your shares", for a free reader (2026-11-18,
 * user: "we will tell users we picked this number of stocks for him and the
 * reason. the premium will tell the full list and reason"). The count and
 * the shares they came from are free above it; this card says what Premium
 * names. Never a company name.
 */
export default function ForYouPremium({ data }: { data: ForYou }) {
  const { user } = useAuth();
  const { lang } = useLang();
  const ref = useRef<HTMLElement>(null);
  const seen = useRef(false);
  const n = data.counts?.total ?? data.items.length;
  const shares = (data.groups ?? []).filter((g) => g.anchor).length;
  const offer = user?.offer ?? null;
  const href = offer ? "/premium?plan=offer&src=for-you#pay" : `${PREMIUM_PATH}?src=for-you#pay`;

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        if (seen.current || !entries.some((e) => e.isIntersecting)) return;
        seen.current = true;
        trackEvent("premium_lock_view", { area: "for-you", lock: "for-you", stakes: n });
        io.disconnect();
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [n]);

  const onTap = () => {
    trackEvent("premium_lock_tap", { area: "for-you", lock: "for-you", stakes: n });
    const bn = lang === "bn";
    savePremiumContext({
      from: "for-you",
      label: bn ? "আপনার শেয়ার দেখে বাছাই" : "Based on your shares",
      stakes: [bn ? `আপনার শেয়ার দেখে ${n}টি কোম্পানি বাছাই করা` : `${n} companies picked from your shares`],
    });
  };

  const ticks = [
    {
      en: "Every company's name and price, under the share of yours it came from",
      bn: "প্রতিটি কোম্পানির নাম আর দাম, আপনার যে শেয়ার থেকে এসেছে তার নিচে",
    },
    { en: "Why it fits you, in words about your own share", bn: "কেন আপনার সাথে মেলে, আপনার নিজের শেয়ারের কথায়" },
    { en: "What it shares with your share, and what is stronger", bn: "আপনার শেয়ারের সাথে কী মিল, আর কোথায় বেশি শক্তিশালী" },
    { en: "New companies after every close, marked New", bn: "প্রতিদিন বাজার বন্ধের পর নতুন কোম্পানি, “নতুন” চিহ্নসহ" },
  ];

  return (
    <section ref={ref} id={FOR_YOU_PREMIUM_ANCHOR} className="fu-promo" aria-labelledby="fu-promo-t">
      <div className="fu-promo-top">
        <p className="fu-promo-tag">
          <IconCrown size={15} />
          <T en="Premium" bn="প্রিমিয়াম" />
        </p>
        <h2 id="fu-promo-t" className="fu-promo-h">
          <T
            en={`See the ${n} ${n === 1 ? "company" : "companies"}, and why each one fits you`}
            bn={`${n}টি কোম্পানি দেখুন, আর কেন প্রতিটি আপনার সাথে মেলে`}
          />
        </h2>
        <p className="fu-promo-l">
          <T
            en={
              shares > 0
                ? `We found them from ${shares} of your own shares. Premium names them, so you can read about them and follow the ones you like.`
                : "We found them from your own money. Premium names them, so you can read about them and follow the ones you like."
            }
            bn={
              shares > 0
                ? `আপনার নিজের ${shares}টি শেয়ার দেখে এগুলো পেয়েছি। প্রিমিয়ামে নামগুলো দেখবেন, পড়ে দেখতে আর ভালো লাগলে ফলো করতে পারবেন।`
                : "আপনার নিজের টাকার হিসাব দেখে এগুলো পেয়েছি। প্রিমিয়ামে নামগুলো দেখবেন, পড়ে দেখতে আর ভালো লাগলে ফলো করতে পারবেন।"
            }
          />
        </p>
      </div>
      <ul className="fu-promo-ticks">
        {ticks.map((t) => (
          <li key={t.en}>
            <span className="fu-promo-tick" aria-hidden="true">
              <IconCheck size={14} />
            </span>
            <T en={t.en} bn={t.bn} />
          </li>
        ))}
      </ul>
      <div className="fu-promo-foot">
        <Button href={href} onClick={onTap} size="lg" block>
          {offer ? (
            <T en={`See them for ৳${offer.amount}`} bn={`৳${offer.amount}-এ দেখুন`} />
          ) : (
            <T en={`See my ${n} companies`} bn={`আমার ${n}টি কোম্পানি দেখুন`} />
          )}
        </Button>
        <p className="fu-promo-fine">
          {offer ? (
            <T
              en={`Your first month ৳${offer.amount} instead of ৳${offer.list_amount}, once. bKash, Nagad or bank. Nothing renews by itself.`}
              bn={`আপনার প্রথম মাস ৳${offer.list_amount}-এর বদলে ৳${offer.amount}, একবারই। bKash, Nagad বা ব্যাংক। নিজে থেকে নবায়ন হয় না।`}
            />
          ) : (
            <T
              en={`From ৳${FROM_MONTH} a month (৳${LOWEST_PRICE} for one month). bKash, Nagad or bank. Nothing renews by itself.`}
              bn={`মাসে ৳${FROM_MONTH} থেকে (এক মাস ৳${LOWEST_PRICE})। bKash, Nagad বা ব্যাংক। নিজে থেকে নবায়ন হয় না।`}
            />
          )}
        </p>
      </div>
    </section>
  );
}
