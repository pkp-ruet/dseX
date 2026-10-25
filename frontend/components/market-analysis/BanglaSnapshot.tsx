import Link from "next/link";

/**
 * "আজকের বাজার এক নজরে" — the whole market in a short everyday-Bangla
 * paragraph, template-rendered on the backend. Server-rendered so crawlers
 * see real Bengali prose. Renders nothing when the backend has no summary.
 */
export default function BanglaSnapshot({ text }: { text: string }) {
  return (
    <section lang="bn" className="font-bn soft-card mk-card mt-4" aria-labelledby="mk-bn-title">
      <h3 className="mk-card-title" id="mk-bn-title">
        আজকের বাজার এক নজরে
      </h3>
      <p className="mk-bn-text mt-3">{text}</p>
      <div className="mk-card-foot">
        <Link href="/share-bazar" className="mk-link">
          আজকের পুরো বাজার বাংলায় পড়ুন →
        </Link>
      </div>
    </section>
  );
}
