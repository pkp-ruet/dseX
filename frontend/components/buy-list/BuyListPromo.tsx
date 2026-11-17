"use client";

import { useEffect, useRef } from "react";
import Button from "@/components/ui/Button";
import { BuyRowOpen } from "@/components/buy-list/BuyListRows";
import { StockRank } from "@/components/ui/StockRow";
import { IconCheck, IconCrown, IconLock } from "@/components/ui/icons";
import { T } from "@/components/i18n/T";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/context/LangContext";
import { PREMIUM_PATH, usePremium } from "@/lib/premium";
import { FROM_MONTH, LOWEST_PRICE } from "@/lib/premium-plans";
import { savePremiumContext } from "@/lib/premium-context";
import { trackEvent } from "@/lib/track";
import { BUY_LIST_ANCHOR, type BuyList } from "@/lib/buy-list";

const GETS = [
  { en: "Every share on the list, and why it is there", bn: "তালিকার প্রতিটি শেয়ার, আর কেন তালিকায় আছে" },
  { en: "The price each is worth buying under, and its dates coming up", bn: "প্রতিটি কোন দামের নিচে কেনার মতো, আর এর সামনের তারিখ" },
  { en: "The strong companies that just missed, and what would bring them in", bn: "যে শক্তিশালী কোম্পানিগুলো অল্পের জন্য বাদ, আর কী হলে আসবে" },
];

/**
 * The Buy List's one Premium card, for a reader without Premium: today's
 * list in order, every row locked except ONE share open in its own place (a
 * different one each day, `free_pick`), what Premium shows, the price and one
 * button. The count is in the page's lead. Never a hidden share's name.
 */
