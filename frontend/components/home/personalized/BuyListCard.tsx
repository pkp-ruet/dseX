import Link from "next/link";
import type { Lang } from "@/context/LangContext";
import FindCard from "@/components/home/personalized/FindCard";
import OwnerMark from "@/components/home/personalized/OwnerMark";
import { T } from "@/components/i18n/T";
import { IconCheckCircle, IconChevron, IconLock } from "@/components/ui/icons";
import { PRICE_WORDS } from "@/lib/constants";
import { changePct, changeTone, companyShort, money } from "@/lib/formatters";
import { BUY_LIST_ANCHOR, BUY_LIST_PATH, type BuyListHome, type BuyListHomeItem } from "@/lib/buy-list";

function Row({
  item,
  held,
  watched,
  lang,
  free = false,
}: {
  item: BuyListHomeItem;
  held: Set<string>;
  watched: Set<string>;
  lang: Lang;
  free?: boolean;
}) {
  const pw = PRICE_WORDS[item.price_word];
  return (
    <li>
      <Link prefetch={false} href={`${BUY_LIST_PATH}#bl-${item.code}`} className="fbl-row">
        <span className={`rk-pos rk-pos--sm${item.rank <= 3 ? ` rk-pos--${item.rank}` : ""} fbl-pos`}>
          <span className="sr-only">
            <T en="Rank" bn="র‍্যাঙ্ক" />{" "}
          </span>
          {item.rank}
        </span>
        <span className="fbl-co">
          <span className="fbl-name">
            {companyShort(item.name) || item.code}
            {free && (
              <span className="fbl-free">
                <T en="Free today" bn="আজ ফ্রি" />
              </span>
            )}
            {!free && item.new && (
              <span className="bl-new">
                <T en="New" bn="নতুন" />
              </span>
            )}
          </span>
          <span className="fbl-code">
            {item.code}
            <OwnerMark code={item.code} held={held} watched={watched} lang={lang} />
          </span>
        </span>
        <span className="fbl-price">
          <span className="fbl-price-now">{money(item.price)}</span>
          {item.change_pct != null && (
            <span className={`fbl-price-chg ${changeTone(item.change_pct)}`}>{changePct(item.change_pct)}</span>
          )}
        </span>
        <span className="fbl-go" aria-hidden="true">
          <IconChevron size={16} />
        </span>
        <span className="fbl-tags">
          {item.margin_pct != null && (
            <span className="bl-gap nums">
              <T en={`${item.margin_pct}% under our fair price`} bn={`ন্যায্য দামের চেয়ে ${item.margin_pct}% কম`} />
            </span>
          )}
          <span className="bl-chip">
            <T en={item.group.en} bn={item.group.bn} />
          </span>
          <span className="bl-chip">
            <T en={pw.en} bn={pw.bn} />
          </span>
        </span>
        {free && (
          <span className="fbl-why">
            <T en={item.why.en} bn={item.why.bn} />
          </span>
        )}
      </Link>
    </li>
  );
}

/**
 * "Buy List" on the dashboard (2026-11-08, user: "build a featured card like
 * others in homepage, after market today"): the Find stocks cards' shape
 * (`FindCard`, gold = Premium) right under the market card. A Premium reader
 * sees today's top three — rank, company, price, how far under our fair
 * price, the group and price word — each opening its case on /buy-list. A
 * free reader sees the page's free example of the day open (its one-line
 * reason too) and the other places as numbered locked rows, never a name.
 * Data: `/api/user/home` `buy_list`; nothing renders without it.
 */
