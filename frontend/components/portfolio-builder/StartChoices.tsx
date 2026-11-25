"use client";

import Button from "@/components/ui/Button";
import { IconBlocks, IconPlus } from "@/components/ui/icons";
import { T } from "@/components/i18n/T";
import { useAuth } from "@/context/AuthContext";
import { BUILDER_PATH } from "@/lib/portfolio-builder";

/**
 * Two equal ways to start a portfolio (2026-11-25, "Compare and Builder
 * Homes": the builder moved to My shares). "I already own shares" adds them;
 * "I have money to invest" opens the portfolio builder. Shown on an empty
 * Portfolio and an empty My shares page. Until then the builder was one
 * sentence under the Add button.
 */
export default function StartChoices({
  onAdd,
  addHref,
  from,
}: {
  /** Open the add dialog in place (the portfolio page). */
  onAdd?: () => void;
  /** Or go where shares are added (My shares → the portfolio's add dialog). */
  addHref?: string;
  /** GA source on the builder link: `portfolio` · `my`. */
  from: string;
}) {
  const { user } = useAuth();
  const firstFree = !user?.builder?.free_used;

  return (
    <div className="pf-start">
      <div className="pf-start-card">
        <span className="pf-start-ic" aria-hidden="true">
          <IconPlus size={18} />
        </span>
        <h3 className="pf-start-t">
          <T en="I already own shares" bn="আমার শেয়ার আছে" />
        </h3>
        <p className="pf-start-d">
          <T
            en="Add them once. We check them after every close and tell you what to do."
            bn="একবার যোগ করুন। প্রতিদিন বাজার বন্ধের পর আমরা সেগুলো দেখি আর কী করবেন জানাই।"
          />
        </p>
        {onAdd ? (
          <Button type="button" variant="quiet" size="lg" block onClick={onAdd}>
            <T en="Add my shares" bn="আমার শেয়ার যোগ করুন" />
          </Button>
        ) : (
          <Button href={addHref ?? "/portfolio?add=new"} variant="quiet" size="lg" block>
            <T en="Add my shares" bn="আমার শেয়ার যোগ করুন" />
          </Button>
        )}
      </div>

      <div className="pf-start-card pf-start-card--build">
        <span className="pf-start-ic" aria-hidden="true">
          <IconBlocks size={18} />
        </span>
        <h3 className="pf-start-t">
          <T en="I have money to invest" bn="আমার কাছে বিনিয়োগের টাকা আছে" />
        </h3>
        <p className="pf-start-d">
          <T
            en="Tell us how much. We split it across strong companies, with how many of each to buy."
            bn="কত টাকা বলুন। আমরা তা শক্তিশালী কোম্পানিতে ভাগ করে দেব, কোনটি কয়টি কিনবেন তাসহ।"
          />
        </p>
        <Button href={`${BUILDER_PATH}?src=${encodeURIComponent(from)}`} variant="primary" size="lg" block>
          <T en="Build a portfolio" bn="পোর্টফোলিও বানান" />
        </Button>
        {firstFree && (
          <p className="pf-start-free">
            <T en="Your first plan is free" bn="প্রথম প্ল্যানটি ফ্রি" />
          </p>
        )}
      </div>
    </div>
  );
}
