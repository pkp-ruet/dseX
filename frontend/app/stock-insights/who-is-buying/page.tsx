import type { Metadata } from "next";
import ReportShell, { RESEARCH_ANCHOR } from "@/components/research-reports/ReportShell";
import ResearchPromo from "@/components/research-reports/ResearchPromo";
import OwnersView from "@/components/research-reports/OwnersView";
import { T } from "@/components/i18n/T";
import { bdGroup } from "@/lib/formatters";
import { getOwnersReport } from "@/lib/api";
import { monthWords, reportJsonLd, reportMetadata, tkWords } from "@/lib/research-reports";

export const revalidate = 3600;

const TITLE = "Who Is Buying and Selling DSE Shares";
const DESCRIPTION =
  "Founder and director share trades on the Dhaka Stock Exchange over the last year, plus where institutions and foreign investors moved their money this month, the companies where they all agree, and those below the 30% founders' rule.";

export const metadata: Metadata = reportMetadata("who-is-buying", TITLE, DESCRIPTION, [
  "DSE sponsor director buy sell",
  "DSE insider trading Bangladesh",
  "institutional investors DSE shareholding",
  "foreign investors DSE",
  "30 percent sponsor shareholding rule",
]);

export default async function WhoIsBuyingPage() {
  const data = await getOwnersReport();
  const t = data.totals;
  const month = monthWords(data.month);
  const ex = data.trades.buying[0] ?? data.trades.selling[0] ?? null;
  const exTk = tkWords(ex?.net_tk);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(reportJsonLd("who-is-buying", TITLE, DESCRIPTION, data.as_of)) }}
      />
      <ReportShell
        slug="who-is-buying"
        asOf={data.as_of}
        stats={[
          {
            value: `${t.trade_buyers} / ${t.trade_sellers}`,
            label: { en: "companies whose owners bought / sold this year", bn: "কোম্পানির মালিকেরা এ বছর কিনেছেন / বেচেছেন" },
          },
          {
            value: `${t.inst_in} / ${t.inst_out}`,
            label: {
              en: `companies institutions moved into / out of in ${month.en}`,
              bn: `কোম্পানিতে ${month.bn}-এ প্রতিষ্ঠান ঢুকেছে / বেরিয়েছে`,
            },
          },
          {
            value: t.under30,
            tone: "watch",
            label: { en: "companies where founders hold under 30%", bn: "কোম্পানিতে উদ্যোক্তারা 30%-এর কম ধরে আছেন" },
          },
        ]}
        promo={
          <ResearchPromo
            anchor={RESEARCH_ANCHOR}
            lock="research-owners"
            name={{ en: "Who is buying, who is selling", bn: "কে কিনছে, কে বেচছে" }}
            title={{
              en: "The people closest to a company are moving money. See where.",
              bn: "কোম্পানির সবচেয়ে কাছের মানুষেরা টাকা সরাচ্ছেন। কোথায়, দেখুন।",
            }}
            lead={{
              en: "DSE posts owners' trades as separate notices and ownership one company at a time. We join them up: who bought, who sold, how much in taka, and where the big investors agree.",
              bn: "ডিএসই মালিকদের লেনদেন আলাদা আলাদা নোটিশে দেয়, আর মালিকানা দেয় এক কোম্পানি করে। আমরা সব মিলিয়ে দেখাই: কে কিনল, কে বেচল, টাকায় কত, আর বড় বিনিয়োগকারীরা কোথায় একমত।",
            }}
            taste={
              ex ? (
                <div className="rr-taste">
                  <p className="sp-k">
                    <T en="One company from the report" bn="প্রতিবেদন থেকে একটি কোম্পানি" />
                  </p>
                  <div className="rr-taste-card">
                    <p className="rr-taste-name">
                      {ex.name} <span className="rr-code">{ex.code}</span>
                    </p>
                    <p className="rr-co-line">
                      <T
                        en={`Its founders and directors ${ex.net_shares > 0 ? "bought" : "sold"} ${bdGroup(Math.abs(ex.net_shares))} shares net in the last 12 months, about ${exTk.en} at today's price.`}
                        bn={`গত 12 মাসে এর উদ্যোক্তা ও পরিচালকেরা নিট ${bdGroup(Math.abs(ex.net_shares))}টি শেয়ার ${ex.net_shares > 0 ? "কিনেছেন" : "বেচেছেন"}, আজকের দামে প্রায় ${exTk.bn}।`}
                      />
                    </p>
                  </div>
                </div>
              ) : null
            }
            gets={[
              { en: "Every founder and director trade of the year, added up in taka", bn: "বছরের প্রতিটি উদ্যোক্তা-পরিচালকের লেনদেন, টাকায় যোগ করা" },
              { en: "Where institutions and foreign investors moved this month", bn: "এ মাসে প্রতিষ্ঠান ও বিদেশিরা কোথায় গেলেন" },
              { en: "Companies where every group is buying, or selling", bn: "যেসব কোম্পানিতে সবাই কিনছে, বা বেচছে" },
              { en: "Sales announced but never done, and the 30% rule", bn: "ঘোষণা দিয়েও না করা বিক্রি, আর 30% নিয়ম" },
            ]}
          />
        }
        method={[
          {
            en: "Owners' trades come from every buy and sale notice founders and directors posted on DSE in the last 12 months. Each announcement is matched to the notice that says it was done.",
            bn: "মালিকদের লেনদেন এসেছে গত 12 মাসে উদ্যোক্তা ও পরিচালকদের ডিএসইতে দেওয়া প্রতিটি কেনা-বেচার নোটিশ থেকে। প্রতিটি ঘোষণাকে মেলানো হয়েছে কাজ শেষ হওয়ার নোটিশের সঙ্গে।",
          },
          {
            en: "Gifts and transfers inside the owner group are left out: no money changed hands.",
            bn: "মালিক দলের ভেতরে উপহার ও হস্তান্তর বাদ: সেখানে টাকা হাতবদল হয়নি।",
          },
          {
            en: "Ownership moves come from DSE's monthly report of who holds each company. A move of half a point or more is listed; one of 10 points or more is marked, as it is usually a reclassification rather than trading.",
            bn: "মালিকানার পরিবর্তন এসেছে ডিএসইর মাসিক মালিকানা প্রতিবেদন থেকে। আধা পয়েন্ট বা তার বেশি বদল তালিকায় আছে; 10 পয়েন্ট বা তার বেশি হলে চিহ্নিত, কারণ সেটি সাধারণত শ্রেণি বদল, কেনাবেচা নয়।",
          },
          {
            en: "Only graded companies are included: mutual funds and bonds are left out.",
            bn: "শুধু রেটিং পাওয়া কোম্পানি রাখা হয়েছে: মিউচুয়াল ফান্ড ও বন্ড বাদ।",
          },
        ]}
      >
        <OwnersView data={data} />
      </ReportShell>
    </>
  );
}
