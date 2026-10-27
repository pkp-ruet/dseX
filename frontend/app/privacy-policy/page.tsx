import type { Metadata } from "next";
import Link from "next/link";
import PageHeader from "@/components/ui/PageHeader";
import { T } from "@/components/i18n/T";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "TopStockBD privacy policy. Learn how we use cookies, third-party advertising vendors (Google AdSense), and analytics on our Dhaka Stock Exchange data platform.",
  alternates: { canonical: "/privacy-policy" },
  openGraph: {
    title: "Privacy Policy — TopStockBD",
    description:
      "How TopStockBD uses cookies, Google AdSense, and analytics. Your privacy matters.",
    url: "/privacy-policy",
    type: "website",
  },
};

const BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL || "https://www.topstockbd.com";

const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": `${BASE_URL}/privacy-policy`,
      url: `${BASE_URL}/privacy-policy`,
      name: "Privacy Policy — TopStockBD",
      description:
        "Privacy policy for TopStockBD — cookies, third-party vendors, and data use.",
      isPartOf: { "@id": BASE_URL },
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
        {
          "@type": "ListItem",
          position: 2,
          name: "Privacy Policy",
          item: `${BASE_URL}/privacy-policy`,
        },
      ],
    },
  ],
};

const P = "text-lg leading-[1.78] text-text-muted";
const H2 = "text-xl sm:text-2xl font-bold tracking-tight text-text-main";
const LINK = "font-medium text-primary hover:underline";

const NOT_COLLECTED: { en: string; bn: string }[] = [
  {
    en: "We do not collect your name, email or contact details",
    bn: "আমরা আপনার নাম, ইমেইল বা যোগাযোগের তথ্য সংগ্রহ করি না",
  },
  {
    en: "We do not store financial information of any kind",
    bn: "আমরা কোনো ধরনের আর্থিক তথ্য রাখি না",
  },
  {
    en: "We do not sell or share your data with third parties beyond what is described above",
    bn: "ওপরে যা বলা হয়েছে, তার বাইরে আমরা আপনার তথ্য কোনো তৃতীয় পক্ষের কাছে বিক্রি করি না বা দিই না",
  },
  {
    en: "We do not use your data for anything other than site analytics and advertising",
    bn: "সাইটের অ্যানালিটিক্স আর বিজ্ঞাপন ছাড়া অন্য কোনো কাজে আমরা আপনার তথ্য ব্যবহার করি না",
  },
];

function Dot() {
  return <span aria-hidden="true" className="mt-[0.62em] h-[7px] w-[7px] shrink-0 rounded-full bg-primary" />;
}

