"use client";

import { BuyRowOpen } from "@/components/buy-list/BuyListRows";
import { StockRank } from "@/components/ui/StockRow";
import { IconLock } from "@/components/ui/icons";
import { T } from "@/components/i18n/T";
import PremiumCard, { PremiumTicks } from "@/components/premium/PremiumCard";
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
  const n = data.count;
  const example = data.items.find((i) => i.code === data.free_pick) ?? null;

  return (
    <PremiumCard
      anchor={BUY_LIST_ANCHOR}
      area="buy-list"
      lock="buy-list"
      src="buy-list"
      track={{ count: n }}
      className="bl-promo"
      tag={{ en: "Buy List", bn: "কেনার তালিকা" }}
      title={
        n > 1 ? (
          <T en={`See all ${n} shares on today's list`} bn={`আজকের তালিকার ${n}টি শেয়ারই দেখুন`} />
        ) : n === 1 ? (
          <T en="Today's list has one share" bn="আজকের তালিকায় একটি শেয়ার আছে" />
        ) : (
          <T en="No share passes all six of our questions today." bn="আজ কোনো শেয়ার আমাদের ছয়টি প্রশ্নে পাস করেনি।" />
        )
      }
      lead={
        n > 0 ? (
          <T
            en="One share opens free every day. Premium opens them all: why each is on the list and the price it is worth buying under."
            bn="প্রতিদিন একটি শেয়ার ফ্রি খোলা থাকে। প্রিমিয়ামে সবগুলো খোলা: প্রতিটি কেন তালিকায় আছে, আর কোন দামের নিচে কেনার মতো।"
          />
        ) : (
          <T
            en={`We check ${data.universe} companies after every close. When shares pass, Premium shows each one, why it is there and the price it is worth buying under.`}
            bn={`প্রতিদিন বাজার বন্ধের পর আমরা ${data.universe}টি কোম্পানি যাচাই করি। কোনো শেয়ার পাস করলে প্রিমিয়ামে দেখবেন সেটি কোনটি, কেন তালিকায়, আর কোন দামের নিচে কেনার মতো।`}
          />
        )
      }
      cta={{ en: "See the whole list", bn: "পুরো তালিকা দেখুন" }}
      context={{
        label: { en: "Buy List", bn: "কেনার তালিকা" },
        stakes: [{ en: `${n} shares passed every question today`, bn: `আজ ${n}টি শেয়ার সব প্রশ্নে পাস করেছে` }],
      }}
    >
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
      <PremiumTicks items={GETS} />
    </PremiumCard>
  );
}