export default function BuyListCard({
  data,
  premium,
  held,
  watched,
  lang = "en",
}: {
  data: BuyListHome | null | undefined;
  premium: boolean;
  held: Set<string>;
  watched: Set<string>;
  lang?: Lang;
}) {
  if (!data) return null;
  const { count, universe } = data;
  const week = data.week_joined;
  const free = data.free_pick;
  // A free reader's locked rows: the top places other than the free example.
  const lockedRanks = Array.from({ length: Math.min(count, 3) }, (_, i) => i + 1).filter((r) => r !== free?.rank);

  const lead =
    count === 0 ? (
      <T
        en="No share passes all six of our questions today. We never lower the bar to fill the list."
        bn="আজ কোনো শেয়ার আমাদের ছয়টি প্রশ্নে পাস করেনি। তালিকা ভরাতে আমরা কখনো মান নামাই না।"
      />
    ) : (
      <T
        en={`${count} of ${universe} companies pass all six of our questions today: strong, well under what we think they are worth, nothing seriously wrong. The same list for every reader.${week > 0 ? ` ${week} joined this week.` : ""}`}
        bn={`আজ ${universe}টির মধ্যে ${count}টি কোম্পানি আমাদের ছয়টি প্রশ্নেই পাস করেছে: শক্তিশালী, ন্যায্য দামের চেয়ে বেশ কম দামে, আর গুরুতর কোনো সমস্যা নেই। সব পাঠকের জন্য একই তালিকা।${week > 0 ? ` এই সপ্তাহে নতুন এসেছে ${week}টি।` : ""}`}
      />
    );

  return (
    <FindCard
      id="fc-buylist"
      tone="gold"
      icon={<IconCheckCircle size={14} />}
      eyebrow={<T en="Buy List" bn="কেনার তালিকা" />}
      tag={<T en="Premium" bn="প্রিমিয়াম" />}
      title={<T en="Today's Buy List" bn="আজকের কেনার তালিকা" />}
      lead={lead}
      href={premium || count === 0 ? BUY_LIST_PATH : `${BUY_LIST_PATH}#${BUY_LIST_ANCHOR}`}
      allLabel={<T en="Full list" bn="পুরো তালিকা" />}
      footLabel={
        count === 0 ? (
          <T en="See the companies that came closest" bn="যারা সবচেয়ে কাছে এসেছিল, দেখুন" />
        ) : premium ? (
          <T en={`See all ${count} and why each is on the list`} bn={`সব ${count}টি আর কেন তালিকায়, দেখুন`} />
        ) : (
          <T en={`See all ${count} with Premium`} bn={`প্রিমিয়ামে সব ${count}টি দেখুন`} />
        )
      }
    >
      {count > 0 &&
        (premium ? (
          <ol className="fbl-list">
            {data.top.map((it) => (
              <Row key={it.code} item={it} held={held} watched={watched} lang={lang} />
            ))}
          </ol>
        ) : (
          <>
            <ol className="fbl-list">
              {[...lockedRanks, ...(free ? [free.rank] : [])]
                .sort((a, b) => a - b)
                .map((r) =>
                  free && r === free.rank ? (
                    <Row key={`free-${r}`} item={free} held={held} watched={watched} lang={lang} free />
                  ) : (
                    <li key={r} className="fbl-locked">
                      <span className={`rk-pos rk-pos--sm${r <= 3 ? ` rk-pos--${r}` : ""}`}>{r}</span>
                      <span className="fbl-bar" style={{ width: `${44 + ((r * 17) % 30)}%` }} aria-hidden="true" />
                      <span className="fbl-lock" aria-hidden="true">
                        <IconLock size={16} />
                      </span>
                      <span className="sr-only">
                        <T en="Hidden with Premium" bn="প্রিমিয়ামে দেখা যাবে" />
                      </span>
                    </li>
                  ),
                )}
            </ol>
            <p className="fbl-note">
              <T
                en={`The other ${count - (free ? 1 : 0)} shares, the price each is worth buying under and the dates coming up are Premium.`}
                bn={`বাকি ${count - (free ? 1 : 0)}টি শেয়ার, প্রতিটি কোন দামের নিচে কেনার মতো আর সামনের তারিখ প্রিমিয়ামে।`}
              />
            </p>
          </>
        ))}
    </FindCard>
  );
}