export default function BuyListPromo({ data }: { data: BuyList }) {
  const { user } = useAuth();
  const { state } = usePremium();
  const { bn } = useLang();
  const ref = useRef<HTMLElement>(null);
  const seen = useRef(false);

  const n = data.count;
  const example = data.items.find((i) => i.code === data.free_pick) ?? null;
  const offer = user?.offer ?? null;
  const href = offer ? `/premium?plan=offer&src=buy-list#pay` : user ? `${PREMIUM_PATH}#pay` : PREMIUM_PATH;

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        if (seen.current || !entries.some((e) => e.isIntersecting)) return;
        seen.current = true;
        trackEvent("premium_lock_view", { area: "buy-list", lock: "buy-list", state, count: n });
        io.disconnect();
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [state, n]);

  const onTap = () => {
    trackEvent("premium_lock_tap", { area: "buy-list", lock: "buy-list", state, count: n });
    savePremiumContext({
      from: "buy-list",
      label: bn ? "কেনার তালিকা" : "Buy List",
      stakes: [bn ? `আজ ${n}টি শেয়ার সব প্রশ্নে পাস করেছে` : `${n} shares passed every question today`],
    });
  };

  return (
    <section ref={ref} id={BUY_LIST_ANCHOR} className="sp bl-promo" aria-labelledby="bl-promo-t">
      <div className="sp-top">
        <p className="sp-tag">
          <span className="sp-medal" aria-hidden="true">
            <IconCrown size={16} />
          </span>
          <T en="Premium · Buy List" bn="প্রিমিয়াম · কেনার তালিকা" />
        </p>
        <h2 id="bl-promo-t" className="sp-title">
          {n > 1 ? (
            <T en={`See all ${n} shares on today's list`} bn={`আজকের তালিকার ${n}টি শেয়ারই দেখুন`} />
          ) : n === 1 ? (
            <T en="Today's list has one share" bn="আজকের তালিকায় একটি শেয়ার আছে" />
          ) : (
            <T en="No share passes all six of our questions today." bn="আজ কোনো শেয়ার আমাদের ছয়টি প্রশ্নে পাস করেনি।" />
          )}
        </h2>
        <p className="sp-lead">
          {n > 0 ? (
            <T
              en="One share opens free every day. Premium opens them all: why each is on the list and the price it is worth buying under."
              bn="প্রতিদিন একটি শেয়ার ফ্রি খোলা থাকে। প্রিমিয়ামে সবগুলো খোলা: প্রতিটি কেন তালিকায় আছে, আর কোন দামের নিচে কেনার মতো।"
            />
          ) : (
            <T
              en={`We check ${data.universe} companies after every close. When shares pass, Premium shows each one, why it is there and the price it is worth buying under.`}
              bn={`প্রতিদিন বাজার বন্ধের পর আমরা ${data.universe}টি কোম্পানি যাচাই করি। কোনো শেয়ার পাস করলে প্রিমিয়ামে দেখবেন সেটি কোনটি, কেন তালিকায়, আর কোন দামের নিচে কেনার মতো।`}
            />
          )}
        </p>
      </div>

      <div className="sp-body">
        {n > 0 && (
          <>
            <p className="sp-k bl-pr-k">
              <T en="Today's list" bn="আজকের তালিকা" />
            </p>
            <ol className="bl-pr-list">
              {data.items.map((i) =>
                i === example ? (
                  <li key={i.code} className="bl-pr-free">
                    <span className="bl-ex-tag">
                      <T en="Free today · a different share opens every day" bn="আজ ফ্রি · প্রতিদিন আলাদা একটি শেয়ার খোলা থাকে" />
                    </span>
                    <BuyRowOpen item={i} />
                  </li>
                ) : (
                  <li key={i.rank} className="bl-mk">
                    <StockRank n={i.rank} solid={i.rank <= 3} />
                    <span className="bl-mk-bar" style={{ width: `${40 + ((i.rank * 13) % 40)}%` }} aria-hidden="true" />
                    <span className="bl-mk-lock" aria-hidden="true">
                      <IconLock size={16} />
                    </span>
                    <span className="sr-only">
                      <T en="Hidden with Premium" bn="প্রিমিয়ামে দেখা যাবে" />
                    </span>
                  </li>
                ),
              )}
            </ol>
          </>
        )}

        <p className="sp-k rr-gets-k">
          <T en="With Premium you see" bn="প্রিমিয়ামে দেখবেন" />
        </p>
        <ul className="rr-gets">
          {GETS.map((g) => (
            <li key={g.en}>
              <span className="rr-tick" aria-hidden="true">
                <IconCheck size={16} />
              </span>
              <span className="min-w-0">
                <T en={g.en} bn={g.bn} />
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="sp-foot">
        <div className="sp-price">
          {offer ? (
            <>
              <b>
                <T en={`Your first month: ৳${offer.amount}`} bn={`আপনার প্রথম মাস: ৳${offer.amount}`} />
              </b>
              <span>
                <T en={`Instead of ৳${offer.list_amount}, once.`} bn={`৳${offer.list_amount}-এর বদলে, একবারই।`} />
              </span>
            </>
          ) : (
            <>
              <b>
                <T en={`৳${LOWEST_PRICE} a month`} bn={`মাসে ৳${LOWEST_PRICE}`} />
              </b>
              <span>
                <T en={`About ৳${FROM_MONTH} a month on the yearly plan.`} bn={`বছরের প্ল্যানে মাসে প্রায় ৳${FROM_MONTH}।`} />
              </span>
            </>
          )}
        </div>
        <div className="sp-cta">
          <Button href={href} onClick={onTap} size="lg" block>
            {offer ? (
              <T en={`Get your first month for ৳${offer.amount}`} bn={`প্রথম মাস ৳${offer.amount}-এ নিন`} />
            ) : (
              <T en="See the whole list" bn="পুরো তালিকা দেখুন" />
            )}
          </Button>
        </div>
      </div>

      <p className="sp-fine">
        {state === "guest" ? (
          <T
            en="Create a free account, then pay by bKash, Nagad or bank transfer. Nothing renews by itself."
            bn="একটি ফ্রি অ্যাকাউন্ট খুলুন, তারপর bKash, Nagad বা ব্যাংক ট্রান্সফারে টাকা দিন। মেয়াদ শেষে নিজে থেকে নবায়ন হয় না।"
          />
        ) : (
          <T
            en="Pay by bKash, Nagad or bank transfer. Nothing renews by itself."
            bn="bKash, Nagad বা ব্যাংক ট্রান্সফারে টাকা দিতে পারবেন। মেয়াদ শেষে নিজে থেকে নবায়ন হয় না।"
          />
        )}
      </p>
    </section>
  );
}
