import Link from "next/link";
import { T } from "@/components/i18n/T";

/**
 * "Today's market at a glance" — the whole market in one short everyday
 * paragraph, template-rendered on the backend in both languages
 * (`summary_en` / `summary_bn`). Server-rendered so crawlers see real prose.
 * Without an English twin (older backend) the card shows in Bengali mode only.
 */
export default function BanglaSnapshot({ text, textEn }: { text: string; textEn?: string | null }) {
  return (
    <section
      className="soft-card mk-card mt-4"
      aria-labelledby="mk-bn-title"
      data-l={textEn ? undefined : "bn"}
    >
      <h3 className="mk-card-title" id="mk-bn-title">
        <T en="Today's market at a glance" bn="আজকের বাজার এক নজরে" />
      </h3>
      <p className="mk-bn-text mt-3">{textEn ? <T en={textEn} bn={text} /> : text}</p>
      {/* The full daily read is a Bengali article, so the link shows in Bengali mode. */}
      <div className="mk-card-foot" data-l="bn">
        <Link href="/share-bazar" className="mk-link">
          আজকের পুরো বাজার বাংলায় পড়ুন →
        </Link>
      </div>
    </section>
  );
}
