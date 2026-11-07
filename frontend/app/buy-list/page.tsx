import type { Metadata } from "next";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import PageGate from "@/components/premium/PageGate";
import BuyListRows from "@/components/buy-list/BuyListRows";
import BuyListPromo from "@/components/buy-list/BuyListPromo";
import { AlmostList, AlsoPassed, HowWeChoose, ListChanges } from "@/components/buy-list/BuyListParts";
import { PersonalCodesProvider } from "@/components/market-analysis/PersonalCodes";
import { dayShort } from "@/components/dividend-calendar/dates";
import { IconCrown } from "@/components/ui/icons";
import { T } from "@/components/i18n/T";
import { getBuyList } from "@/lib/api";
import { BUY_LIST_ANCHOR, BUY_LIST_PATH } from "@/lib/buy-list";

// The list changes after each close; ISR keeps the last good page if the
// backend is down (the fetch throws, SEO rule 4).
export const revalidate = 900;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://www.topstockbd.com";
const URL = `${BASE_URL}${BUY_LIST_PATH}`;
const TITLE = "Buy List: the best DSE shares to buy today";
const DESCRIPTION =
  "The few Dhaka Stock Exchange shares we would buy today: strong companies, priced well under what we think they are worth, with nothing seriously wrong. Checked after every close.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "DSE buy list",
    "best shares to buy in DSE",
    "which share to buy Bangladesh",
    "DSE stocks to buy today",
    "undervalued DSE shares",
    "Bangladesh stock market buy",
    "কোন শেয়ার কিনব",
  ],
  alternates: { canonical: URL },
  openGraph: { title: `${TITLE} | TopStockBD`, description: DESCRIPTION, url: URL, type: "website" },
};

export default async function BuyListPage() {
  const data = await getBuyList();
  const day = dayShort(data.as_of);
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        name: "Buy List",
        headline: TITLE,
        description: DESCRIPTION,
        url: URL,
        inLanguage: ["en", "bn"],
        dateModified: data.as_of,
        isAccessibleForFree: false,
        hasPart: { "@type": "WebPageElement", isAccessibleForFree: false, cssSelector: ".premium-locked" },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
          { "@type": "ListItem", position: 2, name: "Buy List", item: URL },
        ],
      },
    ],
  };

  return (
    <PersonalCodesProvider>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <PageHeader
        eyebrow={
          <span className="bl-eyebrow">
            <span className="bl-crown">
              <IconCrown size={14} />
              <T en="Premium" bn="প্রিমিয়াম" />
            </span>
            <T en={`Checked after the close, ${day.en}`} bn={`বাজার বন্ধের পর যাচাই, ${day.bn}`} />
          </span>
        }
        title={<T en="Today's Buy List" bn="আজকের কেনার তালিকা" />}
        lead={
          <T
            en="The DSE shares we would buy today. Strong companies, priced well under what we think they are worth, with nothing seriously wrong."
            bn="আজ যে শেয়ারগুলো আমরা কেনার মতো মনে করি। কোম্পানি শক্তিশালী, দাম আমাদের হিসাবের ন্যায্য দামের চেয়ে বেশ কম, আর গুরুতর কোনো সমস্যা নেই।"
          />
        }
      />
      <ul className="bl-facts-row">
        <li>
          <T
            en={`${data.count} of ${data.universe} companies`}
            bn={`${data.universe}টির মধ্যে ${data.count}টি কোম্পানি`}
          />
        </li>
        <li>
          <T en="6 questions, every one a yes" bn="6টি প্রশ্ন, সবগুলোর উত্তর হ্যাঁ" />
        </li>
        <li>
          <T en="The same list for every reader" bn="সব পাঠকের জন্য একই তালিকা" />
        </li>
      </ul>

      <div className="bl-layout">
        <div className="bl-main">
          <PageGate promo={<BuyListPromo data={data} />} anchor={BUY_LIST_ANCHOR}>
            <section className="bl-list" aria-labelledby="bl-list-t">
              <div className="bl-list-head">
                <div>
                  <h2 id="bl-list-t" className="bl-h2 bl-h2--lg">
                    <T en={`Today's ${data.count}`} bn={`আজকের ${data.count}টি`} />
                  </h2>
                  <p className="bl-note">
                    <T
                      en="Ordered by how strong the case is. Tap a share to see why it's here."
                      bn="যার কারণ যত জোরালো, সে তত আগে। কেন তালিকায় আছে দেখতে শেয়ারে চাপুন।"
                    />
                  </p>
                </div>
                <ListChanges data={data} />
              </div>
              {data.items.length > 0 ? (
                <BuyListRows items={data.items} />
              ) : (
                <EmptyState
                  title={<T en="No share passes all six questions today" bn="আজ কোনো শেয়ার ছয়টি প্রশ্নেই পাস করেনি" />}
                  message={
                    <T
                      en="We never lower the bar to fill the list. The strong companies that came closest are below."
                      bn="তালিকা ভরাতে আমরা কখনো মান নামাই না। যারা সবচেয়ে কাছে এসেছিল, সেই শক্তিশালী কোম্পানিগুলো নিচে আছে।"
                    />
                  }
                />
              )}
              <AlsoPassed data={data} />
              <AlmostList data={data} />
            </section>
          </PageGate>
        </div>
        <aside className="bl-side">
          <HowWeChoose rules={data.rules} />
        </aside>
      </div>

      <p className="bl-advice">
        <T
          en="This is our analysis of public figures, not advice. You decide what to buy."
          bn="এটি প্রকাশিত তথ্যের ভিত্তিতে আমাদের বিশ্লেষণ, পরামর্শ নয়। কী কিনবেন, সে সিদ্ধান্ত আপনার।"
        />
      </p>
    </PersonalCodesProvider>
  );
}
