import Link from "next/link";
import { T } from "@/components/i18n/T";

/** The signal's own rules (backend `signal_service._signal_for_row`), in plain
 *  words. Keep in step with that rule order. */
const CHECKS: { en: string; bn: string }[] = [
  { en: "Graded Good or Excellent", bn: "গ্রেড ভালো বা চমৎকার" },
  { en: "A low price, or a fair price for an Excellent company", bn: "দাম কম, অথবা চমৎকার কোম্পানির জন্য ন্যায্য দাম" },
  { en: "Not near the top of its price range for the year", bn: "এ বছরের দামের সীমার ওপরের দিকে নয়" },
  { en: "No serious warning in its notices, and not in Z category", bn: "নোটিশে গুরুতর সতর্কতা নেই, Z ক্যাটাগরিতেও নয়" },
  { en: "Profit not down a quarter or more on last year", bn: "মুনাফা আগের বছরের চেয়ে এক-চতুর্থাংশ বা তার বেশি কমেনি" },
  { en: "Loans smaller than the whole company's value", bn: "ঋণ পুরো কোম্পানির বাজারমূল্যের চেয়ে কম" },
  { en: "Up-to-date accounts, and at least ৳10 lakh traded a day", bn: "হালনাগাদ হিসাব, আর দিনে অন্তত ৳10 লাখ লেনদেন" },
];

/**
 * "Every share here passed" (2026-10-31): the rules a Buy must meet, as a
 * checklist. Replaced the folded "How a share gets a Buy signal" box and its
 * Strong-buy row.
 */
export default function SignalsChecks() {
  return (
    <section aria-labelledby="sg-checks-h" className="soft-card sg-checks">
      <h2 id="sg-checks-h" className="sg-checks-h">
        <T en="Every share on this list passed" bn="এই তালিকার প্রতিটি শেয়ার যা পার হয়েছে" />
      </h2>
      <ul className="sg-checks-list">
        {CHECKS.map((c) => (
          <li key={c.en}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="text-positive">
              <path d="m5 12.5 4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <T en={c.en} bn={c.bn} />
          </li>
        ))}
      </ul>
      <p className="sg-checks-foot">
        <T
          en={
            <>
              The price word says how low the price is against the company&apos;s own past and its sector. How we grade
              a company: <Link href="/about">about our method</Link>.
            </>
          }
          bn={
            <>
              দামের শব্দটি বলে কোম্পানির নিজের অতীত আর সেক্টরের তুলনায় দাম কতটা কম। কীভাবে গ্রেড দিই:{" "}
              <Link href="/about">আমাদের পদ্ধতি</Link>।
            </>
          }
        />
      </p>
    </section>
  );
}
