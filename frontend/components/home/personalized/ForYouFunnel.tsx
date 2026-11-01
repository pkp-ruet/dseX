import { Fragment } from "react";
import type { ForYou } from "@/lib/api";
import type { Lang } from "@/context/LangContext";
import { t } from "@/lib/home-copy";
import { IconChevronRight } from "@/components/ui/icons";

/**
 * The three numbers behind "Picked for you": companies analysed → passed
 * every check → chosen for this reader, as one row of steps. `gold` = on the
 * free reader's gold band (white steps), else a quiet hairline box.
 */
export default function ForYouFunnel({ data, lang = "en", gold = false }: { data: ForYou; lang?: Lang; gold?: boolean }) {
  const steps = [
    { v: data.funnel.rated, l: t(lang, "forYouStatChecked") },
    { v: data.funnel.passed, l: t(lang, "forYouStatPassed") },
    { v: data.items.length, l: t(lang, "forYouStatPicked") },
  ];
  return (
    <div className={`fy-funnel ${gold ? "fy-funnel--gold" : ""}`}>
      {steps.map((s, i) => (
        <Fragment key={i}>
          {i > 0 && (
            <span className="fy-funnel-arrow" aria-hidden="true">
              <IconChevronRight size={14} />
            </span>
          )}
          <span className={`fy-step ${i === 2 ? "fy-step--end" : ""}`}>
            <b>{s.v}</b>
            <span>{s.l}</span>
          </span>
        </Fragment>
      ))}
    </div>
  );
}
