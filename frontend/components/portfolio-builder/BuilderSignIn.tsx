import Button from "@/components/ui/Button";
import { T } from "@/components/i18n/T";
import { IconBlocks, IconCheck } from "@/components/ui/icons";
import { authHref } from "@/lib/next-path";
import { BUILDER_PATH } from "@/lib/portfolio-builder";

/**
 * Signed out (2026-11-23, user: "user must sign in to use this builder"):
 * what the builder does and one way in. The free plan belongs to an account,
 * so signing out can't give a second one.
 */
export default function BuilderSignIn() {
  return (
    <section className="pb-signin" aria-labelledby="pb-signin-t">
      <span className="pb-signin-ic" aria-hidden="true">
        <IconBlocks size={22} />
      </span>
      <h2 id="pb-signin-t" className="pb-signin-h">
        <T en="Sign in to build your portfolio" bn="পোর্টফোলিও বানাতে সাইন ইন করুন" />
      </h2>
      <ul className="pb-signin-list">
        {[
          { en: "Answer three questions: how much, what it is for, what kind of companies", bn: "তিনটি প্রশ্নের উত্তর দিন: কত টাকা, কী জন্য, কেমন কোম্পানি" },
          { en: "Get a whole portfolio: which shares, how many of each, and why", bn: "পুরো পোর্টফোলিও পাবেন: কোন শেয়ার, কতটি করে, আর কেন" },
          { en: "Your first plan is free, in full", bn: "প্রথম পরিকল্পনা পুরোটাই ফ্রি" },
        ].map((l) => (
          <li key={l.en}>
            <IconCheck size={16} />
            <T en={l.en} bn={l.bn} />
          </li>
        ))}
      </ul>
      <div className="pb-signin-cta">
        <Button href={authHref("/register", BUILDER_PATH)} size="lg">
          <T en="Create a free account" bn="ফ্রি অ্যাকাউন্ট খুলুন" />
        </Button>
        <Button href={authHref("/login", BUILDER_PATH)} variant="quiet" size="lg">
          <T en="Sign in" bn="সাইন ইন" />
        </Button>
      </div>
    </section>
  );
}
