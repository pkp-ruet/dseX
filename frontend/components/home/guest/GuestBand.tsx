import Link from "@/components/ui/Link";
import { T } from "@/components/i18n/T";
import { IconChevronRight } from "@/components/ui/icons";
import { GuestAsk, GuestSearch } from "@/components/home/guest/GuestAsk";
import { EXAMPLE_TAG, type GuestMoney } from "@/lib/guest-home";
import { takaGroup } from "@/lib/formatters";

function signedTaka(v: number): string {
  return `${v >= 0 ? "+" : "−"}৳${takaGroup(Math.abs(Math.round(v)))}`;
}

/**
 * Block 1 for a guest: the signed-in band (same warm card, same place), with
 * the greeting turned into what TopStockBD is, the ask, and — where a reader
 * sees their portfolio button — the sample portfolio at today's prices,
 * tagged as an example. The h1 here is the page's h1 for search.
 */
export default function GuestBand({ money, when }: { money: GuestMoney | null; when: "today" | "last" }) {
  return (
    <div className="hm-band hm-band--guest" data-card="guest-band">
      <div className="hm-g-band">
        <div className="min-w-0">
          <p className="hm-date">
            <T
              en="For anyone who buys shares on the Dhaka Stock Exchange"
              bn="ঢাকা স্টক এক্সচেঞ্জে যাঁরা শেয়ার কেনেন, তাঁদের জন্য"
            />
          </p>
          <h1 className="hm-g-h1">
            <T en="Every DSE company, checked. Your shares, watched." bn="ডিএসই-র প্রতিটি কোম্পানি যাচাই করা। আপনার শেয়ারে নজর রাখা।" />
          </h1>
          <p className="hm-g-line">
            <T
              en="After every trading day we read the accounts of every DSE company and tell you, in plain Bangla or English, how strong each one is. Add your shares and we tell you when something happens to them."
              bn="প্রতিদিন বাজার বন্ধের পর আমরা ডিএসই-র প্রতিটি কোম্পানির হিসাব পড়ি, আর সহজ বাংলা বা ইংরেজিতে জানাই কোনটি কতটা শক্তিশালী। আপনার শেয়ার যোগ করুন, সেগুলোতে কিছু ঘটলে আমরা জানাব।"
            />
          </p>
          <GuestAsk />
        </div>

        {money && (
          <Link href="/sample-portfolio/diversified" className="hm-g-money" data-card="guest-money">
            <span className="hm-g-money-top">
              <span>
                <T en="Your portfolio" bn="আপনার পোর্টফোলিও" />
              </span>
              <span className="hm-g-ex">
                <T en={EXAMPLE_TAG.en} bn={EXAMPLE_TAG.bn} />
              </span>
            </span>
            <span className="hm-pill-l1">
              <span className="hm-pill-val nums">{takaGroup(Math.round(money.value))}</span>
              {money.delta != null && (
                <span className={`hm-pill-day nums ${money.delta >= 0 ? "hm-pill-day--up" : "hm-pill-day--down"}`}>
                  {when === "today" ? <T en="Today" bn="আজ" /> : <T en="Last close" bn="গত কার্যদিবসে" />}{" "}
                  {signedTaka(money.delta)}
                </span>
              )}
            </span>
            <span className="hm-pill-l2 nums">
              <T
                en={`${money.shares} shares${money.grade ? ` · Grade ${money.grade}` : ""}`}
                bn={`${money.shares}টি শেয়ার${money.grade ? ` · গ্রেড ${money.grade}` : ""}`}
              />
            </span>
            <span className="hm-g-money-go">
              <T en="Add your shares to see yours" bn="নিজেরটা দেখতে শেয়ার যোগ করুন" />
              <IconChevronRight size={16} />
            </span>
          </Link>
        )}

        <GuestSearch />
      </div>
    </div>
  );
}
