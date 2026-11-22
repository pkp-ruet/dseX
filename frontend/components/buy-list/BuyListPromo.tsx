"use client";

import { BuyRowOpen } from "@/components/buy-list/BuyListRows";
import { StockRank } from "@/components/ui/StockRow";
import { IconLock } from "@/components/ui/icons";
import { T } from "@/components/i18n/T";
import PremiumCard, { PremiumTicks } from "@/components/premium/PremiumCard";
import { BUY_LIST_ANCHOR, type BuyList } from "@/lib/buy-list";

const GETS = [
  { en: "Every share on the list, and why it's there", bn: "তালিকার প্রতিটি শেয়ার, আর কেন তালিকায় আছে" },
  { en: "The price to buy each under, or to wait for", bn: "প্রতিটি কোন দামের নিচে কেনার মতো, বা কত পর্যন্ত অপেক্ষা" },
  { en: "The strong companies close to joining, and an alert when one comes in", bn: "তালিকার কাছাকাছি শক্তিশালী কোম্পানি, আর কোনোটি এলে অ্যালার্ট" },
];

/** Locked rows shown before "+ N more". */
const LOCKED_SHOWN = 5;

/**
 * The Buy List's one Premium card, for a reader without Premium (redone
 * 2026-11-22): today's free share first, open and complete ("Free today ·
 * No. 5 of 9", a different one each day, `free_pick`), then the other shares
 * as locked rows that show our group and how far under our fair price, never
 * the name or the sector (a sector and a gap can give a name away: telecom
 * has three shares). Then what Premium shows, the price and one button.
 */
export default function BuyListPromo({ data }: { data: BuyList }) {
  const n = data.count;
  const example = data.items.find((i) => i.code === data.free_pick) ?? null;
  const locked = data.items.filter((i) => i !== example);
  const shown = locked.slice(0, LOCKED_SHOWN);
  const rest = locked.length - shown.length;
  const close = data.also.length + data.almost.length;

  return (
    <PremiumCard
      anchor={BUY_LIST_ANCHOR}
      area="buy-list"
      lock="buy-list"
      src="buy-list"
      track={{ count: n, variant: "v3" }}
      className="bl-promo"
      tag={{ en: "Buy List", bn: "কেনার তালিকা" }}
      title={
        n > 1 ? (
          <T en={`${n} shares made today's list`} bn={`আজকের তালিকায় ${n}টি শেয়ার`} />
        ) : n === 1 ? (
          <T en="One share made today's list" bn="আজকের তালিকায় একটি শেয়ার" />
        ) : (
          <T en="No share passes all five of our questions today." bn="আজ কোনো শেয়ার আমাদের পাঁচটি প্রশ্নে পাস করেনি।" />
        )
      }
      lead={
        n > 1 ? (
          <T
            en={`One opens free every day. Premium opens all ${n}: why each is here, and the price to buy it under.`}
            bn={`প্রতিদিন একটি ফ্রি খোলা থাকে। প্রিমিয়ামে ${n}টিই খোলা: প্রতিটি কেন তালিকায়, আর কোন দামের নিচে কেনার মতো।`}
          />
        ) : n === 1 ? (
          <T
            en="Premium opens it: why it is here, and the price to buy it under."
            bn="প্রিমিয়ামে এটি খোলা: কেন তালিকায়, আর কোন দামের নিচে কেনার মতো।"
          />
        ) : (
          <T
            en={`We check ${data.universe} companies after every close. When shares pass, Premium shows each one, why it is there and the price to buy it under.`}
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
      {example && (
        <>
          <p className="bl-ex-tag">
            <T
              en={`Free today · No. ${example.rank} of ${n} · a different share opens every day`}
              bn={`আজ ফ্রি · ${n}টির মধ্যে ${example.rank} নম্বর · প্রতিদিন আলাদা একটি শেয়ার খোলা থাকে`}
            />
          </p>
          <div className="bl-pr-free">
            <BuyRowOpen item={example} />
          </div>
        </>
      )}
      {shown.length > 0 && (
        <>
          <p className="sp-k bl-pr-k">
            {example ? (
              <T en={`The other ${locked.length}`} bn={`বাকি ${locked.length}টি`} />
            ) : (
              <T en="Today's list" bn="আজকের তালিকা" />
            )}
          </p>
          <ol className="bl-pr-list">
            {shown.map((i) => (
              <li key={i.rank} className="bl-mk">
                <StockRank n={i.rank} solid={i.rank <= 3} />
                <span className="bl-mk-id">
                  <span className="bl-mk-bar" style={{ width: `${45 + ((i.rank * 13) % 40)}%` }} aria-hidden="true" />
                  <span className="bl-mk-group">
                    <T en={i.group.en} bn={i.group.bn} />
                  </span>
                </span>
                <span className="bl-mk-gap nums">
                  {i.margin_pct != null && i.margin_pct >= 1 && (
                    <T en={`${i.margin_pct}% under`} bn={`${i.margin_pct}% কম`} />
                  )}
                  <span className="bl-mk-lock" aria-hidden="true">
                    <IconLock size={14} />
                  </span>
                </span>
                <span className="sr-only">
                  <T en="Company hidden, shown with Premium" bn="কোম্পানির নাম প্রিমিয়ামে দেখা যাবে" />
                </span>
              </li>
            ))}
          </ol>
          {(rest > 0 || close > 0) && (
            <p className="bl-pr-more">
              <T
                en={[rest > 0 ? `+ ${rest} more on the list` : "", close > 0 ? `${close} strong companies close to joining` : ""]
                  .filter(Boolean)
                  .join(" · ")}
                bn={[rest > 0 ? `তালিকায় আরও ${rest}টি` : "", close > 0 ? `আরও ${close}টি শক্তিশালী কোম্পানি তালিকার কাছাকাছি` : ""]
                  .filter(Boolean)
                  .join(" · ")}
              />
            </p>
          )}
        </>
      )}
      <PremiumTicks items={GETS} />
    </PremiumCard>
  );
}