export default function PrivacyPolicyPage() {
  const adsSettings = (
    <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer" className={LINK}>
      Google Ads Settings
    </a>
  );
  const aboutAds = (
    <a href="https://www.aboutads.info/choices/" target="_blank" rel="noopener noreferrer" className={LINK}>
      aboutads.info
    </a>
  );
  const email = (
    <a href="mailto:contact@topstockbd.com" className={LINK}>
      contact@topstockbd.com
    </a>
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />
      <div className="page-narrow space-y-10">
        <PageHeader
          eyebrow={<T en="Privacy · Last updated May 2025" bn="গোপনীয়তা · সর্বশেষ হালনাগাদ মে 2025" />}
          title={<T en="Privacy policy" bn="গোপনীয়তা নীতি" />}
          lead={
            <T
              en={
                <>
                  This privacy policy explains how TopStockBD (&ldquo;we&rdquo;, &ldquo;us&rdquo; or &ldquo;our&rdquo;)
                  collects and uses information when you visit <strong>topstockbd.com</strong>.
                </>
              }
              bn={
                <>
                  আপনি <strong>topstockbd.com</strong>-এ এলে TopStockBD (&ldquo;আমরা&rdquo;) কীভাবে তথ্য সংগ্রহ ও
                  ব্যবহার করে, এই গোপনীয়তা নীতি তা ব্যাখ্যা করে।
                </>
              }
            />
          }
        />

        <section className="space-y-3.5">
          <h2 className={H2}>
            <T en="Information we collect" bn="আমরা কোন তথ্য সংগ্রহ করি" />
          </h2>
          <p className={P}>
            <T
              en="You do not need to create an account or give personal information to use TopStockBD. The only personal data stored locally is your watchlist, which is saved in your browser's localStorage and never sent to our servers."
              bn="TopStockBD ব্যবহার করতে আপনাকে অ্যাকাউন্ট খুলতে বা ব্যক্তিগত তথ্য দিতে হয় না। আপনার ডিভাইসে রাখা একমাত্র ব্যক্তিগত তথ্য হলো আপনার ওয়াচলিস্ট, যা আপনার ব্রাউজারের localStorage-এ সেভ থাকে আর কখনো আমাদের সার্ভারে পাঠানো হয় না।"
            />
          </p>
          <p className={P}>
            <T
              en="We may collect anonymous, combined usage data through third-party analytics services, such as Google Analytics, to understand how visitors use the site. This data does not identify you personally."
              bn="সাইটটি দর্শকেরা কীভাবে ব্যবহার করেন, তা বুঝতে আমরা Google Analytics-এর মতো তৃতীয় পক্ষের অ্যানালিটিক্স সেবার মাধ্যমে নামহীন, সম্মিলিত ব্যবহারের তথ্য সংগ্রহ করতে পারি। এই তথ্য দিয়ে আপনাকে ব্যক্তিগতভাবে চেনা যায় না।"
            />
          </p>
        </section>

        <section className="space-y-3.5">
          <h2 className={H2}>
            <T en="Cookies" bn="কুকি" />
          </h2>
          <p className={P}>
            <T
              en="TopStockBD uses cookies. Cookies are small text files that the websites you visit place on your device. We use cookies for these purposes:"
              bn="TopStockBD কুকি ব্যবহার করে। কুকি হলো ছোট টেক্সট ফাইল, যা আপনি যে ওয়েবসাইটে যান সেটি আপনার ডিভাইসে রাখে। আমরা এসব কাজে কুকি ব্যবহার করি:"
            />
          </p>
          <ul className="space-y-3">
            <li className="flex gap-3 text-lg leading-[1.7] text-text-muted">
              <Dot />
              <span>
                <T
                  en={<><strong className="text-text-main">Analytics:</strong> to understand which pages are visited and how people move around the site</>}
                  bn={<><strong className="text-text-main">অ্যানালিটিক্স:</strong> কোন পেজ দেখা হয় আর মানুষ সাইটে কীভাবে ঘোরেন, তা বুঝতে</>}
                />
              </span>
            </li>
            <li className="flex gap-3 text-lg leading-[1.7] text-text-muted">
              <Dot />
              <span>
                <T
                  en={<><strong className="text-text-main">Advertising:</strong> to show relevant ads through Google AdSense (see below)</>}
                  bn={<><strong className="text-text-main">বিজ্ঞাপন:</strong> Google AdSense-এর মাধ্যমে প্রাসঙ্গিক বিজ্ঞাপন দেখাতে (নিচে দেখুন)</>}
                />
              </span>
            </li>
          </ul>
          <p className={P}>
            <T
              en="You can turn off cookies in your browser settings, but some parts of the site may not work as expected if you do."
              bn="ব্রাউজারের সেটিংসে গিয়ে আপনি কুকি বন্ধ করতে পারেন, তবে তাহলে সাইটের কিছু অংশ ঠিকমতো কাজ না-ও করতে পারে।"
            />
          </p>
        </section>

        <section className="space-y-4">
          <h2 className={H2}>
            <T en="Third-party advertising (Google AdSense)" bn="তৃতীয় পক্ষের বিজ্ঞাপন (Google AdSense)" />
          </h2>
          <div className="soft-card p-5 space-y-3">
            <p className="text-base leading-[1.7] text-text-muted">
              <T
                en="TopStockBD uses Google AdSense to show ads. Google AdSense uses cookies to show ads based on your earlier visits to this and other websites."
                bn="বিজ্ঞাপন দেখাতে TopStockBD Google AdSense ব্যবহার করে। এই ও অন্যান্য ওয়েবসাইটে আপনার আগের ভিজিটের ভিত্তিতে বিজ্ঞাপন দেখাতে Google AdSense কুকি ব্যবহার করে।"
              />
            </p>
            <p className="text-base leading-[1.7] text-text-muted">
              <T
                en="Google's advertising cookies let Google and its partners show you ads based on your visits to our site and/or other sites on the internet."
                bn="Google-এর বিজ্ঞাপনের কুকির মাধ্যমে Google ও তার অংশীদাররা আমাদের সাইট এবং/অথবা ইন্টারনেটের অন্য সাইটে আপনার ভিজিটের ভিত্তিতে আপনাকে বিজ্ঞাপন দেখাতে পারে।"
              />
            </p>
            <p className="text-base leading-[1.7] text-text-muted">
              <T
                en={
                  <>
                    You can opt out of personalised ads by visiting {adsSettings}. You can also opt out of
                    third-party vendors&apos; use of cookies for personalised ads by visiting {aboutAds}.
                  </>
                }
                bn={
                  <>
                    {adsSettings}-এ গিয়ে আপনি ব্যক্তিগতকৃত বিজ্ঞাপন বন্ধ করতে পারেন। এ ছাড়া {aboutAds}-তে গিয়ে
                    ব্যক্তিগতকৃত বিজ্ঞাপনের জন্য তৃতীয় পক্ষের কুকি ব্যবহারও বন্ধ করতে পারেন।
                  </>
                }
              />
            </p>
          </div>
        </section>

        <section className="space-y-3.5">
          <h2 className={H2}>
            <T en="Analytics" bn="অ্যানালিটিক্স" />
          </h2>
          <p className={P}>
            <T
              en="We may use Google Analytics or similar tools to collect anonymous information about how people use TopStockBD, such as the pages visited, the time spent on the site and the general geographic region. This data is combined and does not identify you personally."
              bn="মানুষ TopStockBD কীভাবে ব্যবহার করেন, যেমন কোন পেজ দেখা হয়, সাইটে কত সময় কাটানো হয় আর মোটামুটি কোন অঞ্চল থেকে, সে বিষয়ে নামহীন তথ্য সংগ্রহ করতে আমরা Google Analytics বা এ রকম টুল ব্যবহার করতে পারি। এই তথ্য সম্মিলিতভাবে রাখা হয়, আর এতে আপনাকে ব্যক্তিগতভাবে চেনা যায় না।"
            />
          </p>
        </section>

        <section className="space-y-3.5">
          <h2 className={H2}>
            <T en="Data we do not collect" bn="যে তথ্য আমরা সংগ্রহ করি না" />
          </h2>
          <ul className="space-y-3">
            {NOT_COLLECTED.map((item) => (
              <li key={item.en} className="flex gap-3 text-lg leading-[1.7] text-text-muted">
                <Dot />
                <span>
                  <T en={item.en} bn={item.bn} />
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-3.5">
          <h2 className={H2}>
            <T en="External links" bn="বাইরের লিংক" />
          </h2>
          <p className={P}>
            <T
              en="TopStockBD may contain links to other websites. We are not responsible for the privacy practices or content of those sites. We encourage you to read the privacy policy of any outside site you visit."
              bn="TopStockBD-তে অন্য ওয়েবসাইটের লিংক থাকতে পারে। সেসব সাইটের গোপনীয়তা চর্চা বা বিষয়বস্তুর জন্য আমরা দায়ী নই। বাইরের কোনো সাইটে গেলে সেটির গোপনীয়তা নীতি পড়ে নেওয়ার পরামর্শ দিই।"
            />
          </p>
        </section>

        <section className="space-y-3.5">
          <h2 className={H2}>
            <T en="Changes to this policy" bn="এই নীতির পরিবর্তন" />
          </h2>
          <p className={P}>
            <T
              en="We may update this privacy policy from time to time. Any change will be posted on this page with an updated date. If you keep using the site after a change is posted, you accept the updated policy."
              bn="আমরা সময়ে সময়ে এই গোপনীয়তা নীতি হালনাগাদ করতে পারি। যেকোনো পরিবর্তন নতুন তারিখসহ এই পেজে প্রকাশ করা হবে। পরিবর্তন প্রকাশের পরও সাইট ব্যবহার করলে আপনি হালনাগাদ নীতি মেনে নিচ্ছেন বলে ধরা হবে।"
            />
          </p>
        </section>

        <section className="space-y-3.5">
          <h2 className={H2}>
            <T en="Contact" bn="যোগাযোগ" />
          </h2>
          <p className={P}>
            <T
              en={<>If you have questions about this privacy policy, please write to us at {email}.</>}
              bn={<>এই গোপনীয়তা নীতি নিয়ে কোনো প্রশ্ন থাকলে {email}-এ আমাদের লিখুন।</>}
            />
          </p>
        </section>

        <div className="pt-2 flex gap-4 flex-wrap items-center">
          <Link
            href="/disclaimer"
            className="text-base font-semibold text-primary hover:underline"
          >
            <T en="See the disclaimer →" bn="দায়মুক্তি দেখুন →" />
          </Link>
          <Link
            href="/about"
            className="text-base font-medium text-text-muted hover:text-text-main transition-colors"
          >
            <T en="About TopStockBD" bn="TopStockBD সম্পর্কে" />
          </Link>
        </div>

      </div>
    </>
  );
}
